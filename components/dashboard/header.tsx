"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell, Menu, Mail, LogOut, User, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { LocaleSwitcher } from "@/components/ui/locale-switcher"
import { DashboardCommandMenu } from "@/components/dashboard/dashboard-command-menu"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

interface DashboardHeaderProps {
  locale: Locale
  dict: Dictionary
  user: { id: string; name?: string | null; email: string; avatar?: string | null }
  onMenuClick?: () => void
}

export function DashboardHeader({ locale, dict, user, onMenuClick }: DashboardHeaderProps) {
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)
  const [latestMessage, setLatestMessage] = useState<{
    id: string
    title: string
    createdAt: string
    readAt: string | null
  } | null>(null)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch("/api/dashboard/messages/summary")
        if (!res.ok) return
        const data = await res.json()
        setUnreadCount(data.unreadCount || 0)
        setLatestMessage(data.latest || null)
      } catch {
        // ignore
      }
    }
    fetchSummary()
  }, [])

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push(`/${locale}/login`)
      router.refresh()
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user.email[0].toUpperCase()

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-lg md:px-6">
      <div className="flex items-center gap-2 md:gap-4">
        {/* Mobile menu button */}
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>

        <DashboardCommandMenu locale={locale} />
      </div>

      <div className="flex items-center gap-3">
        <LocaleSwitcher currentLocale={locale} />
        <ThemeToggle dict={dict} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <div className="px-3 py-2">
              <p className="text-sm font-medium">{dict.dashboard.messages}</p>
              <p className="text-xs text-muted-foreground">
                {dict.dashboard.unreadCount.replace("{count}", unreadCount.toString())}
              </p>
            </div>
            <DropdownMenuSeparator />
            {latestMessage ? (
              <DropdownMenuItem asChild>
                <Link href={`/${locale}/dashboard/messages/${latestMessage.id}`}>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium line-clamp-2">{latestMessage.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(latestMessage.createdAt).toLocaleString(locale)}
                    </span>
                  </div>
                </Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem className="text-sm text-muted-foreground" disabled>
                {dict.dashboard.noMessages}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/${locale}/dashboard/messages`} className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {dict.dashboard.viewAllMessages}
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 border-l border-border pl-3 transition-colors hover:opacity-80">
              <Avatar className="h-9 w-9 cursor-pointer">
                <AvatarImage
                  src={user.avatar || undefined}
                  alt={user.name || dict.dashboard.userFallback}
                />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col md:flex text-left">
                <span className="text-sm font-medium">
                  {user.name || dict.dashboard.userFallback}
                </span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user.name || dict.dashboard.userFallback}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(`/${locale}/dashboard/settings`)}>
              <Settings className="mr-2 h-4 w-4" />
              <span>{dict.dashboard.settings}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>{dict.nav.logout}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
