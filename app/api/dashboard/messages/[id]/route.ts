import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
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
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
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
    return NextResponse.json({ error: "Failed to fetch message" }, { status: 500 })
  }
}
