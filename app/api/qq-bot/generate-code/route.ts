import { type NextRequest, NextResponse } from "next/server"
import { createQQVerifyCode } from "@/lib/qq-verify"

const BOT_SECRET = process.env.QQ_BOT_SECRET || "precheck-bot-secret-2024"

/**
 * POST /api/qq-bot/generate-code
 * QQ机器人调用此接口生成验证码
 */
export async function POST(request: NextRequest) {
  try {
    const botSecret = request.headers.get("X-Bot-Secret")
    if (botSecret !== BOT_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const qqNumber = body.qqNumber

    if (!qqNumber || !/^\d{5,15}$/.test(qqNumber)) {
      return NextResponse.json({ error: "Invalid QQ number" }, { status: 400 })
    }

    const result = await createQQVerifyCode(qqNumber)

    if (!result.success) {
      if (result.waitSeconds) {
        return NextResponse.json(
          { error: result.error, retryAfter: result.waitSeconds },
          { status: 429 }
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
