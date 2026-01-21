import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { locales, defaultLocale } from "@/lib/i18n/config"

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 检查路径是否已包含语言前缀
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  )

  if (pathnameHasLocale) return NextResponse.next()

  // 检测用户首选语言
  const acceptLanguage = request.headers.get("accept-language") || ""
  let detectedLocale = defaultLocale

  for (const locale of locales) {
    if (acceptLanguage.toLowerCase().includes(locale)) {
      detectedLocale = locale
      break
    }
  }

  // 重定向到带语言前缀的路径
  request.nextUrl.pathname = `/${detectedLocale}${pathname}`
  return NextResponse.redirect(request.nextUrl)
}

export const config = {
  matcher: [
    // 跳过静态资源和 API 路由
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
}
