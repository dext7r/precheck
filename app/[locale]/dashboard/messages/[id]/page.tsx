"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { PostContent } from "@/components/posts/post-content"
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config"
import { getDictionary } from "@/lib/i18n/get-dictionary"

interface MessageDetail {
  id: string
  title: string
  content: string
  createdAt: string
  readAt: string | null
}

export default function MessageDetailPage() {
  const router = useRouter()
  const params = useParams<{ locale?: string | string[]; id?: string | string[] }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<"" | "not_found" | "fetch_failed">("")
  const [message, setMessage] = useState<MessageDetail | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dict, setDict] = useState<any>(null)

  const rawLocale = Array.isArray(params.locale) ? params.locale[0] : params.locale
  const normalizedLocale = rawLocale?.split("/")[0] || defaultLocale
  const locale = locales.includes(normalizedLocale as Locale)
    ? (normalizedLocale as Locale)
    : defaultLocale
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id
  const messageId = typeof rawId === "string" ? rawId : ""

  useEffect(() => {
    getDictionary(locale).then(setDict)
  }, [locale])

  useEffect(() => {
    if (!messageId) return

    const fetchMessage = async () => {
      try {
        const res = await fetch(`/api/dashboard/messages/${messageId}`)
        if (!res.ok) {
          setError(res.status === 404 ? "not_found" : "fetch_failed")
          return
        }
        const data = await res.json()
        setMessage(data)
      } catch (err) {
        setError("fetch_failed")
      } finally {
        setLoading(false)
      }
    }

    fetchMessage()
  }, [messageId])

  useEffect(() => {
    if (!messageId) return
    fetch(`/api/dashboard/messages/${messageId}/read`, { method: "POST" }).catch(() => null)
  }, [messageId])

  if (!dict) return null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{dict.dashboard.loading}</p>
      </div>
    )
  }

  if (error || !message) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {dict.dashboard.back}
        </Button>
        <p className="text-sm text-destructive">
          {error === "not_found" ? dict.dashboard.messageNotFound : dict.dashboard.fetchFailed}
        </p>
      </div>
    )
  }

  return (
    <motion.div
      key={messageId}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4">
        <Link href={`/${locale}/dashboard/messages`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{message.title}</h1>
          <p className="mt-1 text-muted-foreground">
            {new Date(message.createdAt).toLocaleString(locale)}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <PostContent content={message.content} emptyMessage={dict.dashboard.previewEmpty} />
      </div>
    </motion.div>
  )
}
