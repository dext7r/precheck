import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { writeAuditLog } from "@/lib/audit"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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
        message: { select: { revokedAt: true } },
      },
    })

    if (!record || record.message.revokedAt) {
      return createApiErrorResponse(request, ApiErrorKeys.dashboard.messages.failedToFetchSingle, {
        status: 404,
      })
    }

    if (!record.readAt) {
      const readAt = new Date()
      await db.messageRecipient.update({
        where: {
          messageId_userId: {
            messageId: id,
            userId: user.id,
          },
        },
        data: { readAt },
      })

      await writeAuditLog(db, {
        action: "MESSAGE_READ",
        entityType: "MESSAGE_RECIPIENT",
        entityId: `${id}:${user.id}`,
        actor: user,
        before: record,
        after: { ...record, readAt },
        request,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Read message API error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.dashboard.messages.failedToMarkAsRead, {
      status: 500,
    })
  }
}
