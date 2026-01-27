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
  Sparkles,
  Trash2,
  Gift,
} from "lucide-react"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import type { Role } from "@prisma/client"
import { ApiErrorKeys } from "@/lib/api/error-keys"
import { resolveApiErrorMessage } from "@/lib/api/error-message"
import { preApplicationSources } from "@/lib/pre-application/constants"
import type { QQGroupConfig } from "@/lib/pre-application/constants"
import { EmailWithDomainInput } from "@/components/ui/email-with-domain-input"
import { useAllowedEmailDomains } from "@/lib/hooks/use-allowed-email-domains"
import { cn } from "@/lib/utils"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

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
  userRole?: Role
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
  userRole,
}: PreApplicationFormProps) {
  const router = useRouter()
  const t = dict.preApplication
  const emailSuffixPlaceholder = t.emailSuffixPlaceholder ?? ""
  const essayMinChars = 50
  const [loading, setLoading] = useState(!initialRecords)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [hasAvailableCode, setHasAvailableCode] = useState<boolean | null>(null)
  const [checkingCode, setCheckingCode] = useState(false)
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

  // QQ 群配置（动态加载）
  const [qqGroups, setQqGroups] = useState<QQGroupConfig[]>([])

  // AI 预审状态
  type AIPreviewResult = {
    suggestion: "APPROVE" | "REJECT" | "DISPUTE"
    confidence: number
    scores: {
      relevance: number
      authenticity: number
      completeness: number
      expression: number
    }
    reasoning: string
  }
  const [aiPreviewLoading, setAiPreviewLoading] = useState(false)
  const [aiPreviewResult, setAiPreviewResult] = useState<AIPreviewResult | null>(null)
  const [aiPreviewError, setAiPreviewError] = useState<string | null>(null)

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
  // 管理员可以删除自己的申请记录（用于测试）
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN"
  const canDelete = isAdmin && latest

  // 删除申请记录
  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch("/api/pre-application", { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message =
          resolveApiErrorMessage(data, dict) ??
          ((t as Record<string, unknown>).deleteFailed as string) ??
          "删除失败"
        toast.error(message)
        return
      }
      toast.success(((t as Record<string, unknown>).deleteSuccess as string) ?? "申请记录已删除")
      setRecords([])
      setFormData({
        essay: "",
        source: "",
        sourceDetail: "",
        registerEmail: userEmail || "",
        group: qqGroups[0]?.id || "GROUP_ONE",
      })
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : (((t as Record<string, unknown>).deleteFailed as string) ?? "删除失败"),
      )
    } finally {
      setDeleting(false)
    }
  }

  // 领取邀请码
  const handleClaimCode = async () => {
    setClaiming(true)
    try {
      const res = await fetch("/api/pre-application/claim-code", { method: "POST" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message =
          resolveApiErrorMessage(data, dict) ??
          ((t as Record<string, unknown>).claimCodeFailed as string) ??
          "领取失败"
        toast.error(message)
        return
      }
      toast.success(((t as Record<string, unknown>).claimCodeSuccess as string) ?? "邀请码领取成功")
      await loadRecord()
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : (((t as Record<string, unknown>).claimCodeFailed as string) ?? "领取失败"),
      )
    } finally {
      setClaiming(false)
    }
  }

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

  // 检查是否有可用邀请码
  const checkAvailableCode = async () => {
    setCheckingCode(true)
    try {
      const res = await fetch("/api/pre-application/check-available-code")
      if (res.ok) {
        const data = await res.json()
        setHasAvailableCode(data.hasAvailableCode)
      }
    } catch {
      setHasAvailableCode(false)
    } finally {
      setCheckingCode(false)
    }
  }

  useEffect(() => {
    if (!initialRecords) loadRecord()
  }, [])

  // 审核通过但无码时，自动检查是否有可用邀请码
  useEffect(() => {
    if (latest?.status === "APPROVED" && !latest?.inviteCode) {
      checkAvailableCode()
    }
  }, [latest?.status, latest?.inviteCode])

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

  // 加载 QQ 群配置
  useEffect(() => {
    const loadQQGroups = async () => {
      try {
        const res = await fetch("/api/qq-groups")
        if (res.ok) {
          const data: QQGroupConfig[] = await res.json()
          setQqGroups(data)
          // 如果当前选择的群不在可用列表中，自动选择第一个
          if (data.length > 0 && !data.some((g) => g.id === formData.group)) {
            setFormData((prev) => ({ ...prev, group: data[0].id }))
          }
        }
      } catch (error) {
        console.error("Failed to load QQ groups:", error)
      }
    }
    loadQQGroups()
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
    // 优先从动态加载的 QQ 群配置中获取
    const qqGroup = qqGroups.find((g) => g.id === value)
    if (qqGroup) {
      return locale === "en" && qqGroup.nameEn ? qqGroup.nameEn : qqGroup.name
    }
    // 回退到字典翻译
    const keyMap: Record<string, string> = {
      GROUP_ONE: "groupOne",
      GROUP_TWO: "groupTwo",
      GROUP_THREE: "groupThree",
    }
    const key = keyMap[value]
    return key ? (t.groups as Record<string, string>)[key] || value : value
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

  // AI 预审检测
  const aiPreviewT = (t as unknown as Record<string, unknown>).aiPreview as
    | Record<string, unknown>
    | undefined
  const handleAIPreview = async () => {
    if (formData.essay.length < essayMinChars) {
      toast.error(
        aiPreviewT?.minCharsHint
          ? String(aiPreviewT.minCharsHint).replace("{min}", String(essayMinChars))
          : `至少输入 ${essayMinChars} 个字符后可检测`,
      )
      return
    }

    setAiPreviewLoading(true)
    setAiPreviewError(null)
    setAiPreviewResult(null)

    try {
      const res = await fetch("/api/pre-application/ai-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ essay: formData.essay }),
      })

      if (!res.ok) {
        const errorText = res.status === 503 ? aiPreviewT?.notConfigured : aiPreviewT?.error
        setAiPreviewError(String(errorText || "检测失败"))
        return
      }

      const data = await res.json()
      setAiPreviewResult(data.result)
    } catch {
      setAiPreviewError(String(aiPreviewT?.error || "检测失败，请稍后重试"))
    } finally {
      setAiPreviewLoading(false)
    }
  }

  // AI 建议配置
  const getAISuggestionConfig = (suggestion: string) => {
    const configs: Record<string, { label: string; color: string; bg: string }> = {
      APPROVE: {
        label: String(
          (aiPreviewT?.suggestion as Record<string, string> | undefined)?.approve || "内容质量良好",
        ),
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-500/10",
      },
      REJECT: {
        label: String(
          (aiPreviewT?.suggestion as Record<string, string> | undefined)?.reject ||
            "建议修改后提交",
        ),
        color: "text-rose-600 dark:text-rose-400",
        bg: "bg-rose-500/10",
      },
      DISPUTE: {
        label: String(
          (aiPreviewT?.suggestion as Record<string, string> | undefined)?.dispute || "建议补充完善",
        ),
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-500/10",
      },
    }
    return configs[suggestion] || configs.DISPUTE
  }

  // 分数颜色
  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-emerald-600 dark:text-emerald-400"
    if (score >= 50) return "text-amber-600 dark:text-amber-400"
    return "text-rose-600 dark:text-rose-400"
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

                {/* 审核通过但无码时显示领取按钮 */}
                {latest.status === "APPROVED" && !latest.inviteCode && (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-medium text-amber-800 dark:text-amber-200">
                          {((t as Record<string, unknown>).noCodeYetTitle as string) ??
                            "暂无邀请码"}
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          {hasAvailableCode === false
                            ? (((t as Record<string, unknown>).noCodeAvailableDesc as string) ??
                              "当前暂无可用邀请码，请稍后再来查看。")
                            : (((t as Record<string, unknown>).noCodeYetDesc as string) ??
                              "审核已通过，但暂无可用邀请码。您可以尝试领取，如无可用码请稍后再试。")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {hasAvailableCode === false && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={checkAvailableCode}
                            disabled={checkingCode}
                            className="text-amber-700 border-amber-300 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-900/50"
                          >
                            {checkingCode ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              (((t as Record<string, unknown>).refreshStatus as string) ??
                              "刷新状态")
                            )}
                          </Button>
                        )}
                        <Button
                          onClick={handleClaimCode}
                          disabled={claiming || checkingCode || hasAvailableCode === false}
                          className="bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
                        >
                          {claiming ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {((t as Record<string, unknown>).claiming as string) ?? "领取中..."}
                            </>
                          ) : (
                            <>
                              <Gift className="mr-2 h-4 w-4" />
                              {((t as Record<string, unknown>).claimCode as string) ?? "领取邀请码"}
                            </>
                          )}
                        </Button>
                      </div>
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
                  {/* 管理员删除按钮 */}
                  {canDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={deleting}
                        >
                          {deleting ? (
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 mr-1.5" />
                          )}
                          {((t as Record<string, unknown>).deleteRecord as string) || "删除记录"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {((t as Record<string, unknown>).deleteConfirmTitle as string) ||
                              "确认删除申请记录？"}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {((t as Record<string, unknown>).deleteConfirmDesc as string) ||
                              "此操作将删除您的预申请记录和所有版本历史，删除后可以重新填写申请。此操作不可撤销。"}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>
                            {((t as Record<string, unknown>).cancel as string) || "取消"}
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {((t as Record<string, unknown>).confirmDelete as string) || "确认删除"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
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

                  {/* AI 预审检测按钮和结果 */}
                  <div className="space-y-3">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAIPreview}
                            disabled={aiPreviewLoading || formData.essay.length < essayMinChars}
                            className="gap-2"
                          >
                            {aiPreviewLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {String(aiPreviewT?.loading || "检测中...")}
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4" />
                                {String(aiPreviewT?.button || "AI 检测")}
                              </>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{String(aiPreviewT?.title || "AI 内容检测")}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* AI 预审错误 */}
                    {aiPreviewError && (
                      <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                        {aiPreviewError}
                      </div>
                    )}

                    {/* AI 预审结果 */}
                    {aiPreviewResult && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border bg-muted/30 p-4 space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {String(aiPreviewT?.resultTitle || "检测结果")}
                          </span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "px-2.5 py-1",
                              getAISuggestionConfig(aiPreviewResult.suggestion).bg,
                              getAISuggestionConfig(aiPreviewResult.suggestion).color,
                            )}
                          >
                            {getAISuggestionConfig(aiPreviewResult.suggestion).label}
                          </Badge>
                        </div>

                        {/* 分数展示 */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {(
                            [
                              ["relevance", "相关性"],
                              ["authenticity", "真实性"],
                              ["completeness", "完整性"],
                              ["expression", "表达能力"],
                            ] as const
                          ).map(([key, fallback]) => {
                            const score =
                              aiPreviewResult.scores[key as keyof typeof aiPreviewResult.scores]
                            const label =
                              (aiPreviewT?.scores as Record<string, string> | undefined)?.[key] ||
                              fallback
                            return (
                              <div
                                key={key}
                                className="rounded-lg bg-background/50 p-2 text-center"
                              >
                                <p className={cn("text-lg font-bold", getScoreColor(score))}>
                                  {score}
                                </p>
                                <p className="text-xs text-muted-foreground">{label}</p>
                              </div>
                            )
                          })}
                        </div>

                        {/* 改进建议 */}
                        {aiPreviewResult.reasoning && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">
                              {String(aiPreviewT?.suggestions || "改进建议")}
                            </p>
                            <p className="text-sm leading-relaxed">{aiPreviewResult.reasoning}</p>
                          </div>
                        )}
                      </motion.div>
                    )}
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
                      {qqGroups.map((group) => (
                        <label
                          key={group.id}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors",
                            formData.group === group.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-muted/50",
                          )}
                        >
                          <RadioGroupItem value={group.id} />
                          <span className="text-sm">
                            {locale === "en" && group.nameEn ? group.nameEn : group.name}
                          </span>
                          <span className="text-xs text-muted-foreground">({group.number})</span>
                        </label>
                      ))}
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
