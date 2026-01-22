import type { NextRequest } from "next/server"

type AuditClient = {
  auditLog: {
    create: (args: {
      data: Record<string, unknown>
    }) => Promise<unknown>
  }
}

type AuditActor = {
  id?: string | null
  name?: string | null
  email?: string | null
  role?: string | null
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

const getHeader = (request: Request | NextRequest, key: string) =>
  request.headers.get(key) || ""

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

const toSnapshot = (value: unknown) => {
  if (value === undefined) return null
  try {
    return JSON.parse(JSON.stringify(value))
  } catch (error) {
    console.error("Audit snapshot serialization error:", error)
    return null
  }
}

export async function writeAuditLog(client: AuditClient, input: AuditInput) {
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
      actorRole: (actor.role as string | undefined) ?? null,
      ip,
      userAgent,
      before: toSnapshot(input.before),
      after: toSnapshot(input.after),
      metadata: toSnapshot(input.metadata),
    },
  })
}
