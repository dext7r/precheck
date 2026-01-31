"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, Send, Clock, CheckCircle, AlertCircle, XCircle, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

interface TicketDetailProps {
  locale: Locale
  dict: Dictionary
  ticketId: string
  userId: string
}

type Message = {
  id: string
  content: string
  createdAt: string
  author: {
    id: string
    name: string | null
    email: string
    role: string
    avatar: string | null
  }
}

type TicketData = {
  id: string
  subject: string
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"
  createdAt: string
  preApplication: {
    id: string
    status: string
    registerEmail: string
    essay: string
    guidance: string | null
  }
  messages: Message[]
}

const statusConfig = {
  OPEN: { icon: AlertCircle, color: "text-yellow-500", label: "open" },
  IN_PROGRESS: { icon: Clock, color: "text-blue-500", label: "in_progress" },
  RESOLVED: { icon: CheckCircle, color: "text-green-500", label: "resolved" },
  CLOSED: { icon: XCircle, color: "text-gray-500", label: "closed" },
}

export function TicketDetail({ locale, dict, ticketId, userId }: TicketDetailProps) {
  const router = useRouter()
  const [ticket, setTicket] = useState<TicketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const t = (dict.dashboard as Record<string, unknown>) || {}
  const statusLabels = (t.ticketStatus as Record<string, string>) || {}

  useEffect(() => {
    fetchTicket()
  }, [ticketId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [ticket?.messages])

  const fetchTicket = async () => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTicket(data)
    } catch {
      toast.error("获取工单失败")
      router.push(`/${locale}/dashboard/tickets`)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage }),
      })
      if (!res.ok) throw new Error()
      setNewMessage("")
      await fetchTicket()
    } catch {
      toast.error("发送失败")
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!ticket) return null

  const config = statusConfig[ticket.status]
  const StatusIcon = config.icon
  const canReply = ticket.status === "OPEN" || ticket.status === "IN_PROGRESS"

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{ticket.subject}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <StatusIcon className={`h-4 w-4 ${config.color}`} />
            <span>{statusLabels[config.label] || ticket.status}</span>
            <span>·</span>
            <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* 关联申请信息 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            {(t.ticketRelatedApplication as string) || "关联申请"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">邮箱：</span>
            {ticket.preApplication.registerEmail}
          </p>
          {ticket.preApplication.guidance && (
            <p>
              <span className="text-muted-foreground">审核意见：</span>
              {ticket.preApplication.guidance}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 消息列表 */}
      <Card className="flex flex-col" style={{ height: "calc(100vh - 400px)", minHeight: "300px" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            {(t.ticketMessages as string) || "对话记录"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-4 pb-4">
          {ticket.messages.map((msg, index) => {
            const isMe = msg.author.id === userId
            const isAdmin = msg.author.role !== "USER"

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={msg.author.avatar || undefined} />
                  <AvatarFallback>
                    {(msg.author.name || msg.author.email)?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
                  <div
                    className={`mb-1 flex items-center gap-1 text-xs text-muted-foreground ${isMe ? "justify-end" : ""}`}
                  >
                    <span>{msg.author.name || "用户"}</span>
                    {isAdmin && (
                      <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                        <Shield className="mr-0.5 h-2.5 w-2.5" />
                        管理员
                      </Badge>
                    )}
                  </div>
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : isAdmin
                          ? "bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-bl-sm"
                          : "bg-muted rounded-bl-sm"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                  <p
                    className={`mt-1 text-[10px] text-muted-foreground ${isMe ? "text-right" : ""}`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            )
          })}
          <div ref={messagesEndRef} />
        </CardContent>
      </Card>

      {/* 回复输入框 */}
      {canReply && (
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={(t.ticketReplyPlaceholder as string) || "输入回复内容..."}
            className="min-h-[80px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
          />
          <Button onClick={sendMessage} disabled={sending || !newMessage.trim()} className="px-6">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}

      {!canReply && (
        <p className="text-center text-sm text-muted-foreground">
          工单已{ticket.status === "RESOLVED" ? "解决" : "关闭"}，无法继续回复
        </p>
      )}
    </div>
  )
}
