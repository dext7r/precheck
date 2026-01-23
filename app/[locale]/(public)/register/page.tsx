import { redirect } from "next/navigation"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { RegisterForm } from "@/components/auth/register-form"
import { getEnabledOAuthProviders } from "@/lib/features"
import { AuthLayout } from "@/components/layout/auth-layout"
import { getSiteSettings } from "@/lib/site-settings"
import { getCurrentUser } from "@/lib/auth/session"
import type { Locale } from "@/lib/i18n/config"

interface RegisterPageProps {
  params: Promise<{ locale: Locale }>
}

export default async function RegisterPage({ params }: RegisterPageProps) {
  const { locale } = await params
  const user = await getCurrentUser()

  // 如果已登录，重定向到控制台
  if (user) {
    redirect(`/${locale}/dashboard`)
  }

  const dict = await getDictionary(locale)
  const settings = await getSiteSettings()
  const oauthProviders = settings.oauthLogin ? getEnabledOAuthProviders() : []

  return (
    <AuthLayout>
      <RegisterForm locale={locale} dict={dict} oauthProviders={oauthProviders} />
    </AuthLayout>
  )
}
