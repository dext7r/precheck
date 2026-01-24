import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { generateResetToken } from "@/lib/auth/password"
import { authConfig } from "@/lib/auth/config"
import { buildResetPasswordEmail } from "@/lib/email/templates"
import { sendEmail } from "@/lib/email/mailer"
import { features } from "@/lib/features"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { getSiteSettings } from "@/lib/site-settings"
import { writeAuditLog } from "@/lib/audit"
import { z } from "zod"
import { createApiErrorResponse, resolveLocaleForRequest } from "@/lib/api/error-response"

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
})

function getForgotValidationErrorCode(error: z.ZodError) {
  const field = error.errors[0]?.path[0]

  if (field === "email") {
    return "apiErrors.auth.forgotPassword.invalidEmail"
  }

  return "apiErrors.auth.forgotPassword.validationFailed"
}

export async function POST(request: NextRequest) {
  if (!features.database || !db) {
    return createApiErrorResponse(request, "apiErrors.auth.forgotPassword.serviceUnavailable", {
      status: 503,
    })
  }

  const locale = resolveLocaleForRequest(request)
  const dict = await getDictionary(locale)
  const successMessage =
    dict.auth?.forgotPassword?.success || "If an account exists, a reset link will be sent"

  try {
    const prisma = db
    const body = await request.json()
    const { email } = forgotPasswordSchema.parse(body)
    const settings = await getSiteSettings()

    const user = await prisma.user.findUnique({
      where: { email },
    })

    // 无论用户是否存在都返回成功（安全考虑）
    if (!user) {
      return NextResponse.json({
        success: true,
        message: successMessage,
      })
    }

    // 生成重置 Token
    const resetToken = generateResetToken()
    const resetTokenExpiry = new Date(Date.now() + authConfig.resetTokenExpiry)

    const before = await prisma.user.findUnique({ where: { id: user.id } })

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    })

    await writeAuditLog(prisma, {
      action: "USER_PASSWORD_RESET_REQUEST",
      entityType: "USER",
      entityId: user.id,
      actor: user,
      before,
      after: updated,
      metadata: { email },
      request,
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const resetUrl = new URL(`/${locale}/reset-password`, baseUrl)
    resetUrl.searchParams.set("token", resetToken)
    const resetLink = resetUrl.toString()

    const emailConfigured =
      features.email && process.env.SMTP_PASS && (process.env.SMTP_FROM || process.env.SMTP_USER)

    if (emailConfigured && settings.emailNotifications) {
      const appName = dict.metadata?.title || "App"
      const expiresInHours = Math.max(1, Math.round(authConfig.resetTokenExpiry / (60 * 60 * 1000)))
      const emailContent = buildResetPasswordEmail({
        appName,
        resetUrl: resetLink,
        dictionary: dict,
        expiresInHours,
      })

      try {
        await sendEmail({
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        })
      } catch (sendError) {
        console.error("Reset password email failed:", sendError)
      }
    }

    return NextResponse.json({
      success: true,
      message: successMessage,
      ...(process.env.NODE_ENV === "development" && { resetUrl: resetLink }),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(request, getForgotValidationErrorCode(error), { status: 400 })
    }
    return createApiErrorResponse(request, "apiErrors.auth.forgotPassword.failed", { status: 500 })
  }
}
