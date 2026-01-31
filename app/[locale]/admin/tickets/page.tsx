import { redirect } from "next/navigation"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { getCurrentUser } from "@/lib/auth/session"
import { isAdmin } from "@/lib/auth/permissions"
import { AdminTicketList } from "@/components/admin/admin-ticket-list"

interface AdminTicketsPageProps {
  params: Promise<{ locale: Locale }>
}

export default async function AdminTicketsPage({ params }: AdminTicketsPageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)
  const user = await getCurrentUser()

  if (!user || !isAdmin(user.role)) {
    redirect(`/${locale}/login`)
  }

  return <AdminTicketList locale={locale} dict={dict} />
}
