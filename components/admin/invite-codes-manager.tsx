"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
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
  issuedToUser: { id: string; name: string | null; email: string } | null
}

interface AdminInviteCodesManagerProps {
  locale: Locale
  dict: Dictionary
}

export function AdminInviteCodesManager({ locale, dict }: AdminInviteCodesManagerProps) {
  const t = dict.admin
  const [records, setRecords] = useState<InviteCodeRecord[]>([])
  const [total, setTotal] = useState(0)
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
  const [expiresAt, setExpiresAt] = useState("")
  const [bulkInput, setBulkInput] = useState("")
  const [bulkExpiresAt, setBulkExpiresAt] = useState("")
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

  const inviteCodePattern = /(?:https?:\/\/linux\.do)?\/?invites\/([A-Za-z0-9_-]{4,64})/i

  // 将任何格式的输入转换为完整 URL
  const normalizeInviteCode = (input: string): string => {
    const trimmed = input.trim()
    const match = trimmed.match(inviteCodePattern)
    if (match?.[1]) {
      // 提取到邀请码，转换为完整 URL
      return `https://linux.do/invites/${match[1]}`
    }
    // 如果只是纯邀请码（没有 invites/ 前缀），直接拼接
    if (/^[A-Za-z0-9_-]{4,64}$/.test(trimmed)) {
      return `https://linux.do/invites/${trimmed}`
    }
    return trimmed // 返回原始输入让后端验证
  }

  const bulkSummary = useMemo(() => {
    const lines = bulkInput.split(/\r?\n/)
    const matches: string[] = []
    let invalidCount = 0
    let totalCount = 0

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line) continue
      totalCount += 1
      const match = line.match(inviteCodePattern)
      if (match?.[1]) {
        // 转换为完整 URL 格式
        matches.push(`https://linux.do/invites/${match[1]}`)
      } else if (/^[A-Za-z0-9_-]{4,64}$/.test(line)) {
        // 如果是纯邀请码，也转换为完整 URL
        matches.push(`https://linux.do/invites/${line}`)
      } else {
        invalidCount += 1
      }
    }

    const unique = Array.from(new Set(matches))
    return {
      totalCount,
      invalidCount,
      duplicates: Math.max(0, matches.length - unique.length),
      codes: unique,
    }
  }, [bulkInput])

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
    } catch (error) {
      console.error("Invite codes fetch error:", error)
      toast.error(t.fetchFailed)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [page, pageSize, search, statusFilter, assignmentFilter, expiringWithin, sortBy, sortOrder])

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  const formatPageSummary = (summary: { total: number; page: number; totalPages: number }) =>
    t.pageSummary
      .replace("{total}", summary.total.toString())
      .replace("{page}", summary.page.toString())
      .replace("{totalPages}", summary.totalPages.toString())

  const getStatus = (record: InviteCodeRecord) => {
    if (record.usedAt)
      return { label: t.inviteCodeStatusUsed, className: "bg-slate-200 text-slate-700" }
    if (record.expiresAt && new Date(record.expiresAt).getTime() <= now) {
      return { label: t.inviteCodeStatusExpired, className: "bg-rose-100 text-rose-700" }
    }
    // 已发放状态
    if (isIssued(record)) {
      return { label: t.inviteCodeStatusAssigned, className: "bg-blue-100 text-blue-700" }
    }
    return { label: t.inviteCodeStatusUnused, className: "bg-emerald-100 text-emerald-700" }
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
    const label = expiresAtDate.toLocaleString(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })

    if (diffMs <= 0) {
      return <Badge className="bg-rose-100 text-rose-700 text-xs">{label}</Badge>
    }
    if (diffHours <= 1) {
      return <Badge className="bg-rose-50 text-rose-700 text-xs">{label}</Badge>
    }
    if (diffHours <= 2) {
      return <Badge className="bg-amber-50 text-amber-700 text-xs">{label}</Badge>
    }
    return <Badge variant="outline" className="text-xs">{label}</Badge>
  }

  const handleCreate = async () => {
    if (!code.trim()) {
      toast.error(t.inviteCodeRequired)
      return
    }
    setCreating(true)
    try {
      const normalizedCode = normalizeInviteCode(code)
      const payload: { code: string; expiresAt?: string } = { code: normalizedCode }
      if (expiresAt) {
        payload.expiresAt = new Date(expiresAt).toISOString()
      }
      const res = await fetch("/api/admin/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || t.actionFailed)
      }
      setCode("")
      setExpiresAt("")
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
      const payload: { codes: string[]; expiresAt?: string } = { codes: bulkSummary.codes }
      if (bulkExpiresAt) {
        payload.expiresAt = new Date(bulkExpiresAt).toISOString()
      }
      const res = await fetch("/api/admin/invite-codes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || t.actionFailed)
      }
      const data = await res.json()
      toast.success(
        t.inviteCodeImportSuccess
          .replace("{created}", String(data?.createdCount ?? 0))
          .replace("{skipped}", String(data?.skippedCount ?? 0)),
      )
      setBulkInput("")
      setBulkExpiresAt("")
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
        throw new Error(data?.error || t.actionFailed)
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
        throw new Error(data?.error || t.actionFailed)
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
        throw new Error(data?.error || t.actionFailed)
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
        throw new Error(data?.error || t.actionFailed)
      }
      const data = await res.json()
      setGeneratedToken(data.token)
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

  const columns: Column<InviteCodeRecord>[] = useMemo(
    () => [
      {
        key: "code",
        label: t.inviteCode,
        width: "25%",
        sortable: true,
        render: (record) => (
          <div className="space-y-0.5">
            <p className="text-sm font-medium font-mono tracking-wide">{record.code}</p>
            {record.issuedAt && (
              <p className="text-xs text-muted-foreground">
                {new Date(record.issuedAt).toLocaleString(locale, {
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
        ),
      },
      {
        key: "status",
        label: t.inviteCodeStatus,
        width: "15%",
        render: (record) => {
          const status = getStatus(record)
          return (
            <div className="space-y-1">
              <Badge className={cn("text-xs", status.className)}>{status.label}</Badge>
              {record.usedBy && record.usedAt && (
                <p className="text-xs text-muted-foreground">
                  {new Date(record.usedAt).toLocaleString(locale, {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          )
        },
      },
      {
        key: "expiresAt",
        label: t.inviteExpiresAt,
        width: "20%",
        sortable: true,
        render: (record) => getExpiryBadge(record.expiresAt),
      },
      {
        key: "assignedTo",
        label: t.inviteCodeAssignedTo,
        width: "28%",
        render: (record) =>
          record.preApplication ? (
            <div className="space-y-0.5">
              <p className="text-sm">
                {record.preApplication.user.name || record.preApplication.user.email}
              </p>
              <p className="text-xs text-muted-foreground">{record.preApplication.registerEmail}</p>
            </div>
          ) : record.issuedToUser ? (
            <div className="space-y-0.5">
              <p className="text-sm">{record.issuedToUser.name || record.issuedToUser.email}</p>
              <p className="text-xs text-muted-foreground">{t.inviteCodeIssuedByAdmin}</p>
            </div>
          ) : record.issuedToEmail ? (
            <div className="space-y-0.5">
              <p className="text-sm">{record.issuedToEmail}</p>
              <p className="text-xs text-muted-foreground">{t.inviteCodeIssuedByAdmin}</p>
            </div>
          ) : record.usedBy ? (
            <div className="space-y-0.5">
              <p className="text-sm">{record.usedBy.name || record.usedBy.email}</p>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={!!record.usedAt || isExpired(record) || isIssued(record)}
                onClick={() => openIssueDialog(record)}
              >
                <Send className="mr-2 h-4 w-4" />
                {t.inviteCodeIssue}
              </DropdownMenuItem>
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
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [t, locale, now],
  )

  return (
    <div className="space-y-6">
      <Accordion type="single" collapsible className="rounded-lg border">
        <AccordionItem value="import" className="border-none">
          <AccordionTrigger className="px-4">
            <div className="space-y-1 text-left">
              <p className="text-sm font-medium">{t.inviteCodeImportTitle}</p>
              <p className="text-xs text-muted-foreground">{t.inviteCodeImportDesc}</p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4">
            <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
              <div className="space-y-2">
                <Textarea
                  value={bulkInput}
                  onChange={(event) => setBulkInput(event.target.value)}
                  placeholder={t.inviteCodeImportPlaceholder}
                  rows={6}
                />
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.inviteCodeImportExpiresAt}</label>
                  <Input
                    type="datetime-local"
                    value={bulkExpiresAt}
                    onChange={(event) => setBulkExpiresAt(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.inviteCodeImportFile}</label>
                  <Input type="file" accept=".txt,text/plain" onChange={handleFileUpload} />
                </div>
                <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  <p>
                    {t.inviteCodeImportMatched.replace(
                      "{count}",
                      bulkSummary.codes.length.toString(),
                    )}
                  </p>
                  <p>
                    {t.inviteCodeImportInvalid.replace(
                      "{count}",
                      bulkSummary.invalidCount.toString(),
                    )}
                  </p>
                  <p>
                    {t.inviteCodeImportDuplicates.replace(
                      "{count}",
                      bulkSummary.duplicates.toString(),
                    )}
                  </p>
                </div>
                <Button
                  onClick={handleImport}
                  disabled={importing || bulkSummary.codes.length === 0}
                >
                  {importing ? t.inviteCodeImporting : t.inviteCodeImportButton}
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Card className="p-4">
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t.inviteCode}</label>
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder={t.inviteCodePlaceholder}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t.inviteCodeExpiresAt}</label>
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </div>
          <Button onClick={handleCreate} disabled={creating} className="md:w-auto">
            {creating ? t.saving : t.inviteCodeCreateButton}
          </Button>
        </div>
      </Card>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
          <div className="relative md:w-72">
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSearch()
              }}
              placeholder={t.inviteCodeSearchPlaceholder}
              className="pr-8"
            />
            {searchInput && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
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
          <Button variant="outline" onClick={handleSearch}>
            {t.searchAction}
          </Button>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t.inviteCodeUsageStatus || "使用状态"}
            </label>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="md:w-44">
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
            <label className="text-xs font-medium text-muted-foreground">
              {t.inviteCodeAssignmentStatus || "分配状态"}
            </label>
            <Select
              value={assignmentFilter}
              onValueChange={(value) => {
                setAssignmentFilter(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="md:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.inviteCodeStatusAll}</SelectItem>
                <SelectItem value="unassigned">{t.inviteCodeStatusUnassigned}</SelectItem>
                <SelectItem value="assigned">{t.inviteCodeStatusAssigned}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Select
            value={expiringWithin}
            onValueChange={(value) => {
              setExpiringWithin(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="md:w-44">
              <SelectValue placeholder={t.inviteCodeExpiringAll} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.inviteCodeExpiringAll}</SelectItem>
              <SelectItem value="2">{t.inviteCodeExpiring2h}</SelectItem>
              <SelectItem value="1">{t.inviteCodeExpiring1h}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput("")
              setSearch("")
              setStatusFilter("unused")
              setAssignmentFilter("unassigned")
              setExpiringWithin("all")
              setPage(1)
            }}
          >
            {t.reset || "重置"}
          </Button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {t.queryTokenGenerateDesc?.replace("{count}", selectedIds.size.toString()) ||
              `已选择 ${selectedIds.size} 个邀请码`}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm">{t.queryTokenExpiry || "查询码有效期"}</span>
              <Input
                type="datetime-local"
                value={queryTokenExpiry}
                onChange={(e) => setQueryTokenExpiry(e.target.value)}
                className="w-auto"
              />
            </div>
            <Button onClick={handleGenerateQueryToken} disabled={generatingToken}>
              {generatingToken ? t.saving : t.queryTokenGenerate || "生成查询码"}
            </Button>
          </div>
        </Card>
      )}

      <DataTable
        columns={columns}
        data={records}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        loading={loading}
        emptyMessage={t.inviteCodeNoRecords}
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
            <Card className="p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium font-mono truncate">{record.code}</p>
                <Badge className={cn("text-xs", status.className)}>{status.label}</Badge>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t.inviteExpiresAt}:</span>
                {getExpiryBadge(record.expiresAt)}
              </div>
              {(record.preApplication || record.issuedToUser || record.issuedToEmail) && (
                <div className="mt-1.5 text-xs text-muted-foreground truncate">
                  {record.preApplication
                    ? record.preApplication.user.name || record.preApplication.user.email
                    : record.issuedToUser
                      ? record.issuedToUser.name || record.issuedToUser.email
                      : record.issuedToEmail}
                </div>
              )}
              <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  variant="outline"
                  onClick={() => updateUsage(record, !record.usedAt)}
                >
                  {record.usedAt ? t.inviteCodeMarkUnused : t.inviteCodeMarkUsed}
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  variant="outline"
                  onClick={() => openIssueDialog(record)}
                  disabled={!!record.usedAt || isExpired(record) || isIssued(record)}
                >
                  {t.inviteCodeIssue}
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  variant="outline"
                  onClick={() => openInvalidate(record)}
                  disabled={!!record.usedAt || isExpired(record)}
                >
                  {t.inviteCodeInvalidate}
                </Button>
              </div>
            </Card>
          )
        }}
      />

      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.inviteCodeIssueTitle}</DialogTitle>
            <DialogDescription>{t.inviteCodeIssueDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
            <Button onClick={handleIssue} disabled={issuing}>
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
            <DialogTitle>{t.queryTokenResult || "查询码"}</DialogTitle>
            <DialogDescription>
              {t.queryTokenGenerateSuccess || "查询码已生成，请复制并发送给用户"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                value={generatedToken}
                readOnly
                className="flex-1 font-mono text-lg tracking-widest"
              />
              <Button variant="outline" size="icon" onClick={handleCopyToken}>
                {tokenCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {t.queryTokenSelectHint || "用户可在查询页面使用此查询码查看邀请码"}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setQueryTokenDialogOpen(false)}>{t.confirm || "确定"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
