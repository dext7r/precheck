import Link from "next/link"
import { Github, Twitter, Rss } from "lucide-react"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

interface FooterProps {
  dict: Dictionary
  locale: Locale
}

export function Footer({ dict, locale }: FooterProps) {
  const footerLinks = {
    product: [
      { name: dict.nav.features, href: `/${locale}#features` },
      { name: dict.nav.techStack, href: `/${locale}#stack` },
      { name: dict.nav.deploy, href: `/${locale}#deploy` },
    ],
    resources: [
      { name: dict.footer.documentation, href: `/${locale}/docs` },
      { name: dict.footer.apiReference, href: `/${locale}/docs/api` },
      { name: dict.footer.examples, href: `/${locale}/docs/examples` },
    ],
    legal: [
      { name: dict.footer.privacy, href: `/${locale}/privacy` },
      { name: dict.footer.terms, href: `/${locale}/terms` },
      { name: dict.footer.license, href: `/${locale}/license` },
    ],
  }

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Link href={`/${locale}`} className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">NS</span>
              </div>
              <span className="text-lg font-semibold">Next Starter</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">{dict.footer.description}</p>
            <div className="mt-4 flex gap-3">
              <a
                href="https://github.com/h7ml/next-starter"
                className="text-muted-foreground transition-colors hover:text-primary"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com"
                className="text-muted-foreground transition-colors hover:text-primary"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href={`/${locale}/feed.xml`}
                className="text-muted-foreground transition-colors hover:text-primary"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="RSS Feed"
              >
                <Rss className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">{dict.footer.product}</h3>
            <ul className="mt-4 space-y-2">
              {footerLinks.product.map((link) => (
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

          <div>
            <h3 className="text-sm font-semibold">{dict.footer.resources}</h3>
            <ul className="mt-4 space-y-2">
              {footerLinks.resources.map((link) => (
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

          <div>
            <h3 className="text-sm font-semibold">{dict.footer.legal}</h3>
            <ul className="mt-4 space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href={`/${locale}/feed.xml`}
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  RSS Feed
                </a>
              </li>
              <li>
                <a
                  href={`/${locale}/atom.xml`}
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Atom Feed
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Next Starter. {dict.footer.copyright}
          </p>
          {process.env.NEXT_PUBLIC_BUILD_TIME && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {dict.footer.deployTime}:{" "}
              {new Date(process.env.NEXT_PUBLIC_BUILD_TIME).toLocaleString(locale)}
            </p>
          )}
        </div>
      </div>
    </footer>
  )
}
