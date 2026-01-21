import { Book, Code, Database, Globe, Rocket } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { FadeIn, FadeInStagger, FadeInStaggerItem } from "@/components/ui/motion"
import { CodeBlock } from "@/components/ui/code-block"
import { highlightCode } from "@/lib/highlight"

const sectionIcons = {
  gettingStarted: Rocket,
  database: Database,
  structure: Code,
  deployment: Globe,
}

interface DocsPageProps {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: DocsPageProps) {
  const { locale } = await params
  const dictionary = await getDictionary(locale)

  return {
    title: dictionary.docs.title,
    description: dictionary.docs.description,
  }
}

export default async function DocsPage({ params }: DocsPageProps) {
  const { locale } = await params
  const dictionary = await getDictionary(locale)
  const { docs } = dictionary

  const sections = [
    { key: "gettingStarted" as const, ...docs.sections.gettingStarted },
    { key: "database" as const, ...docs.sections.database },
    { key: "structure" as const, ...docs.sections.structure },
    { key: "deployment" as const, ...docs.sections.deployment },
  ]

  const envCode = `# Database
DATABASE_URL="postgresql://user:password@localhost:5432/db"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"`

  const envHtml = await highlightCode(envCode, "bash")

  return (
    <div className="bg-background py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="mb-12">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Book className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-3xl font-bold">{docs.title}</h1>
            </div>
            <p className="mt-4 text-lg text-muted-foreground">{docs.description}</p>
          </div>
        </FadeIn>

        <FadeInStagger className="space-y-8">
          {sections.map((section) => {
            const Icon = sectionIcons[section.key]
            return (
              <FadeInStaggerItem key={section.key}>
                <Card className="transition-colors hover:border-primary/50">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <CardTitle>{section.title}</CardTitle>
                    </div>
                    <CardDescription>{section.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {section.items.map((item, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary/50" />
                          <code className="font-mono text-foreground/80">{item}</code>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </FadeInStaggerItem>
            )
          })}
        </FadeInStagger>

        <FadeIn>
          <Card className="mt-12">
            <CardHeader>
              <CardTitle>{docs.envTitle}</CardTitle>
              <CardDescription>{docs.envDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock
                code={envCode}
                language="bash"
                highlightedHtml={envHtml || undefined}
                filename=".env"
              />
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </div>
  )
}
