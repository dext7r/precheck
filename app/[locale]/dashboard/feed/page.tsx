import { redirect } from "next/navigation"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { getCurrentUser } from "@/lib/auth/session"
import { PreApplicationFeed } from "@/components/dashboard/pre-application-feed"

interface FeedPageProps {
  params: Promise<{ locale: Locale }>
}

export default async function FeedPage({ params }: FeedPageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const d = dict.dashboard as Record<string, unknown>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {(d.feedTitle as string) || "预申请动态"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {(d.feedDesc as string) || "查看最近的预申请提交与审核状态"}
        </p>
      </div>
      <PreApplicationFeed locale={locale} dict={dict} />
    </div>
  )
}
