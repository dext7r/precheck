import { notFound } from "next/navigation"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { i18n, type Locale } from "@/lib/i18n/config"
import { ErrorPage } from "@/components/errors/error-page"

const validCodes = ["400", "401", "403", "404", "500"] as const

type ErrorCode = (typeof validCodes)[number]

interface ErrorPageProps {
  params: Promise<{
    locale: Locale
    code: string
  }>
}

export function generateStaticParams() {
  return i18n.locales.flatMap((locale) =>
    validCodes.map((code) => ({
      locale,
      code,
    })),
  )
}

export async function generateMetadata({ params }: ErrorPageProps) {
  const { locale, code } = await params
  const dictionary = await getDictionary(locale)

  if (!validCodes.includes(code as ErrorCode)) {
    return { title: "Error" }
  }

  const errorData = dictionary.errors[code as ErrorCode]

  return {
    title: `${code} - ${errorData.title}`,
    description: errorData.description,
  }
}

export default async function ErrorCodePage({ params }: ErrorPageProps) {
  const { locale, code } = await params

  if (!validCodes.includes(code as ErrorCode)) {
    notFound()
  }

  const dictionary = await getDictionary(locale)

  return <ErrorPage code={code as ErrorCode} dictionary={dictionary} locale={locale} />
}
