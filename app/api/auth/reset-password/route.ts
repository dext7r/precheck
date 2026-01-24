import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hashPassword, validatePassword } from "@/lib/auth/password"
import { createSession, setSessionCookie } from "@/lib/auth/session"
import { features } from "@/lib/features"
import { writeAuditLog } from "@/lib/audit"
import { z } from "zod"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { createApiErrorResponse, resolveLocaleForRequest } from "@/lib/api/error-response"

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

// GET: 验证 token 并返回用户信息
export async function GET(request: NextRequest) {
  if (!features.database || !db) {
    return createApiErrorResponse(request, "apiErrors.auth.resetPassword.serviceUnavailable", {
      status: 503,
    })
  }

  const token = request.nextUrl.searchParams.get("token")

  if (!token) {
    return createApiErrorResponse(request, "apiErrors.auth.resetPassword.tokenRequired", {
      status: 400,
    })
  }

  try {
    const user = await db.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
      select: {
        email: true,
        name: true,
      },
    })

    if (!user) {
      return createApiErrorResponse(request, "apiErrors.auth.resetPassword.invalidToken", {
        status: 400,
      })
    }

    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        name: user.name,
      },
    })
  } catch {
    return createApiErrorResponse(request, "apiErrors.auth.resetPassword.resetFailed", {
      status: 500,
    })
  }
}

function getResetValidationErrorCode(error: z.ZodError) {
  const field = error.errors[0]?.path[0]

  if (field === "token") {
    return "apiErrors.auth.resetPassword.tokenRequired"
  }

  if (field === "password") {
    return "apiErrors.auth.resetPassword.weakPassword"
  }

  return "apiErrors.auth.resetPassword.validationFailed"
}

export async function POST(request: NextRequest) {
  if (!features.database || !db) {
    return createApiErrorResponse(request, "apiErrors.auth.resetPassword.serviceUnavailable", {
      status: 503,
    })
  }

  const locale = resolveLocaleForRequest(request)
  const dict = await getDictionary(locale)
  const successMessage = dict.auth?.resetPassword?.success || "Password reset successfully"

  try {
    const prisma = db
    const body = await request.json()
    const { token, password } = resetPasswordSchema.parse(body)

    // 验证密码强度
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return createApiErrorResponse(request, "apiErrors.auth.resetPassword.weakPassword", {
        status: 400,
        meta: { failures: passwordValidation.errors },
      })
    }

    // 查找用户
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    })

    if (!user) {
      return createApiErrorResponse(request, "apiErrors.auth.resetPassword.invalidToken", {
        status: 400,
      })
    }

    // 更新密码
    const hashedPassword = await hashPassword(password)
    const before = await prisma.user.findUnique({ where: { id: user.id } })

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    })

    await writeAuditLog(prisma, {
      action: "USER_PASSWORD_RESET",
      entityType: "USER",
      entityId: user.id,
      actor: user,
      before,
      after: updated,
      request,
    })

    // 创建 Session 实现自动登录
    const { token: sessionToken, expires } = await createSession(user.id)
    const response = NextResponse.json({
      success: true,
      message: successMessage,
    })
    setSessionCookie(response, sessionToken, expires)

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(request, getResetValidationErrorCode(error), { status: 400 })
    }
    return createApiErrorResponse(request, "apiErrors.auth.resetPassword.resetFailed", {
      status: 500,
    })
  }
}
