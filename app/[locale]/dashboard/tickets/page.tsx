import { redirect } from "next/navigation"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { getCurrentUser } from "@/lib/auth/session"
import { TicketList } from "@/components/dashboard/ticket-list"

interface TicketsPageProps {
  params: Promise<{ locale: Locale }>
}

export default async function TicketsPage({ params }: TicketsPageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  return <TicketList locale={locale} dict={dict} userId={user.id} />
}
