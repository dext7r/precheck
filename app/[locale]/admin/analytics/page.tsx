import { getDictionary } from "@/lib/i18n/get-dictionary"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileText, Eye, TrendingUp } from "lucide-react"
import type { Locale } from "@/lib/i18n/config"
import { db } from "@/lib/db"

interface AdminAnalyticsPageProps {
  params: Promise<{ locale: Locale }>
}

export default async function AdminAnalyticsPage({ params }: AdminAnalyticsPageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)

  let monthlyData: Array<{ month: string; users: number; posts: number; views: number }> = []
  let topCountries: Array<{ country: string; users: number; percentage: number }> = []

  const monthKeys = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ] as const

  const now = new Date()
  const monthStartDates = Array.from({ length: 6 }, (_, index) => {
    const monthOffset = now.getMonth() - 5 + index
    return new Date(now.getFullYear(), monthOffset, 1)
  })

  const prisma = db
  if (prisma) {
    try {
      monthlyData = await Promise.all(
        monthStartDates.map(async (monthStart) => {
          const monthEnd = new Date(
            monthStart.getFullYear(),
            monthStart.getMonth() + 1,
            0,
            23,
            59,
            59,
            999,
          )
          const monthKey = monthKeys[monthStart.getMonth()]
          const monthLabel = dict.admin.months[monthKey] || monthKey

          const [userCount, postCount, totalViews] = await Promise.all([
            prisma.user.count({
              where: {
                createdAt: {
                  gte: monthStart,
                  lte: monthEnd,
                },
              },
            }),
            prisma.post.count({
              where: {
                createdAt: {
                  gte: monthStart,
                  lte: monthEnd,
                },
              },
            }),
            prisma.post.aggregate({
              where: {
                createdAt: {
                  gte: monthStart,
                  lte: monthEnd,
                },
              },
              _sum: {
                views: true,
              },
            }),
          ])

          return {
            month: monthLabel,
            users: userCount,
            posts: postCount,
            views: totalViews._sum.views || 0,
          }
        }),
      )

      const countryData = await prisma.user.groupBy({
        by: ["country"],
        where: {
          country: { not: null },
        },
        _count: true,
        orderBy: {
          _count: {
            country: "desc",
          },
        },
        take: 10,
      })

      const totalUsers = await prisma.user.count()
      topCountries = countryData.map((item: { country: string | null; _count: number }) => ({
        country: item.country || "Unknown",
        users: item._count,
        percentage: totalUsers > 0 ? Math.round((item._count / totalUsers) * 100) : 0,
      }))
    } catch (error) {
      console.error("Failed to load admin analytics:", error)
    }
  }

  if (monthlyData.length === 0) {
    monthlyData = monthStartDates.map((monthStart) => {
      const monthKey = monthKeys[monthStart.getMonth()]
      return {
        month: dict.admin.months[monthKey] || monthKey,
        users: 0,
        posts: 0,
        views: 0,
      }
    })
  }

  const maxUsers = Math.max(1, ...monthlyData.map((d) => d.users))
  const maxPosts = Math.max(1, ...monthlyData.map((d) => d.posts))
  const maxViews = Math.max(1, ...monthlyData.map((d) => d.views))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{dict.admin.analytics}</h1>
        <p className="mt-1 text-muted-foreground">{dict.admin.systemDataAnalytics}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {dict.admin.userGrowth}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-end gap-2">
              {monthlyData.map((data) => (
                <div key={data.month} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t bg-primary transition-all hover:bg-primary/80"
                    style={{ height: `${(data.users / maxUsers) * 160}px` }}
                  />
                  <span className="text-xs text-muted-foreground">{data.month}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-chart-2" />
              {dict.admin.postsPublished}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-end gap-2">
              {monthlyData.map((data) => (
                <div key={data.month} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t bg-chart-2 transition-all hover:opacity-80"
                    style={{ height: `${(data.posts / maxPosts) * 160}px` }}
                  />
                  <span className="text-xs text-muted-foreground">{data.month}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-chart-3" />
              {dict.admin.totalViews}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-end gap-2">
              {monthlyData.map((data) => (
                <div key={data.month} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t bg-chart-3 transition-all hover:opacity-80"
                    style={{ height: `${(data.views / maxViews) * 160}px` }}
                  />
                  <span className="text-xs text-muted-foreground">{data.month}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{dict.admin.userDistribution}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCountries.map((country) => (
                <div key={country.country} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{country.country}</span>
                    <span className="text-sm text-muted-foreground">
                      {country.users} ({country.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${country.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{dict.admin.growthOverview}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[
                {
                  label: dict.admin.monthlyActiveUsers,
                  value: "12,453",
                  change: "+12%",
                },
                {
                  label: dict.admin.dailyActiveUsers,
                  value: "3,234",
                  change: "+8%",
                },
                {
                  label: dict.admin.avgSessionDuration,
                  value: "4m 32s",
                  change: "+5%",
                },
                { label: dict.admin.bounceRate, value: "32%", change: "-3%" },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div>
                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                    <p className="mt-1 text-xl font-bold">{metric.value}</p>
                  </div>
                  <div className="flex items-center gap-1 text-primary">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">{metric.change}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
