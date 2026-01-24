import { type NextRequest, NextResponse } from "next/server"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { getDictionaryEntry } from "@/lib/i18n/get-dictionary-entry"
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config"

type ErrorResponseOptions = {
  status?: number
  meta?: Record<string, unknown>
}

function toSupportedLocale(locale?: string | null): Locale | null {
  if (!locale) {
    return null
  }

  const normalized = locale.trim().toLowerCase()
  if (locales.includes(normalized as Locale)) {
    return normalized as Locale
  }

  const simplified = normalized.split("-")[0]
  if (locales.includes(simplified as Locale)) {
    return simplified as Locale
  }

  return null
}

export function resolveLocaleForRequest(request: NextRequest | undefined): Locale {
  if (!request) {
    return defaultLocale
  }

  const explicitLocale =
    request.headers.get("x-next-locale") ?? request.headers.get("x-locale") ?? null
  const resolvedExplicit = toSupportedLocale(explicitLocale)
  if (resolvedExplicit) {
    return resolvedExplicit
  }

  const acceptLanguage = request.headers.get("accept-language") ?? ""
  for (const part of acceptLanguage.split(",")) {
    const [lang] = part.split(";")
    const candidate = lang.trim()
    if (candidate) {
      const detected = toSupportedLocale(candidate)
      if (detected) {
        return detected
      }
    }
  }

  const referer = request.headers.get("referer") ?? ""
  for (const locale of locales) {
    if (referer.includes(`/${locale}/`)) {
      return locale
    }
  }

  return defaultLocale
}

export async function createApiErrorResponse(
  request: NextRequest,
  dictKey: string,
  options?: ErrorResponseOptions,
) {
  const locale = resolveLocaleForRequest(request)
  const dict = await getDictionary(locale)
  const message = getDictionaryEntry(dict, dictKey) ?? dictKey

  return NextResponse.json(
    {
      error: {
        code: dictKey,
        message,
        ...(options?.meta ? { meta: options.meta } : {}),
      },
    },
    {
      status: options?.status ?? 400,
    },
  )
}
