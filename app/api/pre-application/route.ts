import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { writeAuditLog } from "@/lib/audit"
import { isAllowedEmailDomainAsync, normalizeEmail } from "@/lib/pre-application/validation"
import { PreApplicationSource } from "@prisma/client"
import { randomBytes } from "crypto"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"
import { getQQGroups } from "@/lib/qq-groups"

// 最大重新提交次数
const MAX_RESUBMIT_COUNT = 3

async function generateUniqueQueryToken(): Promise<string> {
  if (!db) throw new Error("Database not configured")
  for (let i = 0; i < 5; i++) {
    const token = randomBytes(4).toString("hex").toUpperCase()
    const existing = await db.preApplication.findUnique({ where: { queryToken: token } })
    if (!existing) return token
  }
  return randomBytes(6).toString("hex").toUpperCase()
}

const preApplicationSchema = z.object({
  essay: z.string().min(50).max(1000),
  source: z.nativeEnum(PreApplicationSource).optional().nullable(),
  sourceDetail: z.string().max(100).optional().nullable(),
  registerEmail: z.string().email(),
  group: z.string().min(1), // 动态群 ID，由 QQ 群配置决定
  version: z.number().optional(), // 乐观锁版本号
})

// 验证群 ID 是否在配置中
async function isValidGroupId(groupId: string): Promise<boolean> {
  const groups = await getQQGroups()
  return groups.some((g) => g.id === groupId)
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const records = await db.preApplication.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        reviewedBy: { select: { id: true, name: true, email: true } },
        inviteCode: {
          select: { id: true, code: true, expiresAt: true, usedAt: true, assignedAt: true },
        },
        versions: {
          orderBy: { version: "desc" },
          take: 10,
        },
      },
    })

    // 获取排队信息
    let queueInfo = null
    const latest = records[0]
    if (latest && latest.status === "PENDING") {
      // 统计所有待审核的数量
      const totalPending = await db.preApplication.count({
        where: { status: "PENDING" },
      })
      // 统计在当前用户之前的待审核数量（按创建时间排序）
      const aheadCount = await db.preApplication.count({
        where: {
          status: "PENDING",
          createdAt: { lt: latest.createdAt },
        },
      })
      queueInfo = {
        totalPending,
        position: aheadCount + 1, // 自己的位置
        aheadCount,
      }
    }

    return NextResponse.json({
      records,
      latest: records[0] ?? null,
      maxResubmitCount: MAX_RESUBMIT_COUNT,
      queueInfo,
    })
  } catch (error) {
    console.error("Pre-application fetch error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.preApplication.failedToFetch, {
      status: 500,
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const body = await request.json()
    const data = preApplicationSchema.parse(body)
    const registerEmail = normalizeEmail(data.registerEmail)
    const essay = data.essay.trim()

    if (essay.length < 50) {
      return createApiErrorResponse(request, ApiErrorKeys.preApplication.essayTooShort, {
        status: 400,
      })
    }

    if (!(await isAllowedEmailDomainAsync(registerEmail))) {
      return createApiErrorResponse(request, ApiErrorKeys.preApplication.invalidEmailDomain, {
        status: 400,
      })
    }

    if (data.source === "OTHER" && !data.sourceDetail?.trim()) {
      return createApiErrorResponse(request, ApiErrorKeys.preApplication.sourceDetailRequired, {
        status: 400,
      })
    }

    // 验证群 ID 是否有效
    if (!(await isValidGroupId(data.group))) {
      return createApiErrorResponse(request, ApiErrorKeys.preApplication.invalidGroup, {
        status: 400,
      })
    }

    const existingCount = await db.preApplication.count({
      where: { userId: user.id },
    })

    if (existingCount > 0) {
      return createApiErrorResponse(request, ApiErrorKeys.preApplication.alreadySubmitted, {
        status: 409,
      })
    }

    // 在事务外部生成 queryToken，避免 pgBouncer 兼容性问题
    const queryToken = await generateUniqueQueryToken()

    // 使用事务创建预申请和版本记录
    const record = await db.$transaction(async (tx) => {
      const preApp = await tx.preApplication.create({
        data: {
          userId: user.id,
          essay,
          source: data.source ?? null,
          sourceDetail: data.source === "OTHER" ? data.sourceDetail?.trim() || null : null,
          registerEmail,
          queryToken,
          group: data.group,
          version: 1,
          resubmitCount: 0,
        },
        include: {
          reviewedBy: { select: { id: true, name: true, email: true } },
          inviteCode: {
            select: { id: true, code: true, expiresAt: true, usedAt: true, assignedAt: true },
          },
        },
      })

      // 创建版本历史
      await tx.preApplicationVersion.create({
        data: {
          preApplicationId: preApp.id,
          version: 1,
          essay,
          source: data.source ?? null,
          sourceDetail: data.source === "OTHER" ? data.sourceDetail?.trim() || null : null,
          registerEmail,
          group: data.group,
          status: "PENDING",
        },
      })

      return preApp
    })

    await writeAuditLog(db, {
      action: "PRE_APPLICATION_SUBMIT",
      entityType: "PRE_APPLICATION",
      entityId: record.id,
      actor: user,
      after: record,
      metadata: { payload: data, version: 1 },
      request,
    })

    return NextResponse.json({ record, maxResubmitCount: MAX_RESUBMIT_COUNT })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(request, ApiErrorKeys.general.invalid, {
        status: 400,
        meta: { detail: error.errors[0].message },
      })
    }
    console.error("Pre-application submit error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.preApplication.failedToSubmit, {
      status: 500,
    })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const body = await request.json()
    const data = preApplicationSchema.parse(body)
    const registerEmail = normalizeEmail(data.registerEmail)
    const essay = data.essay.trim()

    if (essay.length < 50) {
      return createApiErrorResponse(request, ApiErrorKeys.preApplication.essayTooShort, {
        status: 400,
      })
    }

    if (!(await isAllowedEmailDomainAsync(registerEmail))) {
      return createApiErrorResponse(request, ApiErrorKeys.preApplication.invalidEmailDomain, {
        status: 400,
      })
    }

    if (data.source === "OTHER" && !data.sourceDetail?.trim()) {
      return createApiErrorResponse(request, ApiErrorKeys.preApplication.sourceDetailRequired, {
        status: 400,
      })
    }

    // 验证群 ID 是否有效
    if (!(await isValidGroupId(data.group))) {
      return createApiErrorResponse(request, ApiErrorKeys.preApplication.invalidGroup, {
        status: 400,
      })
    }

    const latest = await db.preApplication.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, version: true, resubmitCount: true },
    })

    if (!latest) {
      return createApiErrorResponse(request, ApiErrorKeys.preApplication.noPreApplicationFound, {
        status: 404,
      })
    }

    if (latest.status === "APPROVED") {
      return createApiErrorResponse(request, ApiErrorKeys.preApplication.alreadyApproved, {
        status: 400,
      })
    }

    // 乐观锁检查
    if (data.version !== undefined && data.version !== latest.version) {
      return createApiErrorResponse(request, ApiErrorKeys.preApplication.versionConflict, {
        status: 409,
        meta: { detail: "数据已被修改，请刷新后重试" },
      })
    }

    // 驳回后重新提交次数检查
    const isResubmit = latest.status === "REJECTED"
    if (isResubmit && latest.resubmitCount >= MAX_RESUBMIT_COUNT) {
      return createApiErrorResponse(request, ApiErrorKeys.preApplication.resubmitLimitExceeded, {
        status: 400,
        meta: {
          detail: `已达到最大重新提交次数限制 (${MAX_RESUBMIT_COUNT} 次)`,
        },
      })
    }

    const newVersion = latest.version + 1
    const newResubmitCount = isResubmit ? latest.resubmitCount + 1 : latest.resubmitCount

    const payload = {
      essay,
      source: data.source ?? null,
      sourceDetail: data.source === "OTHER" ? data.sourceDetail?.trim() || null : null,
      registerEmail,
      group: data.group,
    }

    const before = await db.preApplication.findUnique({
      where: { id: latest.id },
      include: {
        reviewedBy: { select: { id: true, name: true, email: true } },
        inviteCode: {
          select: { id: true, code: true, expiresAt: true, usedAt: true, assignedAt: true },
        },
      },
    })

    // 使用事务更新预申请和创建版本记录
    const record = await db.$transaction(async (tx) => {
      const updated = await tx.preApplication.update({
        where: { id: latest.id },
        data: {
          ...payload,
          status: "PENDING",
          guidance: null,
          reviewedAt: null,
          reviewedById: null,
          inviteCodeId: null,
          version: newVersion,
          resubmitCount: newResubmitCount,
        },
        include: {
          reviewedBy: { select: { id: true, name: true, email: true } },
          inviteCode: {
            select: { id: true, code: true, expiresAt: true, usedAt: true, assignedAt: true },
          },
        },
      })

      // 创建版本历史
      await tx.preApplicationVersion.create({
        data: {
          preApplicationId: updated.id,
          version: newVersion,
          essay,
          source: data.source ?? null,
          sourceDetail: data.source === "OTHER" ? data.sourceDetail?.trim() || null : null,
          registerEmail,
          group: data.group,
          status: "PENDING",
        },
      })

      return updated
    })

    await writeAuditLog(db, {
      action: isResubmit ? "PRE_APPLICATION_RESUBMIT" : "PRE_APPLICATION_UPDATE",
      entityType: "PRE_APPLICATION",
      entityId: record.id,
      actor: user,
      before,
      after: record,
      metadata: {
        payload,
        version: newVersion,
        resubmitCount: newResubmitCount,
        isResubmit,
      },
      request,
    })

    return NextResponse.json({
      record,
      maxResubmitCount: MAX_RESUBMIT_COUNT,
      remainingResubmits: MAX_RESUBMIT_COUNT - newResubmitCount,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(request, ApiErrorKeys.general.invalid, {
        status: 400,
        meta: { detail: error.errors[0].message },
      })
    }
    console.error("Pre-application update error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.preApplication.failedToUpdate, {
      status: 500,
    })
  }
}

// 管理员删除自己的预申请记录（用于测试）
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    // 仅 ADMIN 和 SUPER_ADMIN 可以删除
    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return createApiErrorResponse(request, ApiErrorKeys.general.forbidden, { status: 403 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    // 查找当前用户的预申请记录
    const records = await db.preApplication.findMany({
      where: { userId: user.id },
      select: { id: true },
    })

    if (records.length === 0) {
      return createApiErrorResponse(request, ApiErrorKeys.preApplication.noPreApplicationFound, {
        status: 404,
      })
    }

    const recordIds = records.map((r) => r.id)

    // 使用事务删除预申请及其版本历史
    await db.$transaction(async (tx) => {
      // 先删除版本历史
      await tx.preApplicationVersion.deleteMany({
        where: { preApplicationId: { in: recordIds } },
      })
      // 再删除预申请记录
      await tx.preApplication.deleteMany({
        where: { userId: user.id },
      })
    })

    await writeAuditLog(db, {
      action: "PRE_APPLICATION_DELETE_SELF",
      entityType: "PRE_APPLICATION",
      entityId: recordIds.join(","),
      actor: user,
      metadata: { deletedCount: records.length, reason: "admin_self_delete_for_testing" },
      request,
    })

    return NextResponse.json({ success: true, deletedCount: records.length })
  } catch (error) {
    console.error("Pre-application delete error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.preApplication.failedToDelete, {
      status: 500,
    })
  }
}
