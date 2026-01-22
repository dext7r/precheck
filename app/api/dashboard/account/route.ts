import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { deleteSession, getCurrentUser } from "@/lib/auth/session"
import { writeAuditLog } from "@/lib/audit"

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }

  try {
    const before = await db.user.findUnique({ where: { id: user.id } })

    await db.user.delete({
      where: { id: user.id },
    })

    await writeAuditLog(db, {
      action: "USER_SELF_DELETE",
      entityType: "USER",
      entityId: user.id,
      actor: user,
      before,
      after: null,
      request,
    })

    await deleteSession()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete account API error:", error)
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
  }
}
