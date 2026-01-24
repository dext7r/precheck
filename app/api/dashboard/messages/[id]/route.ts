import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const { id } = await context.params
    const record = await db.messageRecipient.findUnique({
      where: {
        messageId_userId: {
          messageId: id,
          userId: user.id,
        },
      },
      include: {
        message: {
          select: {
            id: true,
            title: true,
            content: true,
            createdAt: true,
            revokedAt: true,
          },
        },
      },
    })

    if (!record || record.message.revokedAt) {
      return createApiErrorResponse(request, ApiErrorKeys.dashboard.messages.failedToFetchSingle, {
        status: 404,
      })
    }

    return NextResponse.json({
      id: record.message.id,
      title: record.message.title,
      content: record.message.content,
      createdAt: record.message.createdAt,
      readAt: record.readAt,
    })
  } catch (error) {
    console.error("Get dashboard message API error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.dashboard.messages.failedToFetchSingle, {
      status: 500,
    })
  }
}
