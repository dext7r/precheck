"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { X } from "lucide-react"
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
import { cn } from "@/lib/utils"

type AdminPreApplication = {
  id: string
  essay: string
  source: string | null
  sourceDetail: string | null
  registerEmail: string
  queryToken: string | null
  group: string
  status: "PENDING" | "APPROVED" | "REJECTED" | "DISPUTED"
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
  status: "PENDING" | "APPROVED" | "REJECTED" | "DISPUTED"
  guidance: string | null
  reviewedAt: string | null
  createdAt: string
  reviewedBy: { id: string; name: string | null; email: string } | null
}

interface AdminPreApplicationsTableProps {
  locale: Locale
  dict: Dictionary
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
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [statusFilter, setStatusFilter] = useState<string[]>(["PENDING", "DISPUTED"])
  const [registerEmailFilter, setRegisterEmailFilter] = useState("")
  const [registerEmailInput, setRegisterEmailInput] = useState("")
  const [queryTokenFilter, setQueryTokenFilter] = useState("")
  const [queryTokenInput, setQueryTokenInput] = useState("")
  const [reviewRoundFilter, setReviewRoundFilter] = useState("ALL")
  const [inviteStatusFilter, setInviteStatusFilter] = useState("none")
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

  useEffect(() => {
    if (reviewAction === "REJECT") {
      setInviteCode("")
      setInviteExpiresAt("")
    }
  }, [reviewAction])

  useEffect(() => {
    // PENDING 和 DISPUTED 状态切换审核动作时自动填充模板第一条
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
    // PENDING 和 DISPUTED 状态审核通过或有争议时加载邀请码选项
    if (!dialogOpen || reviewAction === "REJECT") return
    if (selected?.status !== "PENDING" && selected?.status !== "DISPUTED") return
    loadInviteOptions()
  }, [dialogOpen, reviewAction, selected?.status])

  useEffect(() => {
    // 加载审核模板
    loadReviewTemplates()
  }, [])

  const fetchRecords = async () => {
    setLoading(true)
    try {
      // 映射前端排序字段到API字段
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
    } catch (error) {
      console.error("Pre-application list error:", error)
      toast.error(t.fetchFailed)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
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

  const statusBadge = (status: AdminPreApplication["status"]) => {
    const map: Record<string, { label: string; className: string }> = {
      PENDING: { label: t.pending, className: "bg-amber-100 text-amber-800 text-xs" },
      APPROVED: { label: t.approved, className: "bg-emerald-100 text-emerald-700 text-xs" },
      REJECTED: { label: t.rejected, className: "bg-rose-100 text-rose-700 text-xs" },
      DISPUTED: {
        label: t.disputed || "有争议",
        className: "bg-purple-100 text-purple-700 text-xs",
      },
    }
    const config = map[status] || map.PENDING
    return <Badge className={config.className}>{config.label}</Badge>
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
      // 过滤掉已过期的邀请码
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
    // PENDING 和 DISPUTED 状态都可以审核
    if (record.status === "PENDING" || record.status === "DISPUTED") {
      setReviewAction("APPROVE")
      setGuidance(record.guidance || "")
      setInviteCode("")
      setInviteExpiresAt("")
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
        throw new Error(data?.error || t.actionFailed)
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

  const columns: Column<AdminPreApplication>[] = useMemo(
    () => [
      {
        key: "user",
        label: t.preApplicationUser,
        width: "28%",
        render: (record) => (
          <div className="space-y-0.5">
            <p className="text-sm font-medium">{record.user.name || record.user.email}</p>
            <p className="text-xs text-muted-foreground">{record.registerEmail}</p>
          </div>
        ),
      },
      {
        key: "status",
        label: t.preApplicationStatus,
        width: "20%",
        sortable: true,
        render: (record) => (
          <div className="flex flex-wrap items-center gap-1.5">
            {statusBadge(record.status)}
            <Badge variant="outline" className="text-xs">
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
              "text-xs",
              record.inviteCode ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600",
            )}
          >
            {record.inviteCode ? t.inviteStatusIssued : t.inviteStatusNone}
          </Badge>
        ),
      },
      {
        key: "createdAt",
        label: t.preApplicationCreatedAt,
        width: "18%",
        sortable: true,
        render: (record) => (
          <span className="text-xs text-muted-foreground">
            {new Date(record.createdAt).toLocaleString(locale, {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        ),
      },
      {
        key: "actions",
        label: t.actions,
        width: "12%",
        render: (record) => (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => openDialog(record)}
          >
            {record.status === "PENDING" || record.status === "DISPUTED"
              ? t.preApplicationReviewAction
              : t.preApplicationView}
          </Button>
        ),
      },
    ],
    [t, locale],
  )

  return (
    <div className="space-y-3">
      {/* 精简筛选栏 */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* 搜索输入框组 */}
        <div className="relative">
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSearch()
            }}
            placeholder={t.searchUsers}
            className="h-8 w-32 pr-6 text-xs"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("")
                setSearch("")
                setPage(1)
              }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="relative">
          <Input
            value={registerEmailInput}
            onChange={(event) => setRegisterEmailInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setRegisterEmailFilter(registerEmailInput)
                setPage(1)
              }
            }}
            placeholder={t.preApplicationRegisterEmail}
            className="h-8 w-36 pr-6 text-xs"
          />
          {registerEmailInput && (
            <button
              type="button"
              onClick={() => {
                setRegisterEmailInput("")
                setRegisterEmailFilter("")
                setPage(1)
              }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="relative">
          <Input
            value={queryTokenInput}
            onChange={(event) => setQueryTokenInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setQueryTokenFilter(queryTokenInput)
                setPage(1)
              }
            }}
            placeholder={t.preApplicationQueryToken}
            className="h-8 w-28 pr-6 text-xs"
          />
          {queryTokenInput && (
            <button
              type="button"
              onClick={() => {
                setQueryTokenInput("")
                setQueryTokenFilter("")
                setPage(1)
              }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="h-4 w-px bg-border" />

        {/* 状态多选下拉 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
              {statusFilter.length === 0
                ? t.statusAll
                : statusFilter.length === 4
                  ? t.statusAll
                  : `${statusFilter.length} ${t.selected || "项"}`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-32">
            {[
              { value: "PENDING", label: t.pending },
              { value: "DISPUTED", label: t.disputed || "有争议" },
              { value: "APPROVED", label: t.approved },
              { value: "REJECTED", label: t.rejected },
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
                className="text-xs"
              >
                {item.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Select
          value={reviewRoundFilter}
          onValueChange={(value) => {
            setReviewRoundFilter(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="h-8 w-20 text-xs">
            <SelectValue placeholder={t.reviewRound} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">
              {t.statusAll}
            </SelectItem>
            <SelectItem value="1" className="text-xs">
              {t.reviewRoundLabel?.replace("{n}", "1") ?? "1审"}
            </SelectItem>
            <SelectItem value="2" className="text-xs">
              {t.reviewRoundLabel?.replace("{n}", "2") ?? "2审"}
            </SelectItem>
            <SelectItem value="3" className="text-xs">
              {t.reviewRoundLabel?.replace("{n}", "3") ?? "3审"}
            </SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={inviteStatusFilter}
          onValueChange={(value) => {
            setInviteStatusFilter(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="h-8 w-24 text-xs">
            <SelectValue placeholder={t.inviteStatus} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">
              {t.statusAll}
            </SelectItem>
            <SelectItem value="issued" className="text-xs">
              {t.inviteStatusIssued}
            </SelectItem>
            <SelectItem value="none" className="text-xs">
              {t.inviteStatusNone}
            </SelectItem>
          </SelectContent>
        </Select>

        <div className="h-4 w-px bg-border" />

        {/* 操作按钮组 */}
        <Button
          variant="default"
          size="sm"
          className="h-8 px-3 text-xs"
          onClick={() => {
            setSearch(searchInput)
            setRegisterEmailFilter(registerEmailInput)
            setQueryTokenFilter(queryTokenInput)
            setPage(1)
          }}
        >
          {t.searchAction}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => {
            setSearchInput("")
            setSearch("")
            setRegisterEmailInput("")
            setRegisterEmailFilter("")
            setQueryTokenInput("")
            setQueryTokenFilter("")
            setStatusFilter(["PENDING", "DISPUTED"])
            setReviewRoundFilter("ALL")
            setInviteStatusFilter("none")
            setPage(1)
          }}
        >
          {t.reset}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={records}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSort={(key, direction) => {
          setSortBy(key)
          setSortOrder(direction)
        }}
        loading={loading}
        emptyMessage={t.noPreApplications}
        loadingText={t.loading}
        perPageText={t.perPage}
        summaryFormatter={formatPageSummary}
        mobileCardRender={(record) => (
          <Card className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {record.user.name || record.user.email}
                </p>
                <p className="text-xs text-muted-foreground truncate">{record.registerEmail}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {statusBadge(record.status)}
                <Badge variant="outline" className="text-xs">
                  {t.reviewRoundLabel?.replace("{n}", String(record.reviewRound ?? 1)) ??
                    `${record.reviewRound ?? 1}审`}
                </Badge>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <Badge
                className={cn(
                  "text-xs",
                  record.inviteCode
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-600",
                )}
              >
                {record.inviteCode ? t.inviteStatusIssued : t.inviteStatusNone}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(record.createdAt).toLocaleString(locale, {
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <Button
              className="mt-2 w-full h-8 text-xs"
              variant="outline"
              onClick={() => openDialog(record)}
            >
              {record.status === "PENDING" || record.status === "DISPUTED"
                ? t.preApplicationReviewAction
                : t.preApplicationView}
            </Button>
          </Card>
        )}
      />

      <Drawer open={dialogOpen} onOpenChange={setDialogOpen} direction="right">
        <DrawerContent className="h-full data-[vaul-drawer-direction=right]:w-[88vw] data-[vaul-drawer-direction=right]:sm:max-w-xl">
          <DrawerHeader className="sticky top-0 z-10 border-b bg-background px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle className="text-base">{t.reviewApplication}</DrawerTitle>
                <DrawerDescription className="text-xs">{t.reviewApplicationDesc}</DrawerDescription>
              </div>
              {selected && statusBadge(selected.status)}
            </div>
          </DrawerHeader>

          {selected && (
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {/* 申请人信息卡片 */}
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">{t.preApplicationUser}</span>
                    <p className="font-medium truncate">
                      {selected.user.name || selected.user.email}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t.preApplicationRegisterEmail}</span>
                    <p className="font-medium truncate">{selected.registerEmail}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t.preApplicationGroup}</span>
                    <p className="font-medium">{getGroupLabel(selected.group)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t.preApplicationSource}</span>
                    <p className="font-medium">{getSourceLabel(selected.source)}</p>
                  </div>
                  {selected.sourceDetail && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">{t.preApplicationSourceDetail}</span>
                      <p className="font-medium">{selected.sourceDetail}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">{t.preApplicationQueryToken}</span>
                    <p className="font-medium font-mono text-[10px]">
                      {selected.queryToken || "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 申请理由 */}
              <Accordion type="multiple" defaultValue={["essay"]} className="rounded-lg border">
                <AccordionItem value="essay" className="border-none">
                  <AccordionTrigger className="px-3 py-2 text-xs font-medium hover:no-underline">
                    {t.preApplicationEssay}
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3">
                    <div className="rounded border bg-card p-3 text-sm">
                      <PostContent content={selected.essay} emptyMessage={t.preApplicationEssay} />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* 审核历史 */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {dict.preApplication.historyTitle}
                </p>
                {historyLoading && <p className="text-xs text-muted-foreground">{t.loading}</p>}
                {!historyLoading && historyRecords.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">
                    {dict.preApplication.historyEmpty}
                  </p>
                )}
                {!historyLoading && historyRecords.length > 0 && (
                  <Accordion type="multiple" className="rounded-lg border">
                    {historyRecords.map((item) => (
                      <AccordionItem
                        key={item.id}
                        value={item.id}
                        className="border-b last:border-none"
                      >
                        <AccordionTrigger className="px-3 py-2 text-xs hover:no-underline">
                          <div className="flex flex-1 items-center justify-between gap-2 pr-2">
                            <span className="text-muted-foreground">
                              {t.reviewRoundLabel?.replace("{n}", String(item.version)) ??
                                `${item.version}审`}
                              {" · "}
                              {new Date(item.createdAt).toLocaleDateString(locale)}
                            </span>
                            {statusBadge(item.status)}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-2 px-3 pb-3">
                          <div className="rounded border bg-muted/30 p-2 text-xs">
                            <PostContent
                              content={item.essay}
                              emptyMessage={t.preApplicationEssay}
                            />
                          </div>
                          {item.reviewedAt ? (
                            <div className="space-y-0.5 text-[10px] text-muted-foreground">
                              <p>
                                {t.preApplicationReviewer}：
                                {item.reviewedBy?.name || item.reviewedBy?.email || "-"}
                              </p>
                              <p>
                                {dict.preApplication.review.reviewedAt}：
                                {new Date(item.reviewedAt).toLocaleString(locale)}
                              </p>
                              <p className="whitespace-pre-wrap">
                                {dict.preApplication.review.guidance}：{item.guidance || "-"}
                              </p>
                            </div>
                          ) : (
                            <p className="text-[10px] text-muted-foreground italic">
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
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {t.preApplicationReviewer}：
                    {selected.reviewedBy.name || selected.reviewedBy.email}
                  </span>
                </div>
              )}

              {/* 审核操作表单 */}
              {selected.status === "PENDING" || selected.status === "DISPUTED" ? (
                <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">{t.reviewAction}</Label>
                      <Select
                        value={reviewAction}
                        onValueChange={(value) =>
                          setReviewAction(value as "APPROVE" | "REJECT" | "DISPUTE")
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="APPROVE" className="text-xs">
                            {t.reviewApprove}
                          </SelectItem>
                          <SelectItem value="REJECT" className="text-xs">
                            {t.reviewReject}
                          </SelectItem>
                          <SelectItem value="DISPUTE" className="text-xs">
                            {t.reviewDispute || "标记有争议"}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {reviewAction !== "REJECT" && (
                      <div className="space-y-1">
                        <Label className="text-xs">{t.inviteCode}</Label>
                        <Select
                          value={inviteCode}
                          onValueChange={setInviteCode}
                          disabled={inviteOptionsLoading || inviteOptions.length === 0}
                        >
                          <SelectTrigger className="h-8 text-xs">
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
                              <SelectItem key={option.id} value={option.code} className="text-xs">
                                <div className="flex flex-col">
                                  <span>{option.code}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {option.expiresAt
                                      ? `${t.inviteExpiresAt} ${new Date(option.expiresAt).toLocaleDateString(locale)}`
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
                    <div className="space-y-1">
                      <Label className="text-xs">{t.inviteExpiresAt}</Label>
                      <Input
                        type="datetime-local"
                        value={inviteExpiresAt}
                        onChange={(event) => setInviteExpiresAt(event.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">{t.guidance}</Label>
                      {getCurrentTemplates().length > 0 && (
                        <Select onValueChange={(value) => setGuidance(value)}>
                          <SelectTrigger className="h-6 w-32 text-[10px]">
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
                      rows={3}
                      className="text-xs resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border bg-muted/20 p-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {selected.inviteCode && (
                      <div>
                        <span className="text-muted-foreground">{t.inviteCode}</span>
                        <p className="font-mono font-medium">{selected.inviteCode.code}</p>
                      </div>
                    )}
                    {selected.inviteCode?.expiresAt && (
                      <div>
                        <span className="text-muted-foreground">{t.inviteExpiresAt}</span>
                        <p className="font-medium">
                          {new Date(selected.inviteCode.expiresAt).toLocaleString(locale)}
                        </p>
                      </div>
                    )}
                  </div>
                  {selected.guidance && (
                    <div className="mt-2 text-xs">
                      <span className="text-muted-foreground">{t.guidance}</span>
                      <p className="mt-1 whitespace-pre-wrap rounded border bg-card p-2">
                        {selected.guidance}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DrawerFooter className="sticky bottom-0 z-10 border-t bg-background px-4 py-2">
            <div className="flex w-full justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setDialogOpen(false)}
              >
                {t.reviewCancel}
              </Button>
              {(selected?.status === "PENDING" || selected?.status === "DISPUTED") && (
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleReview}
                  disabled={submitting}
                >
                  {submitting ? t.saving : t.reviewSubmit}
                </Button>
              )}
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
