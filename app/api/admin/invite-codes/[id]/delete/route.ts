import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { isSuperAdmin } from "@/lib/auth/permissions"
import { writeAuditLog } from "@/lib/audit"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    // 删除邀请码仅限超级管理员
    if (!isSuperAdmin(user.role)) {
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

    if (before.deletedAt) {
      return createApiErrorResponse(request, ApiErrorKeys.admin.inviteCodes.alreadyDeleted, {
        status: 400,
      })
    }

    const updated = await db.inviteCode.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    await writeAuditLog(db, {
      action: "INVITE_CODE_DELETE",
      entityType: "INVITE_CODE",
      entityId: updated.id,
      actor: user,
      before,
      after: updated,
      request,
    })

    return NextResponse.json({ record: updated })
  } catch (error) {
    console.error("Invite code delete error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.admin.inviteCodes.failedToDelete, {
      status: 500,
    })
  }
}
