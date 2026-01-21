import Link from "next/link"
import { ArrowLeft, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { FadeIn, FadeInStagger, FadeInStaggerItem } from "@/components/ui/motion"

interface PrivacyPageProps {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: PrivacyPageProps) {
  const { locale } = await params
  const dictionary = await getDictionary(locale)

  return {
    title: dictionary.legal.privacy.title,
    description: dictionary.legal.privacy.description,
  }
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params
  const dictionary = await getDictionary(locale)
  const { privacy } = dictionary.legal

  const sections = [
    { key: "dataCollection", ...privacy.sections.dataCollection },
    { key: "dataUse", ...privacy.sections.dataUse },
    { key: "dataSecurity", ...privacy.sections.dataSecurity },
    { key: "yourRights", ...privacy.sections.yourRights },
  ]

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
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-3xl font-bold">{privacy.title}</h1>
            </div>
            <p className="mt-4 text-lg text-muted-foreground">{privacy.description}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {privacy.lastUpdated}: {new Date().toLocaleDateString(locale)}
            </p>
          </div>
        </FadeIn>

        <FadeIn className="mb-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">{privacy.sections.intro}</p>
            </CardContent>
          </Card>
        </FadeIn>

        <FadeInStagger className="space-y-6">
          {sections.map((section) => (
            <FadeInStaggerItem key={section.key}>
              <Card className="transition-colors hover:border-primary/50">
                <CardHeader>
                  <CardTitle className="text-xl">{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{section.content}</p>
                </CardContent>
              </Card>
            </FadeInStaggerItem>
          ))}
        </FadeInStagger>
      </div>
    </div>
  )
}
