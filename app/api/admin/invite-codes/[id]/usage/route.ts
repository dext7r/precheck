import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { writeAuditLog } from "@/lib/audit"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

const usageSchema = z.object({
  used: z.boolean(),
})

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    const { id } = await context.params
    const body = await request.json()
    const data = usageSchema.parse(body)

    const before = await db.inviteCode.findUnique({ where: { id } })

    const record = await db.inviteCode.update({
      where: { id },
      data: data.used
        ? { usedAt: new Date(), usedById: user.id }
        : { usedAt: null, usedById: null },
    })

    await writeAuditLog(db, {
      action: data.used ? "INVITE_CODE_MARK_USED" : "INVITE_CODE_MARK_UNUSED",
      entityType: "INVITE_CODE",
      entityId: record.id,
      actor: user,
      before,
      after: record,
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
    console.error("Invite code usage update error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.admin.inviteCodes.failedToUpdateUsage, {
      status: 500,
    })
  }
}
