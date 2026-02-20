"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  Send,
  Shield,
  MessageCircle,
  Reply,
  X,
  Copy,
  Trash2,
  MessageSquare,
  ChevronDown,
  ImageIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
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
  replyTo?: {
    id: string
    content: string
    deletedAt?: string | null
    sender: { id: string; name: string | null; email: string }
  } | null
}

export function ChatRoom({ locale, dict, currentUser }: ChatRoomProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [replyTo, setReplyTo] = useState<ChatMsg | null>(null)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const [hasNewMessages, setHasNewMessages] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const prevMessageCountRef = useRef(0)
  const isInitialLoadRef = useRef(true)

  const t = (dict.dashboard as Record<string, unknown>) || {}

  const compressImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const MAX = 800
          let { width, height } = img
          if (width > MAX || height > MAX) {
            if (width > height) {
              height = Math.round((height * MAX) / width)
              width = MAX
            } else {
              width = Math.round((width * MAX) / height)
              height = MAX
            }
          }
          const canvas = document.createElement("canvas")
          canvas.width = width
          canvas.height = height
          canvas.getContext("2d")!.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL("image/jpeg", 0.7))
        }
        img.onerror = reject
        img.src = e.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const getDisplayContent = (content: string) => {
    const label = (t.chatImage as string) || "[图片]"
    return content.replace(/!\[\]\(data:image\/[^)]+\)/g, label).trim()
  }

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior })
    setHasNewMessages(false)
  }, [])

  const checkIfNearBottom = useCallback(() => {
    const container = containerRef.current
    if (!container) return true
    const threshold = 100
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold
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
    const newCount = messages.length
    const prevCount = prevMessageCountRef.current

    if (newCount > prevCount) {
      if (isInitialLoadRef.current) {
        // 首次加载直接跳到底部
        scrollToBottom("instant")
        isInitialLoadRef.current = false
      } else if (isNearBottom) {
        scrollToBottom()
      } else {
        setHasNewMessages(true)
      }
    }
    prevMessageCountRef.current = newCount
  }, [messages, isNearBottom, scrollToBottom])

  const handleScroll = useCallback(() => {
    setIsNearBottom(checkIfNearBottom())
  }, [checkIfNearBottom])

  const sendMessage = async () => {
    const text = input.trim()
    const img = imagePreview
    if ((!text && !img) || sending) return
    const content = img ? (text ? `${text}\n\n![](${img})` : `![](${img})`) : text
    setSending(true)
    setInput("")
    setImagePreview(null)
    const currentReplyTo = replyTo
    setReplyTo(null)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          replyToId: currentReplyTo?.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || (t.chatSendFailed as string) || "Failed to send")
      }
      setMessages((prev) => [...prev, data])
    } catch (err) {
      const message =
        err instanceof Error ? err.message : (t.chatSendFailed as string) || "Failed to send"
      toast.error(message)
      setInput(text)
      setReplyTo(currentReplyTo)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleReply = (msg: ChatMsg) => {
    setReplyTo(msg)
    inputRef.current?.focus()
  }

  const handleCopy = (content: string) => {
    const selected = window.getSelection()?.toString().trim()
    navigator.clipboard.writeText(selected || content)
    toast.success((t.chatCopySuccess as string) || "Copied")
  }

  const handleRecall = async (msg: ChatMsg) => {
    try {
      const res = await fetch("/api/chat", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: msg.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || (t.chatRecallFailed as string) || "Failed to recall")
      }
      setMessages((prev) => prev.filter((m) => m.id !== msg.id))
      toast.success((t.chatRecallSuccess as string) || "Message recalled")
    } catch (err) {
      const message =
        err instanceof Error ? err.message : (t.chatRecallFailed as string) || "Failed to recall"
      toast.error(message)
    }
  }

  const handlePrivateMessage = async (msg: ChatMsg) => {
    if (msg.sender.role === "USER") {
      toast.error((t.chatOnlyAdminPrivate as string) || "You can only message admins")
      return
    }
    try {
      const res = await fetch("/api/private-chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: msg.sender.id }),
      })
      const data = await res.json()
      if (!res.ok)
        throw new Error(
          data.error?.message || (t.chatCreateChatFailed as string) || "Failed to create chat",
        )
      router.push(`/${locale}/dashboard/private-chats/${data.chatId}`)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : (t.chatCreateChatFailed as string) || "Failed to create chat"
      toast.error(message)
    }
  }

  const canRecall = (msg: ChatMsg) => {
    const isCurrentUserAdmin = currentUser.role === "ADMIN" || currentUser.role === "SUPER_ADMIN"
    // 管理员可撤回任意消息
    if (isCurrentUserAdmin) return true
    // 普通用户只能撤回自己 2 分钟内的消息
    if (msg.sender.id !== currentUser.id) return false
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000
    return new Date(msg.createdAt).getTime() > twoMinutesAgo
  }

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      el.classList.add("bg-primary/10")
      setTimeout(() => el.classList.remove("bg-primary/10"), 1500)
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

  const getSenderName = (sender: { name: string | null; email: string }) => {
    return sender.name || sender.email.split("@")[0]
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-120px)] sm:h-[calc(100vh-160px)] min-w-0 overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between border-b px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h1 className="text-base sm:text-lg font-semibold">{(t.chat as string) || "聊天室"}</h1>
        </div>
      </div>

      {/* 消息区域 */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto px-2 py-3 sm:px-4 sm:py-4"
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
                const showRecall = canRecall(msg)

                return (
                  <div key={msg.id} id={`msg-${msg.id}`} className="transition-colors duration-300">
                    {/* 时间分隔 */}
                    {showTime && (
                      <div className="my-3 flex justify-center">
                        <span className="rounded-md bg-muted/80 px-2 py-0.5 text-[11px] text-muted-foreground">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    )}

                    {/* 消息气泡 */}
                    <ContextMenu>
                      <ContextMenuTrigger asChild>
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
                          <div
                            className={cn(
                              "max-w-[80%] sm:max-w-[65%] min-w-0",
                              isMe ? "items-end" : "items-start",
                            )}
                          >
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
                                  {getSenderName(msg.sender)}
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
                                "relative rounded-xl px-3 py-2 text-sm leading-relaxed break-all whitespace-pre-wrap shadow-sm overflow-hidden",
                                isMe
                                  ? "bg-[#95EC69] text-gray-900 dark:bg-[#2B8A3E] dark:text-white rounded-tr-sm"
                                  : isAdmin
                                    ? "bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900 rounded-tl-sm"
                                    : "bg-white dark:bg-slate-800 rounded-tl-sm",
                              )}
                            >
                              {/* 引用显示 */}
                              {msg.replyTo && (
                                <div
                                  onClick={() =>
                                    !msg.replyTo?.deletedAt && scrollToMessage(msg.replyTo!.id)
                                  }
                                  className={cn(
                                    "mb-2 rounded-md px-2 py-1.5 text-xs border-l-2",
                                    msg.replyTo.deletedAt
                                      ? "opacity-50 cursor-default"
                                      : "cursor-pointer",
                                    isMe
                                      ? "bg-black/10 border-black/30 dark:bg-white/10 dark:border-white/30"
                                      : "bg-muted/50 border-muted-foreground/30",
                                  )}
                                >
                                  <p className="font-medium opacity-70">
                                    {getSenderName(msg.replyTo.sender)}
                                  </p>
                                  <p className="line-clamp-2 opacity-60">
                                    {msg.replyTo.deletedAt
                                      ? (t.chatRecalled as string) || "Message recalled"
                                      : getDisplayContent(msg.replyTo.content)}
                                  </p>
                                </div>
                              )}
                              {msg.content.includes("![](data:image/") ? (
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    img: ({ src, alt }) => (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={src}
                                        alt={alt || ""}
                                        className="max-w-full rounded-lg mt-1 cursor-pointer"
                                        style={{ maxHeight: 300 }}
                                        onClick={() => typeof src === "string" && window.open(src, "_blank")}
                                      />
                                    ),
                                    p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                                    a: ({ href, children }) => (
                                      <a href={href} target="_blank" rel="noopener noreferrer" className="underline opacity-80 hover:opacity-100">{children}</a>
                                    ),
                                    code: ({ children, className }) =>
                                      className ? (
                                        <code className="block bg-black/10 dark:bg-white/10 rounded px-2 py-1 text-xs font-mono overflow-x-auto">{children}</code>
                                      ) : (
                                        <code className="bg-black/10 dark:bg-white/10 rounded px-1 text-xs font-mono">{children}</code>
                                      ),
                                    pre: ({ children }) => <pre className="my-1 overflow-x-auto">{children}</pre>,
                                  }}
                                >
                                  {msg.content}
                                </ReactMarkdown>
                              ) : (
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                                    a: ({ href, children }) => (
                                      <a href={href} target="_blank" rel="noopener noreferrer" className="underline opacity-80 hover:opacity-100">{children}</a>
                                    ),
                                    code: ({ children, className }) =>
                                      className ? (
                                        <code className="block bg-black/10 dark:bg-white/10 rounded px-2 py-1 text-xs font-mono overflow-x-auto">{children}</code>
                                      ) : (
                                        <code className="bg-black/10 dark:bg-white/10 rounded px-1 text-xs font-mono">{children}</code>
                                      ),
                                    pre: ({ children }) => <pre className="my-1 overflow-x-auto">{children}</pre>,
                                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                    em: ({ children }) => <em className="italic">{children}</em>,
                                  }}
                                >
                                  {msg.content}
                                </ReactMarkdown>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onClick={() => handleReply(msg)}>
                          <Reply className="mr-2 h-4 w-4" />
                          {(t.chatReply as string) || "Reply"}
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => handleCopy(msg.content)}>
                          <Copy className="mr-2 h-4 w-4" />
                          {(t.chatCopy as string) || "Copy"}
                        </ContextMenuItem>
                        {!isMe && isAdmin && (
                          <ContextMenuItem onClick={() => handlePrivateMessage(msg)}>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            {(t.chatPrivateMsg as string) || "Private Message"}
                          </ContextMenuItem>
                        )}
                        {showRecall && (
                          <>
                            <ContextMenuSeparator />
                            <ContextMenuItem
                              onClick={() => handleRecall(msg)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {(t.chatRecall as string) || "Recall"}
                            </ContextMenuItem>
                          </>
                        )}
                      </ContextMenuContent>
                    </ContextMenu>
                  </div>
                )
              })}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* 新消息提示 */}
        <AnimatePresence>
          {hasNewMessages && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="sticky bottom-2 flex justify-center"
            >
              <Button
                size="sm"
                onClick={() => scrollToBottom()}
                className="rounded-full shadow-lg gap-1 h-8 px-3"
              >
                <ChevronDown className="h-4 w-4" />
                {(t.chatNewMessages as string) || "新消息"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 图片预览条 */}
      {imagePreview && (
        <div className="flex items-center gap-2 border-t bg-muted/50 px-4 py-2">
          <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="" className="h-16 rounded-md object-cover" />
            <Button
              variant="secondary"
              size="icon"
              className="absolute -right-2 -top-2 h-5 w-5 rounded-full"
              onClick={() => setImagePreview(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* 引用预览 */}
      {replyTo && (
        <div className="flex items-center gap-2 border-t bg-muted/50 px-4 py-2">
          <Reply className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              {(t.chatReply as string) || "Reply"} {getSenderName(replyTo.sender)}
            </p>
            <p className="text-xs text-muted-foreground/70 truncate">{getDisplayContent(replyTo.content)}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => setReplyTo(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* 输入区域 */}
      <div className="border-t bg-background px-2 py-2 sm:px-4 sm:py-3 pb-safe">
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
            onPaste={async (e) => {
              const file = Array.from(e.clipboardData.files).find((f) =>
                f.type.startsWith("image/"),
              )
              if (!file) return
              e.preventDefault()
              try {
                const compressed = await compressImage(file)
                setImagePreview(compressed)
              } catch {
                toast.error((t.chatImageFailed as string) || "图片处理失败")
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
            disabled={sending || (!input.trim() && !imagePreview)}
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
