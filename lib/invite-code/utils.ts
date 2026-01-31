// 邀请码链接前缀默认值
export const DEFAULT_INVITE_URL_PREFIX = ""

// 匹配邀请码链接的正则表达式
export const INVITE_CODE_PATTERN = /(?:https?:\/\/[^/]+)?\/invites\/([A-Za-z0-9_-]{4,64})/i

// 匹配纯邀请码（4-64位字母数字）
export const PURE_CODE_PATTERN = /^[A-Za-z0-9_-]{4,64}$/

/**
 * 从任意格式的输入中提取纯邀请码
 */
export function extractPureCode(input: string): string | null {
  const trimmed = input.trim()
  const match = trimmed.match(INVITE_CODE_PATTERN)
  if (match?.[1]) {
    return match[1]
  }
  if (PURE_CODE_PATTERN.test(trimmed)) {
    return trimmed
  }
  return null
}

/**
 * 将邀请码格式化为完整 URL
 * @param code 邀请码（可以是纯码或完整 URL）
 * @param urlPrefix 链接前缀，如 "https://example.com/invites/"
 * @returns 格式化后的完整 URL，如果无法解析则返回原输入
 */
export function formatInviteCodeUrl(code: string, urlPrefix: string = ""): string {
  const trimmed = code.trim()
  if (!trimmed) {
    return trimmed
  }

  if (isValidInviteCodeUrl(trimmed)) {
    return trimmed
  }

  const pureCode = extractPureCode(trimmed)
  if (!pureCode) {
    return trimmed
  }
  // 如果没有配置前缀，只返回纯码
  if (!urlPrefix) {
    return pureCode
  }
  // 确保前缀以 / 结尾
  const prefix = urlPrefix.endsWith("/") ? urlPrefix : `${urlPrefix}/`
  return `${prefix}${pureCode}`
}

/**
 * 检查输入是否为有效的邀请码链接
 */
export function isValidInviteCodeUrl(input: string): boolean {
  return INVITE_CODE_PATTERN.test(input.trim())
}

/**
 * 批量解析邀请码输入（支持换行分隔）
 * @param input 多行输入文本
 * @param urlPrefix 链接前缀
 * @returns 解析结果
 */
export function parseBulkInviteCodes(
  input: string,
  urlPrefix: string = "",
): {
  totalCount: number
  invalidCount: number
  duplicates: number
  codes: string[]
  pureCodes: string[]
} {
  const lines = input.split(/\r?\n/)
  const matches: string[] = []
  const pureCodes: string[] = []
  let invalidCount = 0
  let totalCount = 0

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue
    totalCount += 1

    const pureCode = extractPureCode(line)
    if (pureCode) {
      pureCodes.push(pureCode)
      matches.push(formatInviteCodeUrl(pureCode, urlPrefix))
    } else {
      invalidCount += 1
    }
  }

  const uniqueCodes = Array.from(new Set(matches))
  const uniquePureCodes = Array.from(new Set(pureCodes))

  return {
    totalCount,
    invalidCount,
    duplicates: Math.max(0, matches.length - uniqueCodes.length),
    codes: uniqueCodes,
    pureCodes: uniquePureCodes,
  }
}
