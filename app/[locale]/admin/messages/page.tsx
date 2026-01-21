import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { AdminMessagesManager } from "@/components/admin/messages-manager"

interface AdminMessagesPageProps {
  params: Promise<{ locale: Locale }>
}

export default async function AdminMessagesPage({ params }: AdminMessagesPageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)

  return <AdminMessagesManager locale={locale} dict={dict} />
}
