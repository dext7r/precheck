"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{dict.dashboard.loading}</p>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{dict.dashboard.noMessages}</p>
      </div>
    )
  }

  return (
    <div className="space-y-1 p-2">
      {messages.map((message) => {
        const isUnread = !message.readAt
        const isSelected = selectedMessageId === message.id
        return (
          <motion.div
            key={message.id}
            whileHover={{ x: 4 }}
            onClick={() => handleClick(message.id)}
            className={cn(
              "relative cursor-pointer rounded-lg border p-4 transition-colors",
              isUnread ? "bg-primary/5 hover:bg-primary/10" : "bg-background hover:bg-muted/50",
              isSelected && "bg-muted",
            )}
          >
            {isUnread && (
              <div className="absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 animate-pulse rounded-full bg-primary" />
            )}
            <div className={cn("space-y-1", isUnread && "pl-4")}>
              <div className="flex items-start justify-between gap-2">
                <h3 className={cn("line-clamp-2 text-sm", isUnread && "font-semibold")}>
                  {message.title}
                </h3>
                {isUnread && (
                  <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                    {dict.dashboard.unread}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(message.createdAt).toLocaleDateString(locale)}
              </p>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
