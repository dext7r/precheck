import Link from "next/link"
import { ExternalLink, MessageCircle, Github, Rss, FileCode2 } from "lucide-react"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { getQQGroups } from "@/lib/qq-groups"

interface FooterProps {
  dict: Dictionary
  locale: Locale
}

export async function Footer({ dict, locale }: FooterProps) {
  const navLinks = [
    { name: dict.footer.docs, href: `/${locale}/docs` },
    { name: dict.footer.privacy, href: `/${locale}/privacy` },
    { name: dict.footer.terms, href: `/${locale}/terms` },
    { name: dict.footer.license, href: `/${locale}/license` },
  ]

  const techLinks = [
    { name: "Sitemap", href: "/sitemap.xml" },
    { name: "RSS", href: "/feed.xml" },
    { name: "Atom", href: "/atom.xml" },
    { name: "Robots", href: "/robots.txt" },
    { name: "LLMs", href: "/llms.txt" },
  ]

  // 从数据库获取 QQ 群配置
  const qqGroupsData = await getQQGroups()
  const qqGroups = qqGroupsData.map((group, index) => ({
    name:
      group.name ||
      dict.footer[`qqGroup${index + 1}` as keyof typeof dict.footer] ||
      `群${index + 1}`,
    href: group.url,
    title: group.number,
  }))

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* 主内容区 */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* 品牌区 */}
          <div className="space-y-3">
            <Link href={`/${locale}`} className="inline-flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">L</span>
              </div>
              <span className="text-lg font-semibold">linux.do</span>
            </Link>
            <p className="text-sm text-muted-foreground">{dict.footer.description}</p>
            <a
              href="https://linux.do"
              className="inline-flex items-center gap-1.5 text-sm text-primary transition-colors hover:text-primary/80"
              target="_blank"
              rel="noopener noreferrer"
            >
              {dict.footer.visitCommunity}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* 导航链接 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">{dict.footer.navigation}</h3>
            <ul className="space-y-2">
              {navLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 社区 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">{dict.footer.community}</h3>
            <div className="space-y-2">
              <a
                href="https://github.com/dext7r/precheck"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-4 w-4" />
                GitHub
              </a>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MessageCircle className="h-4 w-4 shrink-0" />
                <span className="shrink-0">{dict.footer.qqGroupLabel}</span>
                <div className="flex flex-wrap gap-1">
                  {qqGroups.map((group) => (
                    <a
                      key={group.title}
                      href={group.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={group.title}
                      className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary transition-all hover:bg-primary hover:text-primary-foreground"
                    >
                      {group.name}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 技术资源 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">{dict.footer.techResources}</h3>
            <div className="flex flex-wrap gap-2">
              {techLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {link.name === "RSS" || link.name === "Atom" ? (
                    <Rss className="h-3 w-3" />
                  ) : (
                    <FileCode2 className="h-3 w-3" />
                  )}
                  {link.name}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* 版权区 */}
        <div className="mt-8 border-t border-border pt-6">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} linux.do. {dict.footer.copyright}
          </p>
        </div>
      </div>
    </footer>
  )
}
