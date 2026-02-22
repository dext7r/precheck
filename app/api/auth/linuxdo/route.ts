import { NextRequest, NextResponse } from "next/server"
import { getLinuxDoAuthUrl } from "@/lib/auth/oauth"
import { features } from "@/lib/features"
import { getSiteSettings } from "@/lib/site-settings"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"
import { getCurrentUser } from "@/lib/auth/session"
import { buildRedirectUrl } from "@/lib/url"

export async function GET(request: NextRequest) {
  if (!features.oauth.linuxdo) {
    return createApiErrorResponse(request, ApiErrorKeys.auth.oauth.linuxdoNotConfigured, {
      status: 404,
    })
  }

  const settings = await getSiteSettings()
  if (!settings.oauthLogin) {
    return createApiErrorResponse(request, ApiErrorKeys.auth.oauth.disabled, { status: 403 })
  }

  // 检查是否为绑定模式
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get("mode")

  let state: string | undefined
  if (mode === "bind") {
    const user = await getCurrentUser()
    if (!user) {
      // 未登录用户不能绑定，重定向到登录页
      return NextResponse.redirect(buildRedirectUrl("/login", request.url))
    }
    // 在 state 中传递绑定信息
    state = Buffer.from(JSON.stringify({ mode: "bind", userId: user.id })).toString("base64")
  }

  const url = await getLinuxDoAuthUrl(state)
  if (!url) {
    return createApiErrorResponse(request, ApiErrorKeys.auth.oauth.failedToGenerateUrl, {
      status: 500,
    })
  }

  return NextResponse.redirect(url)
}
