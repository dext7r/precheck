import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { getQQVerifyStatus, QQ_VERIFY_CONFIG } from "@/lib/qq-verify"
import { getCurrentUser } from "@/lib/auth/session"
import { GuestApplyForm } from "@/components/guest/guest-apply-form"
import type { Locale } from "@/lib/i18n/config"

interface GuestApplyPageProps {
  params: Promise<{ locale: Locale }>
}

export default async function GuestApplyPage({ params }: GuestApplyPageProps) {
  const { locale } = await params

  const user = await getCurrentUser()
  if (user) {
    redirect(`/${locale}/dashboard/pre-application`)
  }

  const cookieStore = await cookies()
  const token = cookieStore.get(QQ_VERIFY_CONFIG.cookieName)?.value
  const { verified, qqNumber } = await getQQVerifyStatus(token)

  if (!verified || !qqNumber) {
    redirect(`/${locale}/qq-verify?redirect=/${locale}/guest/apply`)
  }

  const dict = await getDictionary(locale)

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <GuestApplyForm locale={locale} qqNumber={qqNumber} dict={dict.guestApply} />
    </div>
  )
}
