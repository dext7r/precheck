import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { writeAuditLog } from "@/lib/audit"
import { buildInviteCodeIssueEmail } from "@/lib/email/templates"
import { sendEmail, isEmailConfigured } from "@/lib/email/mailer"
import { buildInviteCodeIssueMessage } from "@/lib/invite-code/notifications"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config"
import { getSiteSettings } from "@/lib/site-settings"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

const sendSchema = z.object({
  userId: z.string().min(1),
  note: z.string().max(500).optional(),
  locale: z.string().optional(),
})

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const { id } = await context.params
    const body = await request.json()
    const data = sendSchema.parse(body)

    const localeParam = data.locale
    const currentLocale = locales.includes(localeParam as Locale)
      ? (localeParam as Locale)
      : defaultLocale
    const dict = await getDictionary(currentLocale)

    // 查找邀请码，必须是当前用户贡献的
    const record = await db.inviteCode.findUnique({
      where: { id },
      include: {
        preApplication: { select: { id: true } },
        issuedToUser: { select: { id: true } },
      },
    })

    if (!record || record.deletedAt) {
      return createApiErrorResponse(request, ApiErrorKeys.dashboard.inviteCodes.notFound, {
        status: 404,
      })
    }

    // 必须是自己贡献的邀请码
    if (record.createdById !== user.id) {
      return createApiErrorResponse(request, ApiErrorKeys.general.forbidden, { status: 403 })
    }

    // 检查邀请码状态
    if (record.usedAt) {
      return createApiErrorResponse(request, ApiErrorKeys.dashboard.inviteCodes.alreadyUsed, {
        status: 400,
      })
    }

    if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) {
      return createApiErrorResponse(request, ApiErrorKeys.dashboard.inviteCodes.expired, {
        status: 400,
      })
    }

    if (record.preApplication) {
      return createApiErrorResponse(request, ApiErrorKeys.dashboard.inviteCodes.alreadyClaimed, {
        status: 400,
      })
    }

    if (record.issuedToUserId || record.issuedToEmail) {
      return createApiErrorResponse(request, ApiErrorKeys.dashboard.inviteCodes.alreadySent, {
        status: 400,
      })
    }

    // 查找目标用户
    const recipientUser = await db.user.findUnique({
      where: { id: data.userId },
      select: { id: true, name: true, email: true },
    })

    if (!recipientUser) {
      return createApiErrorResponse(request, ApiErrorKeys.dashboard.inviteCodes.userNotFound, {
        status: 404,
      })
    }

    // 不能发给自己
    if (recipientUser.id === user.id) {
      return createApiErrorResponse(request, ApiErrorKeys.dashboard.inviteCodes.cannotSendToSelf, {
        status: 400,
      })
    }

    const settings = await getSiteSettings()
    const note = data.note?.trim() || null
    const senderName = user.name || user.email

    const result = await db.$transaction(async (tx) => {
      const updated = await tx.inviteCode.update({
        where: { id: record.id },
        data: {
          issuedAt: new Date(),
          issuedToUserId: recipientUser.id,
          issuedToEmail: recipientUser.email,
          assignedAt: new Date(),
          assignedById: user.id,
        },
      })

      // 创建站内信
      const messageContent = buildInviteCodeIssueMessage({
        dict,
        code: updated.code,
        expiresAt: updated.expiresAt,
        issuedBy: senderName,
        note: note ?? undefined,
        locale: currentLocale,
      })

      const message = await tx.message.create({
        data: {
          title: messageContent.title,
          content: messageContent.content,
          createdById: user.id,
          recipients: { create: { userId: recipientUser.id } },
        },
      })

      await writeAuditLog(tx, {
        action: "INVITE_CODE_USER_SEND",
        entityType: "INVITE_CODE",
        entityId: updated.id,
        actor: user,
        before: record,
        after: updated,
        metadata: {
          recipientUserId: recipientUser.id,
          recipientEmail: recipientUser.email,
          note,
          messageId: message.id,
        },
        request,
      })

      return updated
    })

    // 发送邮件（不阻塞）
    const emailConfigured = await isEmailConfigured()
    if (emailConfigured && settings.emailNotifications) {
      const emailContent = buildInviteCodeIssueEmail({
        appName: settings.siteName || dict.metadata?.title || "App",
        dictionary: dict,
        issuerName: senderName,
        code: result.code,
        expiresAt: result.expiresAt,
        note: note ?? undefined,
        locale: currentLocale,
      })

      sendEmail({
        to: recipientUser.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      }).catch((err) => {
        console.error("Failed to send invite code email:", err)
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(request, ApiErrorKeys.general.invalid, {
        status: 400,
        meta: { detail: error.errors[0].message },
      })
    }
    console.error("Send invite code error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.dashboard.inviteCodes.failedToSend, {
      status: 500,
    })
  }
}
