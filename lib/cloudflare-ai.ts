// Cloudflare AI 客户端封装

interface CloudflareAIResponse {
  result: {
    response: string
  }
  success: boolean
  errors: Array<{ message: string }>
}

interface AIReviewResult {
  suggestion: "APPROVE" | "REJECT" | "DISPUTE"
  confidence: number
  scores: {
    relevance: number
    authenticity: number
    completeness: number
    expression: number
  }
  referenceReply: string
  reasoning: string
}

interface AISimilarityResult {
  similarity: number
  reason: string
}

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN
const MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8-fast"

export function isCloudflareAIConfigured(): boolean {
  return !!(CLOUDFLARE_ACCOUNT_ID && CLOUDFLARE_API_TOKEN)
}

async function callCloudflareAI(prompt: string): Promise<string> {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    throw new Error("Cloudflare AI not configured")
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${MODEL}`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
    }),
  })

  if (!response.ok) {
    throw new Error(`Cloudflare AI request failed: ${response.status}`)
  }

  const data = (await response.json()) as CloudflareAIResponse

  if (!data.success) {
    throw new Error(data.errors?.[0]?.message || "Cloudflare AI request failed")
  }

  return data.result.response
}

function parseJSONFromResponse<T>(text: string): T {
  // 尝试从响应中提取 JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error("No JSON found in response")
  }
  return JSON.parse(jsonMatch[0]) as T
}

export async function reviewEssayWithAI(essay: string): Promise<AIReviewResult> {
  const prompt = `你是一个社区预申请审核助手。分析以下申请理由，给出审核建议。

申请理由：
"""
${essay}
"""

请以 JSON 格式输出（不要包含任何其他文字，只输出 JSON）：
{
  "suggestion": "APPROVE" 或 "REJECT" 或 "DISPUTE",
  "confidence": 0-100 的置信度数字,
  "scores": {
    "relevance": 0-100 的相关性分数,
    "authenticity": 0-100 的真实性分数,
    "completeness": 0-100 的完整性分数,
    "expression": 0-100 的表达能力分数
  },
  "referenceReply": "给管理员参考的中文回复模板",
  "reasoning": "简要分析理由"
}

评判标准：
- 相关性(relevance)：是否说明了加入社区的目的和需求
- 真实性(authenticity)：内容是否真实可信，不是模板或敷衍
- 完整性(completeness)：信息是否充分，有具体的背景说明
- 表达(expression)：文字表达是否清晰流畅

建议规则：
- 四项分数平均 >= 60 且无单项 < 30：建议 APPROVE
- 四项分数平均 < 40 或任一项 < 20：建议 REJECT
- 其他情况：建议 DISPUTE（需人工复核）`

  const response = await callCloudflareAI(prompt)

  try {
    const result = parseJSONFromResponse<AIReviewResult>(response)

    // 验证并规范化结果
    return {
      suggestion: ["APPROVE", "REJECT", "DISPUTE"].includes(result.suggestion)
        ? result.suggestion
        : "DISPUTE",
      confidence: Math.min(100, Math.max(0, Number(result.confidence) || 50)),
      scores: {
        relevance: Math.min(100, Math.max(0, Number(result.scores?.relevance) || 50)),
        authenticity: Math.min(100, Math.max(0, Number(result.scores?.authenticity) || 50)),
        completeness: Math.min(100, Math.max(0, Number(result.scores?.completeness) || 50)),
        expression: Math.min(100, Math.max(0, Number(result.scores?.expression) || 50)),
      },
      referenceReply: result.referenceReply || "感谢您的申请，我们会尽快处理。",
      reasoning: result.reasoning || "AI 分析完成",
    }
  } catch {
    // JSON 解析失败时返回默认值
    return {
      suggestion: "DISPUTE",
      confidence: 30,
      scores: {
        relevance: 50,
        authenticity: 50,
        completeness: 50,
        expression: 50,
      },
      referenceReply: "感谢您的申请，需要人工复核。",
      reasoning: "AI 分析结果解析失败，建议人工复核",
    }
  }
}

export async function compareSimilarityWithAI(
  essay1: string,
  essay2: string,
): Promise<AISimilarityResult> {
  const prompt = `比较以下两段申请理由的相似程度。

文本A：
"""
${essay1.slice(0, 500)}
"""

文本B：
"""
${essay2.slice(0, 500)}
"""

请以 JSON 格式输出（不要包含任何其他文字，只输出 JSON）：
{
  "similarity": 0-100 的相似度数字,
  "reason": "简要说明相似或不同之处"
}

判断标准：
- 90-100：几乎完全相同，可能是抄袭
- 70-89：高度相似，大量相同内容或结构
- 50-69：中度相似，有明显相同的表述
- 30-49：轻微相似，可能只是话题相近
- 0-29：不相似，是独立撰写的内容`

  const response = await callCloudflareAI(prompt)

  try {
    const result = parseJSONFromResponse<AISimilarityResult>(response)
    return {
      similarity: Math.min(100, Math.max(0, Number(result.similarity) || 0)),
      reason: result.reason || "AI 比对完成",
    }
  } catch {
    return {
      similarity: 0,
      reason: "AI 比对结果解析失败",
    }
  }
}
