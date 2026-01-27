import { db } from "@/lib/db"
import { getBaseUrl, siteConfig } from "@/lib/seo"
import { defaultLocale } from "@/lib/i18n/config"

export const revalidate = 3600

// Atom 1.0 规范完整实现
export async function GET() {
  const baseUrl = getBaseUrl()
  const posts = await getPublishedPosts()
  const staticPages = getStaticPages(baseUrl)
  const allEntries = [...staticPages, ...posts]
  const updated = allEntries[0]?.updatedAt || new Date()
  const currentYear = new Date().getFullYear()

  // 站点分类
  const categories = [
    { term: "technology", label: "Technology" },
    { term: "linux", label: "Linux" },
    { term: "open-source", label: "Open Source" },
    { term: "community", label: "Community" },
    { term: "development", label: "Development" },
  ]

  const atom = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/atom-style.xsl"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="zh-CN">
  <!-- Feed 元数据 -->
  <id>${baseUrl}/</id>
  <title type="text">${escapeXml(siteConfig.name)}</title>
  <subtitle type="text">${escapeXml(siteConfig.description)}</subtitle>
  <updated>${new Date(updated).toISOString()}</updated>

  <!-- 版权 -->
  <rights type="text">Copyright ${currentYear} ${escapeXml(siteConfig.name)}. All rights reserved. Licensed under MIT.</rights>

  <!-- 链接 -->
  <link href="${baseUrl}/atom.xml" rel="self" type="application/atom+xml"/>
  <link href="${baseUrl}/feed.xml" rel="alternate" type="application/rss+xml" title="RSS Feed"/>
  <link href="${baseUrl}" rel="alternate" type="text/html"/>
  <link href="${baseUrl}/zh" rel="alternate" type="text/html" hreflang="zh"/>
  <link href="${baseUrl}/en" rel="alternate" type="text/html" hreflang="en"/>
  <link href="${baseUrl}/${defaultLocale}" rel="alternate" type="text/html" hreflang="x-default"/>

  <!-- 作者信息 -->
  <author>
    <name>community</name>
    <uri>${siteConfig.links.community}</uri>
    <email>noreply@example.com</email>
  </author>

  <!-- 贡献者 -->
  <contributor>
    <name>Community</name>
    <uri>${siteConfig.links.community}</uri>
  </contributor>

  <!-- 图标 -->
  <icon>${baseUrl}/favicon.ico</icon>
  <logo>${baseUrl}/og-image.png</logo>

  <!-- 生成器 -->
  <generator uri="https://nextjs.org/" version="16">Next.js Atom Generator</generator>

  <!-- 分类 -->
${categories.map((cat) => `  <category term="${cat.term}" label="${cat.label}"/>`).join("\n")}

  <!-- 静态页面条目 -->
  <entry>
    <id>${baseUrl}/zh/docs</id>
    <title type="text">使用指南 - User Guide</title>
    <link href="${baseUrl}/zh/docs" rel="alternate" type="text/html"/>
    <link href="${baseUrl}/en/docs" rel="alternate" type="text/html" hreflang="en"/>
    <published>${new Date("2025-01-25").toISOString()}</published>
    <updated>${new Date("2025-01-25").toISOString()}</updated>
    <author>
      <name>community</name>
    </author>
    <category term="documentation" label="Documentation"/>
    <summary type="text">完整的 预申请系统使用指南，包含注册、申请、查询和使用邀请码的详细步骤。</summary>
    <content type="html"><![CDATA[
      <h2>流程概览</h2>
      <ol>
        <li>在本平台注册账号</li>
        <li>填写并提交预申请表单</li>
        <li>等待管理员审核（通常 1-3 个工作日）</li>
        <li>审核通过后获取邀请码</li>
        <li>使用邀请码注册</li>
      </ol>
      <p><a href="${baseUrl}/zh/docs">查看完整指南 →</a></p>
    ]]></content>
  </entry>

  <entry>
    <id>${baseUrl}/zh/docs/api</id>
    <title type="text">API 参考 - API Reference</title>
    <link href="${baseUrl}/zh/docs/api" rel="alternate" type="text/html"/>
    <link href="${baseUrl}/en/docs/api" rel="alternate" type="text/html" hreflang="en"/>
    <published>${new Date("2025-01-25").toISOString()}</published>
    <updated>${new Date("2025-01-25").toISOString()}</updated>
    <author>
      <name>community</name>
    </author>
    <category term="documentation" label="Documentation"/>
    <category term="api" label="API"/>
    <summary type="text">预申请系统 API 文档，包含接口说明和使用示例。</summary>
  </entry>

  <entry>
    <id>${baseUrl}/zh/docs/examples</id>
    <title type="text">示例代码 - Examples</title>
    <link href="${baseUrl}/zh/docs/examples" rel="alternate" type="text/html"/>
    <link href="${baseUrl}/en/docs/examples" rel="alternate" type="text/html" hreflang="en"/>
    <published>${new Date("2025-01-25").toISOString()}</published>
    <updated>${new Date("2025-01-25").toISOString()}</updated>
    <author>
      <name>community</name>
    </author>
    <category term="documentation" label="Documentation"/>
    <category term="examples" label="Examples"/>
    <summary type="text">实用的代码示例和最佳实践指南。</summary>
  </entry>

  <entry>
    <id>${baseUrl}/zh/query-invite-codes</id>
    <title type="text">查询邀请码 - Query Invite Codes</title>
    <link href="${baseUrl}/zh/query-invite-codes" rel="alternate" type="text/html"/>
    <link href="${baseUrl}/en/query-invite-codes" rel="alternate" type="text/html" hreflang="en"/>
    <published>${new Date("2025-01-25").toISOString()}</published>
    <updated>${new Date("2025-01-25").toISOString()}</updated>
    <author>
      <name>community</name>
    </author>
    <category term="feature" label="Feature"/>
    <summary type="text">使用查询码查看申请状态、审核意见和邀请码。</summary>
  </entry>

  <entry>
    <id>${baseUrl}/zh/privacy</id>
    <title type="text">隐私政策 - Privacy Policy</title>
    <link href="${baseUrl}/zh/privacy" rel="alternate" type="text/html"/>
    <link href="${baseUrl}/en/privacy" rel="alternate" type="text/html" hreflang="en"/>
    <published>${new Date("2025-01-01").toISOString()}</published>
    <updated>${new Date("2025-01-01").toISOString()}</updated>
    <author>
      <name>community</name>
    </author>
    <category term="legal" label="Legal"/>
    <summary type="text">我们如何收集、使用和保护您的数据。</summary>
  </entry>

  <entry>
    <id>${baseUrl}/zh/terms</id>
    <title type="text">服务条款 - Terms of Service</title>
    <link href="${baseUrl}/zh/terms" rel="alternate" type="text/html"/>
    <link href="${baseUrl}/en/terms" rel="alternate" type="text/html" hreflang="en"/>
    <published>${new Date("2025-01-01").toISOString()}</published>
    <updated>${new Date("2025-01-01").toISOString()}</updated>
    <author>
      <name>community</name>
    </author>
    <category term="legal" label="Legal"/>
    <summary type="text">使用我们服务的条款和条件。</summary>
  </entry>

  <entry>
    <id>${baseUrl}/zh/license</id>
    <title type="text">许可证 - License</title>
    <link href="${baseUrl}/zh/license" rel="alternate" type="text/html"/>
    <link href="${baseUrl}/en/license" rel="alternate" type="text/html" hreflang="en"/>
    <published>${new Date("2025-01-01").toISOString()}</published>
    <updated>${new Date("2025-01-01").toISOString()}</updated>
    <author>
      <name>community</name>
    </author>
    <category term="legal" label="Legal"/>
    <summary type="text">MIT 许可证 - 开源且免费使用。</summary>
  </entry>

  <!-- 动态文章条目 -->
${posts
  .map(
    (post) => `  <entry>
    <id>${baseUrl}/zh/posts/${post.id}</id>
    <title type="text">${escapeXml(post.title)}</title>
    <link href="${baseUrl}/zh/posts/${post.id}" rel="alternate" type="text/html"/>
    <link href="${baseUrl}/en/posts/${post.id}" rel="alternate" type="text/html" hreflang="en"/>
    <published>${new Date(post.createdAt).toISOString()}</published>
    <updated>${new Date(post.updatedAt).toISOString()}</updated>
    <author>
      <name>${escapeXml(post.author?.name || "预申请系统")}</name>
    </author>
    <category term="article" label="Article"/>
    <summary type="text">${escapeXml(getExcerpt(post.content, 300))}</summary>
    <content type="html"><![CDATA[${formatContent(post.content)}]]></content>
  </entry>`,
  )
  .join("\n")}
</feed>`

  return new Response(atom, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "X-Content-Type-Options": "nosniff",
    },
  })
}

// 静态页面信息
function getStaticPages(baseUrl: string) {
  return [
    {
      id: `${baseUrl}/zh/docs`,
      updatedAt: new Date("2025-01-25"),
    },
  ]
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
