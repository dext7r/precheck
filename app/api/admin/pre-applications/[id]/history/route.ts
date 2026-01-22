import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
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

    // 获取预申请的版本历史
    const versions = await db.preApplicationVersion.findMany({
      where: { preApplicationId: id },
      orderBy: { version: "desc" },
      include: {
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({ records: versions })
  } catch (error) {
    console.error("Admin pre-application history error:", error)
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 })
  }
}
