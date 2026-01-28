import { locales, defaultLocale } from "@/lib/i18n/config"
import { getBaseUrl } from "@/lib/seo"
import { db } from "@/lib/db"

export const revalidate = 3600

// 静态路由配置
const staticRoutes = [
  { path: "", changeFrequency: "daily", priority: 1.0 },
  { path: "/login", changeFrequency: "monthly", priority: 0.6 },
  { path: "/register", changeFrequency: "monthly", priority: 0.6 },
  { path: "/forgot-password", changeFrequency: "yearly", priority: 0.4 },
  { path: "/reset-password", changeFrequency: "yearly", priority: 0.3 },
  { path: "/pre-application", changeFrequency: "monthly", priority: 0.8 },
  { path: "/query-invite-codes", changeFrequency: "monthly", priority: 0.7 },
  { path: "/posts", changeFrequency: "daily", priority: 0.8 },
  { path: "/docs", changeFrequency: "weekly", priority: 0.8 },
  { path: "/docs/api", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/examples", changeFrequency: "monthly", priority: 0.6 },
  { path: "/changelog", changeFrequency: "weekly", priority: 0.7 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/license", changeFrequency: "yearly", priority: 0.3 },
]

function buildAlternates(baseUrl: string, path: string): string {
  const links = locales
    .map(
      (locale) =>
        `      <xhtml:link rel="alternate" hreflang="${locale}" href="${baseUrl}/${locale}${path}"/>`,
    )
    .join("\n")
  return `${links}\n      <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/${defaultLocale}${path}"/>`
}

function getLastModified(type: "static" | "dynamic" = "static"): string {
  if (type === "dynamic") {
    return new Date().toISOString()
  }
  return "2025-01-25T00:00:00.000Z"
}

export async function GET() {
  const baseUrl = getBaseUrl()
  const entries: string[] = []

  // 根路由
  entries.push(`  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${getLastModified("dynamic")}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
${buildAlternates(baseUrl, "")}
  </url>`)

  // 静态路由
  for (const route of staticRoutes) {
    if (route.path === "") continue
    entries.push(`  <url>
    <loc>${baseUrl}/${defaultLocale}${route.path}</loc>
    <lastmod>${getLastModified("static")}</lastmod>
    <changefreq>${route.changeFrequency}</changefreq>
    <priority>${route.priority}</priority>
${buildAlternates(baseUrl, route.path)}
  </url>`)
  }

  // 动态内容 - 已发布文章
  if (db) {
    try {
      const posts = await db.post.findMany({
        where: { status: "PUBLISHED" },
        select: {
          id: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 1000,
      })

      for (const post of posts) {
        const postPath = `/posts/${post.id}`
        entries.push(`  <url>
    <loc>${baseUrl}/${defaultLocale}${postPath}</loc>
    <lastmod>${post.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
${buildAlternates(baseUrl, postPath)}
  </url>`)
      }
    } catch (error) {
      console.warn("Sitemap: Database unavailable, skipping posts", error)
    }
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap-style.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>`

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
