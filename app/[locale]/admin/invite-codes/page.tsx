import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { AdminInviteCodesManager } from "@/components/admin/invite-codes-manager"

interface AdminInviteCodesPageProps {
  params: Promise<{ locale: Locale }>
}

export default async function AdminInviteCodesPage({ params }: AdminInviteCodesPageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{dict.admin.inviteCodes}</h1>
        <p className="mt-1 text-muted-foreground">{dict.admin.inviteCodesDesc}</p>
      </div>
      <AdminInviteCodesManager locale={locale} dict={dict} />
    </div>
  )
}
