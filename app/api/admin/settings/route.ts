import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUser } from "@/lib/auth/session"
import { getSiteSettings, updateSiteSettings } from "@/lib/site-settings"

const settingsSchema = z
  .object({
    siteName: z.string().min(1, "Site name is required").max(100),
    siteDescription: z.string().min(1, "Site description is required").max(200),
    contactEmail: z.string().email("Invalid contact email"),
    userRegistration: z.boolean(),
    oauthLogin: z.boolean(),
    emailNotifications: z.boolean(),
    postModeration: z.boolean(),
    maintenanceMode: z.boolean(),
  })
  .partial()

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const settings = await getSiteSettings()
    return NextResponse.json(settings)
  } catch (error) {
    console.error("Failed to load site settings:", error)
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const updates = settingsSchema.parse(body)
    const settings = await updateSiteSettings(updates)
    return NextResponse.json(settings)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Failed to update site settings:", error)
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
