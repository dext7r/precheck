"use client"

import Link from "next/link"
import { ExternalLink, Menu, X, User, MessageCircle, Play } from "lucide-react"
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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg">
      {/* 公告横幅 */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-b border-primary/20">
        <div className="flex items-center justify-center gap-3 px-4 py-2 text-sm font-medium sm:gap-4">
          <a
            href="https://www.bilibili.com/video/BV1rEzyBxEe8/?share_source=copy_web&vd_source=49695bdf86058dec57a6549df9ba1d52"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-foreground/90 transition-colors hover:text-primary"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20">
              <Play className="h-3 w-3 text-primary fill-primary" />
            </span>
            <span className="truncate">{dict.header.videoAnnouncement}</span>
          </a>
          <span className="text-muted-foreground/40">|</span>
          <a
            href="https://qm.qq.com/q/It6OPlkI8g"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-foreground/90 transition-colors hover:text-primary"
          >
            <MessageCircle className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{dict.header.qqAnnouncement}</span>
          </a>
        </div>
      </div>
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">L</span>
          </div>
          <span className="text-lg font-semibold">{dict.metadata?.title || "预申请系统"}</span>
        </Link>

        <div className="flex items-center gap-2">
          <LocaleSwitcher currentLocale={locale} />
          <ThemeToggle dict={dict} />
          <Button asChild variant="ghost" className="hidden sm:flex">
            <a href="https://github.com/dext7r/precheck" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-5 w-5" />
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
