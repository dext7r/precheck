import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

interface AdminPageProps {
  params: Promise<{ locale: Locale }>
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{dict.admin.title}</h1>
        <p className="mt-1 text-muted-foreground">{dict.admin.overview}</p>
      </div>
      <AdminDashboard locale={locale} dict={dict} />
    </div>
  )
}
