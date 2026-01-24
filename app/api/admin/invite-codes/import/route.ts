import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { writeAuditLog } from "@/lib/audit"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

const importInviteCodesSchema = z.object({
  codes: z.array(z.string().min(1).max(128)).min(1).max(2000), // 增加长度限制以支持完整 URL
  expiresAt: z.string().optional().nullable(),
})

// 验证邀请码格式（完整 URL 或纯邀请码）
const validateInviteCode = (code: string): boolean => {
  // 完整 URL 格式
  if (/^https:\/\/linux\.do\/invites\/[A-Za-z0-9_-]{4,64}$/i.test(code)) {
    return true
  }
  // 纯邀请码格式
  if (/^[A-Za-z0-9_-]{4,64}$/.test(code)) {
    return true
  }
  return false
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

    const body = await request.json()
    const data = importInviteCodesSchema.parse(body)

    const matched: string[] = []
    let invalidCount = 0
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

    for (const raw of data.codes) {
      const value = raw.trim()
      if (!value) continue
      // 前端已经转换为完整 URL，直接验证并存储
      if (validateInviteCode(value)) {
        matched.push(value)
      } else {
        invalidCount += 1
      }
    }

    const uniqueCodes = Array.from(new Set(matched))
    const duplicatesCount = Math.max(0, matched.length - uniqueCodes.length)

    if (uniqueCodes.length === 0) {
      return createApiErrorResponse(request, ApiErrorKeys.admin.inviteCodes.noValid, {
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
            expiresAt,
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
      action: "INVITE_CODE_BULK_IMPORT",
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
        expiresAt: expiresAt?.toISOString() ?? null,
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
        metadata: { source: "bulk-import" },
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
    console.error("Invite codes import error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.admin.inviteCodes.failedToImport, {
      status: 500,
    })
  }
}
