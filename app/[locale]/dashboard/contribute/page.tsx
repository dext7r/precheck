import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { ContributeCodesManager } from "@/components/dashboard/contribute-codes-manager"

interface ContributePageProps {
  params: Promise<{ locale: Locale }>
}

export default async function ContributePage({ params }: ContributePageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {dict.dashboard.contribute}
        </h1>
        <p className="mt-1 text-muted-foreground">{dict.dashboard.contributeDesc}</p>
      </div>
      <ContributeCodesManager locale={locale} dict={dict} />
    </div>
  )
}
