import { getDictionary } from "@/lib/i18n/get-dictionary"
import { AdminPostsTable } from "@/components/admin/posts-table"
import type { Locale } from "@/lib/i18n/config"

interface AdminPostsPageProps {
  params: Promise<{ locale: Locale }>
}

export default async function AdminPostsPage({ params }: AdminPostsPageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{dict.admin.postManagement}</h1>
        <p className="mt-1 text-muted-foreground">{dict.admin.postManagementDesc}</p>
      </div>
      <AdminPostsTable locale={locale} dict={dict} />
    </div>
  )
}
