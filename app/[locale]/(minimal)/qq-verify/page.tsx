import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { QQVerifyForm } from "@/components/auth/qq-verify-form"
import { AuthLayout } from "@/components/layout/auth-layout"
import { validateAccessToken, QQ_VERIFY_CONFIG } from "@/lib/qq-verify"
import type { Locale } from "@/lib/i18n/config"

interface QQVerifyPageProps {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ redirect?: string }>
}

export default async function QQVerifyPage({ params, searchParams }: QQVerifyPageProps) {
  const { locale } = await params
  const { redirect: redirectUrl } = await searchParams

  const cookieStore = await cookies()
  const token = cookieStore.get(QQ_VERIFY_CONFIG.cookieName)?.value

  if (token) {
    const { valid } = await validateAccessToken(token)
    if (valid) {
      redirect(redirectUrl || `/${locale}/guest/apply`)
    }
  }

  const dict = await getDictionary(locale)

  return (
    <AuthLayout>
      <QQVerifyForm locale={locale} redirectUrl={redirectUrl} dict={dict.qqVerify} />
    </AuthLayout>
  )
}
