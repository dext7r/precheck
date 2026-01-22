import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { writeAuditLog } from "@/lib/audit"

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const { id } = await context.params
    const message = await db.message.findUnique({
      where: { id },
    })

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    if (message.revokedAt) {
      return NextResponse.json({ error: "Message already revoked" }, { status: 400 })
    }

    const updated = await db.message.update({
      where: { id },
      data: { revokedAt: new Date(), revokedById: user.id },
    })

    await writeAuditLog(db, {
      action: "MESSAGE_REVOKE",
      entityType: "MESSAGE",
      entityId: id,
      actor: user,
      before: message,
      after: updated,
      request,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Revoke message API error:", error)
    return NextResponse.json({ error: "Failed to revoke message" }, { status: 500 })
  }
}
