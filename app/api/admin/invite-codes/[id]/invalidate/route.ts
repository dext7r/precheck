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
    const before = await db.inviteCode.findUnique({ where: { id } })

    if (!before) {
      return NextResponse.json({ error: "Invite code not found" }, { status: 404 })
    }

    if (before.usedAt) {
      return NextResponse.json({ error: "Invite code already used" }, { status: 400 })
    }

    const updated = await db.inviteCode.update({
      where: { id },
      data: { expiresAt: new Date() },
    })

    await writeAuditLog(db, {
      action: "INVITE_CODE_INVALIDATE",
      entityType: "INVITE_CODE",
      entityId: updated.id,
      actor: user,
      before,
      after: updated,
      request,
    })

    return NextResponse.json({ record: updated })
  } catch (error) {
    console.error("Invite code invalidate error:", error)
    return NextResponse.json({ error: "Failed to invalidate invite code" }, { status: 500 })
  }
}
