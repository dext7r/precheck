import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { writeAuditLog } from "@/lib/audit"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"
import { ensureInviteCodeStorageEnabled } from "@/lib/invite-code/guard"

const createInviteCodeSchema = z.object({
  code: z.string().min(4).max(128), // 增加长度限制以支持完整 URL 格式
  expiresAt: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
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

    const { searchParams } = request.nextUrl
    const search = (searchParams.get("search") || "").trim()
    const status = searchParams.get("status") || ""
    const assignment = searchParams.get("assignment") || ""
    const expiringWithin = Number.parseInt(searchParams.get("expiringWithin") || "0")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    const now = new Date()

    // 使用 AND 数组来组合条件，避免 OR/AND 键冲突
    const conditions: Record<string, unknown>[] = [{ deletedAt: null }]

    if (search) {
      conditions.push({ code: { contains: search, mode: "insensitive" } })
    }

    // 状态筛选 - 与统计逻辑保持一致
    if (status === "used") {
      conditions.push({ usedAt: { not: null } })
    } else if (status === "unused") {
      // 未使用 = usedAt: null 且 未过期
      conditions.push({ usedAt: null })
      conditions.push({ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] })
    } else if (status === "expired") {
      // 已过期 = usedAt: null 且 已过期（未使用但已过期）
      conditions.push({ usedAt: null })
      conditions.push({ expiresAt: { not: null, lte: now } })
    }

    // 分配筛选
    if (assignment === "assigned") {
      conditions.push({
        OR: [
          { preApplication: { isNot: null } },
          { issuedToEmail: { not: null } },
          { issuedToUserId: { not: null } },
        ],
      })
    } else if (assignment === "unassigned") {
      conditions.push({
        AND: [{ preApplication: { is: null } }, { issuedToEmail: null }, { issuedToUserId: null }],
      })
    }

    // 即将过期筛选
    if (expiringWithin === 1 || expiringWithin === 2) {
      conditions.push({
        usedAt: null,
        expiresAt: {
          gt: now,
          lte: new Date(now.getTime() + expiringWithin * 60 * 60 * 1000),
        },
      })
    }

    const where = { AND: conditions }

    // 计算2小时内过期的时间点
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000)

    const [records, total, unusedCount, usedCount, expiredCount, expiringSoonCount] =
      await Promise.all([
        db.inviteCode.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            code: true,
            expiresAt: true,
            assignedAt: true,
            usedAt: true,
            issuedToEmail: true,
            issuedAt: true,
            deletedAt: true,
            checkValid: true,
            checkMessage: true,
            checkedAt: true,
            createdAt: true,
            updatedAt: true,
            preApplication: {
              select: {
                id: true,
                registerEmail: true,
                user: { select: { id: true, name: true, email: true } },
              },
            },
            assignedBy: { select: { id: true, name: true, email: true } },
            usedBy: { select: { id: true, name: true, email: true } },
            createdBy: { select: { id: true, name: true, email: true } },
            issuedToUser: { select: { id: true, name: true, email: true } },
          },
        }),
        db.inviteCode.count({ where }),
        // 未使用且未过期
        db.inviteCode.count({
          where: {
            deletedAt: null,
            usedAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            // 未分配：没有关联申请、没有发送给用户
            preApplication: { is: null },
            issuedToUserId: null,
            issuedToEmail: null,
          },
        }),
        // 已使用
        db.inviteCode.count({
          where: {
            deletedAt: null,
            usedAt: { not: null },
          },
        }),
        // 已过期（未使用）
        db.inviteCode.count({
          where: {
            deletedAt: null,
            usedAt: null,
            expiresAt: { not: null, lte: now },
          },
        }),
        // 即将过期（2小时内，未使用）
        db.inviteCode.count({
          where: {
            deletedAt: null,
            usedAt: null,
            expiresAt: { gt: now, lte: twoHoursLater },
          },
        }),
      ])

    return NextResponse.json({
      records,
      total,
      page,
      limit,
      stats: {
        unused: unusedCount,
        used: usedCount,
        expired: expiredCount,
        expiringSoon: expiringSoonCount,
      },
    })
  } catch (error) {
    console.error("Invite codes fetch error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.admin.inviteCodes.failedToFetch, {
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

    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
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
    const data = createInviteCodeSchema.parse(body)
    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null

    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      return createApiErrorResponse(request, ApiErrorKeys.admin.inviteCodes.invalidExpiry, {
        status: 400,
      })
    }
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      return createApiErrorResponse(request, ApiErrorKeys.admin.inviteCodes.expiryMustBeInFuture, {
        status: 400,
      })
    }

    const record = await db.inviteCode.create({
      data: {
        code: data.code.trim(),
        expiresAt,
        createdById: user.id,
      },
    })

    await writeAuditLog(db, {
      action: "INVITE_CODE_CREATE",
      entityType: "INVITE_CODE",
      entityId: record.id,
      actor: user,
      after: record,
      metadata: { payload: data },
      request,
    })

    return NextResponse.json({ record })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(request, ApiErrorKeys.general.invalid, {
        status: 400,
        meta: { detail: error.errors[0].message },
      })
    }
    console.error("Invite codes create error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.admin.inviteCodes.failedToCreate, {
      status: 500,
    })
  }
}
