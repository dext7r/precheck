import { Suspense } from "react"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { ReactivateForm } from "@/components/auth/reactivate-form"
import { AuthLayout } from "@/components/layout/auth-layout"
import type { Locale } from "@/lib/i18n/config"

interface ReactivatePageProps {
  params: Promise<{ locale: Locale }>
}

export default async function ReactivatePage({ params }: ReactivatePageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)

  return (
    <AuthLayout>
      <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
        <ReactivateForm locale={locale} dict={dict} />
      </Suspense>
    </AuthLayout>
  )
}
