import { type NextRequest, NextResponse } from "next/server"
import { getLinuxDoProfile, handleOAuthSignIn, handleOAuthBind } from "@/lib/auth/oauth"
import { createSession, setSessionCookie } from "@/lib/auth/session"
import { features } from "@/lib/features"
import { writeAuditLog } from "@/lib/audit"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  if (!features.oauth.linuxdo) {
    return NextResponse.redirect(new URL("/login?error=oauth_not_configured", request.url))
  }

  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", request.url))
  }

  // 解析 state 判断是登录还是绑定模式
  let bindMode = false
  let bindUserId: string | null = null
  if (state) {
    try {
      const stateData = JSON.parse(Buffer.from(state, "base64").toString())
      if (stateData.mode === "bind" && stateData.userId) {
        bindMode = true
        bindUserId = stateData.userId
      }
    } catch {
      // state 解析失败，按登录模式处理
    }
  }

  try {
    const profile = await getLinuxDoProfile(code)
    if (!profile) {
      const errorUrl = bindMode
        ? "/dashboard/contribute?error=oauth_failed"
        : "/login?error=oauth_failed"
      return NextResponse.redirect(new URL(errorUrl, request.url))
    }

    if (bindMode && bindUserId) {
      // 绑定模式：将 OAuth 账号绑定到当前用户
      try {
        await handleOAuthBind("linuxdo", profile, bindUserId, request)
        return NextResponse.redirect(new URL("/dashboard/contribute?success=linked", request.url))
      } catch (error) {
        const message = error instanceof Error ? error.message : "bind_failed"
        const errorCode = message.includes("already linked") ? "already_linked" : "bind_failed"
        return NextResponse.redirect(
          new URL(`/dashboard/contribute?error=${errorCode}`, request.url),
        )
      }
    }

    // 登录模式
    const user = await handleOAuthSignIn("linuxdo", profile, request)
    const { token, expires } = await createSession(user.id)
    const sessionRecord = await db?.session.findUnique({
      where: { sessionToken: token },
    })
    const response = NextResponse.redirect(new URL("/dashboard", request.url))
    setSessionCookie(response, token, expires)
    if (db) {
      await writeAuditLog(db, {
        action: "AUTH_OAUTH_LOGIN",
        entityType: "AUTH",
        entityId: user.id,
        actor: user,
        metadata: { provider: "linuxdo" },
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
    }
    return response
  } catch {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url))
  }
}
