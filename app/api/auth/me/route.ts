import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    // 获取用户绑定的 OAuth 账号
    const accounts = db
      ? await db.account.findMany({
          where: { userId: user.id },
          select: { provider: true },
        })
      : []

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        linkedProviders: accounts.map((a) => a.provider),
      },
    })
  } catch {
    return createApiErrorResponse(request, ApiErrorKeys.auth.me.failedToGetUser, { status: 500 })
  }
}
