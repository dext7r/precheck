import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { writeAuditLog } from "@/lib/audit"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

const updateMessageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
})

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return createApiErrorResponse(request, ApiErrorKeys.general.forbidden, { status: 403 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const { id } = await context.params
    const message = await db.message.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        revokedAt: true,
      },
    })

    if (!message) {
      return createApiErrorResponse(request, ApiErrorKeys.admin.messages.messageNotFound, {
        status: 404,
      })
    }

    return NextResponse.json(message)
  } catch (error) {
    console.error("Get message API error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.admin.messages.failedToFetchSingle, {
      status: 500,
    })
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return createApiErrorResponse(request, ApiErrorKeys.general.forbidden, { status: 403 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const { id } = await context.params
    const body = await request.json()
    const data = updateMessageSchema.parse(body)

    const existing = await db.message.findUnique({
      where: { id },
    })

    if (!existing) {
      return createApiErrorResponse(request, ApiErrorKeys.admin.messages.messageNotFound, {
        status: 404,
      })
    }

    if (existing.revokedAt) {
      return createApiErrorResponse(request, ApiErrorKeys.admin.messages.alreadyRevoked, {
        status: 400,
      })
    }

    const updated = await db.message.update({
      where: { id },
      data,
      select: {
        id: true,
        title: true,
        content: true,
        updatedAt: true,
      },
    })

    await writeAuditLog(db, {
      action: "MESSAGE_UPDATE",
      entityType: "MESSAGE",
      entityId: id,
      actor: user,
      before: existing,
      after: updated,
      metadata: { payload: data },
      request,
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(request, ApiErrorKeys.general.invalid, {
        status: 400,
        meta: { detail: error.errors[0].message },
      })
    }
    console.error("Update message API error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.admin.messages.failedToUpdate, {
      status: 500,
    })
  }
}
