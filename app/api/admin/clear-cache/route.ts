import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth/session"
import { locales } from "@/lib/i18n/config"

export async function POST() {
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to clear cache:", error)
    return NextResponse.json({ error: "Failed to clear cache" }, { status: 500 })
  }
}
