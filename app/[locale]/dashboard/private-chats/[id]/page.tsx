import { redirect } from "next/navigation"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { getCurrentUser } from "@/lib/auth/session"
import { PrivateChatDetail } from "@/components/dashboard/private-chat-detail"

interface PrivateChatDetailPageProps {
  params: Promise<{ locale: Locale; id: string }>
}

export default async function PrivateChatDetailPage({ params }: PrivateChatDetailPageProps) {
  const { locale, id } = await params
  const dict = await getDictionary(locale)
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  return (
    <PrivateChatDetail
      locale={locale}
      dict={dict}
      chatId={id}
      currentUser={{ id: user.id, name: user.name, role: user.role, avatar: user.avatar }}
    />
  )
}
