import Link from "next/link"
import { ArrowLeft, FileCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { FadeIn, FadeInStagger, FadeInStaggerItem } from "@/components/ui/motion"

interface LicensePageProps {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: LicensePageProps) {
  const { locale } = await params
  const dictionary = await getDictionary(locale)

  return {
    title: dictionary.legal.license.title,
    description: dictionary.legal.license.description,
  }
}

export default async function LicensePage({ params }: LicensePageProps) {
  const { locale } = await params
  const dictionary = await getDictionary(locale)
  const { license } = dictionary.legal

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="mb-8">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/${locale}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {dictionary.docs.backHome}
              </Link>
            </Button>
          </div>

          <div className="mb-12">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileCheck className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-3xl font-bold">{license.title}</h1>
            </div>
            <p className="mt-4 text-lg text-muted-foreground">{license.description}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {license.lastUpdated}: {new Date().toLocaleDateString(locale)}
            </p>
          </div>
        </FadeIn>

        <FadeIn className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{license.mitLicense}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{license.sections.intro}</p>
            </CardContent>
          </Card>
        </FadeIn>

        <FadeInStagger className="space-y-6">
          <FadeInStaggerItem>
            <Card className="transition-colors hover:border-primary/50">
              <CardHeader>
                <CardTitle className="text-xl">{license.sections.permissions.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {license.sections.permissions.items.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </FadeInStaggerItem>

          <FadeInStaggerItem>
            <Card className="transition-colors hover:border-primary/50">
              <CardHeader>
                <CardTitle className="text-xl">{license.sections.conditions.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {license.sections.conditions.items.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </FadeInStaggerItem>

          <FadeInStaggerItem>
            <Card className="transition-colors hover:border-primary/50">
              <CardHeader>
                <CardTitle className="text-xl">{license.sections.limitations.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {license.sections.limitations.items.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </FadeInStaggerItem>

          <FadeInStaggerItem>
            <Card className="border-primary/20 bg-muted/30">
              <CardHeader>
                <CardTitle className="text-xl">{license.sections.fullText.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap font-mono text-sm text-muted-foreground">
                  {license.sections.fullText.content}
                </pre>
              </CardContent>
            </Card>
          </FadeInStaggerItem>
        </FadeInStagger>
      </div>
    </div>
  )
}
