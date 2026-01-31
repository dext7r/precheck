"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  Send,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Play,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

interface AdminTicketDetailProps {
  locale: Locale
  dict: Dictionary
  ticketId: string
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
  updatedAt: string
  user: { id: string; name: string | null; email: string; role: string; avatar: string | null }
  preApplication: {
    id: string
    status: string
    registerEmail: string
    essay: string
    guidance: string | null
    reviewedAt: string | null
    reviewedBy: { id: string; name: string | null } | null
  }
  messages: Message[]
}

const statusConfig = {
  OPEN: { icon: AlertCircle, color: "text-yellow-500" },
  IN_PROGRESS: { icon: Clock, color: "text-blue-500" },
  RESOLVED: { icon: CheckCircle, color: "text-green-500" },
  CLOSED: { icon: XCircle, color: "text-gray-500" },
}

export function AdminTicketDetail({ locale, dict, ticketId }: AdminTicketDetailProps) {
  const router = useRouter()
  const [ticket, setTicket] = useState<TicketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const t = (dict.admin as Record<string, unknown>) || {}
  const statusLabels = (t.ticketStatus as Record<string, string>) || {}

  useEffect(() => {
    fetchTicket()
  }, [ticketId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [ticket?.messages])

  const fetchTicket = async () => {
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`)
      if (!res.ok) throw new Error()
      setTicket(await res.json())
    } catch {
      toast.error("获取工单失败")
      router.push(`/${locale}/admin/tickets`)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/messages`, {
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

  const updateStatus = async (status: string) => {
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      await fetchTicket()
      toast.success("状态已更新")
    } catch {
      toast.error("更新失败")
    } finally {
      setUpdatingStatus(false)
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

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{ticket.subject}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <StatusIcon className={`h-4 w-4 ${config.color}`} />
            <span>
              {statusLabels[ticket.status.toLowerCase() as keyof typeof statusLabels] ||
                ticket.status}
            </span>
            <span>·</span>
            <span>{ticket.user.name || ticket.user.email}</span>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-wrap gap-2">
        {ticket.status === "OPEN" && (
          <Button size="sm" onClick={() => updateStatus("IN_PROGRESS")} disabled={updatingStatus}>
            <Play className="mr-1 h-3.5 w-3.5" />
            {(t.ticketMarkInProgress as string) || "开始处理"}
          </Button>
        )}
        {(ticket.status === "OPEN" || ticket.status === "IN_PROGRESS") && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => updateStatus("RESOLVED")}
            disabled={updatingStatus}
          >
            <CheckCircle className="mr-1 h-3.5 w-3.5" />
            {(t.ticketResolve as string) || "标记已解决"}
          </Button>
        )}
        {ticket.status !== "CLOSED" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateStatus("CLOSED")}
            disabled={updatingStatus}
          >
            <XCircle className="mr-1 h-3.5 w-3.5" />
            {(t.ticketClose as string) || "关闭工单"}
          </Button>
        )}
        {ticket.status === "CLOSED" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateStatus("OPEN")}
            disabled={updatingStatus}
          >
            {(t.ticketReopen as string) || "重新打开"}
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* 消息列表 */}
        <Card
          className="flex flex-col"
          style={{ height: "calc(100vh - 340px)", minHeight: "400px" }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">对话记录</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-3 pb-4">
            {ticket.messages.map((msg, index) => {
              const isAdmin = msg.author.role !== "USER"
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={cn(
                    "flex items-start gap-2",
                    isAdmin ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={msg.author.avatar || undefined} />
                    <AvatarFallback>
                      {(msg.author.name || msg.author.email)?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn("max-w-[70%]", isAdmin ? "items-end" : "items-start")}>
                    <div
                      className={cn(
                        "mb-1 flex items-center gap-1 text-xs text-muted-foreground",
                        isAdmin ? "justify-end" : "",
                      )}
                    >
                      <span>{msg.author.name || msg.author.email}</span>
                      {isAdmin && (
                        <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                          <Shield className="mr-0.5 h-2.5 w-2.5" />
                          管理员
                        </Badge>
                      )}
                    </div>
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2 shadow-sm",
                        isAdmin
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted rounded-bl-sm",
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                    <p
                      className={cn(
                        "mt-1 text-[10px] text-muted-foreground",
                        isAdmin ? "text-right" : "",
                      )}
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

        {/* 右侧信息面板 */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {(t.ticketUser as string) || "用户信息"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">名称：</span>
                {ticket.user.name || "-"}
              </p>
              <p>
                <span className="text-muted-foreground">邮箱：</span>
                {ticket.user.email}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {(t.ticketApplication as string) || "关联申请"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">状态：</span>
                <Badge variant="outline" className="ml-1">
                  {ticket.preApplication.status}
                </Badge>
              </p>
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
              {ticket.preApplication.essay && (
                <div>
                  <span className="text-muted-foreground">小作文：</span>
                  <p className="mt-1 rounded bg-muted p-2 text-xs">{ticket.preApplication.essay}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 回复输入框 */}
      {ticket.status !== "CLOSED" && (
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
    </div>
  )
}
