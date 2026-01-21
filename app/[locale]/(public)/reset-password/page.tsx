import { Suspense } from "react"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { AuthLayout } from "@/components/layout/auth-layout"
import type { Locale } from "@/lib/i18n/config"

interface ResetPasswordPageProps {
  params: Promise<{ locale: Locale }>
}

export default async function ResetPasswordPage({ params }: ResetPasswordPageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)

  return (
    <AuthLayout>
      <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
        <ResetPasswordForm locale={locale} dict={dict} />
      </Suspense>
    </AuthLayout>
  )
}
