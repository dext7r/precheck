import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { isSuperAdmin } from "@/lib/auth/permissions"
import { writeAuditLog } from "@/lib/audit"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

const batchRoleSchema = z.object({
  userIds: z.array(z.string()).min(1).max(100),
  role: z.enum(["USER", "ADMIN"]),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    if (!isSuperAdmin(user.role)) {
      return createApiErrorResponse(request, ApiErrorKeys.general.forbidden, { status: 403 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const body = await request.json()
    const { userIds, role } = batchRoleSchema.parse(body)

    // 排除自己
    const filteredIds = userIds.filter((id) => id !== user.id)
    if (filteredIds.length === 0) {
      return NextResponse.json({ updated: 0 })
    }

    // 不允许操作 SUPER_ADMIN
    const targets = await db.user.findMany({
      where: { id: { in: filteredIds }, role: { not: "SUPER_ADMIN" } },
      select: { id: true, role: true },
    })

    let updated = 0
    for (const target of targets) {
      if (target.role === role) continue
      try {
        await db.user.update({
          where: { id: target.id },
          data: { role },
        })
        await writeAuditLog(db, {
          action: "USER_ADMIN_UPDATE",
          entityType: "USER",
          entityId: target.id,
          actor: user,
          before: { role: target.role },
          after: { role },
          metadata: { source: "batch-role" },
          request,
        })
        updated++
      } catch {
        // 跳过单条失败
      }
    }

    return NextResponse.json({ updated, total: targets.length })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(request, ApiErrorKeys.general.invalid, {
        status: 400,
        meta: { detail: error.errors[0].message },
      })
    }
    console.error("Batch role update error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.admin.users.failedToUpdate, { status: 500 })
  }
}
