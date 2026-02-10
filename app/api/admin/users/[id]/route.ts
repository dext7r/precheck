import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { isSuperAdmin } from "@/lib/auth/permissions"
import { z } from "zod"
import { writeAuditLog } from "@/lib/audit"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

const updateUserSchema = z.object({
  role: z.enum(["USER", "ADMIN", "SUPER_ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "BANNED"]).optional(),
})

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    // 用户管理仅限超级管理员
    if (!isSuperAdmin(user.role)) {
      return createApiErrorResponse(request, ApiErrorKeys.general.forbidden, { status: 403 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const { id } = await context.params

    const targetUser = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!targetUser) {
      return createApiErrorResponse(request, ApiErrorKeys.admin.users.userNotFound, { status: 404 })
    }

    return NextResponse.json(targetUser)
  } catch (error) {
    console.error("Get user API error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.admin.users.failedToFetch, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    // 用户管理仅限超级管理员
    if (!isSuperAdmin(user.role)) {
      return createApiErrorResponse(request, ApiErrorKeys.general.forbidden, { status: 403 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const { id } = await context.params
    const body = await request.json()
    const data = updateUserSchema.parse(body)

    if (Object.keys(data).length === 0) {
      return createApiErrorResponse(request, ApiErrorKeys.admin.users.noFieldsToUpdate, {
        status: 400,
      })
    }

    if (data.role && user.role !== "SUPER_ADMIN") {
      return createApiErrorResponse(
        request,
        ApiErrorKeys.admin.users.onlySuperAdminCanModifyRoles,
        { status: 403 },
      )
    }

    const targetUser = await db.user.findUnique({ where: { id } })
    if (!targetUser) {
      return createApiErrorResponse(request, ApiErrorKeys.admin.users.userNotFound, { status: 404 })
    }

    if (
      user.role === "ADMIN" &&
      (targetUser.role === "ADMIN" || targetUser.role === "SUPER_ADMIN")
    ) {
      return createApiErrorResponse(
        request,
        ApiErrorKeys.admin.users.adminCannotModifyOtherAdmins,
        { status: 403 },
      )
    }

    const before = await db.user.findUnique({ where: { id } })

    const updatedUser = await db.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    await writeAuditLog(db, {
      action: "USER_ADMIN_UPDATE",
      entityType: "USER",
      entityId: id,
      actor: user,
      before,
      after: updatedUser,
      metadata: { payload: data },
      request,
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(request, ApiErrorKeys.general.invalid, {
        status: 400,
        meta: { detail: error.errors[0].message },
      })
    }
    console.error("Update user API error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.admin.users.failedToUpdate, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    // 用户管理仅限超级管理员
    if (!isSuperAdmin(user.role)) {
      return createApiErrorResponse(request, ApiErrorKeys.general.forbidden, { status: 403 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const { id } = await context.params
    const hard = request.nextUrl.searchParams.get("hard") === "true"

    if (id === user.id) {
      return createApiErrorResponse(request, ApiErrorKeys.admin.users.cannotDeleteSelf, {
        status: 400,
      })
    }

    const targetUser = await db.user.findUnique({ where: { id } })
    if (!targetUser) {
      return createApiErrorResponse(request, ApiErrorKeys.admin.users.userNotFound, { status: 404 })
    }

    if (
      user.role === "ADMIN" &&
      (targetUser.role === "ADMIN" || targetUser.role === "SUPER_ADMIN")
    ) {
      return createApiErrorResponse(
        request,
        ApiErrorKeys.admin.users.adminCannotModifyOtherAdmins,
        { status: 403 },
      )
    }

    if (hard) {
      await writeAuditLog(db, {
        action: "USER_ADMIN_HARD_DELETE",
        entityType: "USER",
        entityId: id,
        actor: user,
        before: targetUser,
        metadata: { email: targetUser.email, name: targetUser.name },
        request,
      })
      await db.user.delete({ where: { id } })
      return NextResponse.json({ success: true, hard: true })
    }

    const deletedUser = await db.user.update({
      where: { id },
      data: {
        status: "DELETED",
        reactivationToken: null,
        reactivationTokenExpiry: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    await writeAuditLog(db, {
      action: "USER_ADMIN_DELETE",
      entityType: "USER",
      entityId: id,
      actor: user,
      before: targetUser,
      after: deletedUser,
      request,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete user API error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.admin.users.failedToDelete, { status: 500 })
  }
}
