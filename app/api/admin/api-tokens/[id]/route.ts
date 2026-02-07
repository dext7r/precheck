import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { isAdmin } from "@/lib/auth/permissions"
import { writeAuditLog } from "@/lib/audit"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user || !isAdmin(user.role)) {
      return createApiErrorResponse(request, ApiErrorKeys.general.forbidden, { status: 403 })
    }
    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const { id } = await context.params
    const token = await db.apiToken.findUnique({ where: { id } })

    if (!token) {
      return createApiErrorResponse(request, ApiErrorKeys.admin.apiTokens.tokenNotFound, {
        status: 404,
      })
    }
    if (token.userId !== user.id) {
      return createApiErrorResponse(request, ApiErrorKeys.admin.apiTokens.notOwner, {
        status: 403,
      })
    }

    await db.apiToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    })

    await writeAuditLog(db, {
      action: "API_TOKEN_REVOKE",
      entityType: "API_TOKEN",
      entityId: id,
      actor: user,
      before: { name: token.name, prefix: token.prefix },
      request,
    })

    return NextResponse.json({ success: true })
  } catch {
    return createApiErrorResponse(request, ApiErrorKeys.admin.apiTokens.failedToRevoke, {
      status: 500,
    })
  }
}
