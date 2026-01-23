import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { writeAuditLog } from "@/lib/audit"
import { allowedEmailDomains as defaultEmailDomains } from "@/lib/pre-application/constants"

const systemConfigSchema = z.object({
  preApplicationEssayHint: z.string().min(10).max(500),
  allowedEmailDomains: z.array(z.string().regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)).min(1),
  auditLogEnabled: z.boolean().optional(),
})

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const settings = await db.siteSettings.findUnique({
      where: { id: "global" },
      select: {
        preApplicationEssayHint: true,
        allowedEmailDomains: true,
        auditLogEnabled: true,
      },
    })

    if (!settings) {
      return NextResponse.json({
        preApplicationEssayHint: "建议 100 字左右,避免夸赞社区与版主,只说明你的目的与需求。",
        allowedEmailDomains: defaultEmailDomains,
        auditLogEnabled: false,
      })
    }

    return NextResponse.json({
      preApplicationEssayHint: settings.preApplicationEssayHint,
      allowedEmailDomains: Array.isArray(settings.allowedEmailDomains)
        ? settings.allowedEmailDomains
        : defaultEmailDomains,
      auditLogEnabled: settings.auditLogEnabled ?? false,
    })
  } catch (error) {
    console.error("System config fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch system config" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const body = await request.json()
    const data = systemConfigSchema.parse(body)

    const before = await db.siteSettings.findUnique({
      where: { id: "global" },
    })

    const updated = await db.siteSettings.upsert({
      where: { id: "global" },
      create: {
        id: "global",
        siteName: "linux.do 预申请系统",
        siteDescription: "linux.do 社区预申请与邀请码管理系统",
        contactEmail: "admin@example.com",
        preApplicationEssayHint: data.preApplicationEssayHint,
        allowedEmailDomains: data.allowedEmailDomains,
        auditLogEnabled: data.auditLogEnabled ?? false,
      },
      update: {
        preApplicationEssayHint: data.preApplicationEssayHint,
        allowedEmailDomains: data.allowedEmailDomains,
        ...(data.auditLogEnabled !== undefined && { auditLogEnabled: data.auditLogEnabled }),
      },
    })

    await writeAuditLog(db, {
      action: "SYSTEM_CONFIG_UPDATE",
      entityType: "SITE_SETTINGS",
      entityId: "global",
      actor: user,
      before,
      after: updated,
      metadata: { fields: ["preApplicationEssayHint", "allowedEmailDomains", "auditLogEnabled"] },
      request,
    })

    return NextResponse.json({
      preApplicationEssayHint: updated.preApplicationEssayHint,
      allowedEmailDomains: updated.allowedEmailDomains,
      auditLogEnabled: updated.auditLogEnabled,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("System config update error:", error)
    return NextResponse.json({ error: "Failed to update system config" }, { status: 500 })
  }
}
