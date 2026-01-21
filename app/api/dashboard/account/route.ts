import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { deleteSession, getCurrentUser } from "@/lib/auth/session"

export async function DELETE() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }

  try {
    await db.user.delete({
      where: { id: user.id },
    })
    await deleteSession()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete account API error:", error)
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
  }
}
