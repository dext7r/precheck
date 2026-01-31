import { redirect } from "next/navigation"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { getCurrentUser } from "@/lib/auth/session"
import { PrivateChatList } from "@/components/dashboard/private-chat-list"

interface PrivateChatsPageProps {
  params: Promise<{ locale: Locale }>
}

export default async function PrivateChatsPage({ params }: PrivateChatsPageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  return (
    <PrivateChatList
      locale={locale}
      dict={dict}
      currentUser={{ id: user.id, name: user.name, role: user.role }}
    />
  )
}
