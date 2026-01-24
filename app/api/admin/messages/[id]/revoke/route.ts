import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { writeAuditLog } from "@/lib/audit"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    const { id } = await context.params
    const message = await db.message.findUnique({
      where: { id },
    })

    if (!message) {
      return createApiErrorResponse(request, ApiErrorKeys.admin.messages.messageNotFound, {
        status: 404,
      })
    }

    if (message.revokedAt) {
      return createApiErrorResponse(request, ApiErrorKeys.admin.messages.alreadyRevoked, {
        status: 400,
      })
    }

    const updated = await db.message.update({
      where: { id },
      data: { revokedAt: new Date(), revokedById: user.id },
    })

    await writeAuditLog(db, {
      action: "MESSAGE_REVOKE",
      entityType: "MESSAGE",
      entityId: id,
      actor: user,
      before: message,
      after: updated,
      request,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Revoke message API error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.admin.messages.failedToRevoke, {
      status: 500,
    })
  }
}
