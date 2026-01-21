import type { Locale } from "@/lib/i18n/config"
import { locales } from "@/lib/i18n/config"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { getBaseUrl, siteConfig } from "@/lib/seo"
import { db } from "@/lib/db"

interface AtomEntry {
  title: string
  summary: string
  content?: string
  link: string
  updated: Date
  published?: Date
  id: string
  author?: { name: string; email?: string; uri?: string }
  category?: string[]
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function generateAtomFeed(
  entries: AtomEntry[],
  feedInfo: {
    title: string
    subtitle: string
    link: string
    id: string
    author: { name: string; email?: string; uri?: string }
    selfLink: string
    icon?: string
    logo?: string
    rights?: string
  },
): string {
  const entriesXml = entries
    .map(
      (entry) => `
  <entry>
    <title>${escapeXml(entry.title)}</title>
    <summary>${escapeXml(entry.summary)}</summary>
    ${entry.content ? `<content type="html"><![CDATA[${entry.content}]]></content>` : ""}
    <link href="${entry.link}" rel="alternate" type="text/html"/>
    <id>${entry.id}</id>
    <updated>${entry.updated.toISOString()}</updated>
    ${entry.published ? `<published>${entry.published.toISOString()}</published>` : ""}
    ${entry.author ? `<author><name>${escapeXml(entry.author.name)}</name>${entry.author.email ? `<email>${escapeXml(entry.author.email)}</email>` : ""}${entry.author.uri ? `<uri>${entry.author.uri}</uri>` : ""}</author>` : ""}
    ${entry.category?.map((cat) => `<category term="${escapeXml(cat)}"/>`).join("\n    ") || ""}
  </entry>`,
    )
    .join("")

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(feedInfo.title)}</title>
  <subtitle>${escapeXml(feedInfo.subtitle)}</subtitle>
  <link href="${feedInfo.link}" rel="alternate" type="text/html"/>
  <link href="${feedInfo.selfLink}" rel="self" type="application/atom+xml"/>
  <id>${feedInfo.id}</id>
  <updated>${new Date().toISOString()}</updated>
  <author>
    <name>${escapeXml(feedInfo.author.name)}</name>
    ${feedInfo.author.email ? `<email>${escapeXml(feedInfo.author.email)}</email>` : ""}
    ${feedInfo.author.uri ? `<uri>${feedInfo.author.uri}</uri>` : ""}
  </author>
  <generator uri="https://nextjs.org">Next.js</generator>
  ${feedInfo.icon ? `<icon>${feedInfo.icon}</icon>` : ""}
  ${feedInfo.logo ? `<logo>${feedInfo.logo}</logo>` : ""}
  ${feedInfo.rights ? `<rights>${escapeXml(feedInfo.rights)}</rights>` : ""}
  ${entriesXml}
</feed>`
}

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const currentLocale = locales.includes(locale as Locale) ? (locale as Locale) : "en"
  const baseUrl = getBaseUrl()
  const dict = await getDictionary(currentLocale)

  const atomEntries: AtomEntry[] = []

  // 静态页面
  atomEntries.push(
    {
      title: dict.hero.title + " " + dict.hero.titleHighlight,
      summary: dict.hero.description,
      link: `${baseUrl}/${currentLocale}`,
      updated: new Date(),
      id: `${baseUrl}/${currentLocale}`,
      category: ["Home"],
    },
    {
      title: dict.docs?.title || "Documentation",
      summary: dict.docs?.description || "Project documentation",
      link: `${baseUrl}/${currentLocale}/docs`,
      updated: new Date(),
      id: `${baseUrl}/${currentLocale}/docs`,
      category: ["Documentation"],
    },
    {
      title: dict.footer?.apiReference || "API Reference",
      summary: locale === "zh" ? "API 文档和参考" : "API documentation and reference",
      link: `${baseUrl}/${currentLocale}/docs/api`,
      updated: new Date(),
      id: `${baseUrl}/${currentLocale}/docs/api`,
      category: ["Documentation"],
    },
    {
      title: dict.footer?.examples || "Examples",
      summary: locale === "zh" ? "代码示例和使用案例" : "Code examples and use cases",
      link: `${baseUrl}/${currentLocale}/docs/examples`,
      updated: new Date(),
      id: `${baseUrl}/${currentLocale}/docs/examples`,
      category: ["Documentation"],
    },
    {
      title: dict.footer?.privacy || "Privacy Policy",
      summary: dict.legal?.privacy?.description || "Privacy policy for this website",
      link: `${baseUrl}/${currentLocale}/privacy`,
      updated: new Date(),
      id: `${baseUrl}/${currentLocale}/privacy`,
      category: ["Legal"],
    },
    {
      title: dict.footer?.terms || "Terms of Service",
      summary: dict.legal?.terms?.description || "Terms of service for this website",
      link: `${baseUrl}/${currentLocale}/terms`,
      updated: new Date(),
      id: `${baseUrl}/${currentLocale}/terms`,
      category: ["Legal"],
    },
    {
      title: dict.footer?.license || "License",
      summary: dict.legal?.license?.description || "License information",
      link: `${baseUrl}/${currentLocale}/license`,
      updated: new Date(),
      id: `${baseUrl}/${currentLocale}/license`,
      category: ["Legal"],
    },
  )

  // 从数据库获取已发布文章
  if (db) {
    try {
      const posts = await db.post.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          author: { select: { name: true, email: true } },
        },
      })

      for (const post of posts) {
        atomEntries.push({
          title: post.title,
          summary: post.content?.slice(0, 200) || "",
          content: post.content || undefined,
          link: `${baseUrl}/${currentLocale}/posts/${post.id}`,
          updated: post.updatedAt,
          published: post.createdAt,
          id: `${baseUrl}/${currentLocale}/posts/${post.id}`,
          author: { name: post.author.name || "Anonymous", email: post.author.email },
          category: ["Post"],
        })
      }
    } catch {
      // 数据库查询失败
    }
  }

  const atomXml = generateAtomFeed(atomEntries, {
    title: dict.metadata.title,
    subtitle: dict.metadata.description,
    link: `${baseUrl}/${currentLocale}`,
    id: `${baseUrl}/${currentLocale}`,
    author: { name: siteConfig.name, uri: baseUrl },
    selfLink: `${baseUrl}/${currentLocale}/atom.xml`,
    icon: `${baseUrl}/favicon.ico`,
    logo: `${baseUrl}/og-image.png`,
    rights: `© ${new Date().getFullYear()} ${siteConfig.name}`,
  })

  return new Response(atomXml, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  })
}
