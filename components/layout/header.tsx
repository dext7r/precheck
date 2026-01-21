"use client"

import Link from "next/link"
import { Github, Menu, X, User } from "lucide-react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { LocaleSwitcher } from "@/components/ui/locale-switcher"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

interface HeaderProps {
  locale: Locale
  dict: Dictionary
  user?: { name?: string | null; email: string } | null
  authEnabled?: boolean
}

export function Header({ locale, dict, user, authEnabled = true }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navigation = [
    { name: dict.nav.features, href: `/${locale}#features` },
    { name: dict.nav.techStack, href: `/${locale}#stack` },
    { name: dict.nav.deploy, href: `/${locale}#deploy` },
    { name: dict.nav.docs, href: `/${locale}/docs` },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">NS</span>
          </div>
          <span className="text-lg font-semibold">Next Starter</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            >
              {item.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <LocaleSwitcher currentLocale={locale} />
          <ThemeToggle dict={dict} />
          <Button variant="ghost" size="icon" asChild className="hidden sm:flex">
            <a
              href="https://github.com/h7ml/next-starter"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="h-5 w-5" />
              <span className="sr-only">GitHub</span>
            </a>
          </Button>

          {authEnabled && (
            <>
              {user ? (
                <>
                  <Button asChild variant="ghost" className="hidden sm:flex">
                    <Link href={`/${locale}/dashboard`}>
                      <User className="mr-2 h-4 w-4" />
                      {user.name || dict.nav.dashboard}
                    </Link>
                  </Button>
                  <form action="/api/auth/logout" method="POST" className="hidden sm:flex">
                    <Button type="submit" variant="ghost">
                      {dict.nav.logout}
                    </Button>
                  </form>
                </>
              ) : (
                <>
                  <Button asChild variant="ghost" className="hidden sm:flex">
                    <Link href={`/${locale}/login`}>{dict.nav.login}</Link>
                  </Button>
                  <Button asChild className="hidden sm:flex">
                    <Link href={`/${locale}/register`}>{dict.nav.register}</Link>
                  </Button>
                </>
              )}
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border md:hidden"
          >
            <div className="space-y-1 px-4 py-3">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              {authEnabled && (
                <div className="flex gap-2 pt-2">
                  {user ? (
                    <>
                      <Button asChild className="flex-1">
                        <Link href={`/${locale}/dashboard`}>{dict.nav.dashboard}</Link>
                      </Button>
                      <form action="/api/auth/logout" method="POST" className="flex-1">
                        <Button type="submit" variant="outline" className="w-full">
                          {dict.nav.logout}
                        </Button>
                      </form>
                    </>
                  ) : (
                    <>
                      <Button asChild variant="outline" className="flex-1 bg-transparent">
                        <Link href={`/${locale}/login`}>{dict.nav.login}</Link>
                      </Button>
                      <Button asChild className="flex-1">
                        <Link href={`/${locale}/register`}>{dict.nav.register}</Link>
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
