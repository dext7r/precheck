import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { isAdmin } from "@/lib/auth/permissions"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

const batchCheckSchema = z.object({
  codes: z.array(z.string()).min(1).max(5),
  // 纯邀请码到原始码的映射，用于更新数据库
  codeMapping: z.record(z.string(), z.string()).optional(),
})

type CheckResult = {
  invite_code: string
  valid: boolean | null
  message: string
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const data = batchCheckSchema.parse(body)

    // 获取系统配置中的检测 API 配置
    const settings = await db.siteSettings.findUnique({
      where: { id: "global" },
      select: {
        inviteCodeCheckApiUrl: true,
        inviteCodeCheckApiKey: true,
      },
    })

    if (!settings?.inviteCodeCheckApiUrl || !settings?.inviteCodeCheckApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "邀请码检测 API 未配置",
        },
        { status: 400 },
      )
    }

    // 调用外部检测 API
    const response = await fetch(settings.inviteCodeCheckApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": settings.inviteCodeCheckApiKey,
      },
      body: JSON.stringify({ invite_codes: data.codes }),
    })

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `检测 API 响应异常: ${response.status}`,
        },
        { status: 502 },
      )
    }

    const result = (await response.json()) as {
      success: boolean
      total: number
      results: CheckResult[]
    }

    // 更新数据库中的检测结果
    const now = new Date()
    for (const checkResult of result.results) {
      // 获取原始码（数据库中的码）
      const originalCode = data.codeMapping?.[checkResult.invite_code] || checkResult.invite_code
      await db.inviteCode.updateMany({
        where: { code: originalCode },
        data: {
          checkValid: checkResult.valid,
          checkMessage: checkResult.message,
          checkedAt: now,
        },
      })
    }

    return NextResponse.json({
      success: result.success,
      total: result.total,
      results: result.results,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(request, ApiErrorKeys.general.invalid, {
        status: 400,
        meta: { detail: error.errors[0].message },
      })
    }
    console.error("Batch check error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "检测失败",
      },
      { status: 500 },
    )
  }
}
