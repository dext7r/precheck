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

// POST: 用户贡献邀请码（单个或批量）
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

    const [existingRecords, createdRecords] = await db.$transaction(async (tx) => {
      const existing = await tx.inviteCode.findMany({
        where: { code: { in: uniqueCodes } },
        select: { code: true },
      })
      const existingSet = new Set(existing.map((record) => record.code))
      const newCodes = uniqueCodes.filter((code) => !existingSet.has(code))

      if (newCodes.length > 0) {
        await tx.inviteCode.createMany({
          data: newCodes.map((code) => ({
            code,
            createdById: user.id,
          })),
          skipDuplicates: true,
        })
      }

      const created = newCodes.length
        ? await tx.inviteCode.findMany({
            where: { code: { in: newCodes }, createdById: user.id },
          })
        : []

      return [existing, created] as const
    })

    const skippedCount = existingRecords.length
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
        skippedExisting: skippedCount,
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
      skippedCount,
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
