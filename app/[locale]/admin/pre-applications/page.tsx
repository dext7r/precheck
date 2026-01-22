import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { AdminPreApplicationsTable } from "@/components/admin/pre-applications-table"

interface AdminPreApplicationsPageProps {
  params: Promise<{ locale: Locale }>
}

export default async function AdminPreApplicationsPage({ params }: AdminPreApplicationsPageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{dict.admin.preApplications}</h1>
        <p className="mt-1 text-muted-foreground">{dict.admin.preApplicationsDesc}</p>
      </div>
      <AdminPreApplicationsTable locale={locale} dict={dict} />
    </div>
  )
}
