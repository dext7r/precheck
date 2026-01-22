import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { PreApplicationForm } from "@/components/dashboard/pre-application-form"

interface PreApplicationPageProps {
  params: Promise<{ locale: Locale }>
}

export default async function PreApplicationPage({ params }: PreApplicationPageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)

  return <PreApplicationForm locale={locale} dict={dict} />
}
