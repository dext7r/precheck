import type { MetadataRoute } from "next"
import { locales, defaultLocale } from "@/lib/i18n/config"
import { getBaseUrl } from "@/lib/seo"
import { db } from "@/lib/db"

// 缓存1小时
export const revalidate = 3600

const staticRoutes = [
  { path: "", changeFrequency: "daily" as const, priority: 1.0 },
  { path: "/login", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/register", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/forgot-password", changeFrequency: "yearly" as const, priority: 0.4 },
  { path: "/pre-application", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/query-invite-codes", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/posts", changeFrequency: "daily" as const, priority: 0.8 },
  { path: "/docs", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/docs/api", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/docs/examples", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/license", changeFrequency: "yearly" as const, priority: 0.3 },
]

function buildAlternates(baseUrl: string, path: string) {
  const languages: Record<string, string> = {
    "x-default": `${baseUrl}/${defaultLocale}${path}`,
  }
  for (const locale of locales) {
    languages[locale] = `${baseUrl}/${locale}${path}`
  }
  return { languages }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl()
  const lastModified = new Date()
  const sitemapEntries: MetadataRoute.Sitemap = []

  // 根路由
  sitemapEntries.push({
    url: baseUrl,
    lastModified,
    changeFrequency: "daily",
    priority: 1.0,
    alternates: buildAlternates(baseUrl, ""),
  })

  // 静态路由（每个路由一个条目，使用默认语言 URL）
  for (const route of staticRoutes) {
    if (route.path === "") continue // 根路由已单独处理
    sitemapEntries.push({
      url: `${baseUrl}/${defaultLocale}${route.path}`,
      lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: buildAlternates(baseUrl, route.path),
    })
  }

  // 已发布文章
  if (db) {
    try {
      const posts = await db.post.findMany({
        where: { status: "PUBLISHED" },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 1000,
      })

      for (const post of posts) {
        const postPath = `/posts/${post.id}`
        sitemapEntries.push({
          url: `${baseUrl}/${defaultLocale}${postPath}`,
          lastModified: post.updatedAt,
          changeFrequency: "weekly",
          priority: 0.7,
          alternates: buildAlternates(baseUrl, postPath),
        })
      }
    } catch {
      console.warn("Sitemap: Database unavailable, skipping posts")
    }
  }

  return sitemapEntries
}
