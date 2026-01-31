import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"
import { calculateSimilarity, quickSimilarityCheck } from "@/lib/text-similarity"
import { compareSimilarityWithAI, isCloudflareAIConfigured } from "@/lib/cloudflare-ai"

interface DuplicateRecord {
  id: string
  similarity: number
  essay: string
  user: { name: string | null; email: string } | null
  registerEmail: string
  createdAt: Date
  status: string
  aiReason?: string
}

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

    const { id } = await context.params

    const currentRecord = await db.preApplication.findUnique({
      where: { id },
      select: {
        id: true,
        essay: true,
      },
    })

    if (!currentRecord) {
      return createApiErrorResponse(request, ApiErrorKeys.general.notFound, { status: 404 })
    }

    // 获取所有其他预申请记录
    const otherRecords = await db.preApplication.findMany({
      where: {
        id: { not: id },
      },
      select: {
        id: true,
        essay: true,
        createdAt: true,
        status: true,
        registerEmail: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 500, // 限制检索数量
    })

    // Step 1: 文本相似度快速筛选（Jaccard > 30%）
    const candidates: Array<{
      record: (typeof otherRecords)[0]
      textSimilarity: number
    }> = []

    for (const record of otherRecords) {
      if (quickSimilarityCheck(currentRecord.essay, record.essay, 25)) {
        const textSimilarity = calculateSimilarity(currentRecord.essay, record.essay)
        if (textSimilarity >= 30) {
          candidates.push({ record, textSimilarity })
        }
      }
    }

    // 按文本相似度排序，取前 10 个
    candidates.sort((a, b) => b.textSimilarity - a.textSimilarity)
    const topCandidates = candidates.slice(0, 10)

    // Step 2: AI 语义比对（如果配置了 Cloudflare AI）
    const duplicates: DuplicateRecord[] = []
    const useAI = isCloudflareAIConfigured()

    for (const { record, textSimilarity } of topCandidates) {
      let finalSimilarity = textSimilarity
      let aiReason: string | undefined

      if (useAI && textSimilarity >= 40) {
        try {
          const aiResult = await compareSimilarityWithAI(currentRecord.essay, record.essay)
          // 综合文本相似度（40%）和 AI 语义相似度（60%）
          finalSimilarity = textSimilarity * 0.4 + aiResult.similarity * 0.6
          aiReason = aiResult.reason
        } catch (error) {
          console.error("AI similarity check failed:", error)
          // AI 失败时使用纯文本相似度
        }
      }

      if (finalSimilarity >= 35) {
        duplicates.push({
          id: record.id,
          similarity: Math.round(finalSimilarity),
          essay: record.essay,
          user: record.user,
          registerEmail: record.registerEmail,
          createdAt: record.createdAt,
          status: record.status,
          aiReason,
        })
      }
    }

    // 按最终相似度排序
    duplicates.sort((a, b) => b.similarity - a.similarity)

    return NextResponse.json({
      hasDuplicates: duplicates.length > 0,
      records: duplicates.slice(0, 5), // 最多返回 5 条
      totalCandidates: candidates.length,
      aiEnabled: useAI,
    })
  } catch (error) {
    console.error("Duplicate check error:", error)
    return createApiErrorResponse(
      request,
      ApiErrorKeys.admin.preApplications.duplicateCheckFailed,
      { status: 500 },
    )
  }
}
