import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { AdminEmailLogsTable } from "@/components/admin/email-logs-table"

interface AdminEmailLogsPageProps {
  params: Promise<{ locale: Locale }>
}

export default async function AdminEmailLogsPage({ params }: AdminEmailLogsPageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{dict.admin.emailLogs}</h1>
        <p className="mt-1 text-muted-foreground">{dict.admin.emailLogsDesc}</p>
      </div>
      <AdminEmailLogsTable locale={locale} dict={dict} />
    </div>
  )
}
