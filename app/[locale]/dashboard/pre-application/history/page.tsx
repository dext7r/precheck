import { redirect } from "next/navigation"
import type { Locale } from "@/lib/i18n/config"

interface PreApplicationHistoryPageProps {
  params: Promise<{ locale: Locale }>
}

// 历史页面已合并到预申请主页面，此处重定向
export default async function PreApplicationHistoryPage({
  params,
}: PreApplicationHistoryPageProps) {
  const { locale } = await params
  redirect(`/${locale}/dashboard/pre-application`)
}
