import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { hashPassword, validatePassword, verifyPassword } from "@/lib/auth/password"
import { writeAuditLog } from "@/lib/audit"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

const passwordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Confirm password is required"),
})

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
  }
  if (!db) {
    return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
  }

  try {
    const body = await request.json()
    const { currentPassword, newPassword, confirmPassword } = passwordSchema.parse(body)

    if (newPassword !== confirmPassword) {
      return createApiErrorResponse(request, ApiErrorKeys.dashboard.password.passwordsDoNotMatch, {
        status: 400,
      })
    }

    if (user.password) {
      if (!currentPassword) {
        return createApiErrorResponse(
          request,
          ApiErrorKeys.dashboard.password.currentPasswordRequired,
          { status: 400 },
        )
      }
      const isValid = await verifyPassword(currentPassword, user.password)
      if (!isValid) {
        return createApiErrorResponse(
          request,
          ApiErrorKeys.dashboard.password.invalidCurrentPassword,
          { status: 400 },
        )
      }
    }

    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.valid) {
      return createApiErrorResponse(request, ApiErrorKeys.general.invalid, {
        status: 400,
        meta: { detail: passwordValidation.errors[0] },
      })
    }

    const before = await db.user.findUnique({ where: { id: user.id } })

    const hashedPassword = await hashPassword(newPassword)
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })

    const after = await db.user.findUnique({ where: { id: user.id } })

    await writeAuditLog(db, {
      action: "USER_PASSWORD_UPDATE",
      entityType: "USER",
      entityId: user.id,
      actor: user,
      before,
      after,
      request,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(request, ApiErrorKeys.general.invalid, {
        status: 400,
        meta: { detail: error.errors[0].message },
      })
    }
    console.error("Update password API error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.dashboard.password.failedToUpdate, {
      status: 500,
    })
  }
}
