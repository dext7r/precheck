import { getDictionary } from "@/lib/i18n/get-dictionary"
import { ErrorPage } from "@/components/errors/error-page"

export default async function NotFound() {
  // 使用默认语言，因为 not-found 无法获取动态参数
  const dictionary = await getDictionary("en")

  return <ErrorPage code="404" dictionary={dictionary} locale="en" />
}
