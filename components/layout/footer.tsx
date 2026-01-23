import Link from "next/link"
import { ExternalLink, MessageCircle, Github } from "lucide-react"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

interface FooterProps {
  dict: Dictionary
  locale: Locale
}

export function Footer({ dict, locale }: FooterProps) {
  const footerLinks = [
    { name: dict.footer.privacy, href: `/${locale}/privacy` },
    { name: dict.footer.terms, href: `/${locale}/terms` },
  ]

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/${locale}`} className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">L</span>
              </div>
              <span className="text-lg font-semibold">linux.do</span>
            </Link>
            <a
              href="https://linux.do"
              className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              {dict.footer.visitCommunity || "访问社区"}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            {footerLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="transition-colors hover:text-primary"
              >
                {link.name}
              </Link>
            ))}
            <div className="flex items-center gap-1.5 text-sm">
              <MessageCircle className="h-4 w-4" />
              <span>QQ 群：</span>
              <span className="font-mono font-semibold text-foreground">1080464482</span>
            </div>
            <a
              href="https://github.com/dext7r/precheck"
              className="flex items-center gap-1.5 transition-colors hover:text-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="h-4 w-4" />
              <span>GitHub</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-6">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} linux.do. {dict.footer.copyright}
          </p>
        </div>
      </div>
    </footer>
  )
}
