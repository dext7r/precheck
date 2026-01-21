import { getDictionary } from "@/lib/i18n/get-dictionary"
import { ErrorPage } from "@/components/errors/error-page"

export default async function NotFound() {
  const dictionary = await getDictionary("en")

  return <ErrorPage code="404" dictionary={dictionary} locale="en" />
}
