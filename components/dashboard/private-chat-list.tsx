"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { MessageSquare, Shield } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

interface PrivateChatListProps {
  locale: Locale
  dict: Dictionary
  currentUser: {
    id: string
    name: string | null
    role: string
  }
}

type PrivateChatItem = {
  id: string
  updatedAt: string
  user: { id: string; name: string | null; email: string; avatar: string | null }
  admin: { id: string; name: string | null; email: string; avatar: string | null; role: string }
  messages: Array<{ content: string; senderId: string; createdAt: string; readAt: string | null }>
  unreadCount: number
}

export function PrivateChatList({ locale, dict, currentUser }: PrivateChatListProps) {
  const [chats, setChats] = useState<PrivateChatItem[]>([])
  const [loading, setLoading] = useState(true)

  const t = (dict.dashboard as Record<string, unknown>) || {}

  useEffect(() => {
    fetchChats()
  }, [])

  const fetchChats = async () => {
    try {
      const res = await fetch("/api/private-chats")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setChats(data.chats || [])
    } catch {
      toast.error((t.privateChatsFetchFailed as string) || "Failed to fetch private chats")
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return (t.timeJustNow as string) || "Just now"
    if (diffMins < 60)
      return ((t.timeMinutesAgo as string) || "{n} min ago").replace("{n}", String(diffMins))
    if (diffHours < 24)
      return ((t.timeHoursAgo as string) || "{n}h ago").replace("{n}", String(diffHours))
    if (diffDays < 7)
      return ((t.timeDaysAgo as string) || "{n}d ago").replace("{n}", String(diffDays))
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{(t.privateChats as string) || "Private Messages"}</h1>
        <p className="text-muted-foreground">
          {(t.privateChatsDesc as string) || "Private conversations with admins"}
        </p>
      </div>

      {chats.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              {(t.noPrivateChats as string) || "No private messages"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {(t.privateChatsHint as string) ||
                "Right-click an admin's message in chat room to start a private conversation"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {chats.map((chat, index) => {
            // 显示对方的信息：如果当前用户是 user，显示 admin；否则显示 user
            const other = chat.user.id === currentUser.id ? chat.admin : chat.user
            const isOtherAdmin =
              "role" in other && (other.role === "ADMIN" || other.role === "SUPER_ADMIN")
            const lastMsg = chat.messages[0]

            return (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Link href={`/${locale}/dashboard/private-chats/${chat.id}`}>
                  <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/20">
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={other.avatar || undefined} />
                          <AvatarFallback>
                            {(other.name || other.email)?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        {chat.unreadCount > 0 && (
                          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs text-white">
                            {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {other.name || other.email.split("@")[0]}
                          </span>
                          {isOtherAdmin && (
                            <Badge
                              variant="secondary"
                              className="h-4 px-1 text-[9px] shrink-0 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                            >
                              <Shield className="mr-0.5 h-2 w-2" />
                              {(t.chatAdmin as string) || "Admin"}
                            </Badge>
                          )}
                        </div>
                        {lastMsg && (
                          <p
                            className={cn(
                              "text-sm truncate mt-0.5",
                              chat.unreadCount > 0
                                ? "text-foreground font-medium"
                                : "text-muted-foreground",
                            )}
                          >
                            {lastMsg.senderId === currentUser.id && `${(t.me as string) || "Me"}: `}
                            {lastMsg.content}
                          </p>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground shrink-0">
                        {formatTime(chat.updatedAt)}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
