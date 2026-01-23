"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Input } from "@/components/ui/input"
import { X } from "lucide-react"
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
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

type AuditLogRecord = {
  id: string
  entityType: string
  entityId: string | null
  action: string
  actorId: string | null
  actorName: string | null
  actorEmail: string | null
  actorRole: string | null
  ip: string | null
  userAgent: string | null
  before: unknown | null
  after: unknown | null
  metadata: unknown | null
  createdAt: string
}

interface AdminAuditLogsTableProps {
  locale: Locale
  dict: Dictionary
}

const entityTypeOptions = [
  "ALL",
  "AUTH",
  "USER",
  "ACCOUNT",
  "POST",
  "PRE_APPLICATION",
  "INVITE_CODE",
  "INVITE_CODE_QUERY_TOKEN",
  "MESSAGE",
  "MESSAGE_RECIPIENT",
  "SITE_SETTINGS",
  "SYSTEM",
]

const actionTypeOptions = [
  "ALL",
  // Auth actions
  "LOGIN",
  "LOGOUT",
  "REGISTER",
  // User actions
  "USER_CREATE",
  "USER_ADMIN_UPDATE",
  "USER_ADMIN_DELETE",
  // Invite code actions
  "INVITE_CODE_CREATE",
  "INVITE_CODE_BULK_IMPORT",
  "INVITE_CODE_MANUAL_ASSIGN",
  "INVITE_CODE_INVALIDATE",
  "QUERY_TOKEN_CREATE",
  // Pre-application actions
  "PRE_APPLICATION_SUBMIT",
  "PRE_APPLICATION_UPDATE",
  "PRE_APPLICATION_RESUBMIT",
  "PRE_APPLICATION_REVIEW",
  // Message actions
  "MESSAGE_CREATE",
  "MESSAGE_REVOKE",
  "MESSAGE_READ",
  // Settings actions
  "SYSTEM_CONFIG_UPDATE",
]

export function AdminAuditLogsTable({ locale, dict }: AdminAuditLogsTableProps) {
  const t = dict.admin
  const [records, setRecords] = useState<AuditLogRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [entityType, setEntityType] = useState("ALL")
  const [actionType, setActionType] = useState("ALL")
  const [selected, setSelected] = useState<AuditLogRecord | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        entityType,
        ...(search && { search }),
        ...(actionType !== "ALL" && { action: actionType }),
      })
      const res = await fetch(`/api/admin/audit-logs?${params}`)
      if (!res.ok) {
        throw new Error("Fetch failed")
      }
      const data = await res.json()
      setRecords(data.records || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error("Audit logs fetch error:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [page, pageSize, search, entityType, actionType])

  const formatPageSummary = (summary: { total: number; page: number; totalPages: number }) =>
    t.pageSummary
      .replace("{total}", summary.total.toString())
      .replace("{page}", summary.page.toString())
      .replace("{totalPages}", summary.totalPages.toString())

  const columns: Column<AuditLogRecord>[] = useMemo(
    () => [
      {
        key: "createdAt",
        label: t.auditTime,
        width: "18%",
        render: (record) => (
          <span className="text-sm text-muted-foreground">
            {new Date(record.createdAt).toLocaleString(locale)}
          </span>
        ),
      },
      {
        key: "action",
        label: t.auditAction,
        width: "18%",
        render: (record) => <span className="text-sm font-medium">{record.action}</span>,
      },
      {
        key: "entity",
        label: t.auditEntity,
        width: "18%",
        render: (record) => (
          <div className="text-sm">
            <p className="font-medium">{record.entityType}</p>
            <p className="text-xs text-muted-foreground">{record.entityId || "-"}</p>
          </div>
        ),
      },
      {
        key: "actor",
        label: t.auditActor,
        width: "18%",
        render: (record) => (
          <div className="text-sm">
            <p className="font-medium">{record.actorName || record.actorEmail || "-"}</p>
            <p className="text-xs text-muted-foreground">{record.actorRole || "-"}</p>
          </div>
        ),
      },
      {
        key: "ip",
        label: t.auditIp,
        width: "14%",
        render: (record) => (
          <span className="text-xs text-muted-foreground">{record.ip || "-"}</span>
        ),
      },
      {
        key: "actions",
        label: t.actions,
        width: "14%",
        render: (record) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelected(record)
              setDrawerOpen(true)
            }}
          >
            {t.auditView}
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
              placeholder={t.auditSearchPlaceholder}
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
            value={entityType}
            onValueChange={(value) => {
              setEntityType(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="md:w-48">
              <SelectValue placeholder={t.auditEntityType} />
            </SelectTrigger>
            <SelectContent>
              {entityTypeOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option === "ALL" ? t.auditEntityAll : option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={actionType}
            onValueChange={(value) => {
              setActionType(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="md:w-48">
              <SelectValue placeholder={t.auditAction || "操作类型"} />
            </SelectTrigger>
            <SelectContent>
              {actionTypeOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option === "ALL" ? t.statusAll || "全部" : option}
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
              setEntityType("ALL")
              setActionType("ALL")
              setPage(1)
            }}
          >
            {t.reset || "重置"}
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
        loading={loading}
        emptyMessage={t.auditEmpty}
        loadingText={t.loading}
        perPageText={t.perPage}
        summaryFormatter={formatPageSummary}
        mobileCardRender={(record) => (
          <Card className="p-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">{record.action}</p>
              <p className="text-xs text-muted-foreground">
                {record.entityType} · {record.entityId || "-"}
              </p>
              <p className="text-xs text-muted-foreground">
                {record.actorName || record.actorEmail || "-"}
              </p>
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
              {t.auditView}
            </Button>
          </Card>
        )}
      />

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="right">
        <DrawerContent className="h-full data-[vaul-drawer-direction=right]:w-[92vw] data-[vaul-drawer-direction=right]:sm:max-w-3xl">
          <DrawerHeader className="sticky top-0 z-10 border-b bg-background">
            <DrawerTitle>{selected?.action || t.auditDetail}</DrawerTitle>
            <DrawerDescription>
              {selected?.entityType} · {selected?.entityId || "-"}
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">{t.auditActor}</p>
                <p>{selected?.actorName || selected?.actorEmail || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t.auditTime}</p>
                <p>{selected ? new Date(selected.createdAt).toLocaleString(locale) : "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t.auditIp}</p>
                <p>{selected?.ip || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t.auditUserAgent}</p>
                <p className="break-words">{selected?.userAgent || "-"}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{t.auditBefore}</p>
              <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-muted p-3 text-xs">
                {formatJson(selected?.before)}
              </pre>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{t.auditAfter}</p>
              <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-muted p-3 text-xs">
                {formatJson(selected?.after)}
              </pre>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{t.auditMetadata}</p>
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
