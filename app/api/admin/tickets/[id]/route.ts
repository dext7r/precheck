import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"
import { isAdmin } from "@/lib/auth/permissions"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user || !isAdmin(user.role)) {
      return createApiErrorResponse(request, ApiErrorKeys.general.forbidden, { status: 403 })
    }
    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const { id } = await context.params
    const ticket = await db.ticket.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        preApplication: {
          select: {
            id: true,
            status: true,
            registerEmail: true,
            essay: true,
            guidance: true,
            reviewedAt: true,
            reviewedBy: { select: { id: true, name: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: { id: true, name: true, email: true, role: true, avatar: true } },
          },
        },
      },
    })

    if (!ticket) {
      return createApiErrorResponse(request, ApiErrorKeys.general.notFound, { status: 404 })
    }

    return NextResponse.json(ticket)
  } catch (error) {
    console.error("Admin get ticket error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.general.failed, { status: 500 })
  }
}
