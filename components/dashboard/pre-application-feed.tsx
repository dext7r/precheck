"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Archive,
  Eye,
  PauseCircle,
  User,
  Mail,
  Globe,
  CalendarDays,
  RefreshCw,
  Send,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

interface FeedItem {
  status: string
  userName: string
  registerEmail: string
  source: string | null
  codeSent: boolean
  createdAt: string
  updatedAt: string
  reviewedAt: string | null
}

interface PreApplicationFeedProps {
  locale: Locale
  dict: Dictionary
}

const sourceLabels: Record<string, Record<string, string>> = {
  zh: {
    TIEBA: "贴吧",
    BILIBILI: "B站",
    DOUYIN: "抖音",
    XIAOHONGSHU: "小红书",
    OTHER: "其他",
  },
  en: {
    TIEBA: "Tieba",
    BILIBILI: "Bilibili",
    DOUYIN: "Douyin",
    XIAOHONGSHU: "Xiaohongshu",
    OTHER: "Other",
  },
}

export function PreApplicationFeed({ locale, dict }: PreApplicationFeedProps) {
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const d = dict.dashboard as Record<string, unknown>

  useEffect(() => {
    fetch("/api/pre-application-feed")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setItems(data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const statusConfig: Record<
    string,
    { label: string; className: string; icon: typeof Clock }
  > = {
    PENDING: {
      label: (d.feedPending as string) || "待审核",
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      icon: Clock,
    },
    APPROVED: {
      label: (d.feedApproved as string) || "已通过",
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      icon: CheckCircle2,
    },
    REJECTED: {
      label: (d.feedRejected as string) || "已驳回",
      className: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
      icon: XCircle,
    },
    DISPUTED: {
      label: (d.feedDisputed as string) || "有争议",
      className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      icon: AlertTriangle,
    },
    ARCHIVED: {
      label: (d.feedArchived as string) || "已归档",
      className: "bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-400",
      icon: Archive,
    },
    PENDING_REVIEW: {
      label: (d.feedPendingReview as string) || "待复核",
      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      icon: Eye,
    },
    ON_HOLD: {
      label: (d.feedOnHold as string) || "暂缓处理",
      className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      icon: PauseCircle,
    },
  }

  const formatTime = (iso: string) => {
    const date = new Date(iso)
    return date.toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Archive className="mb-3 h-10 w-10 opacity-40" />
        <p>{(d.feedEmpty as string) || "暂无申请记录"}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const cfg = statusConfig[item.status] || statusConfig.PENDING
        const Icon = cfg.icon
        const srcLabel = item.source
          ? (sourceLabels[locale] || sourceLabels.zh)[item.source] || item.source
          : null

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.25 }}
          >
            <Card className="transition-colors hover:bg-muted/30">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* 左侧：用户信息 */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.userName}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{item.registerEmail}</span>
                      </div>
                    </div>
                  </div>

                  {/* 右侧：状态 + 元信息 */}
                  <div className="flex flex-wrap items-center gap-2">
                    {srcLabel && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Globe className="h-3 w-3" />
                        {srcLabel}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      {formatTime(item.createdAt)}
                    </span>
                    {item.updatedAt !== item.createdAt && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <RefreshCw className="h-3 w-3" />
                        {formatTime(item.updatedAt)}
                      </span>
                    )}
                    {item.reviewedAt && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        {formatTime(item.reviewedAt)}
                      </span>
                    )}
                    {item.status === "APPROVED" && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-xs",
                          item.codeSent ? "text-emerald-600" : "text-muted-foreground",
                        )}
                      >
                        <Send className="h-3 w-3" />
                        {item.codeSent
                          ? (d.feedCodeSent as string) || "已发码"
                          : (d.feedCodeNotSent as string) || "未发码"}
                      </span>
                    )}
                    <Badge className={cn("gap-1 text-xs font-medium", cfg.className)}>
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
