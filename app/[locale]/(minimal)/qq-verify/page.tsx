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

function isValidRedirectUrl(url: string | undefined): boolean {
  if (!url) return false
  // 只允许相对路径，防止开放重定向攻击
  return url.startsWith('/') && !url.startsWith('//')
}

export default async function QQVerifyPage({ params, searchParams }: QQVerifyPageProps) {
  const { locale } = await params
  const { redirect: redirectUrl } = await searchParams
  const safeRedirectUrl = isValidRedirectUrl(redirectUrl) ? redirectUrl : `/${locale}/guest/apply`

  const cookieStore = await cookies()
  const token = cookieStore.get(QQ_VERIFY_CONFIG.cookieName)?.value

  if (token) {
    const { valid } = await validateAccessToken(token)
    if (valid) {
      redirect(safeRedirectUrl)
    }
  }

  const dict = await getDictionary(locale)

  return (
    <AuthLayout>
      <QQVerifyForm locale={locale} redirectUrl={safeRedirectUrl} dict={dict.qqVerify} />
    </AuthLayout>
  )
}
