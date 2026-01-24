import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyPassword } from "@/lib/auth/password"
import { createSession, setSessionCookie } from "@/lib/auth/session"
import { features } from "@/lib/features"
import { writeAuditLog } from "@/lib/audit"
import { verifyTurnstileToken } from "@/lib/turnstile"
import { verifyCode } from "@/lib/verification-code"
import { isRedisAvailable } from "@/lib/redis"
import { z } from "zod"
import { createApiErrorResponse } from "@/lib/api/error-response"

// 密码登录 schema
const passwordLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  turnstileToken: z.string().optional(),
  loginType: z.literal("password").optional(),
})

// 验证码登录 schema
const codeLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  verificationCode: z.string().length(6, "Verification code must be 6 digits"),
  turnstileToken: z.string().optional(),
  loginType: z.literal("code"),
})

// 合并 schema
const loginSchema = z.union([passwordLoginSchema, codeLoginSchema])

function getLoginValidationErrorCode(error: z.ZodError) {
  const issue = error.errors[0]
  const field = issue.path[0]

  if (field === "email") {
    return "apiErrors.auth.login.invalidEmail"
  }

  if (field === "password") {
    return "apiErrors.auth.login.passwordRequired"
  }

  if (field === "verificationCode") {
    return "apiErrors.auth.login.invalidVerificationCode"
  }

  return "apiErrors.auth.login.validationFailed"
}

export async function POST(request: NextRequest) {
  if (!features.database || !db) {
    return createApiErrorResponse(request, "apiErrors.auth.login.serviceUnavailable", {
      status: 503,
    })
  }

  try {
    const body = await request.json()
    const data = loginSchema.parse(body)
    const { email, turnstileToken } = data

    // 验证 Turnstile (如果提供)
    if (turnstileToken) {
      const clientIp =
        request.headers.get("x-forwarded-for")?.split(",")[0] ||
        request.headers.get("x-real-ip") ||
        undefined
      const isValid = await verifyTurnstileToken(turnstileToken, clientIp)
      if (!isValid) {
        return createApiErrorResponse(request, "apiErrors.auth.login.verificationFailed", {
          status: 400,
        })
      }
    }

    // 查找用户
    const user = await db.user.findUnique({
      where: { email },
    })

    if (!user) {
      return createApiErrorResponse(request, "apiErrors.auth.login.invalidCredentials", {
        status: 401,
      })
    }

    // 验证码登录
    if ("loginType" in data && data.loginType === "code") {
      // 检查 Redis 是否可用
      if (!(await isRedisAvailable())) {
        return createApiErrorResponse(request, "apiErrors.auth.login.serviceUnavailable", {
          status: 503,
        })
      }

      const codeVerification = await verifyCode(email, data.verificationCode)
      if (!codeVerification.valid) {
        return createApiErrorResponse(request, "apiErrors.auth.login.invalidVerificationCode", {
          status: 401,
          meta: { reason: codeVerification.error },
        })
      }
    } else {
      // 密码登录
      if (!user.password) {
        return createApiErrorResponse(request, "apiErrors.auth.login.invalidCredentials", {
          status: 401,
        })
      }

      const password = "password" in data ? data.password : ""
      const isValid = await verifyPassword(password, user.password)
      if (!isValid) {
        return createApiErrorResponse(request, "apiErrors.auth.login.invalidCredentials", {
          status: 401,
        })
      }
    }

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

    await writeAuditLog(db, {
      action: "AUTH_LOGIN",
      entityType: "AUTH",
      entityId: user.id,
      actor: user,
      metadata: { email, loginType: "loginType" in data ? data.loginType : "password" },
      request,
    })

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
      return createApiErrorResponse(request, getLoginValidationErrorCode(error), { status: 400 })
    }
    return createApiErrorResponse(request, "apiErrors.auth.login.loginFailed", { status: 500 })
  }
}
