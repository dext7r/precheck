"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { MessageSquare, Send, ArrowLeft, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

interface PrivateChatDetailProps {
  locale: Locale
  dict: Dictionary
  chatId: string
  currentUser: {
    id: string
    name: string | null
    role: string
    avatar: string | null
  }
}

type ChatMessage = {
  id: string
  content: string
  createdAt: string
  readAt: string | null
  sender: {
    id: string
    name: string | null
    email: string
    avatar: string | null
    role: string
  }
}

type ChatInfo = {
  id: string
  user: { id: string; name: string | null; email: string; avatar: string | null }
  admin: { id: string; name: string | null; email: string; avatar: string | null; role: string }
}

export function PrivateChatDetail({ locale, dict, chatId, currentUser }: PrivateChatDetailProps) {
  const router = useRouter()
  const [chat, setChat] = useState<ChatInfo | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const t = (dict.dashboard as Record<string, unknown>) || {}

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  const fetchChat = useCallback(async () => {
    try {
      const res = await fetch(`/api/private-chats/${chatId}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setChat(data)
    } catch {
      toast.error((t.privateChatDetailFetchFailed as string) || "Failed to fetch chat details")
      router.push(`/${locale}/dashboard/private-chats`)
    }
  }, [chatId, locale, router, t.privateChatDetailFetchFailed])

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/private-chats/${chatId}/messages`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setMessages(data.messages || [])
    } catch {
      // 静默失败
    } finally {
      setLoading(false)
    }
  }, [chatId])

  useEffect(() => {
    fetchChat()
    fetchMessages()
    const interval = setInterval(fetchMessages, 3000)
    return () => clearInterval(interval)
  }, [fetchChat, fetchMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const sendMessage = async () => {
    const content = input.trim()
    if (!content || sending) return
    setSending(true)
    setInput("")
    try {
      const res = await fetch(`/api/private-chats/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (!res.ok)
        throw new Error(data.error?.message || (t.chatSendFailed as string) || "Failed to send")
      setMessages((prev) => [...prev, data])
    } catch (err) {
      const message =
        err instanceof Error ? err.message : (t.chatSendFailed as string) || "Failed to send"
      toast.error(message)
      setInput(content)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const getOtherParty = () => {
    if (!chat) return null
    return chat.user.id === currentUser.id ? chat.admin : chat.user
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

  const shouldShowTime = (current: ChatMessage, previous: ChatMessage | undefined) => {
    if (!previous) return true
    const diff = new Date(current.createdAt).getTime() - new Date(previous.createdAt).getTime()
    return diff > 5 * 60 * 1000
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const otherParty = getOtherParty()

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 160px)" }}>
      {/* 头部 */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        {otherParty && (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={otherParty.avatar || undefined} />
              <AvatarFallback>
                {(otherParty.name || otherParty.email)?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-medium">
                  {otherParty.name || otherParty.email.split("@")[0]}
                </span>
                {"role" in otherParty && (
                  <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                    <Shield className="mr-0.5 h-2 w-2" />
                    {(t.chatAdmin as string) || "Admin"}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 消息区域 */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4"
        style={{ background: "var(--chat-bg, hsl(var(--muted) / 0.3))" }}
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="mb-2 h-10 w-10" />
            <p className="text-sm">
              {(t.privateChatsEmpty as string) || "No messages yet. Start the conversation!"}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg, index) => {
              const isMe = msg.sender.id === currentUser.id
              const isAdmin = msg.sender.role !== "USER"
              const showTime = shouldShowTime(msg, messages[index - 1])

              return (
                <div key={msg.id}>
                  {showTime && (
                    <div className="my-3 flex justify-center">
                      <span className="rounded-md bg-muted/80 px-2 py-0.5 text-[11px] text-muted-foreground">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  )}

                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex items-start gap-2 py-1",
                      isMe ? "flex-row-reverse" : "flex-row",
                    )}
                  >
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

                    <div className={cn("max-w-[70%]", isMe ? "items-end" : "items-start")}>
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
