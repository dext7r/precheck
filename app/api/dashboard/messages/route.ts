import { type NextRequest, NextResponse } from "next/server"
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

    const { searchParams } = request.nextUrl
    const page = Number.parseInt(searchParams.get("page") || "1")
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "20")
    const skip = (page - 1) * pageSize

    const where = {
      userId: user.id,
      message: { revokedAt: null },
    }

    const [records, total] = await Promise.all([
      db.messageRecipient.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { message: { createdAt: "desc" } },
        include: {
          message: {
            select: {
              id: true,
              title: true,
              createdAt: true,
            },
          },
        },
      }),
      db.messageRecipient.count({ where }),
    ])

    const messages = records.map((record) => ({
      id: record.message.id,
      title: record.message.title,
      createdAt: record.message.createdAt,
      readAt: record.readAt,
    }))

    return NextResponse.json({ messages, total, page, pageSize })
  } catch (error) {
    console.error("Dashboard messages API error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.dashboard.messages.failedToFetch, {
      status: 500,
    })
  }
}
