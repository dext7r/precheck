import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { isSuperAdmin } from "@/lib/auth/permissions"
import { sendEmail } from "@/lib/email/mailer"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

const resendSchema = z.object({
  ids: z.array(z.string()).min(1).max(50),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    // 邮件重发仅限超级管理员
    if (!user || !isSuperAdmin(user.role)) {
      return createApiErrorResponse(request, ApiErrorKeys.general.forbidden, { status: 403 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const body = await request.json()
    const { ids } = resendSchema.parse(body)

    const logs = await db.emailLog.findMany({
      where: { id: { in: ids } },
    })

    if (logs.length === 0) {
      return createApiErrorResponse(request, ApiErrorKeys.general.notFound, { status: 404 })
    }

    const results: { id: string; success: boolean; error?: string }[] = []

    for (const log of logs) {
      const metadata = log.metadata as Record<string, unknown> | null
      if (!metadata?.html && !metadata?.text) {
        results.push({ id: log.id, success: false, error: "No email content" })
        continue
      }

      try {
        await sendEmail({
          to: log.to,
          subject: log.subject,
          html: metadata.html as string | undefined,
          text: (metadata.text as string) || "",
          from: metadata.from as string | undefined,
          fromName: metadata.fromName as string | undefined,
        })

        // 更新原记录状态和时间
        await db.emailLog.update({
          where: { id: log.id },
          data: {
            status: "SUCCESS",
            errorMessage: null,
            createdAt: new Date(),
          },
        })

        results.push({ id: log.id, success: true })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)

        // 更新原记录状态
        await db.emailLog.update({
          where: { id: log.id },
          data: {
            status: "FAILED",
            errorMessage,
            createdAt: new Date(),
          },
        })

        results.push({ id: log.id, success: false, error: errorMessage })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failedCount = results.filter((r) => !r.success).length

    return NextResponse.json({
      success: true,
      results,
      summary: { total: results.length, success: successCount, failed: failedCount },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(request, ApiErrorKeys.general.invalid, {
        status: 400,
        meta: { detail: error.errors[0].message },
      })
    }
    console.error("Email resend error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.general.failed, { status: 500 })
  }
}
