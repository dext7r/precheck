import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { writeAuditLog } from "@/lib/audit"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"
import { sendEmail, isEmailConfigured } from "@/lib/email/mailer"

const applySchema = z.object({
  reason: z.string().min(1).max(500),
})

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

    // 检查是否已经申请过（通过审计日志）
    const existingApplication = await db.auditLog.findFirst({
      where: {
        action: "ADMIN_APPLICATION_SUBMIT",
        actorId: user.id,
      },
    })

    if (existingApplication) {
      return createApiErrorResponse(request, ApiErrorKeys.dashboard.applyAdmin.alreadyApplied, {
        status: 400,
      })
    }

    const body = await request.json()
    const data = applySchema.parse(body)

    // 只查找超级管理员
    const superAdmins = await db.user.findMany({
      where: { role: "SUPER_ADMIN" },
      select: { id: true, email: true, name: true },
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
        content: `用户 ${user.name || ""} (${user.email}) 申请成为管理员。\n\n**申请说明：**\n${data.reason}\n\n请在用户管理页面审核并处理此申请。`,
        createdById: user.id,
        recipients: {
          create: superAdmins.map((admin) => ({
            userId: admin.id,
          })),
        },
      },
    })

    // 发送邮件通知（不阻塞响应）
    const emailConfigured = await isEmailConfigured()
    if (emailConfigured) {
      const emailPromises = superAdmins.map((admin) =>
        sendEmail({
          to: admin.email,
          subject: `[管理员申请] ${user.name || user.email} 申请成为管理员`,
          text: `用户 ${user.name || ""} (${user.email}) 申请成为管理员。\n\n申请说明：\n${data.reason}\n\n请登录管理后台的用户管理页面审核并处理此申请。`,
          html: `
            <h2>管理员申请通知</h2>
            <p>用户 <strong>${user.name || ""}</strong> (${user.email}) 申请成为管理员。</p>
            <h3>申请说明：</h3>
            <p style="background: #f5f5f5; padding: 12px; border-radius: 4px;">${data.reason.replace(/\n/g, "<br>")}</p>
            <p>请登录管理后台的用户管理页面审核并处理此申请。</p>
          `,
        }).catch((err) => {
          console.error(`Failed to send admin application email to ${admin.email}:`, err)
        }),
      )
      // 不等待邮件发送完成
      Promise.all(emailPromises).catch(() => {})
    }

    await writeAuditLog(db, {
      action: "ADMIN_APPLICATION_SUBMIT",
      entityType: "MESSAGE",
      entityId: message.id,
      actor: user,
      metadata: {
        applicantId: user.id,
        applicantEmail: user.email,
        reason: data.reason,
        recipientCount: superAdmins.length,
        emailSent: emailConfigured,
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
    console.error("Apply admin error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.dashboard.applyAdmin.failed, {
      status: 500,
    })
  }
}
