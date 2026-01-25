"use client"

import { useEffect } from "react"
import type { Locale } from "@/lib/i18n/config"

const langMap: Record<Locale, string> = {
  en: "en",
  zh: "zh-CN",
}

export function HtmlLang({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = langMap[locale] || locale
  }, [locale])

  return null
}
