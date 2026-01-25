import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { isSuperAdmin } from "@/lib/auth/permissions"
import { hashPassword } from "@/lib/auth/password"
import { writeAuditLog } from "@/lib/audit"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

const DEFAULT_PASSWORD = "Precheck123!"

const batchCreateSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(100),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    if (!isSuperAdmin(user.role)) {
      return createApiErrorResponse(request, ApiErrorKeys.general.forbidden, { status: 403 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const body = await request.json()
    const { emails } = batchCreateSchema.parse(body)

    const hashedPassword = await hashPassword(DEFAULT_PASSWORD)
    const uniqueEmails = [...new Set(emails.map((e) => e.toLowerCase().trim()))]

    let created = 0
    let skipped = 0
    const createdUsers: Array<{ id: string; email: string }> = []

    for (const email of uniqueEmails) {
      const existing = await db.user.findUnique({ where: { email } })
      if (existing) {
        skipped++
        continue
      }

      const newUser = await db.user.create({
        data: {
          email,
          password: hashedPassword,
          role: "USER",
          status: "ACTIVE",
        },
      })

      await writeAuditLog(db, {
        action: "USER_CREATE_BY_ADMIN",
        entityType: "USER",
        entityId: newUser.id,
        actor: user,
        after: newUser,
        request,
      })

      createdUsers.push({ id: newUser.id, email: newUser.email })
      created++
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      users: createdUsers,
      defaultPassword: DEFAULT_PASSWORD,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(request, ApiErrorKeys.general.invalid, {
        status: 400,
        meta: { detail: error.errors[0].message },
      })
    }
    console.error("Batch create users error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.general.failed, { status: 500 })
  }
}
