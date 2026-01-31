"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import {
  ChevronsUpDown,
  CheckIcon,
  MoreHorizontal,
  Send,
  ShieldOff,
  CheckCircle2,
  Copy,
  Check,
  X,
  Trash2,
  Ticket,
  Key,
  Users,
  UserPlus,
  Clock,
  AlertTriangle,
  Search,
  Plus,
  Upload,
  Filter,
  RotateCcw,
  Eye,
  Pencil,
  Ban,
  Loader2,
  FileUp,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { cn } from "@/lib/utils"
import { resolveApiErrorMessage } from "@/lib/api/error-message"
import { formatInviteCodeUrl, parseBulkInviteCodes, extractPureCode } from "@/lib/invite-code/utils"

// 获取默认有效期（当前时间 + 23小时），格式为 datetime-local 输入格式
function getDefaultExpiresAt(): string {
  const date = new Date(Date.now() + 23 * 60 * 60 * 1000)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

type InviteCodeRecord = {
  id: string
  code: string
  expiresAt: string | null
  usedAt: string | null
  assignedAt: string | null
  createdAt: string
  issuedToEmail: string | null
  issuedAt: string | null
  queryTokenId: string | null
  preApplication: {
    id: string
    registerEmail: string
    user: { id: string; name: string | null; email: string }
  } | null
  assignedBy: { id: string; name: string | null; email: string } | null
  usedBy: { id: string; name: string | null; email: string } | null
  createdBy: { id: string; name: string | null; email: string } | null
  issuedToUser: { id: string; name: string | null; email: string } | null
}

interface AdminInviteCodesManagerProps {
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
  color?: "primary" | "success" | "warning" | "danger"
  active?: boolean
  onClick?: () => void
}) {
  const colorStyles = {
    primary: "from-primary/20 to-primary/5 text-primary",
    success: "from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    warning: "from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400",
    danger: "from-rose-500/20 to-rose-500/5 text-rose-600 dark:text-rose-400",
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

export function AdminInviteCodesManager({ locale, dict }: AdminInviteCodesManagerProps) {
  const t = dict.admin
  const [records, setRecords] = useState<InviteCodeRecord[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({ unused: 0, used: 0, expired: 0, expiringSoon: 0 })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [statusFilter, setStatusFilter] = useState("unused")
  const [assignmentFilter, setAssignmentFilter] = useState("unassigned")
  const [expiringWithin, setExpiringWithin] = useState("all")
  const [creating, setCreating] = useState(false)
  const [code, setCode] = useState("")
  const [expiresAt, setExpiresAt] = useState(() => getDefaultExpiresAt())
  const [bulkInput, setBulkInput] = useState("")
  const [bulkExpiresAt, setBulkExpiresAt] = useState(() => getDefaultExpiresAt())
  const [importing, setImporting] = useState(false)
  const [issueOpen, setIssueOpen] = useState(false)
  const [issueRecord, setIssueRecord] = useState<InviteCodeRecord | null>(null)
  const [issueTargetType, setIssueTargetType] = useState<"email" | "user">("email")
  const [issueTargetValue, setIssueTargetValue] = useState("")
  const [issueNote, setIssueNote] = useState("")
  const [issuing, setIssuing] = useState(false)
  const [userSearch, setUserSearch] = useState("")
  const [userResults, setUserResults] = useState<
    Array<{ id: string; name: string | null; email: string }>
  >([])
  const [userLoading, setUserLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<{
    id: string
    name: string | null
    email: string
  } | null>(null)
  const [userPickerOpen, setUserPickerOpen] = useState(false)
  const [invalidateOpen, setInvalidateOpen] = useState(false)
  const [invalidateRecord, setInvalidateRecord] = useState<InviteCodeRecord | null>(null)
  const [invalidating, setInvalidating] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [queryTokenDialogOpen, setQueryTokenDialogOpen] = useState(false)
  const [generatedToken, setGeneratedToken] = useState("")
  const [queryTokenExpiry, setQueryTokenExpiry] = useState("")
  const [generatingToken, setGeneratingToken] = useState(false)
  const [tokenCopied, setTokenCopied] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteRecord, setDeleteRecord] = useState<InviteCodeRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false)
  const [batchDeleting, setBatchDeleting] = useState(false)
  const [urlPrefix, setUrlPrefix] = useState("")

  // 获取邀请码链接配置
  useEffect(() => {
    fetch("/api/public/invite-code-config")
      .then((res) => res.json())
      .then((data) => setUrlPrefix(data.inviteCodeUrlPrefix || ""))
      .catch(() => setUrlPrefix(""))
  }, [])

  // 将任何格式的输入转换为完整 URL
  const normalizeInviteCode = (input: string): string => {
    const pureCode = extractPureCode(input)
    if (pureCode) {
      return formatInviteCodeUrl(pureCode, urlPrefix)
    }
    return input.trim()
  }

  const bulkSummary = useMemo(() => {
    return parseBulkInviteCodes(bulkInput, urlPrefix)
  }, [bulkInput, urlPrefix])

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(assignmentFilter !== "all" && { assignment: assignmentFilter }),
        ...(expiringWithin !== "all" && { expiringWithin }),
      })
      const res = await fetch(`/api/admin/invite-codes?${params}`)
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
      console.error("Invite codes fetch error:", error)
      toast.error(t.fetchFailed)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, statusFilter, assignmentFilter, expiringWithin, sortBy, sortOrder])

  const handleSearch = () => {
    setSearch(searchInput)
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

  const getStatus = (record: InviteCodeRecord) => {
    if (record.usedAt)
      return {
        label: t.inviteCodeStatusUsed,
        className: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
      }
    if (record.expiresAt && new Date(record.expiresAt).getTime() <= now) {
      return {
        label: t.inviteCodeStatusExpired,
        className: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
      }
    }
    if (isIssued(record)) {
      return {
        label: t.inviteCodeStatusAssigned,
        className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      }
    }
    return {
      label: t.inviteCodeStatusUnused,
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    }
  }

  const isExpired = (record: InviteCodeRecord) =>
    !!record.expiresAt && new Date(record.expiresAt).getTime() <= now

  const isIssued = (record: InviteCodeRecord) =>
    !!record.preApplication || !!record.issuedToEmail || !!record.issuedToUser

  const getExpiryBadge = (expiresAtValue: string | null) => {
    if (!expiresAtValue) {
      return <span className="text-xs text-muted-foreground">-</span>
    }
    const expiresAtDate = new Date(expiresAtValue)
    const diffMs = expiresAtDate.getTime() - now
    const diffHours = diffMs / (60 * 60 * 1000)
    const label = formatDateTime(expiresAtValue, locale)

    if (diffMs <= 0) {
      return (
        <div className="flex items-center gap-1.5">
          <Ban className="h-3.5 w-3.5 text-rose-500" />
          <span className="text-xs text-rose-600 dark:text-rose-400">{label}</span>
        </div>
      )
    }
    if (diffHours <= 1) {
      return (
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
          <span className="text-xs text-rose-600 dark:text-rose-400">{label}</span>
        </div>
      )
    }
    if (diffHours <= 2) {
      return (
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs text-amber-600 dark:text-amber-400">{label}</span>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    )
  }

  const handleCreate = async () => {
    if (!code.trim()) {
      toast.error(t.inviteCodeRequired)
      return
    }
    setCreating(true)
    try {
      const normalizedCode = normalizeInviteCode(code)
      const payload: { code: string; expiresAt: string } = {
        code: normalizedCode,
        expiresAt: new Date(expiresAt).toISOString(),
      }
      const res = await fetch("/api/admin/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message = resolveApiErrorMessage(data, dict) ?? t.actionFailed
        throw new Error(message)
      }
      setCode("")
      setExpiresAt(getDefaultExpiresAt())
      toast.success(t.inviteCodeCreateButton)
      await fetchRecords()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.actionFailed)
    } finally {
      setCreating(false)
    }
  }

  const handleImport = async () => {
    if (bulkSummary.codes.length === 0) {
      toast.error(t.inviteCodeImportEmpty)
      return
    }
    setImporting(true)
    try {
      const payload: { codes: string[]; expiresAt: string } = {
        codes: bulkSummary.codes,
        expiresAt: new Date(bulkExpiresAt).toISOString(),
      }
      const res = await fetch("/api/admin/invite-codes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message = resolveApiErrorMessage(data, dict) ?? t.actionFailed
        throw new Error(message)
      }
      const data = await res.json()
      toast.success(
        t.inviteCodeImportSuccess
          .replace("{created}", String(data?.createdCount ?? 0))
          .replace("{skipped}", String(data?.skippedCount ?? 0)),
      )
      setBulkInput("")
      setBulkExpiresAt(getDefaultExpiresAt())
      await fetchRecords()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.actionFailed)
    } finally {
      setImporting(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      setBulkInput((prev) => (prev ? `${prev}\n${text}` : text))
    } catch (error) {
      console.error("Invite codes file read error:", error)
      toast.error(t.actionFailed)
    } finally {
      event.target.value = ""
    }
  }

  const updateUsage = async (record: InviteCodeRecord, used: boolean) => {
    try {
      const res = await fetch(`/api/admin/invite-codes/${record.id}/usage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ used }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message = resolveApiErrorMessage(data, dict) ?? t.actionFailed
        throw new Error(message)
      }
      await fetchRecords()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.actionFailed)
    }
  }

  const openIssueDialog = (record: InviteCodeRecord) => {
    setIssueRecord(record)
    setIssueTargetType("email")
    setIssueTargetValue("")
    setIssueNote("")
    setUserSearch("")
    setUserResults([])
    setSelectedUser(null)
    setUserPickerOpen(false)
    setIssueOpen(true)
  }

  const handleIssue = async () => {
    if (!issueRecord) return
    if (issueTargetType === "user" && !selectedUser) {
      toast.error(t.inviteCodeIssueUserRequired)
      return
    }
    if (issueTargetType === "email" && !issueTargetValue.trim()) {
      toast.error(t.inviteCodeIssueEmailRequired)
      return
    }
    setIssuing(true)
    try {
      const payload: {
        recipientType: "email" | "user"
        email?: string
        userId?: string
        note?: string
        locale?: string
      } = {
        recipientType: issueTargetType,
        note: issueNote.trim() || undefined,
        locale,
      }

      if (issueTargetType === "user" && selectedUser) {
        payload.userId = selectedUser.id
      } else {
        payload.email = issueTargetValue.trim()
      }

      const res = await fetch(`/api/admin/invite-codes/${issueRecord.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message = resolveApiErrorMessage(data, dict) ?? t.actionFailed
        throw new Error(message)
      }

      toast.success(t.inviteCodeIssueSuccess)
      setIssueOpen(false)
      setIssueRecord(null)
      setIssueTargetValue("")
      setIssueNote("")
      await fetchRecords()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.actionFailed)
    } finally {
      setIssuing(false)
    }
  }

  useEffect(() => {
    if (!issueOpen || issueTargetType !== "user" || !userPickerOpen) return
    const keyword = userSearch.trim()

    const timer = setTimeout(async () => {
      setUserLoading(true)
      try {
        const params = new URLSearchParams({ page: "1", limit: "10" })
        if (keyword) {
          params.set("search", keyword)
        }
        const res = await fetch(`/api/admin/users?${params}`)
        if (!res.ok) {
          throw new Error("Fetch failed")
        }
        const data = await res.json()
        setUserResults(data.users || [])
      } catch (error) {
        console.error("Invite code user search error:", error)
        setUserResults([])
      } finally {
        setUserLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [issueOpen, issueTargetType, userPickerOpen, userSearch])

  const openInvalidate = (record: InviteCodeRecord) => {
    setInvalidateRecord(record)
    setInvalidateOpen(true)
  }

  const handleInvalidate = async () => {
    if (!invalidateRecord) return
    setInvalidating(true)
    try {
      const res = await fetch(`/api/admin/invite-codes/${invalidateRecord.id}/invalidate`, {
        method: "POST",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message = resolveApiErrorMessage(data, dict) ?? t.actionFailed
        throw new Error(message)
      }
      toast.success(t.inviteCodeInvalidateSuccess)
      setInvalidateOpen(false)
      setInvalidateRecord(null)
      await fetchRecords()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.actionFailed)
    } finally {
      setInvalidating(false)
    }
  }

  const isRowSelectable = (record: InviteCodeRecord) => {
    if (record.usedAt) return false
    if (record.expiresAt && new Date(record.expiresAt).getTime() <= now) return false
    if (record.queryTokenId) return false
    return true
  }

  const handleGenerateQueryToken = async () => {
    if (selectedIds.size === 0) return
    setGeneratingToken(true)
    try {
      const payload: { inviteCodeIds: string[]; expiresAt?: string } = {
        inviteCodeIds: Array.from(selectedIds),
      }
      if (queryTokenExpiry) {
        payload.expiresAt = new Date(queryTokenExpiry).toISOString()
      }
      const res = await fetch("/api/admin/invite-codes/query-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message = resolveApiErrorMessage(data, dict) ?? t.actionFailed
        throw new Error(message)
      }
      const data = await res.json()
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      const queryUrl = `${appUrl}/${locale}/query-invite-codes?queryCode=${data.token}`
      setGeneratedToken(queryUrl)
      setQueryTokenDialogOpen(true)
      setSelectedIds(new Set())
      await fetchRecords()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.actionFailed)
    } finally {
      setGeneratingToken(false)
    }
  }

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(generatedToken)
      setTokenCopied(true)
      toast.success(t.queryTokenCopied)
      setTimeout(() => setTokenCopied(false), 2000)
    } catch {
      toast.error(t.actionFailed)
    }
  }

  const openDeleteDialog = (record: InviteCodeRecord) => {
    setDeleteRecord(record)
    setDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteRecord) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/invite-codes/${deleteRecord.id}/delete`, {
        method: "POST",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message = resolveApiErrorMessage(data, dict) ?? t.actionFailed
        throw new Error(message)
      }
      toast.success(t.inviteCodeDeleteSuccess || "邀请码已删除")
      setDeleteOpen(false)
      setDeleteRecord(null)
      await fetchRecords()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.actionFailed)
    } finally {
      setDeleting(false)
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return
    setBatchDeleting(true)
    try {
      const res = await fetch("/api/admin/invite-codes/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message = resolveApiErrorMessage(data, dict) ?? t.actionFailed
        throw new Error(message)
      }
      const data = await res.json()
      toast.success(
        (t.inviteCodeBatchDeleteSuccess || "已删除 {count} 个邀请码").replace(
          "{count}",
          data.deleted.toString(),
        ),
      )
      setBatchDeleteOpen(false)
      setSelectedIds(new Set())
      await fetchRecords()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.actionFailed)
    } finally {
      setBatchDeleting(false)
    }
  }

  const columns: Column<InviteCodeRecord>[] = useMemo(
    () => [
      {
        key: "code",
        label: t.inviteCode,
        width: "22%",
        sortable: true,
        render: (record) => (
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                record.usedAt
                  ? "bg-slate-100 text-slate-500 dark:bg-slate-800"
                  : isExpired(record)
                    ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30"
                    : "bg-primary/10 text-primary",
              )}
            >
              <Key className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium font-mono tracking-wide">{record.code}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(record.createdAt, locale)}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: "status",
        label: t.inviteCodeStatus,
        width: "12%",
        render: (record) => {
          const status = getStatus(record)
          return (
            <Badge className={cn("text-xs font-medium", status.className)}>{status.label}</Badge>
          )
        },
      },
      {
        key: "expiresAt",
        label: t.inviteExpiresAt,
        width: "18%",
        sortable: true,
        render: (record) => getExpiryBadge(record.expiresAt),
      },
      {
        key: "usedAt",
        label: t.inviteCodeUsedAt || "使用时间",
        width: "14%",
        sortable: true,
        render: (record) =>
          record.usedAt ? (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs">{formatDateTime(record.usedAt, locale)}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          ),
      },
      {
        key: "createdBy",
        label: t.inviteCodeCreatedBy || "提交人",
        width: "12%",
        render: (record) =>
          record.createdBy ? (
            <div className="flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate text-xs text-muted-foreground">
                {record.createdBy.name || record.createdBy.email}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          ),
      },
      {
        key: "assignedTo",
        label: t.inviteCodeAssignedTo,
        width: "14%",
        render: (record) =>
          record.preApplication ? (
            <div className="min-w-0">
              <p className="truncate text-sm">
                {record.preApplication.user?.name || record.preApplication.user?.email || record.preApplication.registerEmail}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {record.preApplication.registerEmail}
              </p>
            </div>
          ) : record.issuedToUser ? (
            <div className="min-w-0">
              <p className="truncate text-sm">
                {record.issuedToUser?.name || record.issuedToUser?.email}
              </p>
              <p className="text-xs text-muted-foreground">{t.inviteCodeIssuedByAdmin}</p>
            </div>
          ) : record.issuedToEmail ? (
            <div className="min-w-0">
              <p className="truncate text-sm">{record.issuedToEmail}</p>
              <p className="text-xs text-muted-foreground">{t.inviteCodeIssuedByAdmin}</p>
            </div>
          ) : record.usedBy ? (
            <div className="min-w-0">
              <p className="truncate text-sm">{record.usedBy?.name || record.usedBy?.email}</p>
              <p className="text-xs text-muted-foreground">{t.inviteCodeUsedBy}</p>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          ),
      },
      {
        key: "actions",
        label: t.actions,
        width: "12%",
        render: (record) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => openIssueDialog(record)}
              disabled={!!record.usedAt || isExpired(record) || isIssued(record)}
            >
              <Send className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  disabled={!!record.usedAt || isExpired(record)}
                  onClick={() => openInvalidate(record)}
                >
                  <ShieldOff className="mr-2 h-4 w-4" />
                  {t.inviteCodeInvalidate}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateUsage(record, !record.usedAt)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {record.usedAt ? t.inviteCodeMarkUnused : t.inviteCodeMarkUsed}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => openDeleteDialog(record)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t.inviteCodeDelete || "删除"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [t, locale, now],
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
              <Key className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">{t.inviteCodes}</h1>
              <p className="text-muted-foreground">{t.inviteCodesDesc || "管理和发放邀请码"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Ticket}
          label={t.inviteCodeStatusUnused}
          value={stats.unused}
          color="success"
          active={
            statusFilter === "unused" &&
            assignmentFilter === "unassigned" &&
            expiringWithin === "all"
          }
          onClick={() => {
            setStatusFilter("unused")
            setAssignmentFilter("unassigned")
            setExpiringWithin("all")
            setPage(1)
          }}
        />
        <StatCard
          icon={CheckCircle2}
          label={t.inviteCodeStatusUsed}
          value={stats.used}
          color="primary"
          active={statusFilter === "used" && assignmentFilter === "all"}
          onClick={() => {
            setStatusFilter("used")
            setAssignmentFilter("all")
            setExpiringWithin("all")
            setPage(1)
          }}
        />
        <StatCard
          icon={Ban}
          label={t.inviteCodeStatusExpired}
          value={stats.expired}
          color="danger"
          active={statusFilter === "expired" && assignmentFilter === "all"}
          onClick={() => {
            setStatusFilter("expired")
            setAssignmentFilter("all")
            setExpiringWithin("all")
            setPage(1)
          }}
        />
        <StatCard
          icon={AlertTriangle}
          label={t.inviteCodeExpiring2h || "即将过期"}
          value={stats.expiringSoon}
          color="warning"
          active={expiringWithin === "2" && assignmentFilter === "all"}
          onClick={() => {
            setStatusFilter("all")
            setAssignmentFilter("all")
            setExpiringWithin("2")
            setPage(1)
          }}
        />
      </div>

      {/* 批量导入折叠面板 */}
      <Accordion type="single" collapsible className="rounded-xl border bg-card shadow-sm">
        <AccordionItem value="import" className="border-none">
          <AccordionTrigger className="px-5 py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Upload className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="font-medium">{t.inviteCodeImportTitle}</p>
                <p className="text-sm text-muted-foreground">{t.inviteCodeImportDesc}</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
              <div className="space-y-2">
                <Textarea
                  value={bulkInput}
                  onChange={(event) => setBulkInput(event.target.value)}
                  placeholder={t.inviteCodeImportPlaceholder}
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">{t.inviteCodeImportExpiresAt}</Label>
                  <Input
                    type="datetime-local"
                    value={bulkExpiresAt}
                    onChange={(event) => setBulkExpiresAt(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{t.inviteCodeImportFile}</Label>
                  <div className="relative">
                    <Input
                      type="file"
                      accept=".txt,text/plain"
                      onChange={handleFileUpload}
                      className="cursor-pointer"
                    />
                  </div>
                </div>
                <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t.inviteCodeImportMatchedLabel}</span>
                    <span className="font-medium text-emerald-600">{bulkSummary.codes.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t.inviteCodeImportInvalidLabel}</span>
                    <span className="font-medium text-rose-600">{bulkSummary.invalidCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t.inviteCodeImportDuplicatesLabel}
                    </span>
                    <span className="font-medium text-amber-600">{bulkSummary.duplicates}</span>
                  </div>
                </div>
                <Button
                  onClick={handleImport}
                  disabled={importing || bulkSummary.codes.length === 0}
                  className="w-full gap-2"
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t.inviteCodeImporting}
                    </>
                  ) : (
                    <>
                      <FileUp className="h-4 w-4" />
                      {t.inviteCodeImportButton}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* 单个添加卡片 */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">{t.inviteCodeCreateButton}</p>
            <p className="text-sm text-muted-foreground">{t.inviteCodePlaceholder}</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="space-y-2">
            <Label className="text-sm">{t.inviteCode}</Label>
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder={t.inviteCodePlaceholder}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">{t.inviteCodeExpiresAt}</Label>
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              required
            />
          </div>
          <Button
            onClick={handleCreate}
            disabled={creating}
            className="gap-2 shadow-lg shadow-primary/25"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t.saving}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                {t.inviteCodeCreateButton}
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* 搜索和筛选 */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          {/* 搜索行 */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleSearch()
                }}
                placeholder={t.inviteCodeSearchPlaceholder}
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
            <Button variant="outline" onClick={handleSearch} className="shrink-0 gap-2">
              <Search className="h-4 w-4" />
              {t.searchAction}
            </Button>
          </div>

          {/* 筛选行 */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                {t.inviteCodeUsageStatus || "使用状态"}
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.inviteCodeStatusAll}</SelectItem>
                  <SelectItem value="unused">{t.inviteCodeStatusUnused}</SelectItem>
                  <SelectItem value="used">{t.inviteCodeStatusUsed}</SelectItem>
                  <SelectItem value="expired">{t.inviteCodeStatusExpired}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                {t.inviteCodeAssignmentStatus || "分配状态"}
              </Label>
              <Select
                value={assignmentFilter}
                onValueChange={(value) => {
                  setAssignmentFilter(value)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.inviteCodeStatusAll}</SelectItem>
                  <SelectItem value="unassigned">{t.inviteCodeStatusUnassigned}</SelectItem>
                  <SelectItem value="assigned">{t.inviteCodeStatusAssigned}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                {t.inviteCodeExpiringLabel || "即将过期"}
              </Label>
              <Select
                value={expiringWithin}
                onValueChange={(value) => {
                  setExpiringWithin(value)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-28">
                  <SelectValue placeholder={t.inviteCodeExpiringAll} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.inviteCodeExpiringAll}</SelectItem>
                  <SelectItem value="2">{t.inviteCodeExpiring2h}</SelectItem>
                  <SelectItem value="1">{t.inviteCodeExpiring1h}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSearchInput("")
                setSearch("")
                setStatusFilter("unused")
                setAssignmentFilter("unassigned")
                setExpiringWithin("all")
                setPage(1)
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t.reset || "重置"}
            </Button>
          </div>
        </div>
      </Card>

      {/* 批量操作栏 */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-primary/50 bg-primary/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    {selectedIds.size}
                  </div>
                  <span className="text-muted-foreground">
                    {t.queryTokenGenerateDesc?.replace("{count}", selectedIds.size.toString()) ||
                      `已选择 ${selectedIds.size} 个邀请码`}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap">
                      {t.queryTokenExpiry || "查询码有效期"}
                    </Label>
                    <Input
                      type="datetime-local"
                      value={queryTokenExpiry}
                      onChange={(e) => setQueryTokenExpiry(e.target.value)}
                      className="w-auto"
                    />
                  </div>
                  <Button
                    onClick={handleGenerateQueryToken}
                    disabled={generatingToken}
                    className="gap-2"
                  >
                    {generatingToken ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    {generatingToken ? t.saving : t.queryTokenGenerate || "生成查询码"}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setBatchDeleteOpen(true)}
                    disabled={batchDeleting}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t.inviteCodeBatchDelete || "批量删除"}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 数据表格 */}
      <Card className="overflow-hidden">
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
          emptyMessage={
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Ticket className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mt-4 font-medium text-muted-foreground">{t.inviteCodeNoRecords}</p>
              <p className="mt-1 text-sm text-muted-foreground/70">
                {t.inviteCodeNoRecordsHint || "尝试调整筛选条件或导入新的邀请码"}
              </p>
            </div>
          }
          loadingText={t.loading}
          perPageText={t.perPage}
          summaryFormatter={formatPageSummary}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          isRowSelectable={isRowSelectable}
          mobileCardRender={(record) => {
            const status = getStatus(record)
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
                      record.usedAt
                        ? "bg-slate-100 text-slate-500 dark:bg-slate-800"
                        : isExpired(record)
                          ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30"
                          : "bg-primary/10 text-primary",
                    )}
                  >
                    <Key className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-medium font-mono">{record.code}</p>
                      <Badge className={cn("shrink-0 text-xs", status.className)}>
                        {status.label}
                      </Badge>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {t.inviteExpiresAt}: {formatDateTime(record.expiresAt, locale)}
                        </span>
                      </div>
                      {record.usedAt && (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span>{formatDateTime(record.usedAt, locale)}</span>
                        </div>
                      )}
                    </div>
                    {(record.preApplication || record.issuedToUser || record.issuedToEmail) && (
                      <p className="mt-2 truncate text-xs text-muted-foreground">
                        {record.preApplication
                          ? record.preApplication.user?.name || record.preApplication.user?.email || record.preApplication.registerEmail
                          : record.issuedToUser
                            ? record.issuedToUser?.name || record.issuedToUser?.email
                            : record.issuedToEmail}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1.5 text-xs"
                        onClick={() => openIssueDialog(record)}
                        disabled={!!record.usedAt || isExpired(record) || isIssued(record)}
                      >
                        <Send className="h-3 w-3" />
                        {t.inviteCodeIssue}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1.5 text-xs"
                        onClick={() => openInvalidate(record)}
                        disabled={!!record.usedAt || isExpired(record)}
                      >
                        <ShieldOff className="h-3 w-3" />
                        {t.inviteCodeInvalidate}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1.5 text-xs"
                        onClick={() => updateUsage(record, !record.usedAt)}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {record.usedAt ? t.inviteCodeMarkUnused : t.inviteCodeMarkUsed}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          }}
        />
      </Card>

      {/* 发放对话框 */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>{t.inviteCodeIssueTitle}</DialogTitle>
                <DialogDescription>{t.inviteCodeIssueDesc}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>{t.inviteCodeIssueTargetType}</Label>
              <Select
                value={issueTargetType}
                onValueChange={(value) => {
                  const next = value as "email" | "user"
                  setIssueTargetType(next)
                  setIssueTargetValue("")
                  setUserSearch("")
                  setUserResults([])
                  setSelectedUser(null)
                  setUserPickerOpen(false)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">{t.inviteCodeIssueTargetEmail}</SelectItem>
                  <SelectItem value="user">{t.inviteCodeIssueTargetUser}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                {issueTargetType === "user"
                  ? t.inviteCodeIssueTargetUserId
                  : t.inviteCodeIssueTargetEmail}
              </Label>
              {issueTargetType === "user" ? (
                <div className="space-y-2">
                  <Popover open={userPickerOpen} onOpenChange={setUserPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between">
                        {selectedUser ? (
                          <span>{selectedUser.name || selectedUser.email}</span>
                        ) : (
                          <span className="text-muted-foreground">
                            {t.inviteCodeIssueSelectUserPlaceholder}
                          </span>
                        )}
                        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder={t.inviteCodeIssueSearchPlaceholder}
                          value={userSearch}
                          onValueChange={setUserSearch}
                        />
                        <CommandList>
                          {userLoading && (
                            <CommandEmpty>{t.inviteCodeIssueSearchLoading}</CommandEmpty>
                          )}
                          {!userLoading && userResults.length === 0 && (
                            <CommandEmpty>{t.inviteCodeIssueSearchEmpty}</CommandEmpty>
                          )}
                          {userResults.map((user) => {
                            const label = user.name || user.email
                            const selected = selectedUser?.id === user.id
                            return (
                              <CommandItem
                                key={user.id}
                                value={`${label} ${user.email}`}
                                onSelect={() => {
                                  setSelectedUser(user)
                                  setIssueTargetValue(user.id)
                                  setUserPickerOpen(false)
                                }}
                              >
                                <CheckIcon
                                  className={`mr-2 size-4 ${selected ? "opacity-100" : "opacity-0"}`}
                                />
                                <div className="flex flex-col">
                                  <span className="text-sm">{label}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {user.email}
                                  </span>
                                </div>
                              </CommandItem>
                            )
                          })}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {selectedUser && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-fit"
                      onClick={() => {
                        setSelectedUser(null)
                        setIssueTargetValue("")
                      }}
                    >
                      {t.inviteCodeIssueClearUser}
                    </Button>
                  )}
                </div>
              ) : (
                <Input
                  value={issueTargetValue}
                  onChange={(event) => setIssueTargetValue(event.target.value)}
                  placeholder={t.inviteCodeIssueTargetEmailPlaceholder}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>{t.inviteCodeIssueNote}</Label>
              <Textarea
                value={issueNote}
                onChange={(event) => setIssueNote(event.target.value)}
                placeholder={t.inviteCodeIssueNotePlaceholder}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleIssue} disabled={issuing} className="gap-2">
              {issuing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {issuing ? t.saving : t.inviteCodeIssueSubmit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={invalidateOpen}
        onOpenChange={(open) => {
          setInvalidateOpen(open)
          if (!open && !invalidating) {
            setInvalidateRecord(null)
          }
        }}
        title={t.inviteCodeInvalidateTitle}
        description={t.inviteCodeInvalidateDesc}
        confirmLabel={t.inviteCodeInvalidate}
        cancelLabel={t.cancel}
        confirming={invalidating}
        destructive
        onConfirm={handleInvalidate}
      />

      <Dialog open={queryTokenDialogOpen} onOpenChange={setQueryTokenDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>{t.queryTokenResult || "查询码"}</DialogTitle>
                <DialogDescription>
                  {t.queryTokenGenerateSuccess || "查询码已生成，请复制并发送给用户"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <Input value={generatedToken} readOnly className="flex-1 font-mono text-sm" />
              <Button variant="outline" size="icon" onClick={handleCopyToken}>
                {tokenCopied ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {t.queryTokenSelectHint || "用户可直接点击此链接查看邀请码"}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setQueryTokenDialogOpen(false)}>{t.confirm || "确定"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open)
          if (!open && !deleting) {
            setDeleteRecord(null)
          }
        }}
        title={t.inviteCodeDeleteTitle || "删除邀请码"}
        description={t.inviteCodeDeleteDesc || "确定要删除此邀请码吗？此操作不可撤销。"}
        confirmLabel={t.inviteCodeDelete || "删除"}
        cancelLabel={t.cancel}
        confirming={deleting}
        destructive
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={batchDeleteOpen}
        onOpenChange={(open) => {
          setBatchDeleteOpen(open)
        }}
        title={t.inviteCodeBatchDeleteTitle || "批量删除邀请码"}
        description={(
          t.inviteCodeBatchDeleteDesc || "确定要删除选中的 {count} 个邀请码吗？此操作不可撤销。"
        ).replace("{count}", selectedIds.size.toString())}
        confirmLabel={t.inviteCodeBatchDelete || "批量删除"}
        cancelLabel={t.cancel}
        confirming={batchDeleting}
        destructive
        onConfirm={handleBatchDelete}
      />
    </div>
  )
}
