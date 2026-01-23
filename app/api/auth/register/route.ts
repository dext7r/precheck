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

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  verificationCode: z.string().optional(), // 改为可选
  turnstileToken: z.string().optional(),
})

export async function POST(request: NextRequest) {
  if (!features.database || !db) {
    return NextResponse.json({ error: "Registration service not configured" }, { status: 503 })
  }

  try {
    const settings = await getSiteSettings()
    if (!settings.userRegistration) {
      return NextResponse.json({ error: "User registration is disabled" }, { status: 403 })
    }

    const body = await request.json()
    const { email, password, name, verificationCode, turnstileToken } = registerSchema.parse(body)

    // 验证 Turnstile (如果提供)
    if (turnstileToken) {
      const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || undefined
      const isValid = await verifyTurnstileToken(turnstileToken, clientIp)
      if (!isValid) {
        return NextResponse.json({ error: "Verification failed" }, { status: 400 })
      }
    }

    // 如果 Redis 可用且提供了验证码，验证验证码
    if (verificationCode && (await isRedisAvailable())) {
      const codeVerification = await verifyCode(email, verificationCode)
      if (!codeVerification.valid) {
        return NextResponse.json(
          { error: codeVerification.error || "Invalid verification code" },
          { status: 400 },
        )
      }
    }

    // 验证密码强度
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.errors[0] }, { status: 400 })
    }

    // 检查邮箱是否已存在
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 })
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
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}
