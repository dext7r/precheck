"use client"

import { useState, useEffect, useMemo } from "react"
import { getDictionary, type Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { MessagesTable } from "@/components/dashboard/messages-table"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { motion } from "framer-motion"
import { PostContent } from "@/components/posts/post-content"
import { ArrowLeft, Mail, Inbox, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer"

interface MessagesPageProps {
  params: Promise<{ locale: Locale }>
}

interface MessageDetail {
  id: string
  title: string
  content: string
  createdAt: string
  readAt: string | null
}

export default function MessagesPage({ params }: MessagesPageProps) {
  const [locale, setLocale] = useState<Locale>("en")
  const [dict, setDict] = useState<Dictionary | null>(null)
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const [selectedMessage, setSelectedMessage] = useState<MessageDetail | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    params.then(({ locale: l }) => {
      setLocale(l)
      getDictionary(l).then(setDict)
    })
  }, [params])

  useEffect(() => {
    if (!selectedMessageId) {
      return
    }

    let cancelled = false

    const fetchMessage = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/dashboard/messages/${selectedMessageId}`)
        const data = await res.json()
        if (!cancelled) {
          setSelectedMessage(data)
          setLoading(false)
          await fetch(`/api/dashboard/messages/${selectedMessageId}/read`, { method: "POST" })
        }
      } catch {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchMessage()

    return () => {
      cancelled = true
    }
  }, [selectedMessageId])

  const handleSelectMessage = (id: string) => {
    setSelectedMessageId(id)
    if (window.innerWidth < 1024) {
      setDrawerOpen(true)
    }
  }

  const handleCloseDetail = () => {
    setSelectedMessageId(null)
    setSelectedMessage(null)
    setDrawerOpen(false)
  }

  const messageDetailContent = useMemo(() => {
    if (loading) {
      return (
        <div className="flex h-full items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{dict?.dashboard.loading}</p>
          </div>
        </div>
      )
    }

    if (!selectedMessage) {
      return (
        <div className="flex h-full flex-col items-center justify-center py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mb-4">
            <Inbox className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-muted-foreground">{dict?.dashboard.selectMessageToView}</p>
        </div>
      )
    }

    return (
      <motion.div
        key={selectedMessageId}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-4"
      >
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCloseDetail}
            className="hidden lg:flex shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl lg:text-2xl font-bold leading-tight">{selectedMessage.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(selectedMessage.createdAt).toLocaleString(locale)}
            </p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 lg:p-6">
          <PostContent
            content={selectedMessage.content}
            emptyMessage={dict?.dashboard.previewEmpty || ""}
          />
        </div>
      </motion.div>
    )
  }, [loading, selectedMessage, selectedMessageId, locale, dict])

  if (!dict) return null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
            <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">{dict.dashboard.messages}</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">{dict.dashboard.inbox}</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5 }}
          >
            <Badge
              variant="destructive"
              className="h-7 px-3 text-sm font-semibold shadow-lg shadow-destructive/25"
            >
              {unreadCount} {locale === "zh" ? "未读" : "unread"}
            </Badge>
          </motion.div>
        )}
      </div>

      {/* 桌面端双栏布局 */}
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        {/* 消息列表 */}
        <div className="relative">
          <ScrollArea className="h-[calc(100vh-14rem)] rounded-xl border bg-card/50 shadow-sm">
            <MessagesTable
              locale={locale}
              dict={dict}
              onSelectMessage={handleSelectMessage}
              selectedMessageId={selectedMessageId}
              onUnreadCountChange={setUnreadCount}
            />
          </ScrollArea>
        </div>

        {/* 桌面端消息详情 */}
        <div className="hidden lg:block">
          <div className="sticky top-4 rounded-xl border bg-card/50 p-6 shadow-sm min-h-[calc(100vh-14rem)]">
            {messageDetailContent}
          </div>
        </div>
      </div>

      {/* 移动端抽屉 */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-lg">
                {selectedMessage?.title || dict.dashboard.messages}
              </DrawerTitle>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>
          <ScrollArea className="flex-1 p-4">{messageDetailContent}</ScrollArea>
        </DrawerContent>
      </Drawer>
    </motion.div>
  )
}
