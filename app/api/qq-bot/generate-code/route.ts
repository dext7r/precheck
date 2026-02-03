import { type NextRequest, NextResponse } from "next/server"
import { createQQVerifyCode } from "@/lib/qq-verify"

const BOT_SECRET = process.env.QQ_BOT_SECRET

/**
 * POST /api/qq-bot/generate-code
 * QQ机器人调用此接口生成验证码
 */
export async function POST(request: NextRequest) {
  try {
    if (!BOT_SECRET) {
      console.error("QQ_BOT_SECRET environment variable is not configured")
      return NextResponse.json({ error: "Bot service not configured" }, { status: 503 })
    }

    const botSecret = request.headers.get("X-Bot-Secret")
    if (botSecret !== BOT_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
    const qqNumber = body.qqNumber

    if (!qqNumber || !/^\d{5,11}$/.test(qqNumber)) {
      return NextResponse.json({ error: "Invalid QQ number" }, { status: 400 })
    }

    const result = await createQQVerifyCode(qqNumber)

    if (!result.success) {
      if (result.waitSeconds) {
        return NextResponse.json(
          { error: result.error, retryAfter: result.waitSeconds },
          { status: 429 },
        )
      }
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      code: result.code,
      expiryMinutes: 3,
    })
  } catch (error) {
    console.error("QQ verify code generation error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
