import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { isAdmin, isSuperAdmin } from "@/lib/auth/permissions"
import { z } from "zod"
import { writeAuditLog } from "@/lib/audit"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

const updatePostSchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "PENDING", "REJECTED"]),
})

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    if (!isAdmin(user.role)) {
      return createApiErrorResponse(request, ApiErrorKeys.general.forbidden, { status: 403 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const { id } = await context.params

    const post = await db.post.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        views: true,
        author: {
          select: {
            name: true,
            email: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!post) {
      return createApiErrorResponse(request, ApiErrorKeys.admin.posts.postNotFound, { status: 404 })
    }

    return NextResponse.json(post)
  } catch (error) {
    console.error("Get post API error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.admin.posts.failedToFetch, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    // 文章审核 ADMIN 可用
    if (!isAdmin(user.role)) {
      return createApiErrorResponse(request, ApiErrorKeys.general.forbidden, { status: 403 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const { id } = await context.params
    const body = await request.json()
    const { status } = updatePostSchema.parse(body)

    const before = await db.post.findUnique({ where: { id } })

    const updatedPost = await db.post.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        views: true,
        author: {
          select: {
            name: true,
            email: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    })

    await writeAuditLog(db, {
      action: "POST_STATUS_UPDATE",
      entityType: "POST",
      entityId: id,
      actor: user,
      before,
      after: updatedPost,
      metadata: { status },
      request,
    })

    return NextResponse.json(updatedPost)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(request, ApiErrorKeys.general.invalid, {
        status: 400,
        meta: { detail: error.errors[0].message },
      })
    }
    console.error("Update post API error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.admin.posts.failedToUpdate, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    // 删除文章仅限超级管理员
    if (!isSuperAdmin(user.role)) {
      return createApiErrorResponse(request, ApiErrorKeys.general.forbidden, { status: 403 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const { id } = await context.params

    const before = await db.post.findUnique({ where: { id } })

    await db.post.delete({ where: { id } })

    await writeAuditLog(db, {
      action: "POST_DELETE",
      entityType: "POST",
      entityId: id,
      actor: user,
      before,
      after: null,
      request,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete post API error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.admin.posts.failedToDelete, { status: 500 })
  }
}
