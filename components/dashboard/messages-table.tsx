"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Mail, MailOpen, ChevronRight, ChevronLeft, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface MessageItem {
  id: string
  title: string
  createdAt: string
  readAt: string | null
}

interface MessagesTableProps {
  locale: string
  dict: {
    dashboard: {
      messages: string
      inbox: string
      noMessages: string
      read: string
      unread: string
      open: string
      date: string
      status: string
      messageTitle: string
      actions: string
      loading: string
      perPage: string
      pageSummary: string
      cancel: string
      confirm: string
      deleting: string
      deleteMessage: string
      deleteMessageConfirmTitle: string
      deleteMessageConfirmDesc: string
      deleteMessageSuccess: string
    }
  }
  onSelectMessage?: (id: string) => void
  selectedMessageId?: string | null
  onUnreadCountChange?: (count: number) => void
}

export function MessagesTable({
  locale,
  dict,
  onSelectMessage,
  selectedMessageId,
  onUnreadCountChange,
}: MessagesTableProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<MessageItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const pageSize = 20

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const fetchMessages = useCallback(
    async (p: number = 1) => {
      setLoading(true)
      try {
        const res = await fetch(`/api/dashboard/messages?page=${p}&pageSize=${pageSize}`)
        if (!res.ok) throw new Error("Failed to fetch messages")
        const data = await res.json()
        setMessages(data.messages || [])
        setTotal(data.total ?? 0)
        const unreadCount = (data.messages || []).filter((m: MessageItem) => !m.readAt).length
        onUnreadCountChange?.(unreadCount)
      } catch (error) {
        console.error("Messages fetch error:", error)
      } finally {
        setLoading(false)
      }
    },
    [onUnreadCountChange],
  )

  useEffect(() => {
    fetchMessages(page)
    const interval = setInterval(() => fetchMessages(page), 30000)
    return () => clearInterval(interval)
  }, [page, fetchMessages])

  const handleClick = (id: string) => {
    if (onSelectMessage) {
      onSelectMessage(id)
    } else {
      router.push(`/${locale}/dashboard/messages/${id}`)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/dashboard/messages/${deleteTarget.id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        toast.success(dict.dashboard.deleteMessageSuccess)
        if (messages.length === 1 && page > 1) {
          setPage(page - 1)
        } else {
          fetchMessages(page)
        }
      } else {
        toast.error("Failed to delete message")
      }
    } catch (error) {
      console.error("Delete message error:", error)
      toast.error("Failed to delete message")
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return locale === "zh" ? "刚刚" : "Just now"
    if (diffMins < 60) return locale === "zh" ? `${diffMins} 分钟前` : `${diffMins}m ago`
    if (diffHours < 24) return locale === "zh" ? `${diffHours} 小时前` : `${diffHours}h ago`
    if (diffDays < 7) return locale === "zh" ? `${diffDays} 天前` : `${diffDays}d ago`
    return date.toLocaleDateString(locale)
  }

  if (loading && messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-3 text-sm text-muted-foreground">{dict.dashboard.loading}</p>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 mb-3">
          <Mail className="h-7 w-7 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground">{dict.dashboard.noMessages}</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-1 p-2">
        {messages.map((message, index) => {
          const isUnread = !message.readAt
          const isSelected = selectedMessageId === message.id
          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={cn(
                "group relative rounded-xl p-4 transition-all duration-200",
                isUnread
                  ? "bg-gradient-to-r from-primary/8 to-transparent hover:from-primary/12"
                  : "bg-transparent hover:bg-muted/50",
                isSelected && "bg-primary/10 ring-1 ring-primary/20",
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors cursor-pointer",
                    isUnread ? "bg-primary/10" : "bg-muted/50",
                  )}
                  onClick={() => handleClick(message.id)}
                >
                  {isUnread ? (
                    <Mail className="h-4 w-4 text-primary" />
                  ) : (
                    <MailOpen className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => handleClick(message.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className={cn(
                        "line-clamp-2 text-sm leading-snug",
                        isUnread ? "font-semibold text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {message.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(message.createdAt)}
                    </span>
                    {isUnread && (
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-[10px] font-medium text-primary">
                          {dict.dashboard.unread}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteTarget(message)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground/30 transition-all duration-200 cursor-pointer",
                      "group-hover:text-muted-foreground group-hover:translate-x-0.5",
                    )}
                    onClick={() => handleClick(message.id)}
                  />
                </div>
              </div>
            </motion.div>
          )
        })}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t pt-4 px-2">
            <span className="text-sm text-muted-foreground">
              {locale === "zh"
                ? `共 ${total} 条，第 ${page}/${totalPages} 页`
                : `${total} total, page ${page} of ${totalPages}`}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dict.dashboard.deleteMessageConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {dict.dashboard.deleteMessageConfirmDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{dict.dashboard.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {dict.dashboard.deleting}
                </>
              ) : (
                dict.dashboard.confirm
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
