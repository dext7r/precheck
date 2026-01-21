"use client"

import { useState, useEffect } from "react"
import { getDictionary, type Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { MessagesTable } from "@/components/dashboard/messages-table"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { motion } from "framer-motion"
import { PostContent } from "@/components/posts/post-content"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

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

  useEffect(() => {
    params.then(({ locale: l }) => {
      setLocale(l)
      getDictionary(l).then(setDict)
    })
  }, [params])

  useEffect(() => {
    if (!selectedMessageId) return

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
      } catch (error) {
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

  if (!dict) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{dict.dashboard.messages}</h1>
          <p className="mt-1 text-muted-foreground">{dict.dashboard.inbox}</p>
        </div>
        {unreadCount > 0 && (
          <Badge variant="destructive" className="h-6 px-2">
            {unreadCount}
          </Badge>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <ScrollArea className="h-[calc(100vh-12rem)] rounded-lg border">
          <MessagesTable
            locale={locale}
            dict={dict}
            onSelectMessage={setSelectedMessageId}
            selectedMessageId={selectedMessageId}
            onUnreadCountChange={setUnreadCount}
          />
        </ScrollArea>
        <div className="hidden lg:block">
          {selectedMessage ? (
            <motion.div
              key={selectedMessageId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => setSelectedMessageId(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="text-2xl font-bold">{selectedMessage.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedMessage.createdAt).toLocaleString(locale)}
                  </p>
                </div>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <PostContent
                  content={selectedMessage.content}
                  emptyMessage={dict.dashboard.previewEmpty}
                />
              </div>
            </motion.div>
          ) : loading ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">{dict.dashboard.loading}</p>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">{dict.dashboard.selectMessageToView}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
