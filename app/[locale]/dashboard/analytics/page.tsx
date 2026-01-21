import { getDictionary } from "@/lib/i18n/get-dictionary"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Users, Eye, Clock } from "lucide-react"
import type { Locale } from "@/lib/i18n/config"
import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"

interface AnalyticsPageProps {
  params: Promise<{ locale: Locale }>
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)
  const user = await getCurrentUser()

  let totalViews = 0
  let topPosts: Array<{ title: string; views: number }> = []

  if (db && user) {
    const viewsData = await db.post.aggregate({
      where: { authorId: user.id },
      _sum: { views: true },
    })
    totalViews = viewsData._sum.views || 0

    topPosts = await db.post.findMany({
      where: { authorId: user.id, status: "PUBLISHED" },
      orderBy: { views: "desc" },
      take: 5,
      select: {
        title: true,
        views: true,
      },
    })
  }

  const stats = [
    {
      title: dict.dashboard.totalViews,
      value: totalViews > 1000 ? `${(totalViews / 1000).toFixed(1)}K` : totalViews.toString(),
      change: "+12%",
      icon: Eye,
    },
    {
      title: dict.dashboard.uniqueVisitors,
      value: Math.floor(totalViews * 0.6).toString(),
      change: "+8%",
      icon: Users,
    },
    {
      title: dict.dashboard.avgReadTime,
      value: "4m 32s",
      change: "+5%",
      icon: Clock,
    },
    {
      title: dict.dashboard.growthRate,
      value: "24%",
      change: "+3%",
      icon: TrendingUp,
    },
  ]

  const weeklyData = [
    { day: dict.dashboard.monday, views: Math.floor(totalViews * 0.15) },
    { day: dict.dashboard.tuesday, views: Math.floor(totalViews * 0.18) },
    { day: dict.dashboard.wednesday, views: Math.floor(totalViews * 0.14) },
    { day: dict.dashboard.thursday, views: Math.floor(totalViews * 0.21) },
    { day: dict.dashboard.friday, views: Math.floor(totalViews * 0.19) },
    { day: dict.dashboard.saturday, views: Math.floor(totalViews * 0.08) },
    { day: dict.dashboard.sunday, views: Math.floor(totalViews * 0.05) },
  ]

  const maxViews = Math.max(1, ...weeklyData.map((d) => d.views))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{dict.dashboard.analytics}</h1>
        <p className="mt-1 text-muted-foreground">{dict.dashboard.trackPerformance}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                </div>
                <div className="rounded-full bg-primary/10 p-3">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
              <p className="mt-2 text-sm text-primary">
                {stat.change} {dict.dashboard.vsLastWeek}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{dict.dashboard.weeklyViewsTrend}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-end gap-2">
              {weeklyData.map((data) => (
                <div key={data.day} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t bg-primary transition-all hover:bg-primary/80"
                    style={{ height: `${(data.views / maxViews) * 200}px` }}
                  />
                  <span className="text-xs text-muted-foreground">{data.day}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{dict.dashboard.topPosts}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPosts.length === 0 ? (
                <p className="text-sm text-muted-foreground">{dict.dashboard.noTopPosts}</p>
              ) : (
                topPosts.map((post, index) => (
                  <div key={`${post.title}-${index}`} className="flex items-center gap-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium line-clamp-1">{post.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {post.views.toLocaleString()} {dict.dashboard.viewsCount}
                      </p>
                    </div>
                    {totalViews > 0 && (
                      <span className="text-sm font-medium text-primary">
                        {((post.views / totalViews) * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
