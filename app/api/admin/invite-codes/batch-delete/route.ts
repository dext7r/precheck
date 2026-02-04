import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { isSuperAdmin } from "@/lib/auth/permissions"
import { writeAuditLog } from "@/lib/audit"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"
import { ensureInviteCodeStorageEnabled } from "@/lib/invite-code/guard"

const batchDeleteSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    // 批量删除邀请码仅限超级管理员
    if (!isSuperAdmin(user.role)) {
      return createApiErrorResponse(request, ApiErrorKeys.general.forbidden, { status: 403 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const disabledResponse = await ensureInviteCodeStorageEnabled(request)
    if (disabledResponse) {
      return disabledResponse
    }

    const body = await request.json()
    const data = batchDeleteSchema.parse(body)

    const before = await db.inviteCode.findMany({
      where: {
        id: { in: data.ids },
        deletedAt: null,
      },
    })

    if (before.length === 0) {
      return createApiErrorResponse(request, ApiErrorKeys.admin.inviteCodes.notFound, {
        status: 404,
      })
    }

    const validIds = before.map((record) => record.id)

    await db.inviteCode.updateMany({
      where: { id: { in: validIds } },
      data: { deletedAt: new Date() },
    })

    for (const record of before) {
      await writeAuditLog(db, {
        action: "INVITE_CODE_DELETE",
        entityType: "INVITE_CODE",
        entityId: record.id,
        actor: user,
        before: record,
        after: { ...record, deletedAt: new Date() },
        request,
      })
    }

    return NextResponse.json({ deleted: validIds.length })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(request, ApiErrorKeys.general.invalid, {
        status: 400,
        meta: { detail: error.errors[0].message },
      })
    }
    console.error("Invite codes batch delete error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.admin.inviteCodes.failedToDelete, {
      status: 500,
    })
  }
}
