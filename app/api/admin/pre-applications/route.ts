import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { PreApplicationStatus } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const { searchParams } = request.nextUrl
    const search = (searchParams.get("search") || "").trim()
    const status = searchParams.get("status") || ""
    const sortByParam = searchParams.get("sortBy") || "createdAt"
    const sortOrderParam = searchParams.get("sortOrder")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit
    const allowedSortBy = new Set(["createdAt", "status", "registerEmail"])
    const sortBy = allowedSortBy.has(sortByParam) ? sortByParam : "createdAt"
    const sortOrder = sortOrderParam === "asc" ? "asc" : "desc"

    const where: {
      status?: PreApplicationStatus
      OR?: Array<Record<string, unknown>>
    } = {}

    if (status && Object.values(PreApplicationStatus).includes(status as PreApplicationStatus)) {
      where.status = status as PreApplicationStatus
    }

    if (search) {
      where.OR = [
        { registerEmail: { contains: search, mode: "insensitive" as const } },
        { queryToken: { contains: search, mode: "insensitive" as const } },
        { user: { name: { contains: search, mode: "insensitive" as const } } },
        { user: { email: { contains: search, mode: "insensitive" as const } } },
      ]
    }

    const [records, total] = await Promise.all([
      db.preApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: { select: { id: true, name: true, email: true } },
          reviewedBy: { select: { id: true, name: true, email: true } },
          inviteCode: {
            select: { id: true, code: true, expiresAt: true, usedAt: true, assignedAt: true },
          },
        },
      }),
      db.preApplication.count({ where }),
    ])

    const userIds = Array.from(new Set(records.map((record) => record.userId)))
    const reviewStats = userIds.length
      ? await db.preApplication.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds } },
          _min: { createdAt: true },
          _count: { _all: true },
        })
      : []

    const statsByUser = new Map(
      reviewStats.map((stat) => [
        stat.userId,
        { minCreatedAt: stat._min.createdAt, total: stat._count._all },
      ]),
    )

    const enrichedRecords = records.map((record) => {
      const stats = statsByUser.get(record.userId)
      let reviewStage = "INITIAL"
      if (record.reviewCount > 0) {
        reviewStage = "FOLLOW_UP"
      } else if (stats && stats.total > 1 && stats.minCreatedAt) {
        const isFirst = record.createdAt.getTime() === stats.minCreatedAt.getTime()
        reviewStage = isFirst ? "INITIAL" : "FOLLOW_UP"
      }
      return { ...record, reviewStage }
    })

    return NextResponse.json({ records: enrichedRecords, total, page, limit })
  } catch (error) {
    console.error("Admin pre-application list error:", error)
    return NextResponse.json({ error: "Failed to fetch pre-applications" }, { status: 500 })
  }
}
