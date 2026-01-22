import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { AdminAuditLogsTable } from "@/components/admin/audit-logs-table"

interface AdminAuditLogsPageProps {
  params: Promise<{ locale: Locale }>
}

export default async function AdminAuditLogsPage({ params }: AdminAuditLogsPageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{dict.admin.auditLogs}</h1>
        <p className="mt-1 text-muted-foreground">{dict.admin.auditLogsDesc}</p>
      </div>
      <AdminAuditLogsTable locale={locale} dict={dict} />
    </div>
  )
}
