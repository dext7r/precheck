import { getDictionary } from "@/lib/i18n/get-dictionary"
import { QueryInviteCodesForm } from "@/components/public/query-invite-codes-form"
import { AuthLayout } from "@/components/layout/auth-layout"
import type { Locale } from "@/lib/i18n/config"

interface QueryInviteCodesPageProps {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: QueryInviteCodesPageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)
  const t = dict.queryInviteCodes || {}

  return {
    title: t.metaTitle || t.title || "查询",
    description: t.metaDescription || t.description || "输入查询码查看申请状态或可用的邀请码",
  }
}

export default async function QueryInviteCodesPage({ params }: QueryInviteCodesPageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)

  return (
    <AuthLayout>
      <QueryInviteCodesForm locale={locale} dict={dict} />
    </AuthLayout>
  )
}
