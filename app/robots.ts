import type { MetadataRoute } from "next"
import { getBaseUrl } from "@/lib/seo"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl()

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/api/", // API接口
          "/admin/", // 管理后台
          "/dashboard/", // 用户控制台
          "/_next/", // Next.js内部资源
          "/private/", // 私有资源
          "/*/admin/", // 多语言管理后台
          "/*/dashboard/", // 多语言用户控制台
          "/*?queryCode=*", // 查询链接（防止重复索引）
          "/*?token=*", // 临时令牌链接
        ],
        crawlDelay: 1, // 限制爬取速率，避免服务器压力
      },
      {
        userAgent: "Googlebot",
        allow: ["/"],
        disallow: [
          "/api/",
          "/admin/",
          "/dashboard/",
          "/*/admin/",
          "/*/dashboard/",
        ],
        crawlDelay: 0.5, // Google爬虫可以更快
      },
      {
        userAgent: "Bingbot",
        allow: ["/"],
        disallow: [
          "/api/",
          "/admin/",
          "/dashboard/",
          "/*/admin/",
          "/*/dashboard/",
        ],
        crawlDelay: 1,
      },
      {
        userAgent: "Baiduspider",
        allow: ["/"],
        disallow: [
          "/api/",
          "/admin/",
          "/dashboard/",
          "/*/admin/",
          "/*/dashboard/",
        ],
        crawlDelay: 2, // 百度爬虫稍慢一些
      },
      {
        // 阻止AI爬虫（GPTBot、Claude-Web等）
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "Claude-Web",
          "CCBot",
          "anthropic-ai",
          "Omgilibot",
          "FacebookBot",
        ],
        disallow: ["/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
