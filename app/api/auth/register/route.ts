import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hashPassword, validatePassword } from "@/lib/auth/password"
import { createSession, setSessionCookie } from "@/lib/auth/session"
import { features } from "@/lib/features"
import { getCountryFromIP } from "@/lib/utils/geolocation"
import { getSiteSettings } from "@/lib/site-settings"
import { writeAuditLog } from "@/lib/audit"
import { verifyCode } from "@/lib/verification-code"
import { isRedisAvailable } from "@/lib/redis"
import { verifyTurnstileToken } from "@/lib/turnstile"
import { z } from "zod"
import { createApiErrorResponse } from "@/lib/api/error-response"

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  verificationCode: z.string().optional(), // 改为可选
  turnstileToken: z.string().optional(),
})

function getRegisterValidationErrorCode(error: z.ZodError) {
  const issue = error.errors[0]
  const field = issue.path[0]

  if (field === "email") {
    return "apiErrors.auth.register.invalidEmail"
  }

  if (field === "password") {
    return "apiErrors.auth.register.weakPassword"
  }

  return "apiErrors.auth.register.validationFailed"
}

export async function POST(request: NextRequest) {
  if (!features.database || !db) {
    return createApiErrorResponse(request, "apiErrors.auth.register.serviceUnavailable", {
      status: 503,
    })
  }

  try {
    const settings = await getSiteSettings()
    if (!settings.userRegistration) {
      return createApiErrorResponse(request, "apiErrors.auth.register.registrationDisabled", {
        status: 403,
      })
    }

    // 维护模式下禁止注册
    if (settings.maintenanceMode) {
      return createApiErrorResponse(request, "apiErrors.auth.register.maintenanceMode", {
        status: 503,
      })
    }

    const body = await request.json()
    const { email, password, name, verificationCode, turnstileToken } = registerSchema.parse(body)

    // 验证 Turnstile (如果提供)
    if (turnstileToken) {
      const clientIp =
        request.headers.get("x-forwarded-for")?.split(",")[0] ||
        request.headers.get("x-real-ip") ||
        undefined
      const isValid = await verifyTurnstileToken(turnstileToken, clientIp)
      if (!isValid) {
        return createApiErrorResponse(request, "apiErrors.auth.register.verificationFailed", {
          status: 400,
        })
      }
    }

    // 验证邮箱验证码
    const redisAvailable = await isRedisAvailable()
    if (redisAvailable) {
      if (!verificationCode) {
        return createApiErrorResponse(request, "apiErrors.auth.register.verificationCodeRequired", {
          status: 400,
        })
      }
      const codeVerification = await verifyCode(email, verificationCode)
      if (!codeVerification.valid) {
        return createApiErrorResponse(request, "apiErrors.auth.register.invalidVerificationCode", {
          status: 400,
          meta: { reason: codeVerification.error },
        })
      }
    }

    // 验证密码强度
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return createApiErrorResponse(request, "apiErrors.auth.register.weakPassword", {
        status: 400,
        meta: { failures: passwordValidation.errors },
      })
    }

    // 检查邮箱是否已存在
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return createApiErrorResponse(request, "apiErrors.auth.register.emailExists", { status: 400 })
    }

    // 创建用户
    const hashedPassword = await hashPassword(password)
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip")
    const country = await getCountryFromIP(ip)

    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        country,
      },
    })

    await writeAuditLog(db, {
      action: "USER_REGISTER",
      entityType: "USER",
      entityId: user.id,
      actor: user,
      after: user,
      metadata: { country },
      request,
    })

    // 创建 Session
    const { token, expires } = await createSession(user.id)
    const sessionRecord = await db.session.findUnique({
      where: { sessionToken: token },
    })
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
    setSessionCookie(response, token, expires)

    if (sessionRecord) {
      await writeAuditLog(db, {
        action: "SESSION_CREATE",
        entityType: "SESSION",
        entityId: sessionRecord.id,
        actor: user,
        after: sessionRecord,
        request,
      })
    }
    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(request, getRegisterValidationErrorCode(error), { status: 400 })
    }
    return createApiErrorResponse(request, "apiErrors.auth.register.registrationFailed", {
      status: 500,
    })
  }
}
