import { Code, FileJson, Server, Zap } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { FadeIn, FadeInStagger, FadeInStaggerItem } from "@/components/ui/motion"
import { CodeBlock } from "@/components/ui/code-block"
import { highlightCode } from "@/lib/highlight"

interface ApiPageProps {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: ApiPageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)

  return {
    title: dict.footer?.apiReference || "API Reference",
    description: locale === "zh" ? "API 文档和参考" : "API documentation and reference",
  }
}

export default async function ApiPage({ params }: ApiPageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)

  const endpoints = [
    {
      method: "GET",
      path: "/api/posts",
      description: locale === "zh" ? "获取所有已发布的文章" : "Get all published posts",
      icon: FileJson,
    },
    {
      method: "GET",
      path: "/api/posts/:id",
      description: locale === "zh" ? "获取单篇文章详情" : "Get a single post by ID",
      icon: FileJson,
    },
    {
      method: "POST",
      path: "/api/auth/login",
      description: locale === "zh" ? "用户登录认证" : "User login authentication",
      icon: Server,
    },
    {
      method: "POST",
      path: "/api/auth/register",
      description: locale === "zh" ? "用户注册" : "User registration",
      icon: Server,
    },
  ]

  const exampleCode = `// Example API request
const response = await fetch('/api/posts', {
  headers: {
    'Content-Type': 'application/json',
  },
});
const posts = await response.json();`

  const exampleHtml = await highlightCode(exampleCode, "typescript")

  return (
    <div className="bg-background py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="mb-12">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Code className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-3xl font-bold">{dict.footer?.apiReference || "API Reference"}</h1>
            </div>
            <p className="mt-4 text-lg text-muted-foreground">
              {locale === "zh"
                ? "完整的 API 文档和使用示例"
                : "Complete API documentation and usage examples"}
            </p>
          </div>
        </FadeIn>

        <FadeInStagger className="space-y-6">
          {endpoints.map((endpoint) => {
            const Icon = endpoint.icon
            return (
              <FadeInStaggerItem key={endpoint.path + endpoint.method}>
                <Card className="transition-colors hover:border-primary/50">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-1 text-xs font-bold ${
                            endpoint.method === "GET"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          }`}
                        >
                          {endpoint.method}
                        </span>
                        <CardTitle className="font-mono text-base">{endpoint.path}</CardTitle>
                      </div>
                    </div>
                    <CardDescription>{endpoint.description}</CardDescription>
                  </CardHeader>
                </Card>
              </FadeInStaggerItem>
            )
          })}
        </FadeInStagger>

        <FadeIn>
          <Card className="mt-12">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <CardTitle>{locale === "zh" ? "快速开始" : "Quick Start"}</CardTitle>
              </div>
              <CardDescription>
                {locale === "zh" ? "API 调用示例" : "Example API call"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock
                code={exampleCode}
                language="typescript"
                highlightedHtml={exampleHtml || undefined}
                filename="example.ts"
              />
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </div>
  )
}
