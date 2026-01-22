import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hashPassword, validatePassword } from "@/lib/auth/password"
import { features } from "@/lib/features"
import { writeAuditLog } from "@/lib/audit"
import { z } from "zod"

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export async function POST(request: NextRequest) {
  if (!features.database || !db) {
    return NextResponse.json({ error: "Authentication service not configured" }, { status: 503 })
  }

  try {
    const prisma = db
    const body = await request.json()
    const { token, password } = resetPasswordSchema.parse(body)

    // 验证密码强度
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.errors[0] }, { status: 400 })
    }

    // 查找用户
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 })
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

    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 })
  }
}
