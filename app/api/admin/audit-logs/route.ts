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

    const { searchParams } = request.nextUrl
    const search = (searchParams.get("search") || "").trim()
    const entityType = searchParams.get("entityType") || "ALL"
    const action = searchParams.get("action") || "ALL"
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (entityType !== "ALL") {
      where.entityType = entityType
    }
    if (action !== "ALL") {
      where.action = action
    }
    if (search) {
      where.OR = [
        { entityId: { contains: search, mode: "insensitive" } },
        { actorEmail: { contains: search, mode: "insensitive" } },
        { action: { contains: search, mode: "insensitive" } },
        { entityType: { contains: search, mode: "insensitive" } },
      ]
    }

    const [records, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      db.auditLog.count({ where }),
    ])

    return NextResponse.json({ records, total, page, limit })
  } catch (error) {
    console.error("Audit logs fetch error:", error)
    return createApiErrorResponse(request, "apiErrors.admin.auditLogs.failed", { status: 500 })
  }
}
