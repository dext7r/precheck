"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Shield, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

interface ChatRoomProps {
  locale: Locale
  dict: Dictionary
  currentUser: {
    id: string
    name: string | null
    role: string
    avatar: string | null
  }
}

type ChatMsg = {
  id: string
  content: string
  createdAt: string
  sender: {
    id: string
    name: string | null
    email: string
    role: string
    avatar: string | null
  }
}

export function ChatRoom({ dict, currentUser }: ChatRoomProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const t = (dict.dashboard as Record<string, unknown>) || {}

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/chat?limit=100")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setMessages(data.messages || [])
    } catch {
      // 静默失败
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 3000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const sendMessage = async () => {
    const content = input.trim()
    if (!content || sending) return
    setSending(true)
    setInput("")
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error()
      const msg = await res.json()
      setMessages((prev) => [...prev, msg])
    } catch {
      toast.error("发送失败")
      setInput(content)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  // 时间分组：两条消息间隔超过5分钟显示时间
  const shouldShowTime = (current: ChatMsg, previous: ChatMsg | undefined) => {
    if (!previous) return true
    const diff = new Date(current.createdAt).getTime() - new Date(previous.createdAt).getTime()
    return diff > 5 * 60 * 1000
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    if (isToday) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    return (
      date.toLocaleDateString([], { month: "short", day: "numeric" }) +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    )
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 160px)" }}>
      {/* 头部 */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">{(t.chat as string) || "聊天室"}</h1>
        </div>
      </div>

      {/* 消息区域 */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-4"
        style={{ background: "var(--chat-bg, hsl(var(--muted) / 0.3))" }}
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <MessageCircle className="mb-2 h-10 w-10" />
            <p className="text-sm">{(t.chatEmpty as string) || "暂无消息"}</p>
          </div>
        ) : (
          <div className="space-y-1">
            <AnimatePresence initial={false}>
              {messages.map((msg, index) => {
                const isMe = msg.sender.id === currentUser.id
                const isAdmin = msg.sender.role !== "USER"
                const showTime = shouldShowTime(msg, messages[index - 1])

                return (
                  <div key={msg.id}>
                    {/* 时间分隔 */}
                    {showTime && (
                      <div className="my-3 flex justify-center">
                        <span className="rounded-md bg-muted/80 px-2 py-0.5 text-[11px] text-muted-foreground">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    )}

                    {/* 消息气泡 */}
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex items-start gap-2 py-1",
                        isMe ? "flex-row-reverse" : "flex-row",
                      )}
                    >
                      {/* 头像 */}
                      <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                        <AvatarImage src={msg.sender.avatar || undefined} />
                        <AvatarFallback
                          className={cn(
                            "text-xs font-medium",
                            isAdmin
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                              : "",
                          )}
                        >
                          {(msg.sender.name || msg.sender.email)?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>

                      {/* 消息内容 */}
                      <div className={cn("max-w-[65%]", isMe ? "items-end" : "items-start")}>
                        {/* 昵称和角色 */}
                        {!isMe && (
                          <div className="mb-0.5 flex items-center gap-1 px-1">
                            <span
                              className={cn(
                                "text-xs font-medium",
                                isAdmin
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-muted-foreground",
                              )}
                            >
                              {msg.sender.name || msg.sender.email.split("@")[0]}
                            </span>
                            {isAdmin && (
                              <Badge
                                variant="secondary"
                                className="h-3.5 px-1 text-[9px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-0"
                              >
                                <Shield className="mr-0.5 h-2 w-2" />
                                {(t.chatAdmin as string) || "管理员"}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* 气泡 */}
                        <div
                          className={cn(
                            "relative rounded-xl px-3 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap shadow-sm",
                            isMe
                              ? "bg-[#95EC69] text-gray-900 dark:bg-[#2B8A3E] dark:text-white rounded-tr-sm"
                              : isAdmin
                                ? "bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900 rounded-tl-sm"
                                : "bg-white dark:bg-slate-800 rounded-tl-sm",
                          )}
                        >
                          {msg.content}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )
              })}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <div className="border-t bg-background px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={(t.chatPlaceholder as string) || "输入消息..."}
            className="max-h-32 min-h-[40px] flex-1 resize-none rounded-lg border bg-muted/50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = "auto"
              target.style.height = Math.min(target.scrollHeight, 128) + "px"
            }}
          />
          <Button
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            size="icon"
            className="h-10 w-10 shrink-0 rounded-lg"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
