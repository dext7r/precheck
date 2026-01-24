import { type NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth/session"
import { locales } from "@/lib/i18n/config"
import { writeAuditLog } from "@/lib/audit"
import { db } from "@/lib/db"
import { createApiErrorResponse } from "@/lib/api/error-response"

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return createApiErrorResponse(request, "apiErrors.general.notAuthenticated", { status: 401 })
  }
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return createApiErrorResponse(request, "apiErrors.general.forbidden", { status: 403 })
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
    return createApiErrorResponse(request, "apiErrors.admin.clearCache.failed", {
      status: 500,
    })
  }
}
