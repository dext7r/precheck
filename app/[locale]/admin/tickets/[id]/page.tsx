import { redirect } from "next/navigation"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { getCurrentUser } from "@/lib/auth/session"
import { isAdmin } from "@/lib/auth/permissions"
import { AdminTicketDetail } from "@/components/admin/admin-ticket-detail"

interface AdminTicketDetailPageProps {
  params: Promise<{ locale: Locale; id: string }>
}

export default async function AdminTicketDetailPage({ params }: AdminTicketDetailPageProps) {
  const { locale, id } = await params
  const dict = await getDictionary(locale)
  const user = await getCurrentUser()

  if (!user || !isAdmin(user.role)) {
    redirect(`/${locale}/login`)
  }

  return <AdminTicketDetail locale={locale} dict={dict} ticketId={id} />
}
