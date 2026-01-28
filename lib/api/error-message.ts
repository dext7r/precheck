import { getDictionaryEntry } from "@/lib/i18n/get-dictionary-entry"
import type { Dictionary } from "@/lib/i18n/get-dictionary"

export type ApiErrorDetail = {
  code?: string
  message?: string
  meta?: Record<string, unknown>
}

export type ApiErrorResponsePayload =
  | string
  | {
      error?: string | ApiErrorDetail
      message?: string
    }

/**
 * 从服务端统一的 API 错误结构中提取出用户可读的文本。
 * 会优先使用实际的 message，再尝试查找 code 对应的字典，最后再退回到原始字符串。
 * 如果存在 meta.detail，会附加到错误信息后面。
 */
export function resolveApiErrorMessage(
  payload?: ApiErrorResponsePayload | null,
  dict?: Dictionary,
): string | undefined {
  if (!payload) {
    return undefined
  }

  if (typeof payload === "string") {
    const trimmed = payload.trim()
    return trimmed || undefined
  }

  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message.trim()
  }

  const error = payload.error
  if (!error) {
    return undefined
  }

  if (typeof error === "string") {
    const trimmed = error.trim()
    return trimmed || undefined
  }

  let baseMessage: string | undefined

  if (typeof error.message === "string" && error.message.trim()) {
    baseMessage = error.message.trim()
  } else if (typeof error.code === "string" && error.code.trim()) {
    const code = error.code.trim()
    if (dict) {
      const entry = getDictionaryEntry(dict, code)
      if (entry) {
        baseMessage = entry
      }
    }
    if (!baseMessage) {
      baseMessage = code
    }
  }

  // 附加 meta.detail 信息
  if (baseMessage && error.meta?.detail && typeof error.meta.detail === "string") {
    return `${baseMessage}: ${error.meta.detail}`
  }

  return baseMessage
}
