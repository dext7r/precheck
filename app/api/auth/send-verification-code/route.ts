import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { sendVerificationEmail } from "@/lib/verification-code"
import { isEmailConfigured } from "@/lib/email/mailer"
import { isRedisAvailable } from "@/lib/redis"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"
import { db } from "@/lib/db"
import { verifyTurnstileToken } from "@/lib/turnstile"
import type { Locale } from "@/lib/i18n/config"

const sendCodeSchema = z.object({
  email: z.string().email("Invalid email address"),
  purpose: z.enum(["register", "reset-password", "change-email", "login"]).default("register"),
  locale: z.enum(["zh", "en"]).optional(),
  turnstileToken: z.string().optional(),
})

/**
 * 发送邮箱验证码
 */
export async function POST(request: NextRequest) {
  try {
    // 检查邮件服务是否配置
    if (!(await isEmailConfigured())) {
      return createApiErrorResponse(
        request,
        ApiErrorKeys.auth.verificationCode.emailServiceNotConfigured,
        { status: 503 },
      )
    }

    // 检查 Redis 是否可用
    if (!(await isRedisAvailable())) {
      return createApiErrorResponse(request, ApiErrorKeys.general.failed, {
        status: 503,
        meta: { detail: "Verification service not available. Please configure Redis." },
      })
    }

    const body = await request.json()
    const data = sendCodeSchema.parse(body)

    // 验证 Turnstile token（如果提供）
    if (data.turnstileToken) {
      const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      const isValid = await verifyTurnstileToken(data.turnstileToken, clientIp)
      if (!isValid) {
        return createApiErrorResponse(request, ApiErrorKeys.general.invalid, {
          status: 400,
          meta: { detail: "Turnstile verification failed" },
        })
      }
    }

    // 登录验证码：检查邮箱是否存在
    if (data.purpose === "login" && db) {
      const user = await db.user.findUnique({ where: { email: data.email } })
      if (!user) {
        // 安全考虑：不透露邮箱是否存在，但不发送邮件
        return NextResponse.json({
          success: true,
          message: "Verification code sent successfully",
        })
      }
    }

    // 注册验证码：检查邮箱是否已存在
    if (data.purpose === "register" && db) {
      const existingUser = await db.user.findUnique({ where: { email: data.email } })
      if (existingUser) {
        return createApiErrorResponse(request, "apiErrors.auth.register.emailExists", {
          status: 400,
        })
      }
    }

    // 从请求获取 locale，回退到 Accept-Language 头
    const acceptLang = request.headers.get("Accept-Language") || ""
    const locale: Locale = data.locale || (acceptLang.startsWith("zh") ? "zh" : "en")

    // 发送验证码
    const result = await sendVerificationEmail(data.email, data.purpose, locale)

    if (!result.success) {
      if (result.waitSeconds) {
        return createApiErrorResponse(request, ApiErrorKeys.general.failed, {
          status: 429,
          meta: { detail: result.error, waitSeconds: result.waitSeconds },
        })
      }

      return createApiErrorResponse(request, ApiErrorKeys.auth.verificationCode.sendFailed, {
        status: 500,
        meta: { detail: result.error },
      })
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent successfully",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(request, ApiErrorKeys.general.invalid, {
        status: 400,
        meta: { detail: error.errors[0].message },
      })
    }

    console.error("Send verification code error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.auth.verificationCode.sendFailed, {
      status: 500,
    })
  }
}
