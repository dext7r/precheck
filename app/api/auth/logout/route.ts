import { type NextRequest, NextResponse } from "next/server"
import { clearSessionCookie, deleteSession, getCurrentUser, getSession } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { defaultLocale, locales } from "@/lib/i18n/config"
import { writeAuditLog } from "@/lib/audit"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const session = await getSession()
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

    if (user && db) {
      await writeAuditLog(db, {
        action: "AUTH_LOGOUT",
        entityType: "AUTH",
        entityId: user.id,
        actor: user,
        request,
      })
      if (session) {
        await writeAuditLog(db, {
          action: "SESSION_DELETE",
          entityType: "SESSION",
          entityId: session.id,
          actor: user,
          before: session,
          after: null,
          request,
        })
      }
    }

    return response
  } catch {
    return createApiErrorResponse(request, ApiErrorKeys.auth.logout.failed, { status: 500 })
  }
}
