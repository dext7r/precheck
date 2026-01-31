import { redirect } from "next/navigation"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { getCurrentUser } from "@/lib/auth/session"
import { TicketDetail } from "@/components/dashboard/ticket-detail"

interface TicketDetailPageProps {
  params: Promise<{ locale: Locale; id: string }>
}

export default async function TicketDetailPage({ params }: TicketDetailPageProps) {
  const { locale, id } = await params
  const dict = await getDictionary(locale)
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  return <TicketDetail locale={locale} dict={dict} ticketId={id} userId={user.id} />
}
