import type { Locale } from "@/lib/i18n/config"
import { locales } from "@/lib/i18n/config"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { getBaseUrl, siteConfig } from "@/lib/seo"
import { db } from "@/lib/db"

interface FeedItem {
  title: string
  description: string
  content?: string
  link: string
  pubDate: Date
  guid: string
  author?: string
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

function generateRssFeed(
  items: FeedItem[],
  feedInfo: {
    title: string
    description: string
    link: string
    language: string
    selfLink: string
    copyright?: string
    managingEditor?: string
    webMaster?: string
    image?: { url: string; title: string; link: string }
  },
): string {
  const itemsXml = items
    .map(
      (item) => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <description>${escapeXml(item.description)}</description>
      ${item.content ? `<content:encoded><![CDATA[${item.content}]]></content:encoded>` : ""}
      <link>${item.link}</link>
      <guid isPermaLink="true">${item.guid}</guid>
      <pubDate>${item.pubDate.toUTCString()}</pubDate>
      ${item.author ? `<author>${escapeXml(item.author)}</author>` : ""}
      ${item.category?.map((cat) => `<category>${escapeXml(cat)}</category>`).join("\n      ") || ""}
    </item>`,
    )
    .join("")

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(feedInfo.title)}</title>
    <description>${escapeXml(feedInfo.description)}</description>
    <link>${feedInfo.link}</link>
    <language>${feedInfo.language}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${feedInfo.selfLink}" rel="self" type="application/rss+xml"/>
    <generator>Next.js</generator>
    <ttl>60</ttl>
    ${feedInfo.copyright ? `<copyright>${escapeXml(feedInfo.copyright)}</copyright>` : ""}
    ${feedInfo.managingEditor ? `<managingEditor>${escapeXml(feedInfo.managingEditor)}</managingEditor>` : ""}
    ${feedInfo.webMaster ? `<webMaster>${escapeXml(feedInfo.webMaster)}</webMaster>` : ""}
    ${feedInfo.image ? `<image><url>${feedInfo.image.url}</url><title>${escapeXml(feedInfo.image.title)}</title><link>${feedInfo.image.link}</link></image>` : ""}
    ${itemsXml}
  </channel>
</rss>`
}

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const currentLocale = locales.includes(locale as Locale) ? (locale as Locale) : "en"
  const baseUrl = getBaseUrl()
  const dict = await getDictionary(currentLocale)

  const feedItems: FeedItem[] = []

  // 静态页面
  feedItems.push(
    {
      title: dict.hero.title + " " + dict.hero.titleHighlight,
      description: dict.hero.description,
      link: `${baseUrl}/${currentLocale}`,
      pubDate: new Date(),
      guid: `${baseUrl}/${currentLocale}`,
      category: ["Home"],
    },
    {
      title: dict.docs?.title || "Documentation",
      description: dict.docs?.description || "Project documentation",
      link: `${baseUrl}/${currentLocale}/docs`,
      pubDate: new Date(),
      guid: `${baseUrl}/${currentLocale}/docs`,
      category: ["Documentation"],
    },
    {
      title: dict.footer?.apiReference || "API Reference",
      description: locale === "zh" ? "API 文档和参考" : "API documentation and reference",
      link: `${baseUrl}/${currentLocale}/docs/api`,
      pubDate: new Date(),
      guid: `${baseUrl}/${currentLocale}/docs/api`,
      category: ["Documentation"],
    },
    {
      title: dict.footer?.examples || "Examples",
      description: locale === "zh" ? "代码示例和使用案例" : "Code examples and use cases",
      link: `${baseUrl}/${currentLocale}/docs/examples`,
      pubDate: new Date(),
      guid: `${baseUrl}/${currentLocale}/docs/examples`,
      category: ["Documentation"],
    },
    {
      title: dict.footer?.privacy || "Privacy Policy",
      description: dict.legal?.privacy?.description || "Privacy policy for this website",
      link: `${baseUrl}/${currentLocale}/privacy`,
      pubDate: new Date(),
      guid: `${baseUrl}/${currentLocale}/privacy`,
      category: ["Legal"],
    },
    {
      title: dict.footer?.terms || "Terms of Service",
      description: dict.legal?.terms?.description || "Terms of service for this website",
      link: `${baseUrl}/${currentLocale}/terms`,
      pubDate: new Date(),
      guid: `${baseUrl}/${currentLocale}/terms`,
      category: ["Legal"],
    },
    {
      title: dict.footer?.license || "License",
      description: dict.legal?.license?.description || "License information",
      link: `${baseUrl}/${currentLocale}/license`,
      pubDate: new Date(),
      guid: `${baseUrl}/${currentLocale}/license`,
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
          author: { select: { name: true, email: true } },
        },
      })

      for (const post of posts) {
        feedItems.push({
          title: post.title,
          description: post.content?.slice(0, 200) || "",
          content: post.content || undefined,
          link: `${baseUrl}/${currentLocale}/posts/${post.id}`,
          pubDate: post.createdAt,
          guid: `${baseUrl}/${currentLocale}/posts/${post.id}`,
          author: post.author.name || post.author.email,
          category: ["Post"],
        })
      }
    } catch {
      // 数据库查询失败
    }
  }

  const feedXml = generateRssFeed(feedItems, {
    title: dict.metadata.title,
    description: dict.metadata.description,
    link: `${baseUrl}/${currentLocale}`,
    language: currentLocale,
    selfLink: `${baseUrl}/${currentLocale}/feed.xml`,
    copyright: `© ${new Date().getFullYear()} ${siteConfig.name}`,
  })

  return new Response(feedXml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  })
}
