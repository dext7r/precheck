import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { writeAuditLog } from "@/lib/audit"

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }

  try {
    const [userCount, postCount, messageCount, inviteCount, preAppCount] = await Promise.all([
      db.user.count(),
      db.post.count(),
      db.message.count(),
      db.inviteCode.count(),
      db.preApplication.count(),
    ])

    await db.$transaction([
      db.post.deleteMany(),
      db.siteSettings.deleteMany(),
      db.session.deleteMany(),
      db.account.deleteMany(),
      db.user.deleteMany({ where: { role: { not: "ADMIN" } } }),
    ])

    await writeAuditLog(db, {
      action: "SYSTEM_RESET_DATABASE",
      entityType: "SYSTEM",
      entityId: "database",
      actor: user,
      metadata: {
        counts: {
          users: userCount,
          posts: postCount,
          messages: messageCount,
          inviteCodes: inviteCount,
          preApplications: preAppCount,
        },
      },
      request,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to reset database:", error)
    return NextResponse.json({ error: "Failed to reset database" }, { status: 500 })
  }
}
