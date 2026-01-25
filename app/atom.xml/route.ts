import { db } from "@/lib/db"
import { getBaseUrl, siteConfig } from "@/lib/seo"

export const revalidate = 3600

export async function GET() {
  const baseUrl = getBaseUrl()
  const posts = await getPublishedPosts()
  const updated = posts[0]?.updatedAt || new Date()

  const atom = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(siteConfig.name)}</title>
  <subtitle>${escapeXml(siteConfig.description)}</subtitle>
  <link href="${baseUrl}/atom.xml" rel="self" type="application/atom+xml"/>
  <link href="${baseUrl}" rel="alternate" type="text/html"/>
  <id>${baseUrl}/</id>
  <updated>${new Date(updated).toISOString()}</updated>
  <author>
    <name>linux.do</name>
    <uri>${siteConfig.links.community}</uri>
  </author>
  <generator uri="https://nextjs.org/">Next.js</generator>
${posts
  .map(
    (post) => `  <entry>
    <title>${escapeXml(post.title)}</title>
    <link href="${baseUrl}/zh/posts/${post.id}" rel="alternate" type="text/html"/>
    <id>${baseUrl}/zh/posts/${post.id}</id>
    <published>${new Date(post.createdAt).toISOString()}</published>
    <updated>${new Date(post.updatedAt).toISOString()}</updated>
    <summary>${escapeXml(getExcerpt(post.content))}</summary>
  </entry>`,
  )
  .join("\n")}
</feed>`

  return new Response(atom, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}

async function getPublishedPosts() {
  if (!db) return []
  try {
    return await db.post.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, title: true, content: true, createdAt: true, updatedAt: true },
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
