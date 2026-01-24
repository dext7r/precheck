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
  action: z.enum(["APPROVE", "REJECT", "DISPUTE"]),
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

    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
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

    // PENDING 和 DISPUTED 状态都可以审核
    if (
      record.status !== PreApplicationStatus.PENDING &&
      record.status !== PreApplicationStatus.DISPUTED
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

    let inviteCodeRecord = null as {
      id: string
      code: string
      expiresAt: Date | null
    } | null

    const guidance = data.guidance.trim()
    const isApproved = data.action === "APPROVE"
    const isDisputed = data.action === "DISPUTE"
    const code = data.inviteCode?.trim()

    // 处理邀请码（通过和有争议都可以发码）
    let inviteCodeData: { id: string; code: string; expiresAt: Date | null } | null = null
    if ((isApproved || isDisputed) && code) {
      const expiresAt = data.inviteExpiresAt ? new Date(data.inviteExpiresAt) : null
      if (expiresAt && Number.isNaN(expiresAt.getTime())) {
        return createApiErrorResponse(
          request,
          ApiErrorKeys.admin.preApplications.invalidInviteExpiry,
          { status: 400 },
        )
      }
      if (expiresAt && expiresAt.getTime() <= Date.now()) {
        return createApiErrorResponse(
          request,
          ApiErrorKeys.admin.preApplications.expiryMustBeInFuture,
          { status: 400 },
        )
      }

      const existing = await db.inviteCode.findUnique({
        where: { code },
        include: { preApplication: { select: { id: true } } },
      })

      if (!existing || existing.deletedAt) {
        return createApiErrorResponse(request, ApiErrorKeys.admin.inviteCodes.notFound, {
          status: 400,
        })
      }
      if (existing.usedAt) {
        return createApiErrorResponse(request, ApiErrorKeys.admin.inviteCodes.alreadyUsed, {
          status: 400,
        })
      }
      if (existing.expiresAt && existing.expiresAt.getTime() <= Date.now()) {
        return createApiErrorResponse(request, ApiErrorKeys.admin.inviteCodes.alreadyExpired, {
          status: 400,
        })
      }
      if (existing.preApplication && existing.preApplication.id !== record.id) {
        return createApiErrorResponse(request, ApiErrorKeys.admin.inviteCodes.alreadyAssigned, {
          status: 400,
        })
      }

      inviteCodeData = {
        id: existing.id,
        code: existing.code,
        expiresAt: expiresAt ?? existing.expiresAt,
      }
    }

    // 通过必须有邀请码
    if (isApproved && !inviteCodeData) {
      return createApiErrorResponse(
        request,
        ApiErrorKeys.admin.preApplications.inviteCodeRequired,
        { status: 400 },
      )
    }

    if (isDisputed) {
      // 标记为有争议，可选发码，不发送通知给用户
      await db.$transaction(async (tx) => {
        if (inviteCodeData) {
          await tx.inviteCode.update({
            where: { id: inviteCodeData.id },
            data: {
              expiresAt: inviteCodeData.expiresAt,
              assignedAt: new Date(),
              assignedById: user.id,
            },
          })
        }

        const updated = await tx.preApplication.update({
          where: { id: record.id },
          data: {
            status: PreApplicationStatus.DISPUTED,
            guidance,
            reviewedAt: new Date(),
            reviewedBy: { connect: { id: user.id } },
            ...(inviteCodeData && { inviteCode: { connect: { id: inviteCodeData.id } } }),
          },
        })

        await tx.preApplicationVersion.updateMany({
          where: { preApplicationId: record.id, version: record.version },
          data: {
            status: PreApplicationStatus.DISPUTED,
            guidance,
            reviewedAt: new Date(),
            reviewedById: user.id,
          },
        })

        await writeAuditLog(tx, {
          action: "PRE_APPLICATION_REVIEW_DISPUTE",
          entityType: "PRE_APPLICATION",
          entityId: record.id,
          actor: user,
          before: record,
          after: updated,
          metadata: { guidance, inviteCode: inviteCodeData?.code },
          request,
        })

        if (inviteCodeData) {
          await writeAuditLog(tx, {
            action: "INVITE_CODE_ASSIGN",
            entityType: "INVITE_CODE",
            entityId: inviteCodeData.id,
            actor: user,
            metadata: { preApplicationId: record.id },
            request,
          })
        }
      })

      return NextResponse.json({ success: true })
    }

    if (isApproved) {
      inviteCodeRecord = await db.$transaction(async (tx) => {
        const inviteCode = await tx.inviteCode.update({
          where: { id: inviteCodeData!.id },
          data: {
            expiresAt: inviteCodeData!.expiresAt,
            assignedAt: new Date(),
            assignedById: user.id,
          },
        })

        const updated = await tx.preApplication.update({
          where: { id: record.id },
          data: {
            status: PreApplicationStatus.APPROVED,
            guidance,
            reviewedAt: new Date(),
            reviewedBy: { connect: { id: user.id } },
            inviteCode: { connect: { id: inviteCode.id } },
          },
          include: {
            reviewedBy: { select: { id: true, name: true, email: true } },
            inviteCode: {
              select: { id: true, code: true, expiresAt: true, usedAt: true, assignedAt: true },
            },
          },
        })

        // 更新版本历史记录
        await tx.preApplicationVersion.updateMany({
          where: { preApplicationId: record.id, version: record.version },
          data: {
            status: PreApplicationStatus.APPROVED,
            guidance,
            reviewedAt: new Date(),
            reviewedById: user.id,
          },
        })

        const messageContent = buildPreApplicationMessage({
          dict,
          status: PreApplicationStatus.APPROVED,
          reviewerName,
          guidance,
          essay: record.essay,
          inviteCode: inviteCode.code,
          inviteExpiresAt: inviteCode.expiresAt,
          locale: currentLocale,
        })

        const message = await tx.message.create({
          data: {
            title: messageContent.title,
            content: messageContent.content,
            createdById: user.id,
            recipients: { create: { userId: record.userId } },
          },
        })

        await writeAuditLog(tx, {
          action: "PRE_APPLICATION_REVIEW_APPROVE",
          entityType: "PRE_APPLICATION",
          entityId: record.id,
          actor: user,
          before: record,
          after: updated,
          metadata: {
            guidance,
            inviteCode: inviteCode.code,
            inviteExpiresAt: inviteCode.expiresAt?.toISOString() ?? null,
          },
          request,
        })

        await writeAuditLog(tx, {
          action: "INVITE_CODE_ASSIGN",
          entityType: "INVITE_CODE",
          entityId: inviteCode.id,
          actor: user,
          after: inviteCode,
          metadata: { preApplicationId: record.id },
          request,
        })

        await writeAuditLog(tx, {
          action: "MESSAGE_CREATE",
          entityType: "MESSAGE",
          entityId: message.id,
          actor: user,
          after: message,
          metadata: { recipientUserId: record.userId },
          request,
        })

        return inviteCode
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

        const updated = await tx.preApplication.update({
          where: { id: record.id },
          data: {
            status: PreApplicationStatus.REJECTED,
            guidance,
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

        // 更新版本历史记录
        await tx.preApplicationVersion.updateMany({
          where: { preApplicationId: record.id, version: record.version },
          data: {
            status: PreApplicationStatus.REJECTED,
            guidance,
            reviewedAt: new Date(),
            reviewedById: user.id,
          },
        })

        const message = await tx.message.create({
          data: {
            title: messageContent.title,
            content: messageContent.content,
            createdById: user.id,
            recipients: { create: { userId: record.userId } },
          },
        })

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

        await writeAuditLog(tx, {
          action: "MESSAGE_CREATE",
          entityType: "MESSAGE",
          entityId: message.id,
          actor: user,
          after: message,
          metadata: { recipientUserId: record.userId },
          request,
        })
      })
    }

    const settings = await getSiteSettings()
    const shouldSendEmail = features.email && settings.emailNotifications

    if (shouldSendEmail) {
      const emailContent = buildPreApplicationReviewEmail({
        appName: settings.siteName || dict.metadata?.title || "App",
        dictionary: dict,
        status: isApproved ? "APPROVED" : "REJECTED",
        reviewerName,
        guidance,
        essay: record.essay,
        inviteCode: inviteCodeRecord?.code ?? undefined,
        inviteExpiresAt: inviteCodeRecord?.expiresAt ?? undefined,
        locale: currentLocale,
      })

      try {
        await sendEmail({
          to: record.registerEmail,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        })
      } catch (sendError) {
        console.error("Pre-application email failed:", sendError)
      }
    }

    return NextResponse.json({ success: true })
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
