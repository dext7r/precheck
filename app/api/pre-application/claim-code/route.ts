import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { writeAuditLog } from "@/lib/audit"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    // 查找用户的预申请记录
    const preApplication = await db.preApplication.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        inviteCodeId: true,
      },
    })

    if (!preApplication) {
      return createApiErrorResponse(request, ApiErrorKeys.preApplication.noPreApplicationFound, {
        status: 404,
      })
    }

    // 验证状态为 APPROVED 且无码
    if (preApplication.status !== "APPROVED") {
      return createApiErrorResponse(request, "apiErrors.preApplication.notApproved", {
        status: 400,
      })
    }

    if (preApplication.inviteCodeId) {
      return createApiErrorResponse(request, "apiErrors.preApplication.alreadyHasCode", {
        status: 400,
      })
    }

    const now = new Date()

    // 查找可用的邀请码：未使用、未分配、未过期、未删除
    // 按过期时间升序排序（NULL 排后面），优先领取最近过期的有效码
    const availableCode = await db.inviteCode.findFirst({
      where: {
        usedAt: null,
        deletedAt: null,
        preApplication: null,
        issuedToEmail: null,
        issuedToUserId: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: [
        // expiresAt 升序，NULL 排最后
        { expiresAt: { sort: "asc", nulls: "last" } },
      ],
      select: {
        id: true,
        code: true,
        expiresAt: true,
      },
    })

    if (!availableCode) {
      return createApiErrorResponse(request, "apiErrors.preApplication.noAvailableCode", {
        status: 404,
      })
    }

    // 事务内完成分配
    const result = await db.$transaction(async (tx) => {
      // 更新邀请码
      const updatedCode = await tx.inviteCode.update({
        where: { id: availableCode.id },
        data: {
          assignedAt: now,
          assignedById: user.id,
        },
      })

      // 更新预申请
      const updatedPreApplication = await tx.preApplication.update({
        where: { id: preApplication.id },
        data: {
          inviteCodeId: availableCode.id,
        },
        include: {
          inviteCode: {
            select: { id: true, code: true, expiresAt: true, usedAt: true, assignedAt: true },
          },
        },
      })

      // 记录审计日志
      await writeAuditLog(tx, {
        action: "INVITE_CODE_CLAIM",
        entityType: "INVITE_CODE",
        entityId: availableCode.id,
        actor: user,
        after: updatedCode,
        metadata: { preApplicationId: preApplication.id },
        request,
      })

      return updatedPreApplication
    })

    return NextResponse.json({
      success: true,
      inviteCode: result.inviteCode,
    })
  } catch (error) {
    console.error("Claim invite code error:", error)
    return createApiErrorResponse(request, "apiErrors.preApplication.claimCodeFailed", {
      status: 500,
    })
  }
}
