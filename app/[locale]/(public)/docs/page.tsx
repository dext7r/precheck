import {
  Book,
  Code,
  Database,
  Globe,
  Rocket,
  UserPlus,
  FileEdit,
  Ticket,
  RefreshCw,
  HelpCircle,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Lightbulb,
  AlertTriangle,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { FadeIn, FadeInStagger, FadeInStaggerItem } from "@/components/ui/motion"
import { CodeBlock } from "@/components/ui/code-block"
import { highlightCode } from "@/lib/highlight"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const sectionIcons = {
  gettingStarted: Rocket,
  database: Database,
  structure: Code,
  deployment: Globe,
}

const userGuideIcons = {
  overview: Book,
  register: UserPlus,
  apply: FileEdit,
  inviteCode: Ticket,
  resubmit: RefreshCw,
  faq: HelpCircle,
}

const statusIcons = {
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
  disputed: AlertCircle,
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

        <Tabs defaultValue="userGuide" className="space-y-8">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="userGuide">{docs.tabs.userGuide}</TabsTrigger>
            <TabsTrigger value="developer">{docs.tabs.developer}</TabsTrigger>
          </TabsList>

          {/* 用户指南 */}
          <TabsContent value="userGuide" className="space-y-8">
            <FadeInStagger className="space-y-8">
              {/* 流程概览 */}
              <FadeInStaggerItem>
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                        <Book className="h-4 w-4 text-primary" />
                      </div>
                      <CardTitle>{docs.userGuide.overview.title}</CardTitle>
                    </div>
                    <CardDescription className="text-base">
                      {docs.userGuide.overview.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-3">
                      {docs.userGuide.overview.steps.map((step, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                            {index + 1}
                          </span>
                          <span className="text-sm text-foreground/80">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              </FadeInStaggerItem>

              {/* 第一步：注册账号 */}
              <FadeInStaggerItem>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10">
                        <UserPlus className="h-4 w-4 text-blue-500" />
                      </div>
                      <CardTitle>{docs.userGuide.register.title}</CardTitle>
                    </div>
                    <CardDescription>{docs.userGuide.register.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {docs.userGuide.register.items.map((item, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500/50" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/50">
                      <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                        <Lightbulb className="h-4 w-4" />
                        {docs.userGuide.register.tips.title}
                      </div>
                      <ul className="mt-2 space-y-1">
                        {docs.userGuide.register.tips.items.map((tip, index) => (
                          <li key={index} className="text-sm text-amber-700 dark:text-amber-300">
                            • {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </FadeInStaggerItem>

              {/* 第二步：提交预申请 */}
              <FadeInStaggerItem>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-500/10">
                        <FileEdit className="h-4 w-4 text-green-500" />
                      </div>
                      <CardTitle>{docs.userGuide.apply.title}</CardTitle>
                    </div>
                    <CardDescription>{docs.userGuide.apply.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {docs.userGuide.apply.items.map((item, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500/50" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/50">
                      <div className="flex items-center gap-2 text-sm font-medium text-green-800 dark:text-green-200">
                        <Lightbulb className="h-4 w-4" />
                        {docs.userGuide.apply.essayTips.title}
                      </div>
                      <ul className="mt-2 space-y-1">
                        {docs.userGuide.apply.essayTips.items.map((tip, index) => (
                          <li key={index} className="text-sm text-green-700 dark:text-green-300">
                            • {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </FadeInStaggerItem>

              {/* 第三步：获取并使用邀请码 */}
              <FadeInStaggerItem>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/10">
                        <Ticket className="h-4 w-4 text-emerald-500" />
                      </div>
                      <CardTitle>{docs.userGuide.inviteCode.title}</CardTitle>
                    </div>
                    <CardDescription>{docs.userGuide.inviteCode.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {docs.userGuide.inviteCode.items.map((item, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500/50" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/50">
                      <div className="flex items-center gap-2 text-sm font-medium text-red-800 dark:text-red-200">
                        <AlertTriangle className="h-4 w-4" />
                        {docs.userGuide.inviteCode.warnings.title}
                      </div>
                      <ul className="mt-2 space-y-1">
                        {docs.userGuide.inviteCode.warnings.items.map((warning, index) => (
                          <li key={index} className="text-sm text-red-700 dark:text-red-300">
                            • {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </FadeInStaggerItem>

              {/* 重新提交 */}
              <FadeInStaggerItem>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-500/10">
                        <RefreshCw className="h-4 w-4 text-orange-500" />
                      </div>
                      <CardTitle>{docs.userGuide.resubmit.title}</CardTitle>
                    </div>
                    <CardDescription>{docs.userGuide.resubmit.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {docs.userGuide.resubmit.items.map((item, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500/50" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/50">
                      <div className="text-sm font-medium text-orange-800 dark:text-orange-200">
                        {docs.userGuide.resubmit.limits.title}
                      </div>
                      <p className="mt-1 text-sm text-orange-700 dark:text-orange-300">
                        {docs.userGuide.resubmit.limits.content}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </FadeInStaggerItem>

              {/* 常见问题 */}
              <FadeInStaggerItem>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-500/10">
                        <HelpCircle className="h-4 w-4 text-cyan-500" />
                      </div>
                      <CardTitle>{docs.userGuide.faq.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {docs.userGuide.faq.items.map((item, index) => (
                        <AccordionItem key={index} value={`faq-${index}`}>
                          <AccordionTrigger className="text-left text-sm">
                            {item.q}
                          </AccordionTrigger>
                          <AccordionContent className="text-sm text-muted-foreground">
                            {item.a}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              </FadeInStaggerItem>
            </FadeInStagger>
          </TabsContent>

          {/* 开发者文档 */}
          <TabsContent value="developer" className="space-y-8">
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
