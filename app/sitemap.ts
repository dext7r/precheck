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
  { path: "/pre-application", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/query-invite-codes", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/posts", changeFrequency: "daily" as const, priority: 0.8 },
  { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly" as const, priority: 0.3 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl()
  const lastModified = new Date()
  const sitemapEntries: MetadataRoute.Sitemap = []

  // 静态路由
  for (const locale of locales) {
    for (const route of staticRoutes) {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}${route.path}`,
        lastModified,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: {
          languages: locales.reduce(
            (acc, l) => {
              acc[l] = `${baseUrl}/${l}${route.path}`
              return acc
            },
            {} as Record<string, string>,
          ),
        },
      })
    }
  }

  // 默认语言根路由
  sitemapEntries.push({
    url: baseUrl,
    lastModified,
    changeFrequency: "daily",
    priority: 1.0,
    alternates: {
      languages: {
        [defaultLocale]: baseUrl,
        ...locales
          .filter((l) => l !== defaultLocale)
          .reduce(
            (acc, l) => {
              acc[l] = `${baseUrl}/${l}`
              return acc
            },
            {} as Record<string, string>,
          ),
      },
    },
  })

  // 已发布文章（限制1000篇，按更新时间倒序）
  if (db) {
    try {
      const posts = await db.post.findMany({
        where: { status: "PUBLISHED" },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 1000,
      })

      for (const post of posts) {
        for (const locale of locales) {
          sitemapEntries.push({
            url: `${baseUrl}/${locale}/posts/${post.id}`,
            lastModified: post.updatedAt,
            changeFrequency: "weekly",
            priority: 0.7,
            alternates: {
              languages: locales.reduce(
                (acc, l) => {
                  acc[l] = `${baseUrl}/${l}/posts/${post.id}`
                  return acc
                },
                {} as Record<string, string>,
              ),
            },
          })
        }
      }
    } catch (error) {
      // 数据库不可用时静默跳过，避免构建失败
      console.warn("Sitemap: Database unavailable, skipping posts")
    }
  }

  return sitemapEntries
}
