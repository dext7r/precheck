import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"

export async function POST() {
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

  try {
    await db.$transaction([
      db.post.deleteMany(),
      db.siteSettings.deleteMany(),
      db.session.deleteMany(),
      db.account.deleteMany(),
      db.user.deleteMany({ where: { role: { not: "ADMIN" } } }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to reset database:", error)
    return NextResponse.json({ error: "Failed to reset database" }, { status: 500 })
  }
}
