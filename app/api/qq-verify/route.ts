import { NextRequest, NextResponse } from "next/server"
import { verifyQQCode, QQ_VERIFY_CONFIG } from "@/lib/qq-verify"

export async function POST(request: NextRequest) {
  let body: { qqNumber?: string; code?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { qqNumber, code } = body

  if (!qqNumber || !/^\d{5,11}$/.test(qqNumber)) {
    return NextResponse.json({ error: "请输入有效的 QQ 号" }, { status: 400 })
  }

  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "请输入 6 位验证码" }, { status: 400 })
  }

  const result = await verifyQQCode(qqNumber, code)

  if (!result.valid) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const response = NextResponse.json({ success: true })
  const isHttps = process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://")

  response.cookies.set(QQ_VERIFY_CONFIG.cookieName, result.accessToken!, {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    maxAge: QQ_VERIFY_CONFIG.accessExpiryHours * 60 * 60,
    path: "/",
  })

  return response
}
