import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { isAdmin } from "@/lib/auth/permissions"
import {
  generateApiToken,
  hashToken,
  extractTokenPrefix,
  MAX_TOKENS_PER_USER,
} from "@/lib/auth/api-token"
import { writeAuditLog } from "@/lib/audit"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

const createTokenSchema = z.object({
  name: z.string().min(1).max(50),
  expiresAt: z.string().datetime().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !isAdmin(user.role)) {
      return createApiErrorResponse(request, ApiErrorKeys.general.forbidden, { status: 403 })
    }
    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const tokens = await db.apiToken.findMany({
      where: { userId: user.id, revokedAt: null },
      select: {
        id: true,
        name: true,
        prefix: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ tokens })
  } catch {
    return createApiErrorResponse(request, ApiErrorKeys.admin.apiTokens.failedToFetch, {
      status: 500,
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !isAdmin(user.role)) {
      return createApiErrorResponse(request, ApiErrorKeys.general.forbidden, { status: 403 })
    }
    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const body = await request.json()
    const data = createTokenSchema.parse(body)

    const count = await db.apiToken.count({
      where: { userId: user.id, revokedAt: null },
    })
    if (count >= MAX_TOKENS_PER_USER) {
      return createApiErrorResponse(request, ApiErrorKeys.admin.apiTokens.maxTokensReached, {
        status: 400,
      })
    }

    const plainToken = generateApiToken()
    const tokenHash = hashToken(plainToken)
    const prefix = extractTokenPrefix(plainToken)

    const record = await db.apiToken.create({
      data: {
        name: data.name,
        tokenHash,
        prefix,
        userId: user.id,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    })

    await writeAuditLog(db, {
      action: "API_TOKEN_CREATE",
      entityType: "API_TOKEN",
      entityId: record.id,
      actor: user,
      after: { name: data.name, prefix },
      request,
    })

    return NextResponse.json({
      id: record.id,
      name: record.name,
      prefix: record.prefix,
      token: plainToken,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(request, ApiErrorKeys.general.invalid, {
        status: 400,
        meta: { errors: error.errors },
      })
    }
    return createApiErrorResponse(request, ApiErrorKeys.admin.apiTokens.failedToCreate, {
      status: 500,
    })
  }
}
