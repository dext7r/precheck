import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { PostsTable } from "@/components/dashboard/posts-table"

interface PostsPageProps {
  params: Promise<{ locale: Locale }>
}

export default async function PostsPage({ params }: PostsPageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)

  return <PostsTable locale={locale} dict={dict} />
}
