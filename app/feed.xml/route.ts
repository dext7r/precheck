import { db } from "@/lib/db"
import { getBaseUrl, siteConfig } from "@/lib/seo"

export const revalidate = 3600

export async function GET() {
  const baseUrl = getBaseUrl()
  const posts = await getPublishedPosts()

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(siteConfig.name)}</title>
    <link>${baseUrl}</link>
    <description>${escapeXml(siteConfig.description)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    <generator>Next.js</generator>
${posts
  .map(
    (post) => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${baseUrl}/zh/posts/${post.id}</link>
      <guid isPermaLink="true">${baseUrl}/zh/posts/${post.id}</guid>
      <pubDate>${new Date(post.createdAt).toUTCString()}</pubDate>
      <description>${escapeXml(getExcerpt(post.content))}</description>
    </item>`,
  )
  .join("\n")}
  </channel>
</rss>`

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}

async function getPublishedPosts() {
  if (!db) return []
  try {
    return await db.post.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, title: true, content: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    })
  } catch {
    return []
  }
}

function getExcerpt(content: string | null, maxLength = 200): string {
  if (!content) return ""
  const text = content
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
  return text.length > maxLength ? text.slice(0, maxLength) + "..." : text
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}
