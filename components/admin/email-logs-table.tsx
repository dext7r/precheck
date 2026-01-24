"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Input } from "@/components/ui/input"
import {
  X,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  RefreshCw,
  Loader2,
  Inbox,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

type EmailLogRecord = {
  id: string
  to: string
  subject: string
  status: "PENDING" | "SUCCESS" | "FAILED"
  provider: string | null
  errorMessage: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

interface AdminEmailLogsTableProps {
  locale: Locale
  dict: Dictionary
}

type TranslationVars = Record<string, string | number>

const statusOptions = ["ALL", "PENDING", "SUCCESS", "FAILED"]

function StatCard({
  icon: Icon,
  label,
  value,
  color = "primary",
  active = false,
  onClick,
}: {
  icon: React.ElementType
  label: string
  value: string | number
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
        </div>
      </div>
    </motion.div>
  )
}

export function AdminEmailLogsTable({ locale, dict }: AdminEmailLogsTableProps) {
  const t = dict.admin
  const translationSource = t as unknown as Record<string, string | undefined>
  const translateAdmin = (key: string, fallback: string, vars?: TranslationVars) => {
    const template = translationSource[key] ?? fallback
    if (!vars) {
      return template
    }
    return Object.entries(vars).reduce(
      (result, [varKey, value]) => result.replace(`{${varKey}}`, String(value)),
      template,
    )
  }
  const [records, setRecords] = useState<EmailLogRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [stats, setStats] = useState({ pending: 0, success: 0, failed: 0, total: 0 })
  const [sortKey, setSortKey] = useState("createdAt")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [selected, setSelected] = useState<EmailLogRecord | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [contentScale, setContentScale] = useState(100)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [resending, setResending] = useState(false)
  const [resendingId, setResendingId] = useState<string | null>(null)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        status: statusFilter,
        sortKey,
        sortDir,
        ...(search && { search }),
      })
      const res = await fetch(`/api/admin/email-logs?${params}`)
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
      console.error("Email logs fetch error:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [page, pageSize, search, statusFilter, sortKey, sortDir])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fullscreen) setFullscreen(false)
    }
    window.addEventListener("keydown", handleEsc)
    return () => window.removeEventListener("keydown", handleEsc)
  }, [fullscreen])

  const handleSort = (key: string, direction: "asc" | "desc") => {
    setSortKey(key)
    setSortDir(direction)
    setPage(1)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === records.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(records.map((r) => r.id)))
    }
  }

  const handleResend = async (ids: string[]) => {
    if (ids.length === 0) return

    const isSingle = ids.length === 1
    if (isSingle) {
      setResendingId(ids[0])
    } else {
      setResending(true)
    }

    try {
      const res = await fetch("/api/admin/email-logs/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })

      if (!res.ok) {
        throw new Error("Resend failed")
      }

      const data = await res.json()
      const { summary } = data

      if (summary.failed === 0) {
        toast.success(
          translateAdmin("emailResendSuccess", "Resent {count} email(s)", {
            count: summary.success,
          }),
        )
      } else {
        toast.warning(
          translateAdmin(
            "emailResendSummary",
            "Resend completed: {success} success, {failed} failed",
            { success: summary.success, failed: summary.failed },
          ),
        )
      }

      setSelectedIds(new Set())
      await fetchLogs()
    } catch (error) {
      console.error("Email resend error:", error)
      toast.error(translateAdmin("emailResendFailed", "Resend failed"))
    } finally {
      setResending(false)
      setResendingId(null)
    }
  }

  const formatPageSummary = (summary: { total: number; page: number; totalPages: number }) =>
    t.pageSummary
      .replace("{total}", summary.total.toString())
      .replace("{page}", summary.page.toString())
      .replace("{totalPages}", summary.totalPages.toString())

  const getStatusBadge = (status: EmailLogRecord["status"]) => {
    switch (status) {
      case "SUCCESS":
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="mr-1 h-3 w-3" />
            {t.emailLogStatusSuccess}
          </Badge>
        )
      case "FAILED":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            {t.emailLogStatusFailed}
          </Badge>
        )
      case "PENDING":
      default:
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            {t.emailLogStatusPending}
          </Badge>
        )
    }
  }

  const columns: Column<EmailLogRecord>[] = useMemo(
    () => [
      {
        key: "select",
        label: (
          <Checkbox
            checked={records.length > 0 && selectedIds.size === records.length}
            onCheckedChange={toggleSelectAll}
          />
        ) as unknown as string,
        width: "5%",
        render: (record) => (
          <Checkbox
            checked={selectedIds.has(record.id)}
            onCheckedChange={() => toggleSelect(record.id)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      },
      {
        key: "createdAt",
        label: t.emailLogTime,
        width: "16%",
        sortable: true,
        render: (record) => (
          <span className="text-sm text-muted-foreground">
            {new Date(record.createdAt).toLocaleString(locale)}
          </span>
        ),
      },
      {
        key: "to",
        label: t.emailLogTo,
        width: "18%",
        sortable: true,
        render: (record) => (
          <span className="text-sm font-medium truncate max-w-[200px] block" title={record.to}>
            {record.to}
          </span>
        ),
      },
      {
        key: "subject",
        label: t.emailLogSubject,
        width: "24%",
        sortable: true,
        render: (record) => (
          <span className="text-sm truncate max-w-[280px] block" title={record.subject}>
            {record.subject}
          </span>
        ),
      },
      {
        key: "status",
        label: t.emailLogStatus,
        width: "10%",
        sortable: true,
        render: (record) => getStatusBadge(record.status),
      },
      {
        key: "provider",
        label: t.emailLogProvider,
        width: "9%",
        render: (record) => (
          <span className="text-sm text-muted-foreground uppercase">{record.provider || "-"}</span>
        ),
      },
      {
        key: "actions",
        label: t.actions,
        width: "18%",
        render: (record) => (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => {
                setSelected(record)
                setDrawerOpen(true)
              }}
            >
              {t.emailLogView}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => handleResend([record.id])}
              disabled={resendingId === record.id}
            >
              {resendingId === record.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        ),
      },
    ],
    [locale, t, records, selectedIds, resendingId],
  )

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Inbox}
          label={t.statusAll || "全部"}
          value={stats.total}
          color="primary"
          active={statusFilter === "ALL"}
          onClick={() => {
            setStatusFilter("ALL")
            setPage(1)
          }}
        />
        <StatCard
          icon={CheckCircle}
          label={t.emailLogStatusSuccess || "发送成功"}
          value={stats.success}
          color="success"
          active={statusFilter === "SUCCESS"}
          onClick={() => {
            setStatusFilter("SUCCESS")
            setPage(1)
          }}
        />
        <StatCard
          icon={XCircle}
          label={t.emailLogStatusFailed || "发送失败"}
          value={stats.failed}
          color="danger"
          active={statusFilter === "FAILED"}
          onClick={() => {
            setStatusFilter("FAILED")
            setPage(1)
          }}
        />
        <StatCard
          icon={Clock}
          label={t.emailLogStatusPending || "待发送"}
          value={stats.pending}
          color="warning"
          active={statusFilter === "PENDING"}
          onClick={() => {
            setStatusFilter("PENDING")
            setPage(1)
          }}
        />
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
          <div className="relative md:w-72">
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setSearch(searchInput)
                  setPage(1)
                }
              }}
              placeholder={t.emailLogSearchPlaceholder}
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
          <Button
            variant="outline"
            onClick={() => {
              setSearch(searchInput)
              setPage(1)
            }}
          >
            {t.searchAction}
          </Button>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="md:w-40">
              <SelectValue placeholder={t.emailLogStatus} />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option === "ALL"
                    ? t.statusAll
                    : option === "SUCCESS"
                      ? t.emailLogStatusSuccess
                      : option === "FAILED"
                        ? t.emailLogStatusFailed
                        : t.emailLogStatusPending}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput("")
              setSearch("")
              setStatusFilter("ALL")
              setSortKey("createdAt")
              setSortDir("desc")
              setPage(1)
            }}
          >
            {t.reset}
          </Button>
          {selectedIds.size > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={() => handleResend(Array.from(selectedIds))}
              disabled={resending}
              className="gap-1"
            >
              {resending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {translateAdmin("emailResendSelected", "Resend ({count})", {
                count: selectedIds.size,
              })}
            </Button>
          )}
        </div>
      </div>

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
          emptyMessage={t.emailLogEmpty}
          loadingText={t.loading}
          perPageText={t.perPage}
          summaryFormatter={formatPageSummary}
          mobileCardRender={(record) => (
            <Card className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {getStatusBadge(record.status)}
                </div>
                <p className="text-sm font-medium truncate">{record.to}</p>
                <p className="text-sm text-muted-foreground truncate">{record.subject}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(record.createdAt).toLocaleString(locale)}
                </p>
              </div>
              <Button
                className="mt-3 w-full"
                variant="outline"
                onClick={() => {
                  setSelected(record)
                  setDrawerOpen(true)
                }}
              >
                {t.emailLogView}
              </Button>
            </Card>
          )}
        />
      </Card>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="right">
        <DrawerContent className="h-full data-[vaul-drawer-direction=right]:w-[92vw] data-[vaul-drawer-direction=right]:sm:max-w-xl">
          <DrawerHeader className="sticky top-0 z-10 border-b bg-background">
            <DrawerTitle>{t.emailLogDetail}</DrawerTitle>
            <DrawerDescription>{selected?.to}</DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">{t.emailLogTo}</p>
                <p className="break-all">{selected?.to || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t.emailLogTime}</p>
                <p>{selected ? new Date(selected.createdAt).toLocaleString(locale) : "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t.emailLogStatus}</p>
                {selected && getStatusBadge(selected.status)}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t.emailLogProvider}</p>
                <p className="uppercase">{selected?.provider || "-"}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{t.emailLogSubject}</p>
              <p className="break-words">{selected?.subject || "-"}</p>
            </div>

            {(() => {
              const html = (selected?.metadata as Record<string, unknown> | null)?.html
              if (!html || typeof html !== "string") return null
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {translateAdmin("emailLogContent", "Email Content")}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 px-2"
                      onClick={() => {
                        setContentScale(100)
                        setFullscreen(true)
                      }}
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      <span className="text-xs">{translateAdmin("fullscreen", "Fullscreen")}</span>
                    </Button>
                  </div>
                  <div
                    className="max-h-60 overflow-auto rounded-lg border border-border bg-white p-4 text-sm dark:bg-zinc-900"
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                </div>
              )
            })()}

            {selected?.errorMessage && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{t.emailLogError}</p>
                <pre className="max-h-32 overflow-auto rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
                  {selected.errorMessage}
                </pre>
              </div>
            )}
          </div>

          <DrawerFooter className="sticky bottom-0 border-t bg-background">
            <div className="flex w-full gap-2">
              <Button
                variant="default"
                className="flex-1 gap-1"
                onClick={() => selected && handleResend([selected.id])}
                disabled={resendingId === selected?.id}
              >
                {resendingId === selected?.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {translateAdmin("emailResend", "Resend")}
              </Button>
              <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                {t.confirm}
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {fullscreen &&
        (() => {
          const html = (selected?.metadata as Record<string, unknown> | null)?.html
          if (!html || typeof html !== "string") return null
          return (
            <div
              className="fixed inset-0 z-50 flex flex-col bg-background"
              onClick={(e) => e.target === e.currentTarget && setFullscreen(false)}
            >
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selected?.subject}</p>
                  <p className="text-xs text-muted-foreground truncate">{selected?.to}</p>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setContentScale((s) => Math.max(50, s - 10))}
                    disabled={contentScale <= 50}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center text-xs text-muted-foreground">
                    {contentScale}%
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setContentScale((s) => Math.min(200, s + 10))}
                    disabled={contentScale >= 200}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  {contentScale !== 100 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setContentScale(100)}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                  <div className="w-px h-5 bg-border mx-2" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setFullscreen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-auto bg-white dark:bg-zinc-900">
                <div
                  className="p-6 text-sm origin-top-left transition-transform duration-150"
                  style={{
                    transform: `scale(${contentScale / 100})`,
                    width: `${10000 / contentScale}%`,
                  }}
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </div>
            </div>
          )
        })()}
    </div>
  )
}
