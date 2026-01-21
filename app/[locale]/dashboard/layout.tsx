import type React from "react"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth/session"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { DashboardLayoutClient } from "@/components/dashboard/dashboard-layout-client"
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config"

export const dynamic = "force-dynamic"

interface DashboardLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function DashboardLayout({ children, params }: DashboardLayoutProps) {
  const { locale } = await params
  const currentLocale = locales.includes(locale as Locale) ? (locale as Locale) : defaultLocale
  const user = await getCurrentUser()
  const dict = await getDictionary(currentLocale)

  if (!user) {
    redirect(`/${currentLocale}/login`)
  }

  return (
    <DashboardLayoutClient locale={currentLocale} dict={dict} user={user}>
      {children}
    </DashboardLayoutClient>
  )
}
