import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { writeAuditLog } from "@/lib/audit"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    // 已经是管理员不需要申请
    if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
      return createApiErrorResponse(request, ApiErrorKeys.dashboard.applyAdmin.alreadyAdmin, {
        status: 400,
      })
    }

    // 查找所有超级管理员
    const superAdmins = await db.user.findMany({
      where: { role: "SUPER_ADMIN" },
      select: { id: true },
    })

    if (superAdmins.length === 0) {
      return createApiErrorResponse(request, ApiErrorKeys.dashboard.applyAdmin.noSuperAdmin, {
        status: 500,
      })
    }

    // 创建站内信通知超级管理员
    const message = await db.message.create({
      data: {
        title: `管理员申请：${user.name || user.email}`,
        content: `用户 ${user.name || ""} (${user.email}) 申请成为管理员。\n\n请在用户管理页面审核并处理此申请。`,
        createdById: user.id,
        recipients: {
          create: superAdmins.map((admin) => ({
            userId: admin.id,
          })),
        },
      },
    })

    await writeAuditLog(db, {
      action: "ADMIN_APPLICATION_SUBMIT",
      entityType: "MESSAGE",
      entityId: message.id,
      actor: user,
      metadata: {
        applicantId: user.id,
        applicantEmail: user.email,
        recipientCount: superAdmins.length,
      },
      request,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Apply admin error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.dashboard.applyAdmin.failed, {
      status: 500,
    })
  }
}
