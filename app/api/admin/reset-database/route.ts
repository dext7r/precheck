import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { isSuperAdmin } from "@/lib/auth/permissions"
import { db } from "@/lib/db"
import { writeAuditLog } from "@/lib/audit"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
  }
  // 重置数据库仅限超级管理员
  if (!isSuperAdmin(user.role)) {
    return createApiErrorResponse(request, ApiErrorKeys.general.forbidden, { status: 403 })
  }
  if (!db) {
    return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
  }

  try {
    const [userCount, postCount, messageCount, inviteCount, preAppCount] = await Promise.all([
      db.user.count(),
      db.post.count(),
      db.message.count(),
      db.inviteCode.count(),
      db.preApplication.count(),
    ])

    await db.$transaction([
      db.post.deleteMany(),
      db.siteSettings.deleteMany(),
      db.session.deleteMany(),
      db.account.deleteMany(),
      db.user.deleteMany({ where: { role: { not: "ADMIN" } } }),
    ])

    await writeAuditLog(db, {
      action: "SYSTEM_RESET_DATABASE",
      entityType: "SYSTEM",
      entityId: "database",
      actor: user,
      metadata: {
        counts: {
          users: userCount,
          posts: postCount,
          messages: messageCount,
          inviteCodes: inviteCount,
          preApplications: preAppCount,
        },
      },
      request,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to reset database:", error)
    return createApiErrorResponse(request, ApiErrorKeys.admin.resetDatabase.failed, {
      status: 500,
    })
  }
}
