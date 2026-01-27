import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { writeAuditLog } from "@/lib/audit"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

// DELETE: 删除用户自己贡献的邀请码
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const { id } = await context.params

    const record = await db.inviteCode.findUnique({
      where: { id },
      include: {
        assignedBy: { select: { id: true, name: true, email: true } },
        usedBy: { select: { id: true, name: true, email: true } },
        preApplication: {
          select: {
            id: true,
            registerEmail: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })

    if (!record || record.deletedAt) {
      return createApiErrorResponse(request, ApiErrorKeys.dashboard.inviteCodes.notFound, {
        status: 404,
      })
    }

    // 检查是否为创建者
    if (record.createdById !== user.id) {
      return createApiErrorResponse(request, ApiErrorKeys.dashboard.inviteCodes.notOwner, {
        status: 403,
      })
    }

    // 检查是否已使用
    if (record.usedAt) {
      return createApiErrorResponse(request, ApiErrorKeys.dashboard.inviteCodes.cannotDeleteUsed, {
        status: 400,
        meta: {
          usedAt: record.usedAt.toISOString(),
          usedBy: record.usedBy ? { name: record.usedBy.name, email: record.usedBy.email } : null,
        },
      })
    }

    // 检查是否已被领取（关联预申请）
    if (record.preApplication) {
      return createApiErrorResponse(
        request,
        ApiErrorKeys.dashboard.inviteCodes.cannotDeleteClaimed,
        {
          status: 400,
          meta: {
            claimedBy: record.preApplication.user
              ? { name: record.preApplication.user.name, email: record.preApplication.user.email }
              : { email: record.preApplication.registerEmail },
            preApplicationId: record.preApplication.id,
          },
        },
      )
    }

    // 检查是否已分配
    if (record.assignedAt) {
      return createApiErrorResponse(
        request,
        ApiErrorKeys.dashboard.inviteCodes.cannotDeleteAssigned,
        {
          status: 400,
          meta: {
            assignedAt: record.assignedAt.toISOString(),
            assignedBy: record.assignedBy
              ? { name: record.assignedBy.name, email: record.assignedBy.email }
              : null,
          },
        },
      )
    }

    // 软删除
    const updated = await db.inviteCode.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    await writeAuditLog(db, {
      action: "INVITE_CODE_DELETE",
      entityType: "INVITE_CODE",
      entityId: record.id,
      actor: user,
      before: record,
      after: updated,
      metadata: { source: "user-contribute" },
      request,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete contributed invite code error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.dashboard.inviteCodes.failedToDelete, {
      status: 500,
    })
  }
}
