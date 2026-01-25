import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { isAdmin, isSuperAdmin } from "@/lib/auth/permissions"
import { writeAuditLog } from "@/lib/audit"
import {
  allowedEmailDomains as defaultEmailDomains,
  defaultQQGroups,
} from "@/lib/pre-application/constants"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

// QQ 群配置 schema
const qqGroupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  number: z.string().min(5),
  url: z.string().url(),
  enabled: z.boolean(),
})

const systemConfigSchema = z.object({
  preApplicationEssayHint: z.string().min(10).max(500),
  allowedEmailDomains: z.array(z.string().regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)).min(1),
  auditLogEnabled: z.boolean().optional(),
  reviewTemplatesApprove: z.array(z.string()).optional(),
  reviewTemplatesReject: z.array(z.string()).optional(),
  reviewTemplatesDispute: z.array(z.string()).optional(),
  // QQ 群配置
  qqGroups: z.array(qqGroupSchema).optional(),
  // 邮件配置
  emailProvider: z.enum(["env", "api", "smtp"]).optional(),
  selectedEmailApiConfigId: z.string().optional().nullable(),
  smtpHost: z.string().optional().nullable(),
  smtpPort: z.number().int().min(1).max(65535).optional().nullable(),
  smtpUser: z.string().optional().nullable(),
  smtpPass: z.string().optional().nullable(),
  smtpSecure: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    // 系统配置查看需要管理员权限
    if (!user || !isAdmin(user.role)) {
      return createApiErrorResponse(request, ApiErrorKeys.general.forbidden, { status: 403 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const settings = await db.siteSettings.findUnique({
      where: { id: "global" },
      select: {
        preApplicationEssayHint: true,
        allowedEmailDomains: true,
        auditLogEnabled: true,
        reviewTemplatesApprove: true,
        reviewTemplatesReject: true,
        reviewTemplatesDispute: true,
        qqGroups: true,
        emailProvider: true,
        selectedEmailApiConfigId: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpPass: true,
        smtpSecure: true,
      },
    })

    if (!settings) {
      return NextResponse.json({
        preApplicationEssayHint: "建议 100 字左右,避免夸赞社区与版主,只说明你的目的与需求。",
        allowedEmailDomains: defaultEmailDomains,
        auditLogEnabled: false,
        reviewTemplatesApprove: [],
        reviewTemplatesReject: [],
        reviewTemplatesDispute: [],
        qqGroups: defaultQQGroups,
        emailProvider: "env",
        selectedEmailApiConfigId: null,
        smtpHost: null,
        smtpPort: null,
        smtpUser: null,
        smtpPass: null,
        smtpSecure: false,
      })
    }

    return NextResponse.json({
      preApplicationEssayHint: settings.preApplicationEssayHint,
      allowedEmailDomains: Array.isArray(settings.allowedEmailDomains)
        ? settings.allowedEmailDomains
        : defaultEmailDomains,
      auditLogEnabled: settings.auditLogEnabled ?? false,
      reviewTemplatesApprove: Array.isArray(settings.reviewTemplatesApprove)
        ? settings.reviewTemplatesApprove
        : [],
      reviewTemplatesReject: Array.isArray(settings.reviewTemplatesReject)
        ? settings.reviewTemplatesReject
        : [],
      reviewTemplatesDispute: Array.isArray(settings.reviewTemplatesDispute)
        ? settings.reviewTemplatesDispute
        : [],
      qqGroups: Array.isArray(settings.qqGroups) ? settings.qqGroups : defaultQQGroups,
      emailProvider: settings.emailProvider ?? "env",
      selectedEmailApiConfigId: settings.selectedEmailApiConfigId,
      smtpHost: settings.smtpHost,
      smtpPort: settings.smtpPort,
      smtpUser: settings.smtpUser,
      smtpPass: settings.smtpPass,
      smtpSecure: settings.smtpSecure ?? false,
    })
  } catch (error) {
    console.error("System config fetch error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.admin.systemConfig.failedToFetch, {
      status: 500,
    })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    // 系统配置修改仅限超级管理员
    if (!user || !isSuperAdmin(user.role)) {
      return createApiErrorResponse(request, ApiErrorKeys.general.forbidden, { status: 403 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
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
        reviewTemplatesApprove: data.reviewTemplatesApprove ?? [],
        reviewTemplatesReject: data.reviewTemplatesReject ?? [],
        reviewTemplatesDispute: data.reviewTemplatesDispute ?? [],
        qqGroups: data.qqGroups ?? defaultQQGroups,
        emailProvider: data.emailProvider ?? "env",
        selectedEmailApiConfigId: data.selectedEmailApiConfigId ?? null,
        smtpHost: data.smtpHost ?? null,
        smtpPort: data.smtpPort ?? null,
        smtpUser: data.smtpUser ?? null,
        smtpPass: data.smtpPass ?? null,
        smtpSecure: data.smtpSecure ?? false,
      },
      update: {
        preApplicationEssayHint: data.preApplicationEssayHint,
        allowedEmailDomains: data.allowedEmailDomains,
        ...(data.auditLogEnabled !== undefined && { auditLogEnabled: data.auditLogEnabled }),
        ...(data.reviewTemplatesApprove !== undefined && {
          reviewTemplatesApprove: data.reviewTemplatesApprove,
        }),
        ...(data.reviewTemplatesReject !== undefined && {
          reviewTemplatesReject: data.reviewTemplatesReject,
        }),
        ...(data.reviewTemplatesDispute !== undefined && {
          reviewTemplatesDispute: data.reviewTemplatesDispute,
        }),
        ...(data.qqGroups !== undefined && { qqGroups: data.qqGroups }),
        ...(data.emailProvider !== undefined && { emailProvider: data.emailProvider }),
        ...(data.selectedEmailApiConfigId !== undefined && {
          selectedEmailApiConfigId: data.selectedEmailApiConfigId,
        }),
        ...(data.smtpHost !== undefined && { smtpHost: data.smtpHost }),
        ...(data.smtpPort !== undefined && { smtpPort: data.smtpPort }),
        ...(data.smtpUser !== undefined && { smtpUser: data.smtpUser }),
        ...(data.smtpPass !== undefined && { smtpPass: data.smtpPass }),
        ...(data.smtpSecure !== undefined && { smtpSecure: data.smtpSecure }),
      },
    })

    await writeAuditLog(db, {
      action: "SYSTEM_CONFIG_UPDATE",
      entityType: "SITE_SETTINGS",
      entityId: "global",
      actor: user,
      before,
      after: updated,
      metadata: {
        fields: [
          "preApplicationEssayHint",
          "allowedEmailDomains",
          "auditLogEnabled",
          "reviewTemplatesApprove",
          "reviewTemplatesReject",
          "reviewTemplatesDispute",
          "qqGroups",
          "emailProvider",
          "selectedEmailApiConfigId",
          "smtpHost",
          "smtpPort",
          "smtpUser",
          "smtpSecure",
        ],
      },
      request,
    })

    return NextResponse.json({
      preApplicationEssayHint: updated.preApplicationEssayHint,
      allowedEmailDomains: updated.allowedEmailDomains,
      auditLogEnabled: updated.auditLogEnabled,
      reviewTemplatesApprove: updated.reviewTemplatesApprove,
      reviewTemplatesReject: updated.reviewTemplatesReject,
      reviewTemplatesDispute: updated.reviewTemplatesDispute,
      qqGroups: updated.qqGroups,
      emailProvider: updated.emailProvider,
      selectedEmailApiConfigId: updated.selectedEmailApiConfigId,
      smtpHost: updated.smtpHost,
      smtpPort: updated.smtpPort,
      smtpUser: updated.smtpUser,
      smtpPass: updated.smtpPass,
      smtpSecure: updated.smtpSecure,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(request, ApiErrorKeys.general.invalid, {
        status: 400,
        meta: { detail: error.errors[0].message },
      })
    }
    console.error("System config update error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.admin.systemConfig.failedToUpdate, {
      status: 500,
    })
  }
}
