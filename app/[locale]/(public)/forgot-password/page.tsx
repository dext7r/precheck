import { getDictionary } from "@/lib/i18n/get-dictionary"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { AuthLayout } from "@/components/layout/auth-layout"
import type { Locale } from "@/lib/i18n/config"

interface ForgotPasswordPageProps {
  params: Promise<{ locale: Locale }>
}

export default async function ForgotPasswordPage({ params }: ForgotPasswordPageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)

  return (
    <AuthLayout>
      <ForgotPasswordForm locale={locale} dict={dict} />
    </AuthLayout>
  )
}
