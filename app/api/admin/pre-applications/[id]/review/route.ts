import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config"
import { buildPreApplicationReviewEmail } from "@/lib/email/templates"
import { sendEmail } from "@/lib/email/mailer"
import { features } from "@/lib/features"
import { getSiteSettings } from "@/lib/site-settings"
import { buildPreApplicationMessage } from "@/lib/pre-application/notifications"
import { PreApplicationStatus } from "@prisma/client"
import { writeAuditLog } from "@/lib/audit"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

const reviewSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "DISPUTE", "PENDING_REVIEW", "ON_HOLD"]),
  guidance: z.string().min(1).max(2000),
  inviteCode: z.string().trim().optional(),
  inviteExpiresAt: z.string().optional(),
  locale: z.string().optional(),
})

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    // 预申请审核仅允许 ADMIN 角色，禁止 SUPER_ADMIN
    if (user.role !== "ADMIN") {
      return createApiErrorResponse(request, ApiErrorKeys.general.forbidden, { status: 403 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const { id } = await context.params
    const body = await request.json()
    const data = reviewSchema.parse(body)

    const record = await db.preApplication.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        essay: true,
        source: true,
        sourceDetail: true,
        registerEmail: true,
        group: true,
        status: true,
        guidance: true,
        reviewedAt: true,
        version: true,
        inviteCodeId: true,
        user: { select: { id: true, name: true, email: true } },
        inviteCode: {
          select: { id: true, code: true, expiresAt: true, usedAt: true, assignedAt: true },
        },
      },
    })

    if (!record) {
      return createApiErrorResponse(request, ApiErrorKeys.general.notFound, { status: 404 })
    }

    // PENDING、DISPUTED、PENDING_REVIEW 和 ON_HOLD 状态都可以审核
    if (
      record.status !== PreApplicationStatus.PENDING &&
      record.status !== PreApplicationStatus.DISPUTED &&
      record.status !== PreApplicationStatus.PENDING_REVIEW &&
      record.status !== PreApplicationStatus.ON_HOLD
    ) {
      return createApiErrorResponse(request, ApiErrorKeys.admin.preApplications.alreadyReviewed, {
        status: 400,
      })
    }

    const localeParam = data.locale
    const currentLocale = locales.includes(localeParam as Locale)
      ? (localeParam as Locale)
      : defaultLocale
    const dict = await getDictionary(currentLocale)
    const reviewerName = user.name || user.email

    const guidance = data.guidance.trim()
    const isApproved = data.action === "APPROVE"
    const isDisputed = data.action === "DISPUTE"
    const isPendingReview = data.action === "PENDING_REVIEW"
    const isOnHold = data.action === "ON_HOLD"
    const code = data.inviteCode?.trim()

    // 通过/有争议且附带邀请码时，将邀请码拼接到指导意见末尾（持久化到 DB、站内信、邮件）
    const guidanceWithCode =
      (isApproved || isDisputed) && code
        ? `${guidance}\n\n${dict.preApplication.notifications.inviteCodeLabel ?? "邀请码："}${code}`
        : guidance

    // 处理待复核和暂缓处理（无需邀请码，直接更新状态）
    if (isPendingReview || isOnHold) {
      const newStatus = isPendingReview
        ? PreApplicationStatus.PENDING_REVIEW
        : PreApplicationStatus.ON_HOLD
      const newVersion = record.version + 1

      await db.$transaction(async (tx) => {
        // 创建新的版本记录来保存本次审核
        await tx.preApplicationVersion.create({
          data: {
            preApplicationId: record.id,
            version: newVersion,
            essay: record.essay,
            source: record.source,
            sourceDetail: record.sourceDetail,
            registerEmail: record.registerEmail,
            group: record.group,
            status: newStatus,
            guidance,
            reviewedAt: new Date(),
            reviewedById: user.id,
          },
        })

        const updated = await tx.preApplication.update({
          where: { id: record.id },
          data: {
            status: newStatus,
            guidance,
            version: newVersion,
            reviewedAt: new Date(),
            reviewedBy: { connect: { id: user.id } },
          },
        })

        await writeAuditLog(tx, {
          action: isPendingReview ? "PRE_APPLICATION_PENDING_REVIEW" : "PRE_APPLICATION_ON_HOLD",
          entityType: "PRE_APPLICATION",
          entityId: record.id,
          actor: user,
          before: record,
          after: updated,
          metadata: { guidance },
          request,
        })
      })

      return NextResponse.json({ success: true })
    }

    // 邀请码作为纯文本处理（管理员可通过外部检测 API 自行验证有效性）

    if (isDisputed) {
      // 标记为有争议，可选发码，发送通知给用户
      const messageContent = buildPreApplicationMessage({
        dict,
        status: PreApplicationStatus.DISPUTED,
        reviewerName,
        guidance: guidanceWithCode,
        essay: record.essay,
        locale: currentLocale,
      })

      const newVersion = record.version + 1

      await db.$transaction(async (tx) => {
        // 创建新的版本记录来保存本次审核
        await tx.preApplicationVersion.create({
          data: {
            preApplicationId: record.id,
            version: newVersion,
            essay: record.essay,
            source: record.source,
            sourceDetail: record.sourceDetail,
            registerEmail: record.registerEmail,
            group: record.group,
            status: PreApplicationStatus.DISPUTED,
            guidance: guidanceWithCode,
            reviewedAt: new Date(),
            reviewedById: user.id,
          },
        })

        const updated = await tx.preApplication.update({
          where: { id: record.id },
          data: {
            status: PreApplicationStatus.DISPUTED,
            guidance: guidanceWithCode,
            version: newVersion,
            reviewedAt: new Date(),
            reviewedBy: { connect: { id: user.id } },
          },
        })

        // 仅当有用户ID时才发送站内信（访客提交时没有用户ID）
        let message = null
        if (record.userId) {
          message = await tx.message.create({
            data: {
              title: messageContent.title,
              content: messageContent.content,
              createdById: user.id,
              recipients: { create: { userId: record.userId } },
            },
          })
        }

        await writeAuditLog(tx, {
          action: "PRE_APPLICATION_REVIEW_DISPUTE",
          entityType: "PRE_APPLICATION",
          entityId: record.id,
          actor: user,
          before: record,
          after: updated,
          metadata: { guidance, inviteCode: code },
          request,
        })

        if (message) {
          await writeAuditLog(tx, {
            action: "MESSAGE_CREATE",
            entityType: "MESSAGE",
            entityId: message.id,
            actor: user,
            after: message,
            metadata: { recipientUserId: record.userId },
            request,
          })
        }
      })

      // 发送邮件
      const settings = await getSiteSettings()
      const shouldSendEmail = features.email && settings.emailNotifications

      let emailSent = false
      let emailError: string | undefined

      if (shouldSendEmail) {
        const emailContent = buildPreApplicationReviewEmail({
          appName: settings.siteName || dict.metadata?.title || "App",
          dictionary: dict,
          status: "DISPUTED",
          reviewerName,
          guidance: guidanceWithCode,
          essay: record.essay,
          locale: currentLocale,
        })

        try {
          await sendEmail({
            to: record.registerEmail,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
          })
          emailSent = true
        } catch (sendError) {
          console.error("Pre-application disputed email failed:", sendError)
          emailError = sendError instanceof Error ? sendError.message : String(sendError)
        }
      }

      return NextResponse.json({ success: true, emailSent, emailError })
    }

    if (isApproved) {
      const newVersion = record.version + 1
      await db.$transaction(async (tx) => {
        // 创建新的版本记录来保存本次审核
        await tx.preApplicationVersion.create({
          data: {
            preApplicationId: record.id,
            version: newVersion,
            essay: record.essay,
            source: record.source,
            sourceDetail: record.sourceDetail,
            registerEmail: record.registerEmail,
            group: record.group,
            status: PreApplicationStatus.APPROVED,
            guidance: guidanceWithCode,
            reviewedAt: new Date(),
            reviewedById: user.id,
          },
        })

        const updated = await tx.preApplication.update({
          where: { id: record.id },
          data: {
            status: PreApplicationStatus.APPROVED,
            guidance: guidanceWithCode,
            version: newVersion,
            reviewedAt: new Date(),
            reviewedBy: { connect: { id: user.id } },
            ...(code ? { codeSent: true, codeSentAt: new Date() } : {}),
          },
          include: {
            reviewedBy: { select: { id: true, name: true, email: true } },
          },
        })

        const messageContent = buildPreApplicationMessage({
          dict,
          status: PreApplicationStatus.APPROVED,
          reviewerName,
          guidance: guidanceWithCode,
          essay: record.essay,
          locale: currentLocale,
        })

        // 仅当有用户ID时才发送站内信（访客提交时没有用户ID）
        let message = null
        if (record.userId) {
          message = await tx.message.create({
            data: {
              title: messageContent.title,
              content: messageContent.content,
              createdById: user.id,
              recipients: { create: { userId: record.userId } },
            },
          })
        }

        await writeAuditLog(tx, {
          action: "PRE_APPLICATION_REVIEW_APPROVE",
          entityType: "PRE_APPLICATION",
          entityId: record.id,
          actor: user,
          before: record,
          after: updated,
          metadata: {
            guidance,
            inviteCode: code ?? null,
          },
          request,
        })

        if (message) {
          await writeAuditLog(tx, {
            action: "MESSAGE_CREATE",
            entityType: "MESSAGE",
            entityId: message.id,
            actor: user,
            after: message,
            metadata: { recipientUserId: record.userId },
            request,
          })
        }
      })
    } else {
      const messageContent = buildPreApplicationMessage({
        dict,
        status: PreApplicationStatus.REJECTED,
        reviewerName,
        guidance,
        essay: record.essay,
        locale: currentLocale,
      })

      const newVersion = record.version + 1

      await db.$transaction(async (tx) => {
        let inviteBefore = null as { id: string } | null
        let inviteAfter = null as { id: string } | null

        if (record.inviteCodeId) {
          inviteBefore = await tx.inviteCode.findUnique({
            where: { id: record.inviteCodeId },
          })
          inviteAfter = await tx.inviteCode.update({
            where: { id: record.inviteCodeId },
            data: {
              assignedAt: null,
              assignedById: null,
            },
          })
        }

        // 创建新的版本记录来保存本次审核
        await tx.preApplicationVersion.create({
          data: {
            preApplicationId: record.id,
            version: newVersion,
            essay: record.essay,
            source: record.source,
            sourceDetail: record.sourceDetail,
            registerEmail: record.registerEmail,
            group: record.group,
            status: PreApplicationStatus.REJECTED,
            guidance,
            reviewedAt: new Date(),
            reviewedById: user.id,
          },
        })

        const updated = await tx.preApplication.update({
          where: { id: record.id },
          data: {
            status: PreApplicationStatus.REJECTED,
            guidance,
            version: newVersion,
            reviewedAt: new Date(),
            reviewedBy: { connect: { id: user.id } },
            inviteCode: { disconnect: true },
          },
          include: {
            reviewedBy: { select: { id: true, name: true, email: true } },
            inviteCode: {
              select: { id: true, code: true, expiresAt: true, usedAt: true, assignedAt: true },
            },
          },
        })

        // 仅当有用户ID时才发送站内信（访客提交时没有用户ID）
        let message = null
        if (record.userId) {
          message = await tx.message.create({
            data: {
              title: messageContent.title,
              content: messageContent.content,
              createdById: user.id,
              recipients: { create: { userId: record.userId } },
            },
          })
        }

        await writeAuditLog(tx, {
          action: "PRE_APPLICATION_REVIEW_REJECT",
          entityType: "PRE_APPLICATION",
          entityId: record.id,
          actor: user,
          before: record,
          after: updated,
          metadata: { guidance },
          request,
        })

        if (inviteAfter) {
          await writeAuditLog(tx, {
            action: "INVITE_CODE_UNASSIGN",
            entityType: "INVITE_CODE",
            entityId: inviteAfter.id,
            actor: user,
            before: inviteBefore,
            after: inviteAfter,
            metadata: { preApplicationId: record.id },
            request,
          })
        }

        if (message) {
          await writeAuditLog(tx, {
            action: "MESSAGE_CREATE",
            entityType: "MESSAGE",
            entityId: message.id,
            actor: user,
            after: message,
            metadata: { recipientUserId: record.userId },
            request,
          })
        }
      })
    }

    const settings = await getSiteSettings()
    const shouldSendEmail = features.email && settings.emailNotifications

    let emailSent = false
    let emailError: string | undefined

    if (shouldSendEmail) {
      const emailContent = buildPreApplicationReviewEmail({
        appName: settings.siteName || dict.metadata?.title || "App",
        dictionary: dict,
        status: isApproved ? "APPROVED" : "REJECTED",
        reviewerName,
        guidance: isApproved ? guidanceWithCode : guidance,
        essay: record.essay,
        locale: currentLocale,
      })

      try {
        await sendEmail({
          to: record.registerEmail,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        })
        emailSent = true
      } catch (sendError) {
        console.error("Pre-application email failed:", sendError)
        emailError = sendError instanceof Error ? sendError.message : String(sendError)
      }
    }

    return NextResponse.json({
      success: true,
      emailSent,
      emailError,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(request, ApiErrorKeys.general.invalid, {
        status: 400,
        meta: { detail: error.errors[0].message },
      })
    }
    console.error("Pre-application review error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.admin.preApplications.failedToReview, {
      status: 500,
    })
  }
}
