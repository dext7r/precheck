import { db } from "@/lib/db"
import { getBaseUrl, siteConfig } from "@/lib/seo"
import { defaultLocale, locales } from "@/lib/i18n/config"
import { readFile } from "fs/promises"
import { join } from "path"

export const revalidate = 3600

interface ChangelogVersion {
  version: string
  date: string | null
  changes: Array<{ type: string; content: string }>
}

async function getChangelog(): Promise<ChangelogVersion[]> {
  try {
    const filePath = join(process.cwd(), "data/changelog.json")
    const content = await readFile(filePath, "utf-8")
    const data = JSON.parse(content)
    return data.versions || []
  } catch {
    return []
  }
}

// RSS 2.0 规范完整实现
export async function GET() {
  const baseUrl = getBaseUrl()
  const posts = await getPublishedPosts()
  const changelog = await getChangelog()
  const buildDate = new Date().toUTCString()
  const currentYear = new Date().getFullYear()

  // 站点分类
  const categories = ["Technology", "Linux", "Open Source", "Community", "Development"]

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/rss-style.xsl"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:media="http://search.yahoo.com/mrss/"
  xmlns:sy="http://purl.org/rss/1.0/modules/syndication/">
  <channel>
    <!-- 基本信息 -->
    <title>${escapeXml(siteConfig.name)}</title>
    <link>${baseUrl}</link>
    <description>${escapeXml(siteConfig.description)}</description>
    <language>zh-CN</language>
    <copyright>Copyright ${currentYear} ${escapeXml(siteConfig.name)}. All rights reserved.</copyright>

    <!-- 管理信息 -->
    <managingEditor>noreply@example.com (System Admin)</managingEditor>
    <webMaster>noreply@example.com (System Webmaster)</webMaster>

    <!-- 时间信息 -->
    <pubDate>${buildDate}</pubDate>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <ttl>60</ttl>

    <!-- 同步信息 -->
    <sy:updatePeriod>hourly</sy:updatePeriod>
    <sy:updateFrequency>1</sy:updateFrequency>

    <!-- 生成器 -->
    <generator>Next.js RSS Generator</generator>
    <docs>https://www.rssboard.org/rss-specification</docs>

    <!-- 自引用链接 -->
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    <atom:link href="${baseUrl}/atom.xml" rel="alternate" type="application/atom+xml" title="Atom Feed"/>

    <!-- 多语言链接 -->
${locales
  .map(
    (locale) =>
      `    <atom:link href="${baseUrl}/${locale}" rel="alternate" hreflang="${locale}" type="text/html"/>`,
  )
  .join("\n")}
    <atom:link href="${baseUrl}/${defaultLocale}" rel="alternate" hreflang="x-default" type="text/html"/>

    <!-- 站点图片 -->
    <image>
      <url>${baseUrl}/og-image.png</url>
      <title>${escapeXml(siteConfig.name)}</title>
      <link>${baseUrl}</link>
      <width>144</width>
      <height>144</height>
      <description>${escapeXml(siteConfig.description)}</description>
    </image>

    <!-- 分类 -->
${categories.map((cat) => `    <category>${cat}</category>`).join("\n")}

    <!-- 静态页面 -->
    <item>
      <title>使用指南 - User Guide</title>
      <link>${baseUrl}/zh/docs</link>
      <guid isPermaLink="true">${baseUrl}/zh/docs</guid>
      <pubDate>${new Date("2025-01-25").toUTCString()}</pubDate>
      <description>完整的 预申请系统使用指南，包含注册、申请、查询和使用邀请码的详细步骤。</description>
      <category>Documentation</category>
      <dc:creator>community</dc:creator>
    </item>

    <item>
      <title>API 参考 - API Reference</title>
      <link>${baseUrl}/zh/docs/api</link>
      <guid isPermaLink="true">${baseUrl}/zh/docs/api</guid>
      <pubDate>${new Date("2025-01-25").toUTCString()}</pubDate>
      <description>预申请系统 API 文档，包含接口说明和使用示例。</description>
      <category>Documentation</category>
      <category>API</category>
      <dc:creator>community</dc:creator>
    </item>

    <item>
      <title>示例代码 - Examples</title>
      <link>${baseUrl}/zh/docs/examples</link>
      <guid isPermaLink="true">${baseUrl}/zh/docs/examples</guid>
      <pubDate>${new Date("2025-01-25").toUTCString()}</pubDate>
      <description>实用的代码示例和最佳实践指南。</description>
      <category>Documentation</category>
      <category>Examples</category>
      <dc:creator>community</dc:creator>
    </item>

    <item>
      <title>更新日志 - Changelog</title>
      <link>${baseUrl}/zh/changelog</link>
      <guid isPermaLink="true">${baseUrl}/zh/changelog</guid>
      <pubDate>${changelog[0]?.date ? new Date(changelog[0].date).toUTCString() : buildDate}</pubDate>
      <description>查看系统更新记录，了解新功能和改进。当前版本：${changelog[0]?.version || "1.0.0"}</description>
      <category>Changelog</category>
      <dc:creator>community</dc:creator>
    </item>

    <!-- 更新日志版本 -->
${changelog
  .slice(0, 5)
  .map(
    (v) => `    <item>
      <title>版本 ${v.version} - Version ${v.version}</title>
      <link>${baseUrl}/zh/changelog#${v.version}</link>
      <guid isPermaLink="true">${baseUrl}/zh/changelog#${v.version}</guid>
      <pubDate>${v.date ? new Date(v.date).toUTCString() : buildDate}</pubDate>
      <description>${v.changes
        .slice(0, 3)
        .map((c) => `[${c.type}] ${c.content}`)
        .join("; ")}${v.changes.length > 3 ? "..." : ""}</description>
      <category>Changelog</category>
      <category>Release</category>
      <dc:creator>community</dc:creator>
    </item>`,
  )
  .join("\n")}

    <!-- 动态文章 -->
${posts
  .map(
    (post) => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${baseUrl}/zh/posts/${post.id}</link>
      <guid isPermaLink="true">${baseUrl}/zh/posts/${post.id}</guid>
      <pubDate>${new Date(post.createdAt).toUTCString()}</pubDate>
      <dc:creator>${escapeXml(post.author?.name || "预申请系统")}</dc:creator>
      <description>${escapeXml(getExcerpt(post.content, 300))}</description>
      <content:encoded><![CDATA[${formatContent(post.content)}]]></content:encoded>
      <category>Article</category>
    </item>`,
  )
  .join("\n")}
  </channel>
</rss>`

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "X-Content-Type-Options": "nosniff",
    },
  })
}

async function getPublishedPosts() {
  if (!db) return []
  try {
    return await db.post.findMany({
      where: { status: "PUBLISHED" },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: { name: true },
        },
      },
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

function formatContent(content: string | null): string {
  if (!content) return ""
  // 保留基本 HTML 格式，转换 Markdown 链接
  return content.replace(/\n/g, "<br/>").replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}
