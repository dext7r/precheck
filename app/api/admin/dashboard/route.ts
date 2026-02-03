import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { createApiErrorResponse } from "@/lib/api/error-response"

const querySchema = z.object({
  range: z.coerce
    .number()
    .int()
    .refine((value) => [7, 30, 90, 180, 365].includes(value)),
  granularity: z.enum(["day", "week", "month"]),
})

const DAY_MS = 24 * 60 * 60 * 1000

const startOfDay = (value: Date) => {
  const next = new Date(value)
  next.setHours(0, 0, 0, 0)
  return next
}

const startOfWeek = (value: Date) => {
  const next = startOfDay(value)
  const day = next.getDay()
  const diff = (day + 6) % 7
  next.setDate(next.getDate() - diff)
  return next
}

const startOfMonth = (value: Date) => new Date(value.getFullYear(), value.getMonth(), 1)

const alignToBucket = (value: Date, granularity: "day" | "week" | "month") => {
  if (granularity === "week") return startOfWeek(value)
  if (granularity === "month") return startOfMonth(value)
  return startOfDay(value)
}

const addStep = (value: Date, granularity: "day" | "week" | "month") => {
  const next = new Date(value)
  if (granularity === "week") {
    next.setDate(next.getDate() + 7)
    return next
  }
  if (granularity === "month") {
    return new Date(next.getFullYear(), next.getMonth() + 1, 1)
  }
  next.setDate(next.getDate() + 1)
  return next
}

const toBucketKey = (value: Date) => {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, "0")
  const day = `${value.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

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

    const searchParams = request.nextUrl.searchParams
    const parsed = querySchema.safeParse({
      range: searchParams.get("range") ?? "30",
      granularity: searchParams.get("granularity") ?? "day",
    })

    if (!parsed.success) {
      return createApiErrorResponse(request, "apiErrors.admin.dashboard.invalidQuery", {
        status: 400,
      })
    }

    const rangeDays = parsed.data.range
    const granularity = parsed.data.granularity

    const now = new Date()
    const rangeEnd = new Date(now)
    rangeEnd.setHours(23, 59, 59, 999)
    const rangeStart = startOfDay(new Date(now.getTime() - (rangeDays - 1) * DAY_MS))

    const bucketStart = alignToBucket(rangeStart, granularity)
    const bucketEnd = alignToBucket(rangeEnd, granularity)

    const bucketStarts: Date[] = []
    for (let cursor = bucketStart; cursor <= bucketEnd; cursor = addStep(cursor, granularity)) {
      bucketStarts.push(new Date(cursor))
    }

    const bucketIndex = new Map<string, number>()
    bucketStarts.forEach((date, index) => {
      bucketIndex.set(toBucketKey(date), index)
    })

    const bucketCount = bucketStarts.length
    const preApplicationSeries = Array.from({ length: bucketCount }, (_, index) => ({
      bucket: toBucketKey(bucketStarts[index]),
      submitted: 0,
      approved: 0,
      rejected: 0,
    }))
    const userSeries = Array.from({ length: bucketCount }, (_, index) => ({
      bucket: toBucketKey(bucketStarts[index]),
      users: 0,
    }))
    const inviteSeries = Array.from({ length: bucketCount }, (_, index) => ({
      bucket: toBucketKey(bucketStarts[index]),
      assigned: 0,
      used: 0,
      expired: 0,
    }))

    const dateTrunc = (column: string) => Prisma.raw(`date_trunc('${granularity}', "${column}")`)

    const [
      pendingCount,
      approvedCount,
      rejectedCount,
      submissionsRangeCount,
      inviteTotalCount,
      inviteAssignedCount,
      inviteExpiredCount,
      inviteAvailableUnassignedCount,
      inviteAvailableUnusedCount,
      inviteUsedCount,
      inviteExpiringSoonCount,
      inviteExpiredUnusedCount,
      submissionsRows,
      reviewRows,
      userRows,
      inviteAssignedRows,
      inviteUsedRows,
      inviteExpiredRows,
      sourceRows,
      inviteStatusAssignedUnusedCount,
      reviewerStatsRows,
    ] = await Promise.all([
      db.preApplication.count({ where: { status: "PENDING" } }),
      db.preApplication.count({ where: { status: "APPROVED" } }),
      db.preApplication.count({ where: { status: "REJECTED" } }),
      db.preApplication.count({
        where: { createdAt: { gte: rangeStart, lte: rangeEnd } },
      }),
      db.inviteCode.count({ where: { deletedAt: null } }),
      db.inviteCode.count({ where: { deletedAt: null, assignedAt: { not: null } } }),
      db.inviteCode.count({
        where: { deletedAt: null, usedAt: null, expiresAt: { not: null, lte: now } },
      }),
      db.inviteCode.count({
        where: {
          deletedAt: null,
          assignedAt: null,
          usedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      db.inviteCode.count({
        where: {
          deletedAt: null,
          usedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      db.inviteCode.count({ where: { deletedAt: null, usedAt: { not: null } } }),
      db.inviteCode.count({
        where: {
          deletedAt: null,
          usedAt: null,
          expiresAt: {
            gt: now,
            lte: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      }),
      db.inviteCode.count({
        where: {
          deletedAt: null,
          usedAt: null,
          expiresAt: { not: null, lte: now },
        },
      }),
      db.$queryRaw<Array<{ bucket: Date; count: number }>>`
        SELECT ${dateTrunc("createdAt")} AS bucket, COUNT(*)::int AS count
        FROM "PreApplication"
        WHERE "createdAt" >= ${rangeStart} AND "createdAt" <= ${rangeEnd}
        GROUP BY bucket
        ORDER BY bucket ASC
      `,
      db.$queryRaw<Array<{ bucket: Date; status: string; count: number }>>`
        SELECT ${dateTrunc("reviewedAt")} AS bucket, "status", COUNT(*)::int AS count
        FROM "PreApplication"
        WHERE "reviewedAt" IS NOT NULL
          AND "reviewedAt" >= ${rangeStart}
          AND "reviewedAt" <= ${rangeEnd}
        GROUP BY bucket, "status"
        ORDER BY bucket ASC
      `,
      db.$queryRaw<Array<{ bucket: Date; count: number }>>`
        SELECT ${dateTrunc("createdAt")} AS bucket, COUNT(*)::int AS count
        FROM "User"
        WHERE "createdAt" >= ${rangeStart} AND "createdAt" <= ${rangeEnd}
        GROUP BY bucket
        ORDER BY bucket ASC
      `,
      db.$queryRaw<Array<{ bucket: Date; count: number }>>`
        SELECT ${dateTrunc("assignedAt")} AS bucket, COUNT(*)::int AS count
        FROM "InviteCode"
        WHERE "deletedAt" IS NULL
          AND "assignedAt" IS NOT NULL
          AND "assignedAt" >= ${rangeStart}
          AND "assignedAt" <= ${rangeEnd}
        GROUP BY bucket
        ORDER BY bucket ASC
      `,
      db.$queryRaw<Array<{ bucket: Date; count: number }>>`
        SELECT ${dateTrunc("usedAt")} AS bucket, COUNT(*)::int AS count
        FROM "InviteCode"
        WHERE "deletedAt" IS NULL
          AND "usedAt" IS NOT NULL
          AND "usedAt" >= ${rangeStart}
          AND "usedAt" <= ${rangeEnd}
        GROUP BY bucket
        ORDER BY bucket ASC
      `,
      db.$queryRaw<Array<{ bucket: Date; count: number }>>`
        SELECT ${dateTrunc("expiresAt")} AS bucket, COUNT(*)::int AS count
        FROM "InviteCode"
        WHERE "deletedAt" IS NULL
          AND "usedAt" IS NULL
          AND "expiresAt" IS NOT NULL
          AND "expiresAt" >= ${rangeStart}
          AND "expiresAt" <= ${rangeEnd}
        GROUP BY bucket
        ORDER BY bucket ASC
      `,
      db.preApplication.groupBy({
        by: ["source"],
        where: { createdAt: { gte: rangeStart, lte: rangeEnd } },
        _count: true,
      }),
      db.inviteCode.count({
        where: {
          deletedAt: null,
          assignedAt: { not: null },
          usedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      db.$queryRaw<
        Array<{
          reviewedById: string
          name: string | null
          email: string
          status: string
          count: number
        }>
      >`
        SELECT
          p."reviewedById",
          u."name",
          u."email",
          p."status",
          COUNT(*)::int AS count
        FROM "PreApplication" p
        INNER JOIN "User" u ON p."reviewedById" = u."id"
        WHERE p."reviewedById" IS NOT NULL
          AND p."status" IN ('APPROVED', 'REJECTED')
          AND p."reviewedAt" >= ${rangeStart}
          AND p."reviewedAt" <= ${rangeEnd}
        GROUP BY p."reviewedById", u."name", u."email", p."status"
        ORDER BY count DESC
      `,
    ])

    for (const row of submissionsRows) {
      const key = toBucketKey(new Date(row.bucket))
      const index = bucketIndex.get(key)
      if (index === undefined) continue
      preApplicationSeries[index].submitted = Number(row.count)
    }

    for (const row of reviewRows) {
      const key = toBucketKey(new Date(row.bucket))
      const index = bucketIndex.get(key)
      if (index === undefined) continue
      if (row.status === "APPROVED") {
        preApplicationSeries[index].approved = Number(row.count)
      }
      if (row.status === "REJECTED") {
        preApplicationSeries[index].rejected = Number(row.count)
      }
    }

    for (const row of userRows) {
      const key = toBucketKey(new Date(row.bucket))
      const index = bucketIndex.get(key)
      if (index === undefined) continue
      userSeries[index].users = Number(row.count)
    }

    for (const row of inviteAssignedRows) {
      const key = toBucketKey(new Date(row.bucket))
      const index = bucketIndex.get(key)
      if (index === undefined) continue
      inviteSeries[index].assigned = Number(row.count)
    }

    for (const row of inviteUsedRows) {
      const key = toBucketKey(new Date(row.bucket))
      const index = bucketIndex.get(key)
      if (index === undefined) continue
      inviteSeries[index].used = Number(row.count)
    }

    for (const row of inviteExpiredRows) {
      const key = toBucketKey(new Date(row.bucket))
      const index = bucketIndex.get(key)
      if (index === undefined) continue
      inviteSeries[index].expired = Number(row.count)
    }

    const sourceDistribution = sourceRows
      .map((row) => ({
        source: row.source ?? "UNKNOWN",
        count: Number(row._count),
      }))
      .sort((a, b) => b.count - a.count)

    const reviewerStatsMap = new Map<string, { name: string; approved: number; rejected: number }>()
    for (const row of reviewerStatsRows) {
      const existing = reviewerStatsMap.get(row.reviewedById)
      if (existing) {
        if (row.status === "APPROVED") existing.approved += Number(row.count)
        if (row.status === "REJECTED") existing.rejected += Number(row.count)
      } else {
        reviewerStatsMap.set(row.reviewedById, {
          name: row.name || row.email,
          approved: row.status === "APPROVED" ? Number(row.count) : 0,
          rejected: row.status === "REJECTED" ? Number(row.count) : 0,
        })
      }
    }

    const reviewerStats = Array.from(reviewerStatsMap.entries())
      .map(([reviewerId, data]) => ({
        reviewerId,
        name: data.name,
        approved: data.approved,
        rejected: data.rejected,
        total: data.approved + data.rejected,
      }))
      .sort((a, b) => b.total - a.total)

    const currentUserStats = reviewerStats.find((r) => r.reviewerId === user.id)
    const currentUserReviewed = currentUserStats?.total ?? 0
    const othersReviewed = reviewerStats
      .filter((r) => r.reviewerId !== user.id)
      .reduce((sum, r) => sum + r.total, 0)

    return NextResponse.json({
      range: rangeDays,
      granularity,
      kpis: {
        preApplicationPending: pendingCount,
        preApplicationApproved: approvedCount,
        preApplicationRejected: rejectedCount,
        preApplicationSubmitted: submissionsRangeCount,
        inviteTotal: inviteTotalCount,
        inviteAssigned: inviteAssignedCount,
        inviteExpired: inviteExpiredCount,
        inviteAvailableUnassigned: inviteAvailableUnassignedCount,
        inviteAvailableUnused: inviteAvailableUnusedCount,
        inviteExpiringSoon: inviteExpiringSoonCount,
        inviteAssignedUnused: inviteStatusAssignedUnusedCount,
      },
      series: {
        preApplications: preApplicationSeries,
        users: userSeries,
        invites: inviteSeries,
      },
      distributions: {
        sources: sourceDistribution,
        inviteStatuses: [
          { key: "unassigned", count: inviteAvailableUnassignedCount },
          { key: "assignedUnused", count: inviteStatusAssignedUnusedCount },
          { key: "used", count: inviteUsedCount },
          { key: "expired", count: inviteExpiredUnusedCount },
        ],
      },
      reviewerStats: {
        currentUser: currentUserReviewed,
        others: othersReviewed,
        total: currentUserReviewed + othersReviewed,
        breakdown: reviewerStats,
      },
    })
  } catch (error) {
    console.error("Admin dashboard stats error:", error)
    return createApiErrorResponse(request, "apiErrors.admin.dashboard.failed", { status: 500 })
  }
}
