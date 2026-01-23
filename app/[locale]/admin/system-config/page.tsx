import { redirect } from "next/navigation"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { getCurrentUser } from "@/lib/auth/session"
import { SystemConfigForm } from "@/components/admin/system-config-form"

interface SystemConfigPageProps {
  params: Promise<{ locale: Locale }>
}

export default async function SystemConfigPage({ params }: SystemConfigPageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    redirect(`/${locale}/error/403`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">系统配置</h1>
        <p className="mt-2 text-muted-foreground">管理预申请表单和邮箱域名白名单</p>
      </div>

      <SystemConfigForm locale={locale} dict={dict} />
    </div>
  )
}
