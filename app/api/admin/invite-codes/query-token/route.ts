import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { writeAuditLog } from "@/lib/audit"
import { nanoid } from "nanoid"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

const createQueryTokenSchema = z.object({
  inviteCodeIds: z.array(z.string().min(1)).min(1).max(100),
  expiresAt: z.string().optional().nullable(),
})

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
    const data = createQueryTokenSchema.parse(body)

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

    const now = new Date()
    const inviteCodes = await db.inviteCode.findMany({
      where: {
        id: { in: data.inviteCodeIds },
        usedAt: null,
        queryTokenId: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { id: true, code: true },
    })

    if (inviteCodes.length === 0) {
      return createApiErrorResponse(request, ApiErrorKeys.admin.inviteCodes.noValidFound, {
        status: 400,
      })
    }

    const token = nanoid(8).toUpperCase()

    const queryToken = await db.$transaction(async (tx) => {
      const created = await tx.inviteCodeQueryToken.create({
        data: {
          token,
          expiresAt,
          createdById: user.id,
        },
      })

      await tx.inviteCode.updateMany({
        where: { id: { in: inviteCodes.map((ic) => ic.id) } },
        data: { queryTokenId: created.id },
      })

      return created
    })

    await writeAuditLog(db, {
      action: "QUERY_TOKEN_CREATE",
      entityType: "INVITE_CODE_QUERY_TOKEN",
      entityId: queryToken.id,
      actor: user,
      after: queryToken,
      metadata: {
        inviteCodeCount: inviteCodes.length,
        inviteCodeIds: inviteCodes.map((ic) => ic.id),
        expiresAt: expiresAt?.toISOString() ?? null,
      },
      request,
    })

    return NextResponse.json({
      token: queryToken.token,
      expiresAt: queryToken.expiresAt,
      inviteCodeCount: inviteCodes.length,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(request, ApiErrorKeys.general.invalid, {
        status: 400,
        meta: { detail: error.errors[0].message },
      })
    }
    console.error("Query token create error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.admin.inviteCodes.queryTokenFailed, {
      status: 500,
    })
  }
}
