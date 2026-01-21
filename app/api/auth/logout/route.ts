import { type NextRequest, NextResponse } from "next/server"
import { clearSessionCookie, deleteSession } from "@/lib/auth/session"
import { defaultLocale, locales } from "@/lib/i18n/config"

export async function POST(request: NextRequest) {
  try {
    await deleteSession()

    // 从 referer 中提取 locale
    const referer = request.headers.get("referer") || ""
    let locale = defaultLocale

    for (const loc of locales) {
      if (referer.includes(`/${loc}/`)) {
        locale = loc
        break
      }
    }

    // 重定向到登录页
    const loginUrl = new URL(`/${locale}/login`, request.url)
    const response = NextResponse.redirect(loginUrl)
    clearSessionCookie(response)
    return response
  } catch {
    return NextResponse.json({ error: "Logout failed" }, { status: 500 })
  }
}
