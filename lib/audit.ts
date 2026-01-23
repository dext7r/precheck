import type { NextRequest } from "next/server"
import type { Role, Prisma } from "@prisma/client"

type AuditClient = {
  auditLog: {
    create: (args: { data: Prisma.AuditLogUncheckedCreateInput }) => Promise<unknown>
  }
}

type AuditActor = {
  id?: string | null
  name?: string | null
  email?: string | null
  role?: Role | string | null
}

export type AuditInput = {
  action: string
  entityType: string
  entityId?: string | null
  actor?: AuditActor | null
  before?: unknown
  after?: unknown
  metadata?: Record<string, unknown>
  request?: Request | NextRequest
}

const getHeader = (request: Request | NextRequest, key: string) => request.headers.get(key) || ""

export const extractRequestMeta = (request?: Request | NextRequest) => {
  if (!request) {
    return { ip: null, userAgent: null }
  }
  const forwardedFor = getHeader(request, "x-forwarded-for")
  const realIp = getHeader(request, "x-real-ip")
  const ip = forwardedFor.split(",")[0]?.trim() || realIp || null
  const userAgent = getHeader(request, "user-agent") || null
  return { ip, userAgent }
}

const toSnapshot = (value: unknown): Prisma.InputJsonValue | undefined => {
  if (value === undefined || value === null) return undefined
  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
  } catch (error) {
    console.error("Audit snapshot serialization error:", error)
    return undefined
  }
}

export async function writeAuditLog(client: AuditClient, input: AuditInput) {
  try {
    // 检查是否启用审计日志
    const settings = await (client as any).siteSettings?.findUnique?.({
      where: { id: "global" },
      select: { auditLogEnabled: true },
    })

    // 默认不记录，除非明确启用
    if (!settings?.auditLogEnabled) {
      return null
    }

    const { ip, userAgent } = extractRequestMeta(input.request)
    const actor = input.actor || {}

    return client.auditLog.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        action: input.action,
        actorId: actor.id ?? null,
        actorName: actor.name ?? null,
        actorEmail: actor.email ?? null,
        actorRole: (actor.role as Role | undefined) ?? null,
        ip,
        userAgent,
        before: toSnapshot(input.before),
        after: toSnapshot(input.after),
        metadata: toSnapshot(input.metadata),
      },
    })
  } catch (error) {
    console.error("Audit log write error:", error)
    return null
  }
}
