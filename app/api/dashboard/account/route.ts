import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { deleteSession, getCurrentUser } from "@/lib/auth/session"
import { writeAuditLog } from "@/lib/audit"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
  }
  if (!db) {
    return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
  }

  try {
    const before = await db.user.findUnique({ where: { id: user.id } })

    await db.user.delete({
      where: { id: user.id },
    })

    await writeAuditLog(db, {
      action: "USER_SELF_DELETE",
      entityType: "USER",
      entityId: user.id,
      actor: user,
      before,
      after: null,
      request,
    })

    await deleteSession()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete account API error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.dashboard.account.failedToDelete, {
      status: 500,
    })
  }
}
