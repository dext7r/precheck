import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { writeAuditLog } from "@/lib/audit"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

// 验证邀请码格式（完整 URL 或纯邀请码）
const validateInviteCode = (code: string): boolean => {
  if (/^https:\/\/linux\.do\/invites\/[A-Za-z0-9_-]{4,64}$/i.test(code)) {
    return true
  }
  if (/^[A-Za-z0-9_-]{4,64}$/.test(code)) {
    return true
  }
  return false
}

const contributeSchema = z.object({
  codes: z.array(z.string().min(1).max(128)).min(1).max(100),
  expiresAt: z.string().datetime(),
})

// GET: 获取当前用户贡献的邀请码列表
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number(searchParams.get("page")) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20))
    const skip = (page - 1) * pageSize

    const [records, total] = await Promise.all([
      db.inviteCode.findMany({
        where: {
          createdById: user.id,
          deletedAt: null,
        },
        select: {
          id: true,
          code: true,
          expiresAt: true,
          usedAt: true,
          assignedAt: true,
          createdAt: true,
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
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      db.inviteCode.count({
        where: {
          createdById: user.id,
          deletedAt: null,
        },
      }),
    ])

    return NextResponse.json({ records, total, page, pageSize })
  } catch (error) {
    console.error("Fetch contributed invite codes error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.dashboard.inviteCodes.failedToFetch, {
      status: 500,
    })
  }
}

// POST: 用户贡献邀请码（单个或批量）- 仅 Linux.do 用户
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    // 检查用户是否绑定了 Linux.do 账号
    const linuxdoAccount = await db.account.findFirst({
      where: { userId: user.id, provider: "linuxdo" },
    })
    if (!linuxdoAccount) {
      return createApiErrorResponse(request, ApiErrorKeys.dashboard.inviteCodes.linuxdoRequired, {
        status: 403,
      })
    }

    const body = await request.json()
    const data = contributeSchema.parse(body)

    const matched: string[] = []
    let invalidCount = 0

    for (const raw of data.codes) {
      const value = raw.trim()
      if (!value) continue
      if (validateInviteCode(value)) {
        matched.push(value)
      } else {
        invalidCount += 1
      }
    }

    const uniqueCodes = Array.from(new Set(matched))
    const duplicatesCount = Math.max(0, matched.length - uniqueCodes.length)

    if (uniqueCodes.length === 0) {
      return createApiErrorResponse(request, ApiErrorKeys.dashboard.inviteCodes.noValid, {
        status: 400,
      })
    }

    // 先检查是否有已存在的邀请码
    const existingRecords = await db.inviteCode.findMany({
      where: { code: { in: uniqueCodes } },
      select: { code: true },
    })

    if (existingRecords.length > 0) {
      const existingCodes = existingRecords.map((r) => r.code)
      return createApiErrorResponse(request, ApiErrorKeys.dashboard.inviteCodes.alreadyExists, {
        status: 400,
        meta: { existingCodes },
      })
    }

    const createdRecords = await db.$transaction(async (tx) => {
      await tx.inviteCode.createMany({
        data: uniqueCodes.map((code) => ({
          code,
          createdById: user.id,
          expiresAt: new Date(data.expiresAt),
        })),
        skipDuplicates: true,
      })

      return tx.inviteCode.findMany({
        where: { code: { in: uniqueCodes }, createdById: user.id },
      })
    })

    const createdCount = createdRecords.length

    await writeAuditLog(db, {
      action: "INVITE_CODE_CONTRIBUTE",
      entityType: "INVITE_CODE",
      entityId: null,
      actor: user,
      metadata: {
        totalInput: data.codes.length,
        matched: matched.length,
        invalid: invalidCount,
        duplicates: duplicatesCount,
        created: createdCount,
      },
      request,
    })

    for (const record of createdRecords) {
      await writeAuditLog(db, {
        action: "INVITE_CODE_CREATE",
        entityType: "INVITE_CODE",
        entityId: record.id,
        actor: user,
        after: record,
        metadata: { source: "user-contribute" },
        request,
      })
    }

    return NextResponse.json({
      createdCount,
      invalidCount,
      duplicatesCount,
      total: data.codes.length,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(request, ApiErrorKeys.general.invalid, {
        status: 400,
        meta: { detail: error.errors[0].message },
      })
    }
    console.error("Contribute invite codes error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.dashboard.inviteCodes.failedToContribute, {
      status: 500,
    })
  }
}
