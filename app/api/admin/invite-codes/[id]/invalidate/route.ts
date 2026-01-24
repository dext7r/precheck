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
    const before = await db.inviteCode.findUnique({ where: { id } })

    if (!before) {
      return createApiErrorResponse(request, ApiErrorKeys.admin.inviteCodes.notFound, {
        status: 404,
      })
    }

    if (before.usedAt) {
      return createApiErrorResponse(request, ApiErrorKeys.admin.inviteCodes.alreadyUsed, {
        status: 400,
      })
    }

    const updated = await db.inviteCode.update({
      where: { id },
      data: { expiresAt: new Date() },
    })

    await writeAuditLog(db, {
      action: "INVITE_CODE_INVALIDATE",
      entityType: "INVITE_CODE",
      entityId: updated.id,
      actor: user,
      before,
      after: updated,
      request,
    })

    return NextResponse.json({ record: updated })
  } catch (error) {
    console.error("Invite code invalidate error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.admin.inviteCodes.failedToInvalidate, {
      status: 500,
    })
  }
}
