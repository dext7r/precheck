"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { motion } from "framer-motion"
import {
  X,
  ClipboardList,
  Search,
  RotateCcw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Mail,
  FileText,
  Eye,
  Pencil,
  Filter,
  Loader2,
  History,
  Send,
  Key,
  Calendar,
  Users,
  Inbox,
  Archive,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DataTable, type Column } from "@/components/ui/data-table"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { preApplicationGroups, preApplicationSources } from "@/lib/pre-application/constants"
import { PostContent } from "@/components/posts/post-content"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { resolveApiErrorMessage } from "@/lib/api/error-message"

// AI 审核结果类型
type AIReviewResult = {
  suggestion: "APPROVE" | "REJECT" | "DISPUTE"
  confidence: number
  scores: {
    relevance: number
    authenticity: number
    completeness: number
    expression: number
  }
  referenceReply: string
  reasoning: string
}

// 查重结果类型
type DuplicateRecord = {
  id: string
  similarity: number
  essay: string
  user: { name: string | null; email: string }
  createdAt: string
  status: string
  aiReason?: string
}

type DuplicateCheckResult = {
  hasDuplicates: boolean
  records: DuplicateRecord[]
  totalCandidates: number
  aiEnabled: boolean
}

type AdminPreApplication = {
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
  createdAt: string
  updatedAt: string
  user: { id: string; name: string | null; email: string }
  reviewedBy: { id: string; name: string | null; email: string } | null
  inviteCode: { id: string; code: string; expiresAt: string | null; usedAt: string | null } | null
  reviewRound?: number
}

type PreApplicationVersion = {
  id: string
  version: number
  essay: string
  source: string | null
  sourceDetail: string | null
  registerEmail: string
  group: string
  status: "PENDING" | "APPROVED" | "REJECTED" | "DISPUTED" | "ARCHIVED"
  guidance: string | null
  reviewedAt: string | null
  createdAt: string
  reviewedBy: { id: string; name: string | null; email: string } | null
}

interface AdminPreApplicationsTableProps {
  locale: Locale
  dict: Dictionary
}

// 统计卡片组件
function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  color = "primary",
  active = false,
  onClick,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  trend?: string
  color?: "primary" | "success" | "warning" | "danger" | "purple"
  active?: boolean
  onClick?: () => void
}) {
  const colorStyles = {
    primary: "from-primary/20 to-primary/5 text-primary",
    success: "from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    warning: "from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400",
    danger: "from-rose-500/20 to-rose-500/5 text-rose-600 dark:text-rose-400",
    purple: "from-purple-500/20 to-purple-500/5 text-purple-600 dark:text-purple-400",
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border bg-card p-4 ${
        onClick ? "cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md" : ""
      } ${active ? "ring-2 ring-primary ring-offset-2" : ""}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br opacity-50 ${colorStyles[color]}`} />
      <div className="relative flex items-center gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${colorStyles[color]}`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {trend && <p className="text-xs text-muted-foreground">{trend}</p>}
        </div>
      </div>
    </motion.div>
  )
}

// 格式化完整日期时间
function formatDateTime(dateStr: string | null, locale: Locale): string {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

const toDateTimeLocal = (value: string) => {
  const date = new Date(value)
  const pad = (num: number) => num.toString().padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

export function AdminPreApplicationsTable({ locale, dict }: AdminPreApplicationsTableProps) {
  const t = dict.admin
  const [records, setRecords] = useState<AdminPreApplication[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    disputed: 0,
    archived: 0,
  })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [registerEmailFilter, setRegisterEmailFilter] = useState("")
  const [registerEmailInput, setRegisterEmailInput] = useState("")
  const [queryTokenFilter, setQueryTokenFilter] = useState("")
  const [queryTokenInput, setQueryTokenInput] = useState("")
  const [reviewRoundFilter, setReviewRoundFilter] = useState("ALL")
  const [inviteStatusFilter, setInviteStatusFilter] = useState("ALL")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selected, setSelected] = useState<AdminPreApplication | null>(null)
  const [reviewAction, setReviewAction] = useState<"APPROVE" | "REJECT" | "DISPUTE">("APPROVE")
  const [guidance, setGuidance] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [inviteExpiresAt, setInviteExpiresAt] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [historyRecords, setHistoryRecords] = useState<PreApplicationVersion[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [inviteOptions, setInviteOptions] = useState<
    Array<{ id: string; code: string; expiresAt: string | null; usedAt: string | null }>
  >([])
  const [inviteOptionsLoading, setInviteOptionsLoading] = useState(false)
  const [reviewTemplates, setReviewTemplates] = useState<{
    approve: string[]
    reject: string[]
    dispute: string[]
  }>({ approve: [], reject: [], dispute: [] })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchArchiving, setBatchArchiving] = useState(false)

  // AI 审核相关状态
  const [aiReviewLoading, setAIReviewLoading] = useState(false)
  const [aiReviewResult, setAIReviewResult] = useState<AIReviewResult | null>(null)
  const [aiReviewError, setAIReviewError] = useState<string | null>(null)
  const [replyCopied, setReplyCopied] = useState(false)

  // 查重相关状态
  const [duplicateCheckLoading, setDuplicateCheckLoading] = useState(false)
  const [duplicateCheckResult, setDuplicateCheckResult] = useState<DuplicateCheckResult | null>(
    null,
  )
  const [duplicateCheckError, setDuplicateCheckError] = useState<string | null>(null)

  useEffect(() => {
    if (reviewAction === "REJECT") {
      setInviteCode("")
      setInviteExpiresAt("")
    }
  }, [reviewAction])

  useEffect(() => {
    if (selected?.status !== "PENDING" && selected?.status !== "DISPUTED") return

    const templates =
      reviewAction === "APPROVE"
        ? reviewTemplates.approve
        : reviewAction === "REJECT"
          ? reviewTemplates.reject
          : reviewTemplates.dispute
    setGuidance(templates[0] || "")
  }, [reviewAction, selected?.status, selected?.id, reviewTemplates])

  useEffect(() => {
    if (!dialogOpen || reviewAction === "REJECT") return
    if (selected?.status !== "PENDING" && selected?.status !== "DISPUTED") return
    loadInviteOptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen, reviewAction, selected?.status])

  useEffect(() => {
    loadReviewTemplates()
  }, [])

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const sortByMap: Record<string, string> = {
        reviewRound: "resubmitCount",
        inviteStatus: "inviteCodeId",
      }
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        sortBy: sortByMap[sortBy] || sortBy,
        sortOrder,
        ...(search && { search }),
        ...(statusFilter.length > 0 && { status: statusFilter.join(",") }),
        ...(registerEmailFilter && { registerEmail: registerEmailFilter }),
        ...(queryTokenFilter && { queryToken: queryTokenFilter }),
        ...(reviewRoundFilter !== "ALL" && { reviewRound: reviewRoundFilter }),
        ...(inviteStatusFilter !== "ALL" && { inviteStatus: inviteStatusFilter }),
      })
      const res = await fetch(`/api/admin/pre-applications?${params}`)
      if (!res.ok) {
        throw new Error("Fetch failed")
      }
      const data = await res.json()
      setRecords(data.records || [])
      setTotal(data.total || 0)
      if (data.stats) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Pre-application list error:", error)
      toast.error(t.fetchFailed)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    page,
    pageSize,
    search,
    statusFilter,
    registerEmailFilter,
    queryTokenFilter,
    reviewRoundFilter,
    inviteStatusFilter,
    sortBy,
    sortOrder,
  ])

  const handleSearch = () => {
    setSearch(searchInput)
    setRegisterEmailFilter(registerEmailInput)
    setQueryTokenFilter(queryTokenInput)
    setPage(1)
  }

  const handleSort = (key: string, direction: "asc" | "desc") => {
    setSortBy(key)
    setSortOrder(direction)
    setPage(1)
  }

  const formatPageSummary = (summary: { total: number; page: number; totalPages: number }) =>
    t.pageSummary
      .replace("{total}", summary.total.toString())
      .replace("{page}", summary.page.toString())
      .replace("{totalPages}", summary.totalPages.toString())

  const getGroupLabel = (value: string) => {
    const item = preApplicationGroups.find((group) => group.value === value)
    if (!item) return value
    const key = item.labelKey.split(".").pop() || ""
    return (dict.preApplication.groups as Record<string, string>)[key] || value
  }

  const getSourceLabel = (value: string | null) => {
    if (!value) return dict.preApplication.fields.sourceOptional
    const item = preApplicationSources.find((source) => source.value === value)
    if (!item) return value
    const key = item.labelKey.split(".").pop() || ""
    return (dict.preApplication.sources as Record<string, string>)[key] || value
  }

  const getStatusConfig = (status: AdminPreApplication["status"]) => {
    const map: Record<string, { label: string; className: string; icon: React.ElementType }> = {
      PENDING: {
        label: t.pending,
        className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        icon: Clock,
      },
      APPROVED: {
        label: t.approved,
        className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
        icon: CheckCircle2,
      },
      REJECTED: {
        label: t.rejected,
        className: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
        icon: XCircle,
      },
      DISPUTED: {
        label: t.disputed || "有争议",
        className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
        icon: AlertTriangle,
      },
      ARCHIVED: {
        label: t.archived || "已归档",
        className: "bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-400",
        icon: Archive,
      },
    }
    return map[status] || map.PENDING
  }

  const statusBadge = (status: AdminPreApplication["status"]) => {
    const config = getStatusConfig(status)
    const Icon = config.icon
    return (
      <Badge className={cn("gap-1 text-xs font-medium", config.className)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const loadHistory = async (recordId: string) => {
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/admin/pre-applications/${recordId}/history`)
      if (!res.ok) {
        throw new Error("Fetch failed")
      }
      const data = await res.json()
      setHistoryRecords(data.records || [])
    } catch (error) {
      console.error("Pre-application history error:", error)
      toast.error(t.fetchFailed)
      setHistoryRecords([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const loadInviteOptions = async () => {
    setInviteOptionsLoading(true)
    try {
      const params = new URLSearchParams({
        status: "unused",
        assignment: "unassigned",
        page: "1",
        limit: "200",
      })
      const res = await fetch(`/api/admin/invite-codes?${params}`)
      if (!res.ok) {
        throw new Error("Fetch failed")
      }
      const data = await res.json()
      const now = new Date()
      const available = (data.records || []).filter(
        (record: { expiresAt: string | null }) =>
          !record.expiresAt || new Date(record.expiresAt) > now,
      )
      setInviteOptions(available)
    } catch (error) {
      console.error("Invite options fetch error:", error)
      toast.error(t.fetchFailed)
      setInviteOptions([])
    } finally {
      setInviteOptionsLoading(false)
    }
  }

  const loadReviewTemplates = async () => {
    try {
      const res = await fetch("/api/admin/system-config")
      if (!res.ok) return
      const data = await res.json()
      setReviewTemplates({
        approve: data.reviewTemplatesApprove ?? [],
        reject: data.reviewTemplatesReject ?? [],
        dispute: data.reviewTemplatesDispute ?? [],
      })
    } catch (error) {
      console.error("Review templates fetch error:", error)
    }
  }

  const getCurrentTemplates = () => {
    if (reviewAction === "APPROVE") return reviewTemplates.approve
    if (reviewAction === "REJECT") return reviewTemplates.reject
    return reviewTemplates.dispute
  }

  const openDialog = (record: AdminPreApplication) => {
    setSelected(record)
    setHistoryRecords([])
    // 重置 AI 审核状态
    setAIReviewResult(null)
    setAIReviewError(null)
    setDuplicateCheckResult(null)
    setDuplicateCheckError(null)
    if (record.status === "PENDING" || record.status === "DISPUTED") {
      setReviewAction("APPROVE")
      setGuidance(record.guidance || "")
      // 保留已有的邀请码
      setInviteCode(record.inviteCode?.code || "")
      setInviteExpiresAt(
        record.inviteCode?.expiresAt ? toDateTimeLocal(record.inviteCode.expiresAt) : "",
      )
    } else {
      setReviewAction(record.status === "APPROVED" ? "APPROVE" : "REJECT")
      setGuidance(record.guidance || "")
      setInviteCode(record.inviteCode?.code || "")
      setInviteExpiresAt(
        record.inviteCode?.expiresAt ? toDateTimeLocal(record.inviteCode.expiresAt) : "",
      )
    }
    setDialogOpen(true)
    loadHistory(record.id)
  }

  // AI 审核处理函数
  const handleAIReview = async () => {
    if (!selected) return
    setAIReviewLoading(true)
    setAIReviewError(null)

    try {
      const res = await fetch(`/api/admin/pre-applications/${selected.id}/ai-review`, {
        method: "POST",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message = resolveApiErrorMessage(data, dict) ?? t.aiReviewFailed
        throw new Error(message)
      }
      const data = await res.json()
      setAIReviewResult(data)
    } catch (error) {
      setAIReviewError(error instanceof Error ? error.message : t.aiReviewFailed)
      toast.error(t.aiReviewFailed)
    } finally {
      setAIReviewLoading(false)
    }
  }

  // 查重处理函数
  const handleDuplicateCheck = async () => {
    if (!selected) return
    setDuplicateCheckLoading(true)
    setDuplicateCheckError(null)

    try {
      const res = await fetch(`/api/admin/pre-applications/${selected.id}/duplicate-check`, {
        method: "POST",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message = resolveApiErrorMessage(data, dict) ?? t.duplicateCheckFailed
        throw new Error(message)
      }
      const data = await res.json()
      setDuplicateCheckResult(data)
    } catch (error) {
      setDuplicateCheckError(error instanceof Error ? error.message : t.duplicateCheckFailed)
      toast.error(t.duplicateCheckFailed)
    } finally {
      setDuplicateCheckLoading(false)
    }
  }

  // 复制参考回复
  const handleCopyReply = () => {
    if (aiReviewResult?.referenceReply) {
      navigator.clipboard.writeText(aiReviewResult.referenceReply)
      setReplyCopied(true)
      setTimeout(() => setReplyCopied(false), 2000)
    }
  }

  // 获取 AI 建议配置
  const getAISuggestionConfig = (suggestion: "APPROVE" | "REJECT" | "DISPUTE") => {
    const configs = {
      APPROVE: {
        label: t.aiReviewSuggestApprove,
        className:
          "bg-green-500/10 text-green-600 border-green-500/20 dark:bg-green-500/20 dark:text-green-400",
      },
      REJECT: {
        label: t.aiReviewSuggestReject,
        className:
          "bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/20 dark:text-red-400",
      },
      DISPUTE: {
        label: t.aiReviewSuggestDispute,
        className:
          "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400",
      },
    }
    return configs[suggestion]
  }

  // 获取分数颜色
  const getScoreColor = (score: number) => {
    if (score >= 70) return "bg-green-500"
    if (score >= 40) return "bg-amber-500"
    return "bg-red-500"
  }

  const handleReview = async () => {
    if (!selected) return
    if (!guidance.trim()) {
      toast.error(t.reviewGuidanceRequired)
      return
    }
    if (reviewAction === "APPROVE" && !inviteCode.trim()) {
      toast.error(t.inviteCodeRequired)
      return
    }
    setSubmitting(true)
    try {
      const payload: Record<string, string> = {
        action: reviewAction,
        guidance,
        locale,
      }

      if (reviewAction === "APPROVE") {
        payload.inviteCode = inviteCode
        if (inviteExpiresAt) {
          payload.inviteExpiresAt = new Date(inviteExpiresAt).toISOString()
        }
      }

      const res = await fetch(`/api/admin/pre-applications/${selected.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message = resolveApiErrorMessage(data, dict) ?? t.actionFailed
        throw new Error(message)
      }

      toast.success(t.reviewSubmit)
      setDialogOpen(false)
      await fetchRecords()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.actionFailed)
    } finally {
      setSubmitting(false)
    }
  }

  const handleBatchArchive = async () => {
    if (selectedIds.size === 0) return
    setBatchArchiving(true)
    try {
      const res = await fetch("/api/admin/pre-applications/batch-archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message = resolveApiErrorMessage(data, dict) ?? t.actionFailed
        throw new Error(message)
      }
      const result = await res.json()
      toast.success(`${t.batchArchiveSuccess || "已归档"} ${result.count} ${t.records || "条记录"}`)
      setSelectedIds(new Set())
      await fetchRecords()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.actionFailed)
    } finally {
      setBatchArchiving(false)
    }
  }

  const columns: Column<AdminPreApplication>[] = useMemo(
    () => [
      {
        key: "user",
        label: t.preApplicationUser,
        width: "26%",
        render: (record) => (
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                record.status === "PENDING"
                  ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30"
                  : record.status === "APPROVED"
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30"
                    : record.status === "REJECTED"
                      ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30"
                      : "bg-purple-100 text-purple-600 dark:bg-purple-900/30",
              )}
            >
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {record.user.name || record.user.email}
              </p>
              <p className="truncate text-xs text-muted-foreground">{record.registerEmail}</p>
            </div>
          </div>
        ),
      },
      {
        key: "status",
        label: t.preApplicationStatus,
        width: "18%",
        sortable: true,
        render: (record) => (
          <div className="flex flex-col gap-1">
            {statusBadge(record.status)}
            <Badge variant="outline" className="w-fit text-xs">
              {t.reviewRoundLabel?.replace("{n}", String(record.reviewRound ?? 1)) ??
                `${record.reviewRound ?? 1}审`}
            </Badge>
          </div>
        ),
      },
      {
        key: "inviteStatus",
        label: t.inviteStatus,
        width: "12%",
        sortable: true,
        render: (record) => (
          <Badge
            className={cn(
              "gap-1 text-xs",
              record.inviteCode
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
            )}
          >
            {record.inviteCode ? <Key className="h-3 w-3" /> : null}
            {record.inviteCode ? t.inviteStatusIssued : t.inviteStatusNone}
          </Badge>
        ),
      },
      {
        key: "createdAt",
        label: t.preApplicationCreatedAt,
        width: "20%",
        sortable: true,
        render: (record) => (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {formatDateTime(record.createdAt, locale)}
            </span>
          </div>
        ),
      },
      {
        key: "actions",
        label: t.actions,
        width: "14%",
        render: (record) => (
          <Button
            variant={
              record.status === "PENDING" || record.status === "DISPUTED" ? "default" : "outline"
            }
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => openDialog(record)}
          >
            {record.status === "PENDING" || record.status === "DISPUTED" ? (
              <>
                <Pencil className="h-3.5 w-3.5" />
                {t.preApplicationReviewAction}
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                {t.preApplicationView}
              </>
            )}
          </Button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, locale],
  )

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25">
              <ClipboardList className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">{t.preApplications}</h1>
              <p className="text-muted-foreground">{t.preApplicationsDesc || "审核用户预申请"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          icon={Clock}
          label={t.pending}
          value={stats.pending}
          color="warning"
          active={statusFilter.length === 1 && statusFilter[0] === "PENDING"}
          onClick={() => {
            setStatusFilter(["PENDING"])
            setPage(1)
          }}
        />
        <StatCard
          icon={CheckCircle2}
          label={t.approved}
          value={stats.approved}
          color="success"
          active={statusFilter.length === 1 && statusFilter[0] === "APPROVED"}
          onClick={() => {
            setStatusFilter(["APPROVED"])
            setPage(1)
          }}
        />
        <StatCard
          icon={XCircle}
          label={t.rejected}
          value={stats.rejected}
          color="danger"
          active={statusFilter.length === 1 && statusFilter[0] === "REJECTED"}
          onClick={() => {
            setStatusFilter(["REJECTED"])
            setPage(1)
          }}
        />
        <StatCard
          icon={AlertTriangle}
          label={t.disputed || "有争议"}
          value={stats.disputed}
          color="purple"
          active={statusFilter.length === 1 && statusFilter[0] === "DISPUTED"}
          onClick={() => {
            setStatusFilter(["DISPUTED"])
            setPage(1)
          }}
        />
        <StatCard
          icon={Archive}
          label={t.archived || "已归档"}
          value={stats.archived}
          color="primary"
          active={statusFilter.length === 1 && statusFilter[0] === "ARCHIVED"}
          onClick={() => {
            setStatusFilter(["ARCHIVED"])
            setPage(1)
          }}
        />
      </div>

      {/* 搜索和筛选 */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          {/* 搜索行 */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleSearch()
                }}
                placeholder={t.searchUsers}
                className="pl-9 pr-8"
              />
              {searchInput && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setSearchInput("")
                    setSearch("")
                    setPage(1)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="relative flex-1 sm:max-w-[180px]">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={registerEmailInput}
                onChange={(event) => setRegisterEmailInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleSearch()
                }}
                placeholder={t.preApplicationRegisterEmail}
                className="pl-9 pr-8"
              />
              {registerEmailInput && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setRegisterEmailInput("")
                    setRegisterEmailFilter("")
                    setPage(1)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="relative flex-1 sm:max-w-[140px]">
              <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={queryTokenInput}
                onChange={(event) => setQueryTokenInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleSearch()
                }}
                placeholder={t.preApplicationQueryToken}
                className="pl-9 pr-8"
              />
              {queryTokenInput && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setQueryTokenInput("")
                    setQueryTokenFilter("")
                    setPage(1)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button variant="outline" onClick={handleSearch} className="shrink-0 gap-2">
              <Search className="h-4 w-4" />
              {t.searchAction}
            </Button>
          </div>

          {/* 筛选行 */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{t.preApplicationStatus}</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 w-28 gap-1.5">
                    <Filter className="h-3.5 w-3.5" />
                    {statusFilter.length === 0
                      ? t.statusAll
                      : statusFilter.length === 4
                        ? t.statusAll
                        : `${statusFilter.length} 项`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-36">
                  {[
                    { value: "PENDING", label: t.pending },
                    { value: "DISPUTED", label: t.disputed || "有争议" },
                    { value: "APPROVED", label: t.approved },
                    { value: "REJECTED", label: t.rejected },
                    { value: "ARCHIVED", label: t.archived || "已归档" },
                  ].map((item) => (
                    <DropdownMenuCheckboxItem
                      key={item.value}
                      checked={statusFilter.includes(item.value)}
                      onCheckedChange={(checked) => {
                        setStatusFilter((prev) =>
                          checked ? [...prev, item.value] : prev.filter((v) => v !== item.value),
                        )
                        setPage(1)
                      }}
                    >
                      {item.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{t.reviewRound || "审核轮次"}</Label>
              <Select
                value={reviewRoundFilter}
                onValueChange={(value) => {
                  setReviewRoundFilter(value)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9 w-24">
                  <SelectValue placeholder={t.reviewRound} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t.statusAll}</SelectItem>
                  <SelectItem value="1">
                    {t.reviewRoundLabel?.replace("{n}", "1") ?? "1审"}
                  </SelectItem>
                  <SelectItem value="2">
                    {t.reviewRoundLabel?.replace("{n}", "2") ?? "2审"}
                  </SelectItem>
                  <SelectItem value="3">
                    {t.reviewRoundLabel?.replace("{n}", "3") ?? "3审"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{t.inviteStatus}</Label>
              <Select
                value={inviteStatusFilter}
                onValueChange={(value) => {
                  setInviteStatusFilter(value)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9 w-28">
                  <SelectValue placeholder={t.inviteStatus} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t.statusAll}</SelectItem>
                  <SelectItem value="issued">{t.inviteStatusIssued}</SelectItem>
                  <SelectItem value="none">{t.inviteStatusNone}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSearchInput("")
                setSearch("")
                setRegisterEmailInput("")
                setRegisterEmailFilter("")
                setQueryTokenInput("")
                setQueryTokenFilter("")
                setStatusFilter([])
                setReviewRoundFilter("ALL")
                setInviteStatusFilter("ALL")
                setPage(1)
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t.reset}
            </Button>
          </div>
        </div>
      </Card>

      {/* 数据表格 */}
      <Card className="overflow-hidden">
        {/* 批量操作栏 */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
            <span className="text-sm text-muted-foreground">
              {t.selectedCount?.replace("{count}", String(selectedIds.size)) ||
                `已选择 ${selectedIds.size} 条记录`}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                className="h-8"
              >
                {t.clearSelection || "取消选择"}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleBatchArchive}
                disabled={batchArchiving}
                className="h-8 gap-1.5"
              >
                {batchArchiving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
                {t.batchArchive || "批量归档"}
              </Button>
            </div>
          </div>
        )}
        <DataTable
          columns={columns}
          data={records}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSort={handleSort}
          loading={loading}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          rowKey="id"
          emptyMessage={
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Inbox className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mt-4 font-medium text-muted-foreground">{t.noPreApplications}</p>
              <p className="mt-1 text-sm text-muted-foreground/70">
                {t.noPreApplicationsHint || "暂无预申请记录"}
              </p>
            </div>
          }
          loadingText={t.loading}
          perPageText={t.perPage}
          summaryFormatter={formatPageSummary}
          mobileCardRender={(record) => {
            const statusConfig = getStatusConfig(record.status)
            const StatusIcon = statusConfig.icon
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      record.status === "PENDING"
                        ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30"
                        : record.status === "APPROVED"
                          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30"
                          : record.status === "REJECTED"
                            ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30"
                            : "bg-purple-100 text-purple-600 dark:bg-purple-900/30",
                    )}
                  >
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-medium">
                        {record.user.name || record.user.email}
                      </p>
                      <Badge className={cn("shrink-0 gap-1 text-xs", statusConfig.className)}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{record.registerEmail}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {t.reviewRoundLabel?.replace("{n}", String(record.reviewRound ?? 1)) ??
                          `${record.reviewRound ?? 1}审`}
                      </Badge>
                      <Badge
                        className={cn(
                          "gap-1 text-xs",
                          record.inviteCode
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800",
                        )}
                      >
                        {record.inviteCode ? t.inviteStatusIssued : t.inviteStatusNone}
                      </Badge>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateTime(record.createdAt, locale)}
                      </span>
                    </div>
                    <Button
                      className="mt-3 w-full h-8 gap-1.5 text-xs"
                      variant={
                        record.status === "PENDING" || record.status === "DISPUTED"
                          ? "default"
                          : "outline"
                      }
                      onClick={() => openDialog(record)}
                    >
                      {record.status === "PENDING" || record.status === "DISPUTED" ? (
                        <>
                          <Pencil className="h-3.5 w-3.5" />
                          {t.preApplicationReviewAction}
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" />
                          {t.preApplicationView}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )
          }}
        />
      </Card>

      {/* 审核抽屉 */}
      <Drawer open={dialogOpen} onOpenChange={setDialogOpen} direction="right">
        <DrawerContent className="h-full data-[vaul-drawer-direction=right]:w-[92vw] data-[vaul-drawer-direction=right]:sm:max-w-xl">
          <DrawerHeader className="sticky top-0 z-10 border-b bg-background px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <DrawerTitle className="text-base">{t.reviewApplication}</DrawerTitle>
                  <DrawerDescription className="text-xs">
                    {t.reviewApplicationDesc}
                  </DrawerDescription>
                </div>
              </div>
              {selected && statusBadge(selected.status)}
            </div>
          </DrawerHeader>

          {selected && (
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {/* 申请人信息卡片 */}
              <div className="rounded-xl border bg-gradient-to-br from-muted/50 to-muted/20 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4 text-primary" />
                  {t.preApplicationUser}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">{t.preApplicationUser}</span>
                    <p className="font-medium truncate">
                      {selected.user.name || selected.user.email}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">
                      {t.preApplicationRegisterEmail}
                    </span>
                    <p className="font-medium truncate">{selected.registerEmail}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">{t.preApplicationGroup}</span>
                    <p className="font-medium">{getGroupLabel(selected.group)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">{t.preApplicationSource}</span>
                    <p className="font-medium">{getSourceLabel(selected.source)}</p>
                  </div>
                  {selected.sourceDetail && (
                    <div className="col-span-2">
                      <span className="text-xs text-muted-foreground">
                        {t.preApplicationSourceDetail}
                      </span>
                      <p className="font-medium">{selected.sourceDetail}</p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground">
                      {t.preApplicationQueryToken}
                    </span>
                    <p className="font-medium font-mono text-xs">{selected.queryToken || "-"}</p>
                  </div>
                </div>
              </div>

              {/* 申请理由 */}
              <Accordion type="multiple" defaultValue={["essay"]} className="rounded-xl border">
                <AccordionItem value="essay" className="border-none">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <FileText className="h-4 w-4 text-primary" />
                      {t.preApplicationEssay}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="rounded-lg border bg-card p-4 text-sm">
                      <PostContent content={selected.essay} emptyMessage={t.preApplicationEssay} />
                    </div>

                    {/* AI 辅助工具栏 */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={handleAIReview}
                        disabled={aiReviewLoading}
                      >
                        {aiReviewLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        {aiReviewLoading ? t.aiReviewLoading : t.aiReview}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={handleDuplicateCheck}
                        disabled={duplicateCheckLoading}
                      >
                        {duplicateCheckLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Search className="h-3.5 w-3.5" />
                        )}
                        {duplicateCheckLoading ? t.duplicateCheckLoading : t.duplicateCheck}
                      </Button>
                    </div>

                    {/* AI 审核结果卡片 */}
                    {aiReviewResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 space-y-3 rounded-lg border bg-gradient-to-br from-primary/5 to-transparent p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">{t.aiReviewResult}</span>
                          </div>
                          <Badge
                            className={cn(
                              "border",
                              getAISuggestionConfig(aiReviewResult.suggestion).className,
                            )}
                          >
                            {getAISuggestionConfig(aiReviewResult.suggestion).label}
                            <span className="ml-1 opacity-70">({aiReviewResult.confidence}%)</span>
                          </Badge>
                        </div>

                        {/* 多维度评分 */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                          {[
                            { key: "relevance", label: t.aiReviewRelevance },
                            { key: "authenticity", label: t.aiReviewAuthenticity },
                            { key: "completeness", label: t.aiReviewCompleteness },
                            { key: "expression", label: t.aiReviewExpression },
                          ].map(({ key, label }) => {
                            const score =
                              aiReviewResult.scores[key as keyof typeof aiReviewResult.scores]
                            return (
                              <div key={key} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">{label}</span>
                                  <span className="font-medium">{score}</span>
                                </div>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-all",
                                      getScoreColor(score),
                                    )}
                                    style={{ width: `${score}%` }}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* 分析理由 */}
                        {aiReviewResult.reasoning && (
                          <div className="rounded-md border bg-muted/30 p-3">
                            <p className="text-xs text-muted-foreground">
                              {aiReviewResult.reasoning}
                            </p>
                          </div>
                        )}

                        {/* 参考回复 */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">
                              {t.aiReviewReferenceReply}
                            </span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={handleCopyReply}
                                >
                                  {replyCopied ? (
                                    <Check className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {replyCopied ? t.aiReviewCopied : t.aiReviewCopy}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="rounded-md border bg-card p-3 text-sm">
                            {aiReviewResult.referenceReply}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* AI 审核错误 */}
                    {aiReviewError && (
                      <div className="mt-3 flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                        <div className="flex items-center gap-2 text-sm text-destructive">
                          <XCircle className="h-4 w-4" />
                          <span>{t.aiReviewFailed}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleAIReview}>
                          <RotateCcw className="mr-1.5 h-3 w-3" />
                          {dict.errors.tryAgain}
                        </Button>
                      </div>
                    )}

                    {/* 查重结果卡片 */}
                    {duplicateCheckResult && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        {!duplicateCheckResult.hasDuplicates ? (
                          <div className="mt-3 flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-600 dark:bg-green-500/20 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>{t.duplicateCheckNoDuplicates}</span>
                          </div>
                        ) : (
                          <div className="mt-3 space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="h-4 w-4" />
                              <span>
                                {t.duplicateCheckFound.replace(
                                  "{count}",
                                  String(duplicateCheckResult.records.length),
                                )}
                              </span>
                            </div>
                            <div className="max-h-48 space-y-2 overflow-y-auto">
                              {duplicateCheckResult.records.map((record) => (
                                <div
                                  key={record.id}
                                  className="flex items-center justify-between rounded-md border bg-card p-2.5"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="truncate text-sm font-medium">
                                        {record.user.name || record.user.email}
                                      </span>
                                      {statusBadge(record.status as AdminPreApplication["status"])}
                                    </div>
                                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                      {record.essay}
                                    </p>
                                  </div>
                                  <div className="ml-3 flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "font-mono text-xs",
                                        record.similarity >= 80
                                          ? "border-red-500/50 text-red-500"
                                          : record.similarity >= 50
                                            ? "border-amber-500/50 text-amber-500"
                                            : "border-muted-foreground/50",
                                      )}
                                    >
                                      {record.similarity}%
                                    </Badge>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0"
                                          onClick={() => {
                                            // 查看原申请（打开新记录）
                                            const original = records.find((r) => r.id === record.id)
                                            if (original) openDialog(original)
                                          }}
                                        >
                                          <ExternalLink className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {t.duplicateCheckViewOriginal}
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* 查重错误 */}
                    {duplicateCheckError && (
                      <div className="mt-3 flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                        <div className="flex items-center gap-2 text-sm text-destructive">
                          <XCircle className="h-4 w-4" />
                          <span>{t.duplicateCheckFailed}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleDuplicateCheck}>
                          <RotateCcw className="mr-1.5 h-3 w-3" />
                          {dict.errors.tryAgain}
                        </Button>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* 审核历史 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <History className="h-4 w-4 text-primary" />
                  {dict.preApplication.historyTitle}
                </div>
                {historyLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.loading}
                  </div>
                )}
                {!historyLoading && historyRecords.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">
                    {dict.preApplication.historyEmpty}
                  </p>
                )}
                {!historyLoading && historyRecords.length > 0 && (
                  <Accordion type="multiple" className="rounded-xl border">
                    {historyRecords.map((item) => (
                      <AccordionItem
                        key={item.id}
                        value={item.id}
                        className="border-b last:border-none"
                      >
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                          <div className="flex flex-1 items-center justify-between gap-2 pr-2">
                            <span className="text-sm text-muted-foreground">
                              {t.reviewRoundLabel?.replace("{n}", String(item.version)) ??
                                `${item.version}审`}
                              {" · "}
                              {formatDateTime(item.createdAt, locale)}
                            </span>
                            {statusBadge(item.status)}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3 px-4 pb-4">
                          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                            <PostContent
                              content={item.essay}
                              emptyMessage={t.preApplicationEssay}
                            />
                          </div>
                          {item.reviewedAt ? (
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <p>
                                {t.preApplicationReviewer}：
                                {item.reviewedBy?.name || item.reviewedBy?.email || "-"}
                              </p>
                              <p>
                                {dict.preApplication.review.reviewedAt}：
                                {formatDateTime(item.reviewedAt, locale)}
                              </p>
                              <p className="whitespace-pre-wrap">
                                {dict.preApplication.review.guidance}：{item.guidance || "-"}
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">
                              {dict.preApplication.status.pending}
                            </p>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </div>

              {/* 当前审核状态 */}
              {selected.reviewedBy && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>
                    {t.preApplicationReviewer}：
                    {selected.reviewedBy.name || selected.reviewedBy.email}
                  </span>
                </div>
              )}

              {/* 审核操作表单 */}
              {selected.status === "PENDING" || selected.status === "DISPUTED" ? (
                <div className="space-y-4 rounded-xl border bg-gradient-to-br from-muted/30 to-muted/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Send className="h-4 w-4 text-primary" />
                    {t.reviewAction}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t.reviewAction}</Label>
                      <Select
                        value={reviewAction}
                        onValueChange={(value) =>
                          setReviewAction(value as "APPROVE" | "REJECT" | "DISPUTE")
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="APPROVE">{t.reviewApprove}</SelectItem>
                          <SelectItem value="REJECT">{t.reviewReject}</SelectItem>
                          <SelectItem value="DISPUTE">{t.reviewDispute || "标记有争议"}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {reviewAction !== "REJECT" && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t.inviteCode}</Label>
                        <Select
                          value={inviteCode}
                          onValueChange={setInviteCode}
                          disabled={inviteOptionsLoading || inviteOptions.length === 0}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue
                              placeholder={
                                inviteOptionsLoading
                                  ? t.loading
                                  : inviteOptions.length === 0
                                    ? t.inviteCodeNoRecords
                                    : t.inviteCodePlaceholder
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {inviteOptions.map((option) => (
                              <SelectItem key={option.id} value={option.code}>
                                <div className="flex flex-col">
                                  <span className="text-sm">{option.code}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {option.expiresAt
                                      ? `${t.inviteExpiresAt} ${formatDateTime(option.expiresAt, locale)}`
                                      : t.inviteCodeSelectNoExpiry}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  {reviewAction !== "REJECT" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t.inviteExpiresAt}</Label>
                      <Input
                        type="datetime-local"
                        value={inviteExpiresAt}
                        onChange={(event) => setInviteExpiresAt(event.target.value)}
                        className="h-9"
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">{t.guidance}</Label>
                      {getCurrentTemplates().length > 0 && (
                        <Select onValueChange={(value) => setGuidance(value)}>
                          <SelectTrigger className="h-7 w-36 text-xs">
                            <SelectValue placeholder={t.reviewTemplateSelect} />
                          </SelectTrigger>
                          <SelectContent>
                            {getCurrentTemplates().map((template, index) => (
                              <SelectItem key={index} value={template} className="text-xs">
                                <span className="line-clamp-1">{template}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <Textarea
                      value={guidance}
                      onChange={(event) => setGuidance(event.target.value)}
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border bg-gradient-to-br from-muted/30 to-muted/10 p-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selected.inviteCode && (
                      <div>
                        <span className="text-xs text-muted-foreground">{t.inviteCode}</span>
                        <p className="font-mono font-medium">{selected.inviteCode.code}</p>
                      </div>
                    )}
                    {selected.inviteCode?.expiresAt && (
                      <div>
                        <span className="text-xs text-muted-foreground">{t.inviteExpiresAt}</span>
                        <p className="font-medium">
                          {formatDateTime(selected.inviteCode.expiresAt, locale)}
                        </p>
                      </div>
                    )}
                  </div>
                  {selected.guidance && (
                    <div className="mt-3 text-sm">
                      <span className="text-xs text-muted-foreground">{t.guidance}</span>
                      <p className="mt-1.5 whitespace-pre-wrap rounded-lg border bg-card p-3">
                        {selected.guidance}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DrawerFooter className="sticky bottom-0 z-10 border-t bg-background px-4 py-3">
            <div className="flex w-full justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t.reviewCancel}
              </Button>
              {(selected?.status === "PENDING" || selected?.status === "DISPUTED") && (
                <Button onClick={handleReview} disabled={submitting} className="gap-2">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t.saving}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      {t.reviewSubmit}
                    </>
                  )}
                </Button>
              )}
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
