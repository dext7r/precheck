"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Input } from "@/components/ui/input"
import { X, CheckCircle, XCircle, Clock, Mail } from "lucide-react"
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

const statusOptions = ["ALL", "PENDING", "SUCCESS", "FAILED"]

export function AdminEmailLogsTable({ locale, dict }: AdminEmailLogsTableProps) {
  const t = dict.admin
  const [records, setRecords] = useState<EmailLogRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [sortKey, setSortKey] = useState("createdAt")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [selected, setSelected] = useState<EmailLogRecord | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

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
    } catch (error) {
      console.error("Email logs fetch error:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [page, pageSize, search, statusFilter, sortKey, sortDir])

  const handleSort = (key: string, direction: "asc" | "desc") => {
    setSortKey(key)
    setSortDir(direction)
    setPage(1)
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
        key: "createdAt",
        label: t.emailLogTime,
        width: "18%",
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
        width: "20%",
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
        width: "28%",
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
        width: "12%",
        sortable: true,
        render: (record) => getStatusBadge(record.status),
      },
      {
        key: "provider",
        label: t.emailLogProvider,
        width: "10%",
        render: (record) => (
          <span className="text-sm text-muted-foreground uppercase">
            {record.provider || "-"}
          </span>
        ),
      },
      {
        key: "actions",
        label: t.actions,
        width: "12%",
        render: (record) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelected(record)
              setDrawerOpen(true)
            }}
          >
            {t.emailLogView}
          </Button>
        ),
      },
    ],
    [locale, t],
  )

  const formatJson = (value: unknown) => {
    if (!value) return "-"
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return "-"
    }
  }

  return (
    <div className="space-y-4">
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

            {selected?.errorMessage && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{t.emailLogError}</p>
                <pre className="max-h-32 overflow-auto rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
                  {selected.errorMessage}
                </pre>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{t.emailLogMetadata}</p>
              <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-muted p-3 text-xs">
                {formatJson(selected?.metadata)}
              </pre>
            </div>
          </div>

          <DrawerFooter className="sticky bottom-0 border-t bg-background">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              {t.confirm}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
