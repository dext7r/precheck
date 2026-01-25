"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Mail, MailOpen, ChevronRight } from "lucide-react"

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

  const fetchMessages = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/messages?page=1&pageSize=100`)
      if (!res.ok) throw new Error("Failed to fetch messages")
      const data = await res.json()
      setMessages(data.messages || [])
      const unreadCount = (data.messages || []).filter((m: MessageItem) => !m.readAt).length
      onUnreadCountChange?.(unreadCount)
    } catch (error) {
      console.error("Messages fetch error:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleClick = (id: string) => {
    if (onSelectMessage) {
      onSelectMessage(id)
    } else {
      router.push(`/${locale}/dashboard/messages/${id}`)
    }
  }

  // 格式化相对时间
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

  if (loading) {
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
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleClick(message.id)}
            className={cn(
              "group relative cursor-pointer rounded-xl p-4 transition-all duration-200",
              isUnread
                ? "bg-gradient-to-r from-primary/8 to-transparent hover:from-primary/12"
                : "bg-transparent hover:bg-muted/50",
              isSelected && "bg-primary/10 ring-1 ring-primary/20",
            )}
          >
            <div className="flex items-start gap-3">
              {/* 图标 */}
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                  isUnread ? "bg-primary/10" : "bg-muted/50",
                )}
              >
                {isUnread ? (
                  <Mail className="h-4 w-4 text-primary" />
                ) : (
                  <MailOpen className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className={cn(
                      "line-clamp-2 text-sm leading-snug",
                      isUnread ? "font-semibold text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {message.title}
                  </h3>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground/30 transition-all duration-200",
                      "group-hover:text-muted-foreground group-hover:translate-x-0.5",
                    )}
                  />
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
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
