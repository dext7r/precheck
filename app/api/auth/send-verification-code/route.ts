import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { sendVerificationEmail } from "@/lib/verification-code"
import { isEmailConfigured } from "@/lib/email/mailer"
import { isRedisAvailable } from "@/lib/redis"

const sendCodeSchema = z.object({
  email: z.string().email("Invalid email address"),
  purpose: z.enum(["register", "reset-password", "change-email"]).default("register"),
})

/**
 * 发送邮箱验证码
 */
export async function POST(request: NextRequest) {
  try {
    // 检查邮件服务是否配置
    if (!isEmailConfigured()) {
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 503 },
      )
    }

    // 检查 Redis 是否可用
    if (!(await isRedisAvailable())) {
      return NextResponse.json(
        { error: "Verification service not available. Please configure Redis." },
        { status: 503 },
      )
    }

    const body = await request.json()
    const data = sendCodeSchema.parse(body)

    // 发送验证码
    const result = await sendVerificationEmail(data.email, data.purpose)

    if (!result.success) {
      if (result.waitSeconds) {
        return NextResponse.json(
          {
            error: result.error,
            waitSeconds: result.waitSeconds,
          },
          { status: 429 },
        )
      }

      return NextResponse.json(
        { error: result.error || "Failed to send verification code" },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent successfully",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }

    console.error("Send verification code error:", error)
    return NextResponse.json(
      { error: "Failed to send verification code" },
      { status: 500 },
    )
  }
}
