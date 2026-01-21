import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
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
    return NextResponse.json({ error: "Failed to fetch summary" }, { status: 500 })
  }
}
