import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { generateResetToken } from "@/lib/auth/password"
import { authConfig } from "@/lib/auth/config"
import { buildResetPasswordEmail } from "@/lib/email/templates"
import { sendEmail } from "@/lib/email/mailer"
import { features } from "@/lib/features"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { defaultLocale, locales } from "@/lib/i18n/config"
import { getSiteSettings } from "@/lib/site-settings"
import { z } from "zod"

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
})

export async function POST(request: NextRequest) {
  if (!features.database || !db) {
    return NextResponse.json({ error: "Authentication service not configured" }, { status: 503 })
  }

  try {
    const prisma = db
    const body = await request.json()
    const { email } = forgotPasswordSchema.parse(body)
    const settings = await getSiteSettings()

    const referer = request.headers.get("referer") || ""
    let locale = defaultLocale
    for (const loc of locales) {
      if (referer.includes(`/${loc}/`)) {
        locale = loc
        break
      }
    }

    const user = await prisma.user.findUnique({
      where: { email },
    })

    // 无论用户是否存在都返回成功（安全考虑）
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account exists, a reset link will be sent",
      })
    }

    // 生成重置 Token
    const resetToken = generateResetToken()
    const resetTokenExpiry = new Date(Date.now() + authConfig.resetTokenExpiry)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const resetUrl = new URL(`/${locale}/reset-password`, baseUrl)
    resetUrl.searchParams.set("token", resetToken)
    const resetLink = resetUrl.toString()

    const emailConfigured =
      features.email && process.env.SMTP_PASS && (process.env.SMTP_FROM || process.env.SMTP_USER)

    if (emailConfigured && settings.emailNotifications) {
      const dict = await getDictionary(locale)
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
      message: "If an account exists, a reset link will be sent",
      // 仅开发环境返回
      ...(process.env.NODE_ENV === "development" && { resetUrl: resetLink }),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}
