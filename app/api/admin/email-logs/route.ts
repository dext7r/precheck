import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"
import type { Prisma } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return createApiErrorResponse(request, ApiErrorKeys.general.forbidden, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")))
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || "ALL"
    const sortKey = searchParams.get("sortKey") || "createdAt"
    const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc"

    const where: Prisma.EmailLogWhereInput = {}

    if (search) {
      where.OR = [
        { to: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
      ]
    }

    if (status !== "ALL") {
      where.status = status as "PENDING" | "SUCCESS" | "FAILED"
    }

    const orderBy: Prisma.EmailLogOrderByWithRelationInput = {}
    if (sortKey === "createdAt" || sortKey === "to" || sortKey === "subject" || sortKey === "status") {
      orderBy[sortKey] = sortDir
    } else {
      orderBy.createdAt = "desc"
    }

    const [records, total] = await Promise.all([
      db!.emailLog.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      db!.emailLog.count({ where }),
    ])

    return NextResponse.json({ records, total })
  } catch (error) {
    console.error("Email logs fetch error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.admin.emailLogs.failed, { status: 500 })
  }
}
