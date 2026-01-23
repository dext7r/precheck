import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyPassword } from "@/lib/auth/password"
import { createSession, setSessionCookie } from "@/lib/auth/session"
import { features } from "@/lib/features"
import { writeAuditLog } from "@/lib/audit"
import { verifyTurnstileToken } from "@/lib/turnstile"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  turnstileToken: z.string().optional(),
})

export async function POST(request: NextRequest) {
  if (!features.database || !db) {
    return NextResponse.json({ error: "Authentication service not configured" }, { status: 503 })
  }

  try {
    const body = await request.json()
    const { email, password, turnstileToken } = loginSchema.parse(body)

    // 验证 Turnstile (如果提供)
    if (turnstileToken) {
      const clientIp =
        request.headers.get("x-forwarded-for")?.split(",")[0] ||
        request.headers.get("x-real-ip") ||
        undefined
      const isValid = await verifyTurnstileToken(turnstileToken, clientIp)
      if (!isValid) {
        return NextResponse.json({ error: "Verification failed" }, { status: 400 })
      }
    }

    // 查找用户
    const user = await db.user.findUnique({
      where: { email },
    })

    if (!user || !user.password) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // 验证密码
    const isValid = await verifyPassword(password, user.password)
    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
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
      metadata: { email },
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
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
