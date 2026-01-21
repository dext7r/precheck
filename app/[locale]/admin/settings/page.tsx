import { getDictionary } from "@/lib/i18n/get-dictionary"
import { AdminSettingsForm } from "@/components/admin/settings-form"
import type { Locale } from "@/lib/i18n/config"

interface AdminSettingsPageProps {
  params: Promise<{ locale: Locale }>
}

export default async function AdminSettingsPage({ params }: AdminSettingsPageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)

  return <AdminSettingsForm locale={locale} dict={dict} />
}
