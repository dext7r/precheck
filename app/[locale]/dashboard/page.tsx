import { getDictionary } from "@/lib/i18n/get-dictionary"
import { getCurrentUser } from "@/lib/auth/session"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config"
import { db } from "@/lib/db"
import Link from "next/link"

interface DashboardPageProps {
  params: Promise<{ locale: string }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params
  const currentLocale = locales.includes(locale as Locale) ? (locale as Locale) : defaultLocale
  const dict = await getDictionary(currentLocale)
  const user = await getCurrentUser()

  let hasHistory = false

  if (db && user) {
    const count = await db.preApplication.count({ where: { userId: user.id } })
    hasHistory = count > 0
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{dict.dashboard.title}</h1>
        <p className="mt-1 text-muted-foreground">
          {dict.dashboard.welcome}, {user?.name || user?.email}
        </p>
      </div>

      {currentLocale === "zh" && dict.dashboard.preApplicationGuide && (
        <Card>
          <CardHeader>
            <CardTitle>{dict.dashboard.preApplicationGuide.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>{dict.dashboard.preApplicationGuide.description}</p>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="font-medium text-foreground">
                  {dict.dashboard.preApplicationGuide.stepsTitle}
                </p>
                <ol className="mt-2 list-decimal space-y-1 pl-4">
                  {dict.dashboard.preApplicationGuide.steps.map((item: string) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {dict.dashboard.preApplicationGuide.statusTitle}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {dict.dashboard.preApplicationGuide.statuses.map((item: string) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {dict.dashboard.preApplicationGuide.rulesTitle}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {dict.dashboard.preApplicationGuide.rules.map((item: string) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{dict.dashboard.quickNav}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link href={`/${currentLocale}/dashboard/messages`}>
              <Button variant="outline" className="h-auto w-full justify-start">
                <div className="space-y-1 text-left">
                  <p className="font-medium">{dict.dashboard.messages}</p>
                  <p className="text-xs text-muted-foreground">{dict.dashboard.inbox}</p>
                </div>
              </Button>
            </Link>
            <Link href={`/${currentLocale}/dashboard/pre-application`}>
              <Button variant="outline" className="h-auto w-full justify-start">
                <div className="space-y-1 text-left">
                  <p className="font-medium">{dict.dashboard.preApplication}</p>
                  <p className="text-xs text-muted-foreground">
                    {dict.preApplication.description}
                  </p>
                </div>
              </Button>
            </Link>
            {hasHistory && (
              <Link href={`/${currentLocale}/dashboard/pre-application/history`}>
                <Button variant="outline" className="h-auto w-full justify-start">
                  <div className="space-y-1 text-left">
                    <p className="font-medium">{dict.dashboard.reviewHistory}</p>
                    <p className="text-xs text-muted-foreground">
                      {dict.preApplication.historyTitle}
                    </p>
                  </div>
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
