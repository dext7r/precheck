import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    // 检查是否已经申请过（通过审计日志）
    const existingApplication = await db.auditLog.findFirst({
      where: {
        action: "ADMIN_APPLICATION_SUBMIT",
        actorId: user.id,
      },
    })

    return NextResponse.json({ hasApplied: !!existingApplication })
  } catch {
    return NextResponse.json({ hasApplied: false })
  }
}
