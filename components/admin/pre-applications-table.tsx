"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
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
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { preApplicationGroups, preApplicationSources } from "@/lib/pre-application/constants"
import { PostContent } from "@/components/posts/post-content"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { cn } from "@/lib/utils"

type AdminPreApplication = {
  id: string
  essay: string
  source: string | null
  sourceDetail: string | null
  registerEmail: string
  queryToken: string | null
  group: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  guidance: string | null
  reviewedAt: string | null
  createdAt: string
  user: { id: string; name: string | null; email: string }
  reviewedBy: { id: string; name: string | null; email: string } | null
  inviteCode: { id: string; code: string; expiresAt: string | null; usedAt: string | null } | null
  reviewStage?: "INITIAL" | "FOLLOW_UP"
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
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selected, setSelected] = useState<AdminPreApplication | null>(null)
  const [reviewAction, setReviewAction] = useState<"APPROVE" | "REJECT">("APPROVE")
  const [guidance, setGuidance] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [inviteExpiresAt, setInviteExpiresAt] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [historyRecords, setHistoryRecords] = useState<AdminPreApplication[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [inviteOptions, setInviteOptions] = useState<
    Array<{ id: string; code: string; expiresAt: string | null; usedAt: string | null }>
  >([])
  const [inviteOptionsLoading, setInviteOptionsLoading] = useState(false)

  const getRandomApproveGuidance = useCallback(() => {
    const suggestions = Array.isArray(t.preApplicationGuidanceApproveSuggestions)
      ? t.preApplicationGuidanceApproveSuggestions
      : []
    if (suggestions.length === 0) return ""
    const index = Math.floor(Math.random() * suggestions.length)
    return suggestions[index] ?? ""
  }, [t])

  useEffect(() => {
    if (reviewAction === "REJECT") {
      setInviteCode("")
      setInviteExpiresAt("")
    }
  }, [reviewAction])

  useEffect(() => {
    if (reviewAction !== "APPROVE") return
    if (selected?.status !== "PENDING") return
    if (guidance.trim()) return
    setGuidance(getRandomApproveGuidance())
  }, [reviewAction, selected?.status, selected?.id, guidance, getRandomApproveGuidance])

  useEffect(() => {
    if (!dialogOpen || reviewAction !== "APPROVE" || selected?.status !== "PENDING") return
    loadInviteOptions()
  }, [dialogOpen, reviewAction, selected?.status])

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...(statusFilter !== "ALL" && { status: statusFilter }),
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
  }, [page, pageSize, search, statusFilter, sortBy, sortOrder])

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
      PENDING: { label: t.pending, className: "bg-amber-100 text-amber-800" },
      APPROVED: { label: t.approved, className: "bg-emerald-100 text-emerald-700" },
      REJECTED: { label: t.rejected, className: "bg-rose-100 text-rose-700" },
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
        status: "unassigned",
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
        (record: { usedAt: string | null; expiresAt: string | null }) =>
          !record.usedAt && (!record.expiresAt || new Date(record.expiresAt) > now),
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

  const openDialog = (record: AdminPreApplication) => {
    setSelected(record)
    setHistoryRecords([])
    if (record.status === "PENDING") {
      setReviewAction("APPROVE")
      setGuidance("")
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
        width: "18%",
        render: (record) => (
          <div>
            <p className="font-medium">{record.user.name || record.user.email}</p>
            <p className="text-xs text-muted-foreground">{record.user.email}</p>
          </div>
        ),
      },
      {
        key: "registerEmail",
        label: t.preApplicationRegisterEmail,
        width: "18%",
        render: (record) => <span className="text-sm">{record.registerEmail}</span>,
      },
      {
        key: "group",
        label: t.preApplicationGroup,
        width: "10%",
        render: (record) => <span className="text-sm">{getGroupLabel(record.group)}</span>,
      },
      {
        key: "status",
        label: t.preApplicationStatus,
        width: "12%",
        sortable: true,
        render: (record) => statusBadge(record.status),
      },
      {
        key: "reviewStage",
        label: t.reviewStage,
        width: "10%",
        render: (record) => (
          <span className="text-sm text-muted-foreground">
            {record.reviewStage === "FOLLOW_UP" ? t.reviewStageFollowUp : t.reviewStageInitial}
          </span>
        ),
      },
      {
        key: "reviewer",
        label: t.preApplicationReviewer,
        width: "16%",
        render: (record) => (
          <span className="text-sm text-muted-foreground">
            {record.reviewedBy?.name || record.reviewedBy?.email || "-"}
          </span>
        ),
      },
      {
        key: "createdAt",
        label: t.preApplicationCreatedAt,
        width: "14%",
        sortable: true,
        render: (record) => (
          <span className="text-sm text-muted-foreground">
            {new Date(record.createdAt).toLocaleString(locale)}
          </span>
        ),
      },
      {
        key: "actions",
        label: t.actions,
        width: "12%",
        render: (record) => (
          <Button variant="ghost" size="sm" onClick={() => openDialog(record)}>
            {record.status === "PENDING" ? t.preApplicationReviewAction : t.preApplicationView}
          </Button>
        ),
      },
    ],
    [t, locale],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSearch()
            }}
            placeholder={t.searchUsers}
            className="md:w-72"
          />
          <Button variant="outline" onClick={handleSearch}>
            {t.searchAction}
          </Button>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="md:w-48">
              <SelectValue placeholder={t.statusAll} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t.statusAll}</SelectItem>
              <SelectItem value="PENDING">{t.pending}</SelectItem>
              <SelectItem value="APPROVED">{t.approved}</SelectItem>
              <SelectItem value="REJECTED">{t.rejected}</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{record.user.name || record.user.email}</p>
                <p className="text-xs text-muted-foreground">{record.registerEmail}</p>
              </div>
              {statusBadge(record.status)}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {t.reviewStage}：
              {record.reviewStage === "FOLLOW_UP" ? t.reviewStageFollowUp : t.reviewStageInitial}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{getGroupLabel(record.group)}</span>
              <span>{new Date(record.createdAt).toLocaleDateString(locale)}</span>
            </div>
            <Button className="mt-3 w-full" variant="outline" onClick={() => openDialog(record)}>
              {record.status === "PENDING" ? t.preApplicationReviewAction : t.preApplicationView}
            </Button>
          </Card>
        )}
      />

      <Drawer open={dialogOpen} onOpenChange={setDialogOpen} direction="right">
        <DrawerContent className="h-full data-[vaul-drawer-direction=right]:w-[92vw] data-[vaul-drawer-direction=right]:sm:max-w-3xl">
          <DrawerHeader className="sticky top-0 z-10 border-b bg-background">
            <DrawerTitle>{t.reviewApplication}</DrawerTitle>
            <DrawerDescription>{t.reviewApplicationDesc}</DrawerDescription>
          </DrawerHeader>

          {selected && (
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">{t.preApplicationUser}</p>
                  <p className="font-medium">{selected.user.name || selected.user.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.preApplicationRegisterEmail}</p>
                  <p className="font-medium">{selected.registerEmail}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.preApplicationGroup}</p>
                  <p className="font-medium">{getGroupLabel(selected.group)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.preApplicationSource}</p>
                  <p className="font-medium">{getSourceLabel(selected.source)}</p>
                </div>
                {selected.sourceDetail && (
                  <div>
                    <p className="text-xs text-muted-foreground">{t.preApplicationSourceDetail}</p>
                    <p className="font-medium">{selected.sourceDetail}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">{t.preApplicationQueryToken}</p>
                  <p className="font-medium">{selected.queryToken || "-"}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">{t.preApplicationEssay}</p>
                <div className="mt-2 rounded-lg border bg-card p-4">
                  <PostContent content={selected.essay} emptyMessage={t.preApplicationEssay} />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-sm font-medium">{dict.preApplication.historyTitle}</p>
                {historyLoading && (
                  <p className="text-xs text-muted-foreground">{t.loading}</p>
                )}
                {!historyLoading && historyRecords.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {dict.preApplication.historyEmpty}
                  </p>
                )}
                {!historyLoading && historyRecords.length > 0 && (
                  <Accordion type="multiple" className="rounded-lg border border-border">
                    {historyRecords.map((item, index) => (
                      <AccordionItem key={item.id} value={item.id} className="px-3">
                        <AccordionTrigger className="py-3 text-sm">
                          <div className="flex flex-1 items-center justify-between gap-3 pr-3">
                            <span>
                              {new Date(item.createdAt).toLocaleString(locale)}
                              {index === 0 ? ` · ${dict.preApplication.submitted}` : ""}
                            </span>
                            {statusBadge(item.status)}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-3 text-xs text-muted-foreground">
                          <div className="space-y-1">
                            <p>
                              {t.preApplicationReviewer}：
                              {item.reviewedBy?.name || item.reviewedBy?.email || "-"}
                            </p>
                            <p>
                              {dict.preApplication.review.reviewedAt}：
                              {item.reviewedAt
                                ? new Date(item.reviewedAt).toLocaleString(locale)
                                : "-"}
                            </p>
                            <p className="whitespace-pre-wrap">
                              {dict.preApplication.review.guidance}：{item.guidance || "-"}
                            </p>
                            {item.inviteCode && (
                              <p>
                                {dict.preApplication.invite.code}：{item.inviteCode.code}
                              </p>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                {statusBadge(selected.status)}
                {selected.reviewedBy && (
                  <span className="text-xs text-muted-foreground">
                    {t.preApplicationReviewer}：{selected.reviewedBy.name || selected.reviewedBy.email}
                  </span>
                )}
              </div>

              {selected.status === "PENDING" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t.reviewAction}</Label>
                    <Select value={reviewAction} onValueChange={(value) => setReviewAction(value as "APPROVE" | "REJECT")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="APPROVE">{t.reviewApprove}</SelectItem>
                        <SelectItem value="REJECT">{t.reviewReject}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {reviewAction === "APPROVE" && (
                    <div className="space-y-2">
                      <Label htmlFor="inviteCode">{t.inviteCode}</Label>
                      <Select
                        value={inviteCode}
                        onValueChange={setInviteCode}
                        disabled={inviteOptionsLoading || inviteOptions.length === 0}
                      >
                        <SelectTrigger>
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
                              <div className="flex flex-col gap-1">
                                <span className="text-sm">{option.code}</span>
                                <span className="text-xs text-muted-foreground">
                                  {option.expiresAt
                                    ? `${t.inviteExpiresAt} ${new Date(option.expiresAt).toLocaleString(locale)}`
                                    : t.inviteCodeSelectNoExpiry}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">{t.inviteCodeSelectHint}</p>
                    </div>
                  )}
                  {reviewAction === "APPROVE" && (
                    <div className="space-y-2">
                      <Label htmlFor="inviteExpiresAt">{t.inviteExpiresAt}</Label>
                      <Input
                        id="inviteExpiresAt"
                        type="datetime-local"
                        value={inviteExpiresAt}
                        onChange={(event) => setInviteExpiresAt(event.target.value)}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {selected.inviteCode && (
                    <div>
                      <p className="text-xs text-muted-foreground">{t.inviteCode}</p>
                      <p className="font-medium">{selected.inviteCode.code}</p>
                    </div>
                  )}
                  {selected.inviteCode?.expiresAt && (
                    <div>
                      <p className="text-xs text-muted-foreground">{t.inviteExpiresAt}</p>
                      <p className="font-medium">
                        {new Date(selected.inviteCode.expiresAt).toLocaleString(locale)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="guidance">{t.guidance}</Label>
                <Textarea
                  id="guidance"
                  value={guidance}
                  onChange={(event) => setGuidance(event.target.value)}
                  rows={5}
                  disabled={selected.status !== "PENDING"}
                  className={cn(selected.status !== "PENDING" && "opacity-80")}
                />
              </div>
            </div>
          )}

          <DrawerFooter className="sticky bottom-0 z-10 border-t bg-background">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t.reviewCancel}
              </Button>
              {selected?.status === "PENDING" && (
                <Button onClick={handleReview} disabled={submitting}>
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
