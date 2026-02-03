"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { toast } from "sonner"
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable, type Column } from "@/components/ui/data-table"
import {
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Ticket,
  Send,
  AlertTriangle,
  Package,
  UserCheck,
  Users,
  TrendingUp,
  Loader2,
} from "lucide-react"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { preApplicationSources } from "@/lib/pre-application/constants"

type CardDetailType =
  | "preApplicationPending"
  | "preApplicationApproved"
  | "preApplicationRejected"
  | "preApplicationSubmitted"
  | "inviteTotal"
  | "inviteAssigned"
  | "inviteExpired"
  | "inviteAvailableUnassigned"
  | "inviteAvailableUnused"

type PreApplicationRecord = {
  id: string
  registerEmail: string
  status: "PENDING" | "APPROVED" | "REJECTED" | "DISPUTED" | "ARCHIVED"
  createdAt: string
  user: { name: string | null; email: string }
}

type InviteCodeRecord = {
  id: string
  code: string
  assignedAt: string | null
  usedAt: string | null
  expiresAt: string | null
  assignedTo: { name: string | null; email: string } | null
}

type DashboardData = {
  range: number
  granularity: "day" | "week" | "month"
  kpis: {
    preApplicationPending: number
    preApplicationApproved: number
    preApplicationRejected: number
    preApplicationSubmitted: number
    inviteTotal: number
    inviteAssigned: number
    inviteExpired: number
    inviteAvailableUnassigned: number
    inviteAvailableUnused: number
    inviteExpiringSoon: number
    inviteAssignedUnused: number
  }
  series: {
    preApplications: Array<{
      bucket: string
      submitted: number
      approved: number
      rejected: number
    }>
    users: Array<{ bucket: string; users: number }>
    invites: Array<{ bucket: string; assigned: number; used: number; expired: number }>
  }
  distributions: {
    sources: Array<{ source: string; count: number }>
    inviteStatuses: Array<{ key: string; count: number }>
  }
  reviewerStats: {
    currentUser: number
    others: number
    total: number
    breakdown: Array<{
      reviewerId: string
      name: string
      approved: number
      rejected: number
      total: number
    }>
  }
}

interface AdminDashboardProps {
  locale: Locale
  dict: Dictionary
}

const rangeOptions = [
  { value: "7", key: "range7" },
  { value: "30", key: "range30" },
  { value: "90", key: "range90" },
  { value: "180", key: "range180" },
  { value: "365", key: "range365" },
]

const granularityOptions = [
  { value: "day", key: "granularityDay" },
  { value: "week", key: "granularityWeek" },
  { value: "month", key: "granularityMonth" },
]

const parseBucketDate = (bucket: string) => new Date(`${bucket}T00:00:00`)

export function AdminDashboard({ locale, dict }: AdminDashboardProps) {
  const [range, setRange] = useState("30")
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day")
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedCard, setSelectedCard] = useState<{
    type: CardDetailType
    title: string
  } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailData, setDetailData] = useState<PreApplicationRecord[] | InviteCodeRecord[]>([])
  const [detailTotal, setDetailTotal] = useState(0)
  const [detailPage, setDetailPage] = useState(1)
  const detailPageSize = 10

  const t = dict.admin

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/dashboard?range=${range}&granularity=${granularity}`)
      if (!res.ok) {
        throw new Error(t.fetchFailed)
      }
      const payload = (await res.json()) as DashboardData
      setData(payload)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.fetchFailed)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [range, granularity])

  const fetchDetailData = useCallback(
    async (type: CardDetailType, page: number) => {
      setDetailLoading(true)
      try {
        let url = ""
        const params = new URLSearchParams({
          page: page.toString(),
          limit: detailPageSize.toString(),
        })

        if (type.startsWith("preApplication")) {
          const statusMap: Record<string, string> = {
            preApplicationPending: "PENDING",
            preApplicationApproved: "APPROVED",
            preApplicationRejected: "REJECTED",
          }
          if (statusMap[type]) {
            params.set("status", statusMap[type])
          }
          url = `/api/admin/pre-applications?${params}`
        } else {
          const filterMap: Record<
            string,
            { status?: string; assignment?: string; expiringWithin?: string }
          > = {
            inviteTotal: {},
            inviteAssigned: { assignment: "assigned" },
            inviteExpired: { status: "expired" },
            inviteAvailableUnassigned: { assignment: "unassigned", status: "available" },
            inviteAvailableUnused: { status: "available" },
          }
          const filters = filterMap[type] || {}
          Object.entries(filters).forEach(([key, value]) => {
            if (value) params.set(key, value)
          })
          url = `/api/admin/invite-codes?${params}`
        }

        const res = await fetch(url)
        if (!res.ok) throw new Error("Fetch failed")
        const result = await res.json()
        setDetailData(result.records || [])
        setDetailTotal(result.total || 0)
      } catch {
        toast.error(t.fetchFailed)
      } finally {
        setDetailLoading(false)
      }
    },
    [t.fetchFailed, detailPageSize],
  )

  const handleCardClick = (type: CardDetailType, title: string) => {
    setSelectedCard({ type, title })
    setDetailPage(1)
    setDetailData([])
    setDrawerOpen(true)
    fetchDetailData(type, 1)
  }

  useEffect(() => {
    if (selectedCard && detailPage > 1) {
      fetchDetailData(selectedCard.type, detailPage)
    }
  }, [detailPage, selectedCard, fetchDetailData])

  const sourceLabelMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const source of preApplicationSources) {
      const key = source.labelKey.split(".").pop() || ""
      map.set(source.value, (dict.preApplication.sources as Record<string, string>)[key])
    }
    map.set("UNKNOWN", t.sourceUnknown)
    return map
  }, [dict.preApplication.sources, t.sourceUnknown])

  const formatBucketLabel = (bucket: string) => {
    const date = parseBucketDate(bucket)
    if (granularity === "month") {
      return date.toLocaleDateString(locale, { year: "2-digit", month: "short" })
    }
    return date.toLocaleDateString(locale, { month: "numeric", day: "numeric" })
  }

  const inviteStatusSummary = useMemo(() => {
    if (!data) return []
    const total = data.distributions.inviteStatuses.reduce((sum, item) => sum + item.count, 0)
    return data.distributions.inviteStatuses.map((item) => {
      const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0
      return { ...item, percentage }
    })
  }, [data])

  const cards = data
    ? [
        {
          title: t.preApplicationPending,
          value: data.kpis.preApplicationPending,
          icon: Clock,
          color: "text-amber-500",
          bg: "bg-amber-500/10",
          detailType: "preApplicationPending" as CardDetailType,
        },
        {
          title: t.preApplicationApproved,
          value: data.kpis.preApplicationApproved,
          icon: CheckCircle,
          color: "text-emerald-500",
          bg: "bg-emerald-500/10",
          detailType: "preApplicationApproved" as CardDetailType,
        },
        {
          title: t.preApplicationRejected,
          value: data.kpis.preApplicationRejected,
          icon: XCircle,
          color: "text-red-500",
          bg: "bg-red-500/10",
          detailType: "preApplicationRejected" as CardDetailType,
        },
        {
          title: t.preApplicationSubmitted,
          value: data.kpis.preApplicationSubmitted,
          icon: FileText,
          color: "text-blue-500",
          bg: "bg-blue-500/10",
          detailType: "preApplicationSubmitted" as CardDetailType,
        },
        {
          title: t.inviteTotal,
          value: data.kpis.inviteTotal,
          icon: Ticket,
          color: "text-violet-500",
          bg: "bg-violet-500/10",
          detailType: "inviteTotal" as CardDetailType,
        },
        {
          title: t.inviteAssigned,
          value: data.kpis.inviteAssigned,
          icon: Send,
          color: "text-cyan-500",
          bg: "bg-cyan-500/10",
          detailType: "inviteAssigned" as CardDetailType,
        },
        {
          title: t.inviteExpired,
          value: data.kpis.inviteExpired,
          icon: AlertTriangle,
          color: "text-orange-500",
          bg: "bg-orange-500/10",
          detailType: "inviteExpired" as CardDetailType,
        },
        {
          title: t.inviteAvailableUnassigned,
          value: data.kpis.inviteAvailableUnassigned,
          icon: Package,
          color: "text-teal-500",
          bg: "bg-teal-500/10",
          detailType: "inviteAvailableUnassigned" as CardDetailType,
        },
        {
          title: t.inviteAvailableUnused,
          value: data.kpis.inviteAvailableUnused,
          icon: Ticket,
          color: "text-indigo-500",
          bg: "bg-indigo-500/10",
          detailType: "inviteAvailableUnused" as CardDetailType,
        },
      ]
    : []

  if (loading && !data) {
    return <p className="text-sm text-muted-foreground">{t.loading}</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t.metrics}</h2>
          <p className="text-sm text-muted-foreground">{t.dashboardHint}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t.rangeLabel} />
            </SelectTrigger>
            <SelectContent>
              {rangeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {(t as unknown as Record<string, string>)[option.key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={granularity}
            onValueChange={(value) => setGranularity(value as "day" | "week" | "month")}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t.granularityLabel} />
            </SelectTrigger>
            <SelectContent>
              {granularityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {(t as unknown as Record<string, string>)[option.key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card
            key={card.title}
            className="overflow-hidden cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => handleCardClick(card.detailType, card.title)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold tabular-nums">{card.value.toLocaleString()}</p>
                </div>
                <div className={`rounded-full p-3 ${card.bg}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data?.reviewerStats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="overflow-hidden border-l-4 border-l-primary">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <UserCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.myReviewedCount}</p>
                  <p className="text-3xl font-bold tabular-nums">
                    {data.reviewerStats.currentUser.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-l-4 border-l-muted-foreground/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-muted p-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.othersReviewedCount}</p>
                  <p className="text-3xl font-bold tabular-nums">
                    {data.reviewerStats.others.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-l-4 border-l-emerald-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-emerald-500/10 p-3">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.totalReviewedCount}</p>
                  <p className="text-3xl font-bold tabular-nums">
                    {data.reviewerStats.total.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {data?.reviewerStats?.breakdown && data.reviewerStats.breakdown.length > 0 && (
        <ReviewerStatsSection data={data.reviewerStats.breakdown} dict={dict} />
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{t.preApplicationTrend}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                submitted: { label: t.preApplicationSubmitted, color: "var(--chart-1)" },
                approved: { label: t.preApplicationApproved, color: "var(--chart-2)" },
                rejected: { label: t.preApplicationRejected, color: "var(--chart-3)" },
              }}
              className="aspect-2/1 min-h-[200px]"
            >
              <LineChart data={data?.series.preApplications || []} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="bucket"
                  tickFormatter={formatBucketLabel}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis allowDecimals={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="submitted"
                  stroke="var(--color-submitted)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="approved"
                  stroke="var(--color-approved)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="rejected"
                  stroke="var(--color-rejected)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.sourceDistribution}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(data?.distributions.sources || []).map((item) => {
                const label = sourceLabelMap.get(item.source) || item.source
                const total =
                  data?.distributions.sources.reduce((sum, row) => sum + row.count, 0) || 0
                const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0
                return (
                  <div key={item.source} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{label}</span>
                      <span className="text-muted-foreground">
                        {item.count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {data?.distributions.sources.length === 0 && (
                <p className="text-sm text-muted-foreground">{t.noData}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{t.inviteTrend}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                assigned: { label: t.inviteAssigned, color: "var(--chart-2)" },
                used: { label: t.inviteUsed, color: "var(--chart-4)" },
                expired: { label: t.inviteExpired, color: "var(--chart-5)" },
              }}
              className="aspect-2/1 min-h-[200px]"
            >
              <BarChart data={data?.series.invites || []} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="bucket"
                  tickFormatter={formatBucketLabel}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis allowDecimals={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="assigned" fill="var(--color-assigned)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="used" fill="var(--color-used)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expired" fill="var(--color-expired)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.userRegistrations}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                users: { label: t.userRegistrations, color: "var(--chart-1)" },
              }}
              className="aspect-2/1 min-h-[200px]"
            >
              <LineChart data={data?.series.users || []} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="bucket"
                  tickFormatter={formatBucketLabel}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis allowDecimals={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="var(--color-users)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.inviteStatusDistribution}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inviteStatusSummary.map((item) => (
                <div key={item.key} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {(t as unknown as Record<string, string>)[`inviteStatus_${item.key}`]}
                    </span>
                    <span className="text-muted-foreground">
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-chart-2"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
              {inviteStatusSummary.length === 0 && (
                <p className="text-sm text-muted-foreground">{t.noData}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.inviteAvailability}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t.inviteAvailableUnassigned}</span>
              <span className="font-medium">{data?.kpis.inviteAvailableUnassigned ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t.inviteAvailableUnused}</span>
              <span className="font-medium">{data?.kpis.inviteAvailableUnused ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t.inviteExpiringSoon}</span>
              <span className="font-medium">{data?.kpis.inviteExpiringSoon ?? 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="right">
        <DrawerContent className="h-full data-[vaul-drawer-direction=right]:w-[95vw] data-[vaul-drawer-direction=right]:sm:max-w-3xl">
          <DrawerHeader className="border-b">
            <DrawerTitle>{selectedCard?.title}</DrawerTitle>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto p-4">
            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : selectedCard?.type.startsWith("preApplication") ? (
              <PreApplicationDetailTable
                data={detailData as PreApplicationRecord[]}
                total={detailTotal}
                page={detailPage}
                pageSize={detailPageSize}
                onPageChange={setDetailPage}
                locale={locale}
                dict={dict}
              />
            ) : (
              <InviteCodeDetailTable
                data={detailData as InviteCodeRecord[]}
                total={detailTotal}
                page={detailPage}
                pageSize={detailPageSize}
                onPageChange={setDetailPage}
                locale={locale}
                dict={dict}
              />
            )}
          </div>

          <DrawerFooter className="border-t">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              {t.confirm}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

function PreApplicationDetailTable({
  data,
  total,
  page,
  pageSize,
  onPageChange,
  locale,
  dict,
}: {
  data: PreApplicationRecord[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  locale: Locale
  dict: Dictionary
}) {
  const t = dict.admin

  const statusBadge = (status: PreApplicationRecord["status"]) => {
    const map = {
      PENDING: { label: t.pending, variant: "secondary" as const },
      APPROVED: { label: t.approved, variant: "default" as const },
      REJECTED: { label: t.rejected, variant: "destructive" as const },
      DISPUTED: { label: t.disputed || "申诉中", variant: "outline" as const },
      ARCHIVED: { label: t.archived || "已归档", variant: "outline" as const },
    }
    const config = map[status] || map.PENDING
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const columns: Column<PreApplicationRecord>[] = [
    {
      key: "user",
      label: t.preApplicationUser,
      width: "35%",
      render: (record) => (
        <div className="space-y-0.5">
          <p className="text-sm font-medium truncate">
            {record.user?.name || record.user?.email || record.registerEmail}
          </p>
          <p className="text-xs text-muted-foreground truncate">{record.registerEmail}</p>
        </div>
      ),
    },
    {
      key: "status",
      label: t.preApplicationStatus,
      width: "25%",
      render: (record) => statusBadge(record.status),
    },
    {
      key: "createdAt",
      label: t.preApplicationCreatedAt,
      width: "40%",
      render: (record) => (
        <span className="text-sm text-muted-foreground">
          {new Date(record.createdAt).toLocaleString(locale)}
        </span>
      ),
    },
  ]

  const formatPageSummary = (summary: { total: number; page: number; totalPages: number }) =>
    t.pageSummary
      .replace("{total}", summary.total.toString())
      .replace("{page}", summary.page.toString())
      .replace("{totalPages}", summary.totalPages.toString())

  return (
    <DataTable
      columns={columns}
      data={data}
      total={total}
      page={page}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onPageSizeChange={() => {}}
      emptyMessage={t.noPreApplications}
      loadingText={t.loading}
      perPageText={t.perPage}
      summaryFormatter={formatPageSummary}
    />
  )
}

function InviteCodeDetailTable({
  data,
  total,
  page,
  pageSize,
  onPageChange,
  locale,
  dict,
}: {
  data: InviteCodeRecord[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  locale: Locale
  dict: Dictionary
}) {
  const t = dict.admin

  const getStatusBadge = (record: InviteCodeRecord) => {
    const now = new Date()
    const isExpired = record.expiresAt && new Date(record.expiresAt) < now
    if (record.usedAt) {
      return <Badge variant="default">{t.inviteCodeStatusUsed}</Badge>
    }
    if (isExpired) {
      return <Badge variant="destructive">{t.inviteCodeStatusExpired}</Badge>
    }
    if (record.assignedAt) {
      return <Badge variant="secondary">{t.inviteCodeStatusAssigned}</Badge>
    }
    return <Badge variant="outline">{t.inviteCodeStatusUnused}</Badge>
  }

  const columns: Column<InviteCodeRecord>[] = [
    {
      key: "code",
      label: t.inviteCode,
      width: "30%",
      render: (record) => (
        <span className="font-mono text-sm truncate block max-w-[180px]" title={record.code}>
          {record.code}
        </span>
      ),
    },
    {
      key: "status",
      label: t.inviteCodeStatus,
      width: "20%",
      render: (record) => getStatusBadge(record),
    },
    {
      key: "assignedTo",
      label: t.inviteCodeAssignedTo,
      width: "25%",
      render: (record) => (
        <span className="text-sm text-muted-foreground truncate block">
          {record.assignedTo?.name || record.assignedTo?.email || "-"}
        </span>
      ),
    },
    {
      key: "expiresAt",
      label: t.inviteExpiresAt,
      width: "25%",
      render: (record) => (
        <span className="text-sm text-muted-foreground">
          {record.expiresAt ? new Date(record.expiresAt).toLocaleDateString(locale) : "-"}
        </span>
      ),
    },
  ]

  const formatPageSummary = (summary: { total: number; page: number; totalPages: number }) =>
    t.pageSummary
      .replace("{total}", summary.total.toString())
      .replace("{page}", summary.page.toString())
      .replace("{totalPages}", summary.totalPages.toString())

  return (
    <DataTable
      columns={columns}
      data={data}
      total={total}
      page={page}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onPageSizeChange={() => {}}
      emptyMessage={t.inviteCodeNoRecords}
      loadingText={t.loading}
      perPageText={t.perPage}
      summaryFormatter={formatPageSummary}
    />
  )
}

type ReviewerStatsData = {
  reviewerId: string
  name: string
  approved: number
  rejected: number
  total: number
}

function ReviewerStatsSection({ data, dict }: { data: ReviewerStatsData[]; dict: Dictionary }) {
  const t = dict.admin
  const [sortKey, setSortKey] = useState<string>("total")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const sortedData = useMemo(() => {
    const enriched = data.map((item) => ({
      ...item,
      approvalRate: item.total > 0 ? Math.round((item.approved / item.total) * 100) : 0,
    }))
    return [...enriched].sort((a, b) => {
      const aVal = a[sortKey as keyof typeof a] as number
      const bVal = b[sortKey as keyof typeof b] as number
      return sortOrder === "desc" ? bVal - aVal : aVal - bVal
    })
  }, [data, sortKey, sortOrder])

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc")
    } else {
      setSortKey(key)
      setSortOrder("desc")
    }
  }

  const columns: Column<(typeof sortedData)[0]>[] = [
    {
      key: "name",
      label: t.reviewer || "审核人",
      width: "30%",
      sortable: true,
      render: (item) => <span className="font-medium">{item.name}</span>,
    },
    {
      key: "approved",
      label: t.approved || "通过",
      width: "15%",
      sortable: true,
      align: "right",
      render: (item) => (
        <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">{item.approved}</span>
      ),
    },
    {
      key: "rejected",
      label: t.rejected || "驳回",
      width: "15%",
      sortable: true,
      align: "right",
      render: (item) => (
        <span className="text-rose-600 dark:text-rose-400 tabular-nums">{item.rejected}</span>
      ),
    },
    {
      key: "total",
      label: t.totalReviews || "总审核",
      width: "15%",
      sortable: true,
      align: "right",
      render: (item) => <span className="font-bold tabular-nums">{item.total}</span>,
    },
    {
      key: "approvalRate",
      label: t.approvalRate || "通过率",
      width: "25%",
      sortable: true,
      align: "right",
      render: (item) => (
        <div className="flex items-center justify-end gap-2">
          <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${item.approvalRate}%` }}
            />
          </div>
          <span className="tabular-nums text-sm">{item.approvalRate}%</span>
        </div>
      ),
    },
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t.reviewerRanking || "审核排行"}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={sortedData}
            total={sortedData.length}
            page={1}
            pageSize={sortedData.length}
            onPageChange={() => {}}
            onPageSizeChange={() => {}}
            onSort={handleSort}
            compact
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.reviewerChart || "审核分布"}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              approved: { label: t.approved || "通过", color: "hsl(var(--chart-2))" },
              rejected: { label: t.rejected || "驳回", color: "hsl(var(--chart-3))" },
            }}
            className="min-h-[200px]"
          >
            <BarChart data={sortedData} layout="vertical" margin={{ left: 0, right: 16 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="approved"
                stackId="a"
                fill="var(--color-approved)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="rejected"
                stackId="a"
                fill="var(--color-rejected)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
