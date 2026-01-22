import { type NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth/session"
import { locales } from "@/lib/i18n/config"
import { writeAuditLog } from "@/lib/audit"
import { db } from "@/lib/db"

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    revalidatePath("/")
    locales.forEach((locale) => {
      revalidatePath(`/${locale}`)
      revalidatePath(`/${locale}/dashboard`)
      revalidatePath(`/${locale}/admin`)
    })

    if (db) {
      await writeAuditLog(db, {
        action: "SYSTEM_CLEAR_CACHE",
        entityType: "SYSTEM",
        entityId: "cache",
        actor: user,
        request,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to clear cache:", error)
    return NextResponse.json({ error: "Failed to clear cache" }, { status: 500 })
  }
}
