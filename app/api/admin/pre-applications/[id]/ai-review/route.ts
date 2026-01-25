import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"
import { reviewEssayWithAI, isCloudflareAIConfigured } from "@/lib/cloudflare-ai"

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    if (!isCloudflareAIConfigured()) {
      return createApiErrorResponse(request, ApiErrorKeys.admin.preApplications.aiNotConfigured, {
        status: 503,
      })
    }

    const { id } = await context.params

    const record = await db.preApplication.findUnique({
      where: { id },
      select: {
        id: true,
        essay: true,
      },
    })

    if (!record) {
      return createApiErrorResponse(request, ApiErrorKeys.general.notFound, { status: 404 })
    }

    const result = await reviewEssayWithAI(record.essay)

    return NextResponse.json(result)
  } catch (error) {
    console.error("AI review error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.admin.preApplications.aiReviewFailed, {
      status: 500,
    })
  }
}
