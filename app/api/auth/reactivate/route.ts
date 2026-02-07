import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { writeAuditLog } from "@/lib/audit"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return createApiErrorResponse(request, "apiErrors.auth.reactivate.invalidToken", {
        status: 400,
      })
    }

    if (!db) {
      return createApiErrorResponse(request, "apiErrors.auth.reactivate.serviceUnavailable", {
        status: 503,
      })
    }

    const user = await db.user.findUnique({
      where: { reactivationToken: token },
    })

    if (!user) {
      return createApiErrorResponse(request, "apiErrors.auth.reactivate.userNotFound", {
        status: 404,
      })
    }

    if (!user.reactivationTokenExpiry || user.reactivationTokenExpiry < new Date()) {
      return createApiErrorResponse(request, "apiErrors.auth.reactivate.tokenExpired", {
        status: 400,
      })
    }

    const before = { ...user }

    const reactivatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        status: "ACTIVE",
        reactivationToken: null,
        reactivationTokenExpiry: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    })

    await writeAuditLog(db, {
      action: "USER_REACTIVATE",
      entityType: "USER",
      entityId: user.id,
      before,
      after: reactivatedUser,
      request,
    })

    return NextResponse.json({
      success: true,
      message: "Account reactivated successfully",
    })
  } catch (error) {
    console.error("Reactivate user API error:", error)
    return createApiErrorResponse(request, "apiErrors.auth.reactivate.serviceUnavailable", {
      status: 500,
    })
  }
}
