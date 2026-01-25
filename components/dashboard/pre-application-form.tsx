"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { PostContent } from "@/components/posts/post-content"
import {
  Copy,
  Check,
  History,
  FileText,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ClipboardList,
  Loader2,
  Users,
  Heart,
} from "lucide-react"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { ApiErrorKeys } from "@/lib/api/error-keys"
import { resolveApiErrorMessage } from "@/lib/api/error-message"
import { preApplicationGroups, preApplicationSources } from "@/lib/pre-application/constants"
import { EmailWithDomainInput } from "@/components/ui/email-with-domain-input"
import { useAllowedEmailDomains } from "@/lib/hooks/use-allowed-email-domains"
import { cn } from "@/lib/utils"

type PreApplicationVersion = {
  id: string
  version: number
  essay: string
  source: string | null
  sourceDetail: string | null
  registerEmail: string
  group: string
  status: string
  createdAt: string
}

type PreApplicationRecord = {
  id: string
  essay: string
  source: string | null
  sourceDetail: string | null
  registerEmail: string
  queryToken: string | null
  group: string
  status: "PENDING" | "APPROVED" | "REJECTED" | "DISPUTED" | "ARCHIVED"
  guidance: string | null
  reviewedAt: string | null
  updatedAt: string
  createdAt: string
  version: number
  resubmitCount: number
  reviewedBy: { id: string; name: string | null; email: string } | null
  inviteCode: {
    id: string
    code: string
    expiresAt: string | null
    usedAt: string | null
    assignedAt: string | null
  } | null
  versions?: PreApplicationVersion[]
}

interface PreApplicationFormProps {
  locale: Locale
  dict: Dictionary
  initialRecords?: PreApplicationRecord[]
  maxResubmitCount?: number
  userEmail?: string
}

// Loading Skeleton 组件
function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
      </div>
      <Card className="border-0 shadow-md">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>
          <Skeleton className="h-10 w-28 rounded-lg" />
        </CardContent>
      </Card>
    </div>
  )
}

export function PreApplicationForm({
  locale,
  dict,
  initialRecords,
  maxResubmitCount: initialMaxResubmit = 3,
  userEmail,
}: PreApplicationFormProps) {
  const router = useRouter()
  const t = dict.preApplication
  const emailSuffixPlaceholder = t.emailSuffixPlaceholder ?? ""
  const essayMinChars = 50
  const [loading, setLoading] = useState(!initialRecords)
  const [submitting, setSubmitting] = useState(false)
  const [records, setRecords] = useState<PreApplicationRecord[]>(initialRecords || [])
  const [maxResubmitCount, setMaxResubmitCount] = useState(initialMaxResubmit)
  const [tokenCopied, setTokenCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<"form" | "history">("form")
  const [essayHint, setEssayHint] = useState(t.fields.essayHint)
  const [queueInfo, setQueueInfo] = useState<{
    totalPending: number
    position: number
    aheadCount: number
  } | null>(null)
  const allowedDomains = useAllowedEmailDomains()
  const [formData, setFormData] = useState({
    essay: "",
    source: "",
    sourceDetail: "",
    registerEmail: userEmail || "",
    group: "GROUP_ONE",
  })

  const allowedDomainsText = useMemo(() => {
    const joiner = locale === "zh" ? "、" : ", "
    return allowedDomains.join(joiner)
  }, [locale, allowedDomains])

  const latest = records[0] ?? null
  const isEditing = Boolean(latest)
  const hasReviewInfo = Boolean(
    latest?.reviewedAt || latest?.reviewedBy || latest?.guidance || latest?.inviteCode,
  )
  const remainingResubmits = latest
    ? maxResubmitCount - (latest.resubmitCount || 0)
    : maxResubmitCount
  const canResubmit = latest?.status === "REJECTED" && remainingResubmits > 0
  // DISPUTED 状态且没有邀请码时可以修改
  const canEditDisputed = latest?.status === "DISPUTED" && !latest?.inviteCode

  const loadRecord = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/pre-application")
      if (!res.ok) throw new Error(t.loadFailed)
      const data = await res.json()
      const nextRecords = data.records || []
      setRecords(nextRecords)
      if (data.maxResubmitCount) setMaxResubmitCount(data.maxResubmitCount)
      if (data.queueInfo) setQueueInfo(data.queueInfo)
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("pre-application:updated", {
            detail: { count: nextRecords.length },
          }),
        )
      }
    } catch (error) {
      console.error("Pre-application load error:", error)
      toast.error(t.loadFailed)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!initialRecords) loadRecord()
  }, [])

  useEffect(() => {
    const loadSystemConfig = async () => {
      try {
        const res = await fetch("/api/public/system-config")
        if (res.ok) {
          const data = await res.json()
          if (data.preApplicationEssayHint) {
            setEssayHint(data.preApplicationEssayHint)
          }
        }
      } catch (error) {
        console.error("Failed to load system config:", error)
      }
    }
    loadSystemConfig()
  }, [])

  useEffect(() => {
    if (!latest || latest.status === "APPROVED") return
    setFormData({
      essay: latest.essay || "",
      source: latest.source || "",
      sourceDetail: latest.sourceDetail || "",
      registerEmail: latest.registerEmail || "",
      group: latest.group || "GROUP_ONE",
    })
  }, [latest?.id])

  useEffect(() => {
    if (formData.source !== "OTHER" && formData.sourceDetail) {
      setFormData((prev) => ({ ...prev, sourceDetail: "" }))
    }
  }, [formData.source, formData.sourceDetail])

  const statusConfig: Record<
    PreApplicationRecord["status"],
    { label: string; icon: typeof Clock; color: string; bg: string }
  > = {
    PENDING: {
      label: t.status.pending,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    },
    APPROVED: {
      label: t.status.approved,
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    REJECTED: {
      label: t.status.rejected,
      icon: XCircle,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-500/10",
    },
    DISPUTED: {
      label: t.status.disputed || "待补充",
      icon: HelpCircle,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-500/10",
    },
    ARCHIVED: {
      label: t.status.archived || "已归档",
      icon: Clock,
      color: "text-slate-600 dark:text-slate-400",
      bg: "bg-slate-500/10",
    },
  }

  const StatusBadge = ({ status }: { status: PreApplicationRecord["status"] }) => {
    const config = statusConfig[status] || statusConfig.PENDING
    const Icon = config.icon
    return (
      <Badge
        variant="secondary"
        className={cn("gap-1.5 px-2.5 py-1 font-medium", config.bg, config.color)}
      >
        <Icon className="h-3.5 w-3.5" />
        {config.label}
      </Badge>
    )
  }

  const getSourceLabel = (value: string | null) => {
    if (!value) return t.fields.sourceOptional
    const item = preApplicationSources.find((source) => source.value === value)
    if (!item) return value
    const key = item.labelKey.split(".").pop() || ""
    return (t.sources as Record<string, string>)[key] || value
  }

  const getGroupLabel = (value: string) => {
    const item = preApplicationGroups.find((group) => group.value === value)
    if (!item) return value
    const key = item.labelKey.split(".").pop() || ""
    return (t.groups as Record<string, string>)[key] || value
  }

  const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleString(locale) : "-"

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (latest?.status === "APPROVED") {
        toast.error(t.alreadySubmitted)
        return
      }

      // 检查重新提交次数（仅 REJECTED 状态）
      if (latest?.status === "REJECTED" && remainingResubmits <= 0) {
        toast.error(t.maxResubmitExceeded || `已达到最大重新提交次数限制 (${maxResubmitCount} 次)`)
        return
      }

      // 选择其他平台时必须填写说明
      if (formData.source === "OTHER" && !formData.sourceDetail.trim()) {
        toast.error(t.validation.sourceDetailRequired)
        return
      }

      const method = latest ? "PUT" : "POST"
      const res = await fetch("/api/pre-application", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          essay: formData.essay,
          source: formData.source || null,
          sourceDetail: formData.source === "OTHER" ? formData.sourceDetail : null,
          registerEmail: formData.registerEmail,
          group: formData.group,
          version: latest?.version,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message = resolveApiErrorMessage(data, dict) ?? t.submitFailed
        const errorObject = data?.error
        const errorCode =
          errorObject && typeof errorObject === "object" && typeof errorObject.code === "string"
            ? errorObject.code
            : undefined
        if (res.status === 409 && errorCode === ApiErrorKeys.preApplication.versionConflict) {
          toast.error(message)
          await loadRecord()
          return
        }
        toast.error(message)
        return
      }

      toast.success(method === "PUT" ? t.updateSuccess : t.submitSuccess)
      await loadRecord()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.submitFailed)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <FormSkeleton />

  const hasHistory = latest?.versions && latest.versions.length > 1
  // 显示表单的条件：无记录、PENDING、可重新提交的REJECTED、可修改的DISPUTED
  const showForm = !latest || latest.status === "PENDING" || canResubmit || canEditDisputed

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25"
        >
          <ClipboardList className="h-6 w-6 text-white" />
        </motion.div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.description}</p>
        </div>
      </div>

      {/* PENDING 状态 - 排队信息和温馨提示 */}
      {latest?.status === "PENDING" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* 排队信息卡片 */}
          {queueInfo && (
            <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-transparent p-4 dark:border-blue-900/50 dark:from-blue-950/30">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-blue-800 dark:text-blue-200">
                  {(t as unknown as Record<string, string>).queueTitle || "排队信息"}
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-lg bg-blue-100/50 dark:bg-blue-900/20 p-2 text-center">
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {queueInfo.position}
                    </p>
                    <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
                      {(t as unknown as Record<string, string>).yourPosition || "您的位置"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-blue-100/50 dark:bg-blue-900/20 p-2 text-center">
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {queueInfo.aheadCount}
                    </p>
                    <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
                      {(t as unknown as Record<string, string>).aheadOfYou || "前面还有"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-blue-100/50 dark:bg-blue-900/20 p-2 text-center">
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {queueInfo.totalPending}
                    </p>
                    <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
                      {(t as unknown as Record<string, string>).totalPending || "总待审核"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 温馨提示 */}
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-transparent p-4 dark:border-amber-900/50 dark:from-amber-950/30">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
              <Heart className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-sm">
              <p className="font-semibold text-amber-800 dark:text-amber-200">
                {(t as unknown as Record<string, string>).warmTipTitle || "温馨提示"}
              </p>
              <p className="mt-1 text-amber-700 dark:text-amber-300 leading-relaxed">
                {(t as unknown as Record<string, string>).warmTipMessage ||
                  "感谢您的耐心等待！我们正在认真审核每一份申请，通常会在 1-3 个工作日内完成。审核结果会通过站内信和邮件通知您，请留意查收。"}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* 状态警告 */}
      {latest?.status === "REJECTED" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 to-transparent p-4 dark:border-rose-900/50 dark:from-rose-950/30"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10">
            <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-sm">
            <p className="font-semibold text-rose-800 dark:text-rose-200">
              {t.resubmitWarningTitle || "申请已被驳回"}
            </p>
            <p className="mt-0.5 text-rose-700 dark:text-rose-300">
              {canResubmit
                ? (t.resubmitRemaining || "您还可以重新提交 {count} 次").replace(
                    "{count}",
                    String(remainingResubmits),
                  )
                : t.maxResubmitExceeded || "已达到最大重新提交次数限制"}
            </p>
          </div>
        </motion.div>
      )}

      {/* DISPUTED 状态提示 */}
      {latest?.status === "DISPUTED" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-transparent p-4 dark:border-orange-900/50 dark:from-orange-950/30"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
            <HelpCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="text-sm">
            <p className="font-semibold text-orange-800 dark:text-orange-200">
              {t.disputedWarningTitle || "申请需要补充信息"}
            </p>
            <p className="mt-0.5 text-orange-700 dark:text-orange-300">
              {canEditDisputed
                ? t.disputedCanEdit || "请根据审核意见补充或修改您的申请内容"
                : t.disputedWithCode || "您的申请已关联邀请码，等待最终审核"}
            </p>
          </div>
        </motion.div>
      )}

      {latest && hasHistory ? (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "form" | "history")}>
          <TabsList className="mb-4 h-11 p-1 bg-muted/50">
            <TabsTrigger value="form" className="gap-2 data-[state=active]:shadow-sm">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">{t.currentApplication || "当前申请"}</span>
              <span className="sm:hidden">{locale === "zh" ? "申请" : "Form"}</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 data-[state=active]:shadow-sm">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">{t.versionHistory || "版本历史"}</span>
              <span className="sm:hidden">{locale === "zh" ? "历史" : "History"}</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {latest.versions?.length || 0}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <TabsContent value="form" asChild>
              <motion.div
                key="form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                {renderMainContent()}
              </motion.div>
            </TabsContent>

            <TabsContent value="history" asChild>
              <motion.div
                key="history"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                {renderVersionHistory()}
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      ) : (
        renderMainContent()
      )}
    </motion.div>
  )

  function renderMainContent() {
    return (
      <div className="space-y-6">
        {/* 审核信息卡片 */}
        {latest && hasReviewInfo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-md overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    {t.reviewInfoTitle}
                    <StatusBadge status={latest.status} />
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {t.submittedAt}：{formatDate(latest.createdAt)}
                    {latest.version > 1 && ` · v${latest.version}`}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-4 md:p-6 space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t.review.reviewer}</p>
                    <p className="font-medium">
                      {latest.reviewedBy?.name || latest.reviewedBy?.email || "-"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t.review.reviewedAt}</p>
                    <p className="font-medium">{formatDate(latest.reviewedAt)}</p>
                  </div>
                </div>

                {latest.guidance && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">{t.review.guidance}</p>
                    <div className="rounded-xl border bg-muted/30 p-4">
                      <PostContent content={latest.guidance} emptyMessage={t.review.guidance} />
                    </div>
                  </div>
                )}

                {latest.inviteCode && (
                  <div className="grid gap-4 sm:grid-cols-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                    <div className="space-y-1">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        {t.invite.code}
                      </p>
                      <p className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                        {latest.inviteCode.code}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        {t.invite.expiresAt}
                      </p>
                      <p className="font-medium text-emerald-700 dark:text-emerald-300">
                        {formatDate(latest.inviteCode.expiresAt)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        {t.invite.used}
                      </p>
                      <p className="font-medium text-emerald-700 dark:text-emerald-300">
                        {latest.inviteCode.usedAt ? t.invite.used : t.invite.unused}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 已提交信息卡片 */}
        {latest && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-md">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    {hasReviewInfo ? t.formInfoTitle : t.status.label}
                    {!hasReviewInfo && <StatusBadge status={latest.status} />}
                  </CardTitle>
                </div>
                <CardDescription>{t.submitted}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1 p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground">{t.fields.registerEmail}</p>
                    <p className="font-medium truncate">{latest.registerEmail}</p>
                  </div>
                  <div className="space-y-1 p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground">{t.fields.group}</p>
                    <p className="font-medium">{getGroupLabel(latest.group)}</p>
                  </div>
                  <div className="space-y-1 p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground">{t.fields.source}</p>
                    <p className="font-medium">{getSourceLabel(latest.source)}</p>
                  </div>
                  <div className="space-y-1 p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground">{t.fields.queryToken}</p>
                    {latest.queryToken ? (
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-medium tracking-wider text-sm">
                          {latest.queryToken}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={async () => {
                            try {
                              const queryUrl = `${window.location.origin}/${locale}/query-invite-codes?queryCode=${latest.queryToken}`
                              await navigator.clipboard.writeText(queryUrl)
                              setTokenCopied(true)
                              toast.success(t.queryTokenCopied || "查询链接已复制")
                              setTimeout(() => setTokenCopied(false), 2000)
                            } catch {
                              toast.error("复制失败")
                            }
                          }}
                        >
                          {tokenCopied ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => {
                            router.push(
                              `/${locale}/query-invite-codes?queryCode=${latest.queryToken}`,
                            )
                          }}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <p className="font-medium">-</p>
                    )}
                  </div>
                  {latest.sourceDetail && (
                    <div className="space-y-1 p-3 rounded-lg bg-muted/30 sm:col-span-2">
                      <p className="text-xs text-muted-foreground">{t.fields.sourceDetail}</p>
                      <p className="font-medium">{latest.sourceDetail}</p>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{t.fields.essay}</p>
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <PostContent content={latest.essay} emptyMessage={essayHint} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 编辑/提交表单 */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">
                  {latest?.status === "REJECTED"
                    ? t.resubmit || "重新提交"
                    : latest?.status === "DISPUTED"
                      ? t.editDisputed || "补充修改"
                      : latest
                        ? t.update
                        : t.submit}
                </CardTitle>
                <CardDescription>
                  {t.allowedDomainsTitle}：{allowedDomainsText}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="essay" className="text-sm font-medium">
                    {t.fields.essay}
                  </Label>
                  <Textarea
                    id="essay"
                    value={formData.essay}
                    onChange={(event) => setFormData({ ...formData, essay: event.target.value })}
                    rows={6}
                    placeholder={essayHint}
                    className="resize-none rounded-xl"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="line-clamp-1">{essayHint}</span>
                    <span
                      className={cn(
                        "shrink-0 tabular-nums",
                        formData.essay.length >= essayMinChars && "text-emerald-600",
                      )}
                    >
                      {formData.essay.length}/{essayMinChars}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t.fields.source}</Label>
                    <Select
                      value={formData.source}
                      onValueChange={(value) => setFormData({ ...formData, source: value })}
                      disabled={isEditing && !canEditDisputed}
                    >
                      <SelectTrigger
                        disabled={isEditing && !canEditDisputed}
                        className="rounded-lg"
                      >
                        <SelectValue placeholder={t.fields.sourceOptional} />
                      </SelectTrigger>
                      <SelectContent>
                        {preApplicationSources.map((source) => {
                          const key = source.labelKey.split(".").pop() || ""
                          return (
                            <SelectItem key={source.value} value={source.value}>
                              {(t.sources as Record<string, string>)[key]}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    {formData.source === "OTHER" && (
                      <Input
                        value={formData.sourceDetail}
                        onChange={(event) =>
                          setFormData({ ...formData, sourceDetail: event.target.value })
                        }
                        placeholder={t.fields.sourceDetail}
                        readOnly={isEditing && !canEditDisputed}
                        className="rounded-lg"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registerEmail" className="text-sm font-medium">
                      {t.fields.registerEmail}
                    </Label>
                    <EmailWithDomainInput
                      value={formData.registerEmail}
                      domains={allowedDomains}
                      onChange={(email) => setFormData({ ...formData, registerEmail: email })}
                      selectPlaceholder={emailSuffixPlaceholder}
                      inputId="registerEmail"
                      inputPlaceholder={t.fields.registerEmailHint}
                      disabled
                    />
                    <p className="text-xs text-muted-foreground">{t.fields.registerEmailHint}</p>
                  </div>

                  <div className="space-y-3 md:col-span-2">
                    <Label className="text-sm font-medium">{t.fields.group}</Label>
                    <RadioGroup
                      value={formData.group}
                      onValueChange={(value) => setFormData({ ...formData, group: value })}
                      className="flex flex-wrap gap-4"
                    >
                      {preApplicationGroups.map((group) => {
                        const key = group.labelKey.split(".").pop() || ""
                        return (
                          <label
                            key={group.value}
                            className={cn(
                              "flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors",
                              formData.group === group.value
                                ? "border-primary bg-primary/5"
                                : "border-border hover:bg-muted/50",
                            )}
                          >
                            <RadioGroupItem value={group.value} />
                            <span className="text-sm">
                              {(t.groups as Record<string, string>)[key]}
                            </span>
                          </label>
                        )
                      })}
                    </RadioGroup>
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={
                    submitting ||
                    (latest?.status === "REJECTED" && !canResubmit && !canEditDisputed)
                  }
                  className="w-full sm:w-auto"
                  size="lg"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t.submitting}
                    </>
                  ) : latest?.status === "REJECTED" ? (
                    t.resubmit || "重新提交"
                  ) : latest?.status === "DISPUTED" ? (
                    t.editDisputed || "提交修改"
                  ) : latest ? (
                    t.update
                  ) : (
                    t.submit
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    )
  }

  function renderVersionHistory() {
    if (!latest?.versions?.length) {
      return (
        <Card className="border-0 shadow-md">
          <CardContent className="py-16 text-center">
            <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-muted/50 mb-4">
              <History className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground">{t.noVersionHistory || "暂无版本历史"}</p>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-4">
        {latest.versions.map((version, index) => (
          <motion.div
            key={version.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              className={cn(
                "border-0 shadow-md transition-all",
                index === 0 && "ring-2 ring-primary/20",
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    <span className="font-mono">v{version.version}</span>
                    {index === 0 && (
                      <Badge variant="default" className="text-xs">
                        {t.currentVersion || "当前版本"}
                      </Badge>
                    )}
                    <StatusBadge status={version.status as PreApplicationRecord["status"]} />
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(version.createdAt)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 text-sm sm:grid-cols-3">
                  <div className="p-2 rounded-lg bg-muted/30">
                    <span className="text-xs text-muted-foreground">{t.fields.registerEmail}</span>
                    <p className="font-medium truncate">{version.registerEmail}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/30">
                    <span className="text-xs text-muted-foreground">{t.fields.group}</span>
                    <p className="font-medium">{getGroupLabel(version.group)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/30">
                    <span className="text-xs text-muted-foreground">{t.fields.source}</span>
                    <p className="font-medium">{getSourceLabel(version.source)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">{t.fields.essay}</p>
                  <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                    <PostContent content={version.essay} emptyMessage="" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    )
  }
}
