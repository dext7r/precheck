import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"
import { isInviteCodeStorageEnabled } from "@/lib/invite-code/guard"

// 检查是否有可用的邀请码（不暴露具体数量）
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    if (!isInviteCodeStorageEnabled()) {
      return NextResponse.json({ hasAvailableCode: false })
    }

    const now = new Date()

    // 检查是否存在可用的邀请码
    const availableCode = await db.inviteCode.findFirst({
      where: {
        usedAt: null,
        deletedAt: null,
        preApplication: null,
        issuedToEmail: null,
        issuedToUserId: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { id: true },
    })

    return NextResponse.json({
      hasAvailableCode: Boolean(availableCode),
    })
  } catch (error) {
    console.error("Check available code error:", error)
    return NextResponse.json({ hasAvailableCode: false })
  }
}
