import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { writeAuditLog } from "@/lib/audit"

const profileSchema = z.object({
  name: z.string().max(80, "Name is too long").optional(),
  avatar: z.string().url("Invalid avatar URL").optional().or(z.literal("")),
})

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }

  try {
    const body = await request.json()
    const { name, avatar } = profileSchema.parse(body)
    const trimmedName = name?.trim()
    const trimmedAvatar = avatar?.trim()

    const before = await db.user.findUnique({ where: { id: user.id } })

    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        ...(name !== undefined && { name: trimmedName || null }),
        ...(avatar !== undefined && { avatar: trimmedAvatar || null }),
      },
      select: {
        name: true,
        email: true,
        avatar: true,
      },
    })

    await writeAuditLog(db, {
      action: "USER_PROFILE_UPDATE",
      entityType: "USER",
      entityId: user.id,
      actor: user,
      before,
      after: updated,
      metadata: { payload: { name: trimmedName, avatar: trimmedAvatar } },
      request,
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Update profile API error:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
