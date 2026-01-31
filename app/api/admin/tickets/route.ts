import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"
import { isAdmin } from "@/lib/auth/permissions"

const parsePositive = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !isAdmin(user.role)) {
      return createApiErrorResponse(request, ApiErrorKeys.general.forbidden, { status: 403 })
    }
    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const { searchParams } = request.nextUrl
    const page = parsePositive(searchParams.get("page"), 1)
    const pageSize = Math.min(parsePositive(searchParams.get("pageSize"), 20), 100)
    const status = searchParams.get("status")
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const [tickets, total] = await Promise.all([
      db.ticket.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { updatedAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          preApplication: {
            select: { id: true, status: true, registerEmail: true },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              author: { select: { id: true, name: true, role: true } },
            },
          },
        },
      }),
      db.ticket.count({ where }),
    ])

    return NextResponse.json({ tickets, total, page, pageSize })
  } catch (error) {
    console.error("Admin tickets API error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.general.failed, { status: 500 })
  }
}
