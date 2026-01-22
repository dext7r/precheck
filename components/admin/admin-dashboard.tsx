"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { preApplicationSources } from "@/lib/pre-application/constants"

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
    preApplications: Array<{ bucket: string; submitted: number; approved: number; rejected: number }>
    users: Array<{ bucket: string; users: number }>
    invites: Array<{ bucket: string; assigned: number; used: number; expired: number }>
  }
  distributions: {
    sources: Array<{ source: string; count: number }>
    inviteStatuses: Array<{ key: string; count: number }>
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
        },
        {
          title: t.preApplicationApproved,
          value: data.kpis.preApplicationApproved,
        },
        {
          title: t.preApplicationRejected,
          value: data.kpis.preApplicationRejected,
        },
        {
          title: t.preApplicationSubmitted,
          value: data.kpis.preApplicationSubmitted,
        },
        {
          title: t.inviteTotal,
          value: data.kpis.inviteTotal,
        },
        {
          title: t.inviteAssigned,
          value: data.kpis.inviteAssigned,
        },
        {
          title: t.inviteExpired,
          value: data.kpis.inviteExpired,
        },
        {
          title: t.inviteAvailableUnassigned,
          value: data.kpis.inviteAvailableUnassigned,
        },
        {
          title: t.inviteAvailableUnused,
          value: data.kpis.inviteAvailableUnused,
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
                  {(t as Record<string, string>)[option.key]}
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
                  {(t as Record<string, string>)[option.key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{card.title}</p>
              <p className="mt-1 text-2xl font-semibold">{card.value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{t.preApplicationTrend}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                submitted: { label: t.preApplicationSubmitted, color: "hsl(var(--chart-1))" },
                approved: { label: t.preApplicationApproved, color: "hsl(var(--chart-2))" },
                rejected: { label: t.preApplicationRejected, color: "hsl(var(--chart-3))" },
              }}
              className="h-[260px]"
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
                const total = data?.distributions.sources.reduce((sum, row) => sum + row.count, 0) || 0
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
                assigned: { label: t.inviteAssigned, color: "hsl(var(--chart-2))" },
                used: { label: t.inviteUsed, color: "hsl(var(--chart-4))" },
                expired: { label: t.inviteExpired, color: "hsl(var(--chart-5))" },
              }}
              className="h-[260px]"
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
                users: { label: t.userRegistrations, color: "hsl(var(--chart-1))" },
              }}
              className="h-[260px]"
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
                      {(t as Record<string, string>)[`inviteStatus_${item.key}`]}
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
    </div>
  )
}
