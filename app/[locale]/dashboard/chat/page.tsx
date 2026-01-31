import { redirect } from "next/navigation"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { getCurrentUser } from "@/lib/auth/session"
import { ChatRoom } from "@/components/dashboard/chat-room"

interface ChatPageProps {
  params: Promise<{ locale: Locale }>
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  return (
    <ChatRoom
      locale={locale}
      dict={dict}
      currentUser={{ id: user.id, name: user.name, role: user.role, avatar: user.avatar }}
    />
  )
}
