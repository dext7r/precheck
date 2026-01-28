import { getDictionary } from "@/lib/i18n/get-dictionary"
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config"
import { Activity } from "lucide-react"
import { StatusClient } from "./status-client"

interface StatusPageProps {
  params: Promise<{ locale: string }>
}

export default async function StatusPage({ params }: StatusPageProps) {
  const { locale } = await params
  const currentLocale = locales.includes(locale as Locale) ? (locale as Locale) : defaultLocale
  const dict = await getDictionary(currentLocale)

  const t = dict.admin as Record<string, unknown>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/25">
          <Activity className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {(t.status as string) || "系统状态"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {(t.statusDesc as string) || "监控系统依赖服务的健康状态"}
          </p>
        </div>
      </div>

      <StatusClient dict={dict} />
    </div>
  )
}
