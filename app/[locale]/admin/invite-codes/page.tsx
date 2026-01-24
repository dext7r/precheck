import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { AdminInviteCodesManager } from "@/components/admin/invite-codes-manager"

interface AdminInviteCodesPageProps {
  params: Promise<{ locale: Locale }>
}

export default async function AdminInviteCodesPage({ params }: AdminInviteCodesPageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)

  return <AdminInviteCodesManager locale={locale} dict={dict} />
}
