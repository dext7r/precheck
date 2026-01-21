import { getDictionary } from "@/lib/i18n/get-dictionary"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileText, TrendingUp, Activity } from "lucide-react"
import type { Locale } from "@/lib/i18n/config"
import { db } from "@/lib/db"

interface AdminPageProps {
  params: Promise<{ locale: Locale }>
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)

  let totalUsers = 0
  let activeUsers = 0
  let newUsers = 0
  let totalPosts = 0

  if (db) {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const [totalUsersCount, activeUsersCount, newUsersCount, totalPostsCount] = await Promise.all(
        [
          db.user.count(),
          db.user.count({ where: { status: "ACTIVE" } }),
          db.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
          db.post.count(),
        ],
      )

      totalUsers = totalUsersCount
      activeUsers = activeUsersCount
      newUsers = newUsersCount
      totalPosts = totalPostsCount
    } catch (error) {
      console.error("Failed to load admin stats:", error)
    }
  }

  const stats = [
    {
      title: dict.admin.totalUsers,
      value: totalUsers.toLocaleString(),
      change: "+12%",
      icon: Users,
    },
    {
      title: dict.admin.activeUsers,
      value: activeUsers.toLocaleString(),
      change: "+8%",
      icon: Activity,
    },
    {
      title: dict.admin.newUsers,
      value: newUsers.toLocaleString(),
      change: "+23%",
      icon: TrendingUp,
    },
    {
      title: dict.admin.totalPosts,
      value: totalPosts.toLocaleString(),
      change: "+5%",
      icon: FileText,
    },
  ]

  const recentActivity = [
    {
      type: "user",
      message:
        locale === "zh" ? "新用户注册: john@example.com" : "New user registered: john@example.com",
      time: "2 min ago",
    },
    {
      type: "post",
      message:
        locale === "zh" ? "新文章发布: Getting Started" : "New post published: Getting Started",
      time: "15 min ago",
    },
    {
      type: "user",
      message:
        locale === "zh"
          ? "用户更新资料: jane@example.com"
          : "User updated profile: jane@example.com",
      time: "1 hour ago",
    },
    {
      type: "post",
      message: locale === "zh" ? "文章被删除: Old Tutorial" : "Post deleted: Old Tutorial",
      time: "2 hours ago",
    },
    {
      type: "user",
      message: locale === "zh" ? "用户被禁用: spam@example.com" : "User banned: spam@example.com",
      time: "3 hours ago",
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{dict.admin.title}</h1>
        <p className="mt-1 text-muted-foreground">{dict.admin.overview}</p>
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
                {stat.change} {dict.admin.vsLastMonth}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{dict.admin.recentActivity}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 rounded-lg border border-border p-4"
                >
                  <div
                    className={`rounded-full p-2 ${
                      activity.type === "user"
                        ? "bg-primary/10 text-primary"
                        : "bg-chart-2/10 text-chart-2"
                    }`}
                  >
                    {activity.type === "user" ? (
                      <Users className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{activity.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{dict.admin.systemStatus}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "API Server", status: "operational", uptime: "99.9%" },
                { name: "Database", status: "operational", uptime: "99.8%" },
                { name: "Storage", status: "operational", uptime: "100%" },
                { name: "CDN", status: "operational", uptime: "99.9%" },
              ].map((service) => (
                <div
                  key={service.name}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="font-medium">{service.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-primary">
                      {service.status === "operational" ? dict.admin.operational : dict.admin.down}
                    </p>
                    <p className="text-xs text-muted-foreground">{service.uptime} uptime</p>
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
