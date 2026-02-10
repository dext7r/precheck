import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUser } from "@/lib/auth/session"
import { isAdmin, isSuperAdmin } from "@/lib/auth/permissions"
import { getSiteSettings, updateSiteSettings } from "@/lib/site-settings"
import { batchPromoteLinuxDoAdmins } from "@/lib/auth/oauth"
import { db } from "@/lib/db"
import { writeAuditLog } from "@/lib/audit"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

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
    analyticsEnabled: z.boolean(),
    linuxdoAutoAdmin: z.boolean(),
  })
  .partial()

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
  }
  // 设置查看需要管理员权限
  if (!isAdmin(user.role)) {
    return createApiErrorResponse(request, ApiErrorKeys.general.forbidden, { status: 403 })
  }

  try {
    const settings = await getSiteSettings()
    return NextResponse.json(settings)
  } catch (error) {
    console.error("Failed to load site settings:", error)
    return createApiErrorResponse(request, ApiErrorKeys.admin.settings.failedToLoad, {
      status: 500,
    })
  }
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
  }
  // 设置修改仅限超级管理员
  if (!isSuperAdmin(user.role)) {
    return createApiErrorResponse(request, ApiErrorKeys.general.forbidden, { status: 403 })
  }

  try {
    const body = await request.json()
    const updates = settingsSchema.parse(body)
    const before = await getSiteSettings()
    const settings = await updateSiteSettings(updates)

    if (db) {
      await writeAuditLog(db, {
        action: "SETTINGS_UPDATE",
        entityType: "SITE_SETTINGS",
        entityId: "global",
        actor: user,
        before,
        after: settings,
        metadata: { payload: updates },
        request,
      })
    }

    // 开关从 off→on 时，批量提升已存储的 LinuxDo TL>=3 用户
    if (updates.linuxdoAutoAdmin && !before.linuxdoAutoAdmin) {
      const promoted = await batchPromoteLinuxDoAdmins(user)
      return NextResponse.json({ ...settings, _batchPromoted: promoted })
    }

    return NextResponse.json(settings)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(request, ApiErrorKeys.general.invalid, {
        status: 400,
        meta: { detail: error.errors[0].message },
      })
    }
    console.error("Failed to update site settings:", error)
    return createApiErrorResponse(request, ApiErrorKeys.admin.settings.failedToUpdate, {
      status: 500,
    })
  }
}
