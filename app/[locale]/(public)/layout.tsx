import type React from "react"
import { redirect } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { getCurrentUser } from "@/lib/auth/session"
import { features } from "@/lib/features"
import { getSiteSettings } from "@/lib/site-settings"
import { locales, type Locale } from "@/lib/i18n/config"

export const dynamic = "force-dynamic"

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

  // 维护模式检查：管理员豁免
  if (features.database) {
    const settings = await getSiteSettings()
    if (settings.maintenanceMode) {
      const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN"
      if (!isAdmin) {
        redirect(`/${currentLocale}/error/503`)
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header locale={currentLocale} dict={dict} user={user} authEnabled={features.database} />
      <main className="flex-1">{children}</main>
      <Footer dict={dict} locale={currentLocale} />
    </div>
  )
}
