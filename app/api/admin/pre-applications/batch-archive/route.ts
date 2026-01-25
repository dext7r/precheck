import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { writeAuditLog } from "@/lib/audit"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

const batchArchiveSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
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
    const { ids } = batchArchiveSchema.parse(body)

    const result = await db.$transaction(async (tx) => {
      const records = await tx.preApplication.findMany({
        where: { id: { in: ids } },
        select: { id: true, status: true },
      })

      const updated = await tx.preApplication.updateMany({
        where: { id: { in: ids } },
        data: { status: "ARCHIVED" },
      })

      for (const record of records) {
        await writeAuditLog(tx, {
          action: "PRE_APPLICATION_ARCHIVE",
          entityType: "PRE_APPLICATION",
          entityId: record.id,
          actor: user,
          before: { status: record.status },
          after: { status: "ARCHIVED" },
          request,
        })
      }

      return updated
    })

    return NextResponse.json({ success: true, count: result.count })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(request, ApiErrorKeys.general.invalid, {
        status: 400,
        meta: { detail: error.errors[0].message },
      })
    }
    console.error("Batch archive error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.general.failed, { status: 500 })
  }
}
