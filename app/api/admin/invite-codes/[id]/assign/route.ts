import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { writeAuditLog } from "@/lib/audit"
import { buildInviteCodeIssueEmail } from "@/lib/email/templates"
import { sendEmail } from "@/lib/email/mailer"
import { buildInviteCodeIssueMessage } from "@/lib/invite-code/notifications"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config"
import { features } from "@/lib/features"
import { getSiteSettings } from "@/lib/site-settings"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"
import { ensureInviteCodeStorageEnabled } from "@/lib/invite-code/guard"

const assignSchema = z.object({
  recipientType: z.enum(["email", "user"]),
  email: z.string().email().optional(),
  userId: z.string().min(1).optional(),
  note: z.string().max(500).optional(),
  locale: z.string().optional(),
})

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    const disabledResponse = await ensureInviteCodeStorageEnabled(request)
    if (disabledResponse) {
      return disabledResponse
    }

    const { id } = await context.params
    const body = await request.json()
    const data = assignSchema.parse(body)

    const localeParam = data.locale
    const currentLocale = locales.includes(localeParam as Locale)
      ? (localeParam as Locale)
      : defaultLocale
    const dict = await getDictionary(currentLocale)

    const record = await db.inviteCode.findUnique({
      where: { id },
      include: {
        preApplication: { select: { id: true } },
        issuedToUser: { select: { id: true, name: true, email: true } },
      },
    })

    if (!record || record.deletedAt) {
      return createApiErrorResponse(request, ApiErrorKeys.admin.inviteCodes.assign.notFound, {
        status: 404,
      })
    }

    if (record.usedAt) {
      return createApiErrorResponse(request, ApiErrorKeys.admin.inviteCodes.assign.alreadyUsed, {
        status: 400,
      })
    }

    if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) {
      return createApiErrorResponse(request, ApiErrorKeys.admin.inviteCodes.assign.expired, {
        status: 400,
      })
    }

    if (record.preApplication) {
      return createApiErrorResponse(
        request,
        ApiErrorKeys.admin.inviteCodes.assign.alreadyAssigned,
        { status: 400 },
      )
    }

    if (record.issuedToEmail || record.issuedToUserId) {
      return createApiErrorResponse(request, ApiErrorKeys.admin.inviteCodes.assign.alreadyIssued, {
        status: 400,
      })
    }

    let recipientEmail = ""
    let recipientUser: { id: string; name: string | null; email: string } | null = null

    if (data.recipientType === "user") {
      if (!data.userId) {
        return createApiErrorResponse(
          request,
          ApiErrorKeys.admin.inviteCodes.assign.userIdRequired,
          { status: 400 },
        )
      }
      const found = await db.user.findUnique({
        where: { id: data.userId },
        select: { id: true, name: true, email: true },
      })
      if (!found) {
        return createApiErrorResponse(request, ApiErrorKeys.admin.inviteCodes.assign.userNotFound, {
          status: 404,
        })
      }
      recipientUser = found
      recipientEmail = found.email
    } else {
      if (!data.email) {
        return createApiErrorResponse(
          request,
          ApiErrorKeys.admin.inviteCodes.assign.emailRequired,
          { status: 400 },
        )
      }
      const email = data.email.trim()
      const found = await db.user.findUnique({
        where: { email },
        select: { id: true, name: true, email: true },
      })
      recipientUser = found
      recipientEmail = found?.email ?? email
    }

    const settings = await getSiteSettings()
    const inviteCodeUrlPrefix = settings.inviteCodeUrlPrefix ?? ""
    const shouldSendEmail = features.email && settings.emailNotifications

    if (!recipientUser && !shouldSendEmail) {
      return createApiErrorResponse(
        request,
        ApiErrorKeys.admin.inviteCodes.assign.notificationsDisabled,
        { status: 400 },
      )
    }

    const note = data.note?.trim() || null
    const issuedByName = user.name || user.email

    const result = await db.$transaction(async (tx) => {
      const updated = await tx.inviteCode.update({
        where: { id: record.id },
        data: {
          issuedAt: new Date(),
          issuedToEmail: recipientEmail,
          issuedToUserId: recipientUser?.id ?? null,
          assignedAt: new Date(),
          assignedById: user.id,
        },
      })

      let messageId: string | null = null

      if (recipientUser) {
        const messageContent = buildInviteCodeIssueMessage({
          dict,
          code: updated.code,
          expiresAt: updated.expiresAt,
          issuedBy: issuedByName,
          note: note ?? undefined,
          locale: currentLocale,
          inviteCodeUrlPrefix,
        })

        const message = await tx.message.create({
          data: {
            title: messageContent.title,
            content: messageContent.content,
            createdById: user.id,
            recipients: { create: { userId: recipientUser.id } },
          },
        })
        messageId = message.id

        await writeAuditLog(tx, {
          action: "MESSAGE_CREATE",
          entityType: "MESSAGE",
          entityId: message.id,
          actor: user,
          after: message,
          metadata: { recipientUserId: recipientUser.id },
          request,
        })
      }

      await writeAuditLog(tx, {
        action: "INVITE_CODE_MANUAL_ASSIGN",
        entityType: "INVITE_CODE",
        entityId: updated.id,
        actor: user,
        before: record,
        after: updated,
        metadata: {
          recipientType: data.recipientType,
          recipientEmail,
          recipientUserId: recipientUser?.id ?? null,
          note,
          messageId,
        },
        request,
      })

      return updated
    })

    if (shouldSendEmail) {
      const emailContent = buildInviteCodeIssueEmail({
        appName: settings.siteName || dict.metadata?.title || "App",
        dictionary: dict,
        issuerName: issuedByName,
        code: result.code,
        expiresAt: result.expiresAt,
        note: note ?? undefined,
        locale: currentLocale,
        inviteCodeUrlPrefix,
      })

      try {
        await sendEmail({
          to: recipientEmail,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        })
      } catch (sendError) {
        console.error("Invite code issue email failed:", sendError)
      }
    }

    return NextResponse.json({ record: result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(request, ApiErrorKeys.general.invalid, {
        status: 400,
        meta: { detail: error.errors[0].message },
      })
    }
    console.error("Invite code assign error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.admin.inviteCodes.failedToIssue, {
      status: 500,
    })
  }
}
