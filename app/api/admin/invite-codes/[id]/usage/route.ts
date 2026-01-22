import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { writeAuditLog } from "@/lib/audit"

const usageSchema = z.object({
  used: z.boolean(),
})

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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
    const body = await request.json()
    const data = usageSchema.parse(body)

    const before = await db.inviteCode.findUnique({ where: { id } })

    const record = await db.inviteCode.update({
      where: { id },
      data: data.used
        ? { usedAt: new Date(), usedById: user.id }
        : { usedAt: null, usedById: null },
    })

    await writeAuditLog(db, {
      action: data.used ? "INVITE_CODE_MARK_USED" : "INVITE_CODE_MARK_UNUSED",
      entityType: "INVITE_CODE",
      entityId: record.id,
      actor: user,
      before,
      after: record,
      request,
    })

    return NextResponse.json({ record })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Invite code usage update error:", error)
    return NextResponse.json({ error: "Failed to update invite code usage" }, { status: 500 })
  }
}
