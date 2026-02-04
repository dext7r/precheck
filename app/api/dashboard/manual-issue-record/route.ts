import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { writeAuditLog } from "@/lib/audit"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

const manualRecordSchema = z.object({
  note: z.string().min(1).max(1000),
  targetDescription: z.string().max(200).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, {
        status: 503,
      })
    }

    const body = await request.json()
    const data = manualRecordSchema.parse(body)

    await writeAuditLog(db, {
      action: "MANUAL_INVITE_ISSUE_RECORD",
      entityType: "MANUAL_INVITE_ISSUE",
      actor: { id: user.id, name: user.name, email: user.email, role: user.role },
      metadata: {
        note: data.note,
        targetDescription: data.targetDescription ?? null,
      },
      request,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(request, ApiErrorKeys.general.invalid, {
        status: 400,
        meta: { detail: error.errors[0].message },
      })
    }
    console.error("Manual invite issue record error:", error)
    return createApiErrorResponse(request, "apiErrors.general.failed", { status: 500 })
  }
}
