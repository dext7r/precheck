import { BookOpen, Layout, Database, Shield } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { FadeIn, FadeInStagger, FadeInStaggerItem } from "@/components/ui/motion"
import { CodeBlock } from "@/components/ui/code-block"
import { highlightCode } from "@/lib/highlight"

interface ExamplesPageProps {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: ExamplesPageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)

  return {
    title: dict.footer?.examples || "Examples",
    description: locale === "zh" ? "代码示例和使用案例" : "Code examples and use cases",
  }
}

export default async function ExamplesPage({ params }: ExamplesPageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)

  const examples = [
    {
      title: locale === "zh" ? "页面布局" : "Page Layout",
      description:
        locale === "zh" ? "使用 App Router 创建页面布局" : "Create page layouts with App Router",
      icon: Layout,
      code: `// app/[locale]/layout.tsx
export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}`,
      language: "typescript",
    },
    {
      title: locale === "zh" ? "数据库查询" : "Database Query",
      description: locale === "zh" ? "使用 Prisma 查询数据" : "Query data with Prisma",
      icon: Database,
      code: `// lib/db.ts
import { db } from "@/lib/db"

const posts = await db.post.findMany({
  where: { status: "PUBLISHED" },
  orderBy: { createdAt: "desc" },
  include: { author: true },
})`,
      language: "typescript",
    },
    {
      title: locale === "zh" ? "用户认证" : "Authentication",
      description: locale === "zh" ? "实现用户登录认证" : "Implement user authentication",
      icon: Shield,
      code: `// lib/auth/session.ts
import { getCurrentUser } from "@/lib/auth/session"

export default async function Page() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  return <Dashboard user={user} />
}`,
      language: "typescript",
    },
  ]

  const highlightedExamples = await Promise.all(
    examples.map(async (example) => ({
      ...example,
      highlightedHtml: await highlightCode(example.code, example.language),
    })),
  )

  return (
    <div className="bg-background py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="mb-12">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-3xl font-bold">{dict.footer?.examples || "Examples"}</h1>
            </div>
            <p className="mt-4 text-lg text-muted-foreground">
              {locale === "zh"
                ? "实用的代码示例，帮助你快速上手"
                : "Practical code examples to help you get started"}
            </p>
          </div>
        </FadeIn>

        <FadeInStagger className="space-y-8">
          {highlightedExamples.map((example) => {
            const Icon = example.icon
            return (
              <FadeInStaggerItem key={example.title}>
                <Card className="transition-colors hover:border-primary/50">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <CardTitle>{example.title}</CardTitle>
                    </div>
                    <CardDescription>{example.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CodeBlock
                      code={example.code}
                      language={example.language}
                      highlightedHtml={example.highlightedHtml || undefined}
                    />
                  </CardContent>
                </Card>
              </FadeInStaggerItem>
            )
          })}
        </FadeInStagger>
      </div>
    </div>
  )
}
