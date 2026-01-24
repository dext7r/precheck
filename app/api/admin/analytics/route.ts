import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { createApiErrorResponse } from "@/lib/api/error-response"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, "apiErrors.general.notAuthenticated", { status: 401 })
    }

    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return createApiErrorResponse(request, "apiErrors.general.forbidden", { status: 403 })
    }

    if (!db) {
      return createApiErrorResponse(request, "apiErrors.general.databaseNotConfigured", {
        status: 503,
      })
    }

    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    const userGrowth = []
    const postStats = []
    const viewStats = []

    for (let i = 0; i < 6; i++) {
      const monthStart = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + i, 1)
      const monthEnd = new Date(
        sixMonthsAgo.getFullYear(),
        sixMonthsAgo.getMonth() + i + 1,
        0,
        23,
        59,
        59,
        999,
      )

      const month = monthStart.toLocaleDateString("en", { month: "short" })

      const [userCount, postCount, totalViews] = await Promise.all([
        db.user.count({
          where: {
            createdAt: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
        }),
        db.post.count({
          where: {
            createdAt: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
        }),
        db.post.aggregate({
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

      userGrowth.push({ month, users: userCount })
      postStats.push({ month, posts: postCount })
      viewStats.push({ month, views: totalViews._sum.views || 0 })
    }

    const countryData = await db.user.groupBy({
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

    const totalUsers = await db.user.count()
    const topCountries = countryData.map((item: { country: string | null; _count: number }) => ({
      country: item.country || "Unknown",
      users: item._count,
      percentage: totalUsers > 0 ? Math.round((item._count / totalUsers) * 100) : 0,
    }))

    return NextResponse.json({
      userGrowth,
      postStats,
      viewStats,
      topCountries,
    })
  } catch (error) {
    console.error("Analytics API error:", error)
    return createApiErrorResponse(request, "apiErrors.admin.analytics.failed", { status: 500 })
  }
}
