import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const [unreadCount, latestRecord] = await Promise.all([
      db.messageRecipient.count({
        where: { userId: user.id, readAt: null, message: { revokedAt: null } },
      }),
      db.messageRecipient.findFirst({
        where: { userId: user.id, message: { revokedAt: null } },
        orderBy: { message: { createdAt: "desc" } },
        include: {
          message: {
            select: { id: true, title: true, createdAt: true },
          },
        },
      }),
    ])

    const latest = latestRecord
      ? {
          id: latestRecord.message.id,
          title: latestRecord.message.title,
          createdAt: latestRecord.message.createdAt,
          readAt: latestRecord.readAt,
        }
      : null

    return NextResponse.json({ unreadCount, latest })
  } catch (error) {
    console.error("Message summary API error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.dashboard.messages.summary.failedToFetch, {
      status: 500,
    })
  }
}
