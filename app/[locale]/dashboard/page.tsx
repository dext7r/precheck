import { PenLine } from "lucide-react"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { getCurrentUser } from "@/lib/auth/session"
import { StatsCard, type StatsIconName } from "@/components/dashboard/stats-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config"
import { db } from "@/lib/db"
import Link from "next/link"

interface DashboardPageProps {
  params: Promise<{ locale: string }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params
  const currentLocale = locales.includes(locale as Locale) ? (locale as Locale) : defaultLocale
  const dict = await getDictionary(currentLocale)
  const user = await getCurrentUser()

  let totalPosts = 0
  let publishedPosts = 0
  let draftPosts = 0
  let totalViews = 0
  let recentPosts: Array<{
    id: string
    title: string
    status: string
    createdAt: Date
  }> = []

  if (db && user) {
    const [posts, totalPostsCount, publishedCount, draftCount, viewsData] = await Promise.all([
      db.post.findMany({
        where: { authorId: user.id },
        orderBy: { createdAt: "desc" },
        take: 4,
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
        },
      }),
      db.post.count({ where: { authorId: user.id } }),
      db.post.count({
        where: { authorId: user.id, status: "PUBLISHED" },
      }),
      db.post.count({
        where: { authorId: user.id, status: "DRAFT" },
      }),
      db.post.aggregate({
        where: { authorId: user.id },
        _sum: { views: true },
      }),
    ])

    recentPosts = posts
    totalPosts = totalPostsCount
    publishedPosts = publishedCount
    draftPosts = draftCount
    totalViews = viewsData._sum.views || 0
  }

  const stats: Array<{
    title: string
    value: number | string
    icon: StatsIconName
    trend?: {
      value: number
      isPositive: boolean
    }
    trendLabel?: string
  }> = [
    {
      title: dict.dashboard.stats.totalPosts,
      value: totalPosts,
      icon: "fileText",
      trend: totalPosts > 0 ? { value: 12, isPositive: true } : undefined,
      trendLabel: dict.dashboard.stats.fromLastMonth,
    },
    {
      title: dict.dashboard.stats.published,
      value: publishedPosts,
      icon: "bookOpen",
      trend: publishedPosts > 0 ? { value: 5, isPositive: true } : undefined,
      trendLabel: dict.dashboard.stats.fromLastMonth,
    },
    { title: dict.dashboard.stats.drafts, value: draftPosts, icon: "penLine" },
    {
      title: dict.dashboard.stats.views,
      value: totalViews > 1000 ? `${(totalViews / 1000).toFixed(1)}K` : totalViews,
      icon: "eye",
      trend: totalViews > 0 ? { value: 18, isPositive: true } : undefined,
      trendLabel: dict.dashboard.stats.fromLastMonth,
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{dict.dashboard.title}</h1>
        <p className="mt-1 text-muted-foreground">
          {dict.dashboard.welcome}, {user?.name || user?.email}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <StatsCard key={stat.title} {...stat} index={index} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{dict.dashboard.recentPosts}</CardTitle>
            <Button variant="outline" size="sm">
              {dict.dashboard.viewAll}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div>
                    <p className="font-medium">{post.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(post.createdAt).toLocaleDateString(currentLocale)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      post.status === "PUBLISHED"
                        ? "bg-green-500/10 text-green-500"
                        : post.status === "PENDING"
                          ? "bg-yellow-500/10 text-yellow-500"
                          : post.status === "REJECTED"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {post.status === "PUBLISHED"
                      ? dict.dashboard.published
                      : post.status === "PENDING"
                        ? dict.dashboard.pending
                        : post.status === "REJECTED"
                          ? dict.dashboard.rejected
                          : dict.dashboard.draft}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{dict.dashboard.createPost}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-primary/10 p-4">
              <PenLine className="h-8 w-8 text-primary" />
            </div>
            <p className="mt-4 text-center text-muted-foreground">{dict.dashboard.startWriting}</p>
            <Link href={`/${currentLocale}/dashboard/posts/new`}>
              <Button className="mt-4">
                <PenLine className="mr-2 h-4 w-4" />
                {dict.dashboard.newPost}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
