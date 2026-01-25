import type { MetadataRoute } from "next"
import { locales, defaultLocale } from "@/lib/i18n/config"
import { getBaseUrl, siteConfig } from "@/lib/seo"
import { db } from "@/lib/db"

// 缓存1小时
export const revalidate = 3600

// 静态路由配置
const staticRoutes = [
  // 首页
  { path: "", changeFrequency: "daily" as const, priority: 1.0 },
  // 认证相关
  { path: "/login", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/register", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/forgot-password", changeFrequency: "yearly" as const, priority: 0.4 },
  { path: "/reset-password", changeFrequency: "yearly" as const, priority: 0.3 },
  // 核心功能
  { path: "/pre-application", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/query-invite-codes", changeFrequency: "monthly" as const, priority: 0.7 },
  // 内容
  { path: "/posts", changeFrequency: "daily" as const, priority: 0.8 },
  // 文档
  { path: "/docs", changeFrequency: "weekly" as const, priority: 0.8 },
  { path: "/docs/api", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/docs/examples", changeFrequency: "monthly" as const, priority: 0.6 },
  // 法律
  { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/license", changeFrequency: "yearly" as const, priority: 0.3 },
]

// 构建多语言 alternates
function buildAlternates(baseUrl: string, path: string) {
  const languages: Record<string, string> = {
    "x-default": `${baseUrl}/${defaultLocale}${path}`,
  }
  for (const locale of locales) {
    languages[locale] = `${baseUrl}/${locale}${path}`
  }
  return { languages }
}

// 获取页面最后修改时间（基于部署时间或固定时间）
function getLastModified(type: "static" | "dynamic" = "static"): Date {
  if (type === "dynamic") {
    return new Date()
  }
  // 静态页面使用固定时间，避免每次构建都更新
  return new Date("2025-01-25T00:00:00Z")
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl()
  const sitemapEntries: MetadataRoute.Sitemap = []

  // 1. 根路由（不带语言前缀）
  sitemapEntries.push({
    url: baseUrl,
    lastModified: getLastModified("dynamic"),
    changeFrequency: "daily",
    priority: 1.0,
    alternates: buildAlternates(baseUrl, ""),
  })

  // 2. 静态路由
  for (const route of staticRoutes) {
    if (route.path === "") continue

    sitemapEntries.push({
      url: `${baseUrl}/${defaultLocale}${route.path}`,
      lastModified: getLastModified("static"),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: buildAlternates(baseUrl, route.path),
    })
  }

  // 3. 动态内容 - 已发布文章
  if (db) {
    try {
      const posts = await db.post.findMany({
        where: { status: "PUBLISHED" },
        select: {
          id: true,
          title: true,
          updatedAt: true,
          createdAt: true,
        },
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
    } catch (error) {
      console.warn("Sitemap: Database unavailable, skipping posts", error)
    }
  }

  return sitemapEntries
}

// 导出站点配置供其他 SEO 文件使用
export { siteConfig, getBaseUrl }
