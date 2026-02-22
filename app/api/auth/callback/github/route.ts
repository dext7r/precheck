import { type NextRequest, NextResponse } from "next/server"
import { getGitHubProfile, handleOAuthSignIn } from "@/lib/auth/oauth"
import { createSession, setSessionCookie } from "@/lib/auth/session"
import { features } from "@/lib/features"
import { writeAuditLog } from "@/lib/audit"
import { db } from "@/lib/db"
import { buildRedirectUrl } from "@/lib/url"

export async function GET(request: NextRequest) {
  if (!features.oauth.github) {
    return NextResponse.redirect(buildRedirectUrl("/login?error=oauth_not_configured", request.url))
  }

  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")

  if (!code) {
    return NextResponse.redirect(buildRedirectUrl("/login?error=no_code", request.url))
  }

  try {
    const profile = await getGitHubProfile(code)
    if (!profile) {
      return NextResponse.redirect(buildRedirectUrl("/login?error=oauth_failed", request.url))
    }

    const user = await handleOAuthSignIn("github", profile, request)
    const { token, expires } = await createSession(user.id)
    const sessionRecord = await db?.session.findUnique({
      where: { sessionToken: token },
    })
    const response = NextResponse.redirect(buildRedirectUrl("/dashboard", request.url))
    setSessionCookie(response, token, expires)
    if (db) {
      await writeAuditLog(db, {
        action: "AUTH_OAUTH_LOGIN",
        entityType: "AUTH",
        entityId: user.id,
        actor: user,
        metadata: { provider: "github" },
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
    return NextResponse.redirect(buildRedirectUrl("/login?error=oauth_failed", request.url))
  }
}
