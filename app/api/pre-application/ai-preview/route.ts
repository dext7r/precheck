import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"
import { features } from "@/lib/features"
import { reviewEssayWithAI } from "@/lib/cloudflare-ai"

// 用户端 AI 预审接口
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    // 检查 AI 功能是否启用
    if (!features.cloudflareAI) {
      return createApiErrorResponse(request, ApiErrorKeys.preApplication.aiPreviewNotConfigured, {
        status: 503,
      })
    }

    const body = await request.json()
    const { essay } = body

    if (!essay || typeof essay !== "string" || essay.trim().length < 50) {
      return createApiErrorResponse(request, ApiErrorKeys.preApplication.essayTooShort, {
        status: 400,
      })
    }

    // 调用 AI 审核（用户端模式，不返回参考回复）
    const result = await reviewEssayWithAI(essay, { userMode: true })

    return NextResponse.json({ result })
  } catch (error) {
    console.error("AI preview error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.preApplication.aiPreviewFailed, {
      status: 500,
    })
  }
}
