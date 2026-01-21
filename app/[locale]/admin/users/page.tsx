import { getDictionary } from "@/lib/i18n/get-dictionary"
import { AdminUsersTable } from "@/components/admin/users-table"
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config"

interface UsersPageProps {
  params: Promise<{ locale: string }>
}

export default async function UsersPage({ params }: UsersPageProps) {
  const { locale } = await params
  const currentLocale = locales.includes(locale as Locale) ? (locale as Locale) : defaultLocale
  const dict = await getDictionary(currentLocale)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{dict.admin.userManagement}</h1>
        <p className="mt-1 text-muted-foreground">{dict.admin.userManagementDesc}</p>
      </div>
      <AdminUsersTable locale={currentLocale} dict={dict} />
    </div>
  )
}
