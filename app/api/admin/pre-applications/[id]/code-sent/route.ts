import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"
import { writeAuditLog } from "@/lib/audit"

const schema = z.object({
  codeSent: z.boolean(),
})

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }
    if (user.role !== "ADMIN") {
      return createApiErrorResponse(request, ApiErrorKeys.general.forbidden, { status: 403 })
    }
    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const { id } = await context.params
    const body = await request.json()
    const { codeSent } = schema.parse(body)

    const record = await db.preApplication.findUnique({
      where: { id },
      select: { id: true, status: true, codeSent: true },
    })

    if (!record) {
      return createApiErrorResponse(request, ApiErrorKeys.general.notFound, { status: 404 })
    }

    if (record.status !== "APPROVED") {
      return createApiErrorResponse(request, ApiErrorKeys.general.forbidden, { status: 400 })
    }

    const updated = await db.preApplication.update({
      where: { id },
      data: {
        codeSent,
        codeSentAt: codeSent ? new Date() : null,
      },
      select: { id: true, codeSent: true, codeSentAt: true },
    })

    await writeAuditLog(db, {
      entityType: "PRE_APPLICATION",
      entityId: id,
      action: codeSent ? "MARK_CODE_SENT" : "MARK_CODE_NOT_SENT",
      actor: user,
      before: { codeSent: record.codeSent },
      after: { codeSent },
      request,
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(request, ApiErrorKeys.general.invalid, { status: 400 })
    }
    console.error("Toggle codeSent error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.general.failed, { status: 500 })
  }
}
