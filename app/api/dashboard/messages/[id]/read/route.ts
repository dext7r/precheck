import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const { id } = await context.params

    await db.messageRecipient.updateMany({
      where: {
        messageId: id,
        userId: user.id,
        readAt: null,
        message: { revokedAt: null },
      },
      data: { readAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Read message API error:", error)
    return NextResponse.json({ error: "Failed to mark message as read" }, { status: 500 })
  }
}
