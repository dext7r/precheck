import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { PreApplicationStatus } from "@prisma/client"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return createApiErrorResponse(request, ApiErrorKeys.general.forbidden, { status: 403 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const { searchParams } = request.nextUrl
    const search = (searchParams.get("search") || "").trim()
    const status = searchParams.get("status") || ""
    const registerEmail = (searchParams.get("registerEmail") || "").trim()
    const queryToken = (searchParams.get("queryToken") || "").trim()
    const reviewRound = searchParams.get("reviewRound") || ""
    const inviteStatus = searchParams.get("inviteStatus") || ""
    const sortByParam = searchParams.get("sortBy") || "createdAt"
    const sortOrderParam = searchParams.get("sortOrder")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit
    const allowedSortBy = new Set([
      "createdAt",
      "updatedAt",
      "status",
      "registerEmail",
      "resubmitCount",
      "inviteCodeId",
    ])
    const sortBy = allowedSortBy.has(sortByParam) ? sortByParam : "createdAt"
    const sortOrder = sortOrderParam === "asc" ? "asc" : "desc"

    const where: {
      status?: PreApplicationStatus
      registerEmail?: { contains: string; mode: "insensitive" }
      queryToken?: { contains: string; mode: "insensitive" }
      resubmitCount?: number
      inviteCodeId?: { not: null } | null
      OR?: Array<Record<string, unknown>>
    } = {}

    if (status && Object.values(PreApplicationStatus).includes(status as PreApplicationStatus)) {
      where.status = status as PreApplicationStatus
    }

    if (registerEmail) {
      where.registerEmail = { contains: registerEmail, mode: "insensitive" }
    }

    if (queryToken) {
      where.queryToken = { contains: queryToken, mode: "insensitive" }
    }

    if (reviewRound) {
      const round = Number.parseInt(reviewRound)
      if (!Number.isNaN(round) && round >= 1) {
        where.resubmitCount = round - 1
      }
    }

    if (inviteStatus === "issued") {
      where.inviteCodeId = { not: null }
    } else if (inviteStatus === "none") {
      where.inviteCodeId = null
    }

    if (search) {
      where.OR = [
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
        select: {
          id: true,
          essay: true,
          source: true,
          sourceDetail: true,
          registerEmail: true,
          queryToken: true,
          group: true,
          status: true,
          guidance: true,
          reviewedAt: true,
          createdAt: true,
          updatedAt: true,
          resubmitCount: true,
          user: { select: { id: true, name: true, email: true } },
          reviewedBy: { select: { id: true, name: true, email: true } },
          inviteCode: {
            select: { id: true, code: true, expiresAt: true, usedAt: true, assignedAt: true },
          },
        },
      }),
      db.preApplication.count({ where }),
    ])

    const enrichedRecords = records.map((record) => {
      const reviewRound = record.resubmitCount + 1
      return { ...record, reviewRound }
    })

    return NextResponse.json({ records: enrichedRecords, total, page, limit })
  } catch (error) {
    console.error("Admin pre-application list error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.admin.preApplications.failedToFetch, {
      status: 500,
    })
  }
}
