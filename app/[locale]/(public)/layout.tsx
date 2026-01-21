import type React from "react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { getCurrentUser } from "@/lib/auth/session"
import { features } from "@/lib/features"
import { locales, type Locale } from "@/lib/i18n/config"

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const currentLocale = locales.includes(locale as Locale) ? (locale as Locale) : "en"
  const dict = await getDictionary(currentLocale)
  const user = await getCurrentUser()

  return (
    <div className="flex min-h-screen flex-col">
      <Header locale={currentLocale} dict={dict} user={user} authEnabled={features.database} />
      <main className="flex-1">{children}</main>
      <Footer dict={dict} locale={currentLocale} />
    </div>
  )
}
