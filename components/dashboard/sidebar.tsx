"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
  LayoutDashboard,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Mail,
  ClipboardList,
  Shield,
  Gift,
  Settings,
  Ticket,
  MessageCircle,
  MessageSquare,
  Activity,
} from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

interface DashboardSidebarProps {
  locale: Locale
  dict: Dictionary
  user: { id: string; name?: string | null; email: string; role: string }
}

export function DashboardSidebar({ locale, dict, user }: DashboardSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [unreadPrivateChatCount, setUnreadPrivateChatCount] = useState(0)

  useEffect(() => {
    const fetchUnreadCounts = async () => {
      try {
        const [msgRes, chatRes] = await Promise.all([
          fetch("/api/dashboard/messages?page=1&pageSize=100"),
          fetch("/api/private-chats"),
        ])
        if (msgRes.ok) {
          const data = await msgRes.json()
          const count = (data.messages || []).filter(
            (m: { readAt: string | null }) => !m.readAt,
          ).length
          setUnreadCount(count)
        }
        if (chatRes.ok) {
          const { chats } = await chatRes.json()
          const total = (chats || []).reduce(
            (sum: number, c: { unreadCount: number }) => sum + (c.unreadCount || 0),
            0,
          )
          setUnreadPrivateChatCount(total)
        }
      } catch (error) {
        console.error("Failed to fetch unread counts:", error)
      }
    }
    fetchUnreadCounts()
    const interval = setInterval(fetchUnreadCounts, 30000)
    return () => clearInterval(interval)
  }, [])

  const navigation = [
    { name: dict.dashboard.overview, href: `/${locale}/dashboard`, icon: LayoutDashboard },
    { name: dict.dashboard.messages, href: `/${locale}/dashboard/messages`, icon: Mail },
    {
      name: dict.dashboard.preApplication,
      href: `/${locale}/dashboard/pre-application`,
      icon: ClipboardList,
    },
    {
      name: ((dict.dashboard as unknown as Record<string, unknown>).tickets as string) || "工单",
      href: `/${locale}/dashboard/tickets`,
      icon: Ticket,
    },
    {
      name: ((dict.dashboard as unknown as Record<string, unknown>).chat as string) || "聊天室",
      href: `/${locale}/dashboard/chat`,
      icon: MessageCircle,
    },
    {
      name:
        ((dict.dashboard as unknown as Record<string, unknown>).privateChats as string) || "私信",
      href: `/${locale}/dashboard/private-chats`,
      icon: MessageSquare,
    },
    {
      name: ((dict.dashboard as unknown as Record<string, unknown>).feed as string) || "申请动态",
      href: `/${locale}/dashboard/feed`,
      icon: Activity,
    },
    {
      name: dict.dashboard.contribute,
      href: `/${locale}/dashboard/contribute`,
      icon: Gift,
    },
    {
      name: dict.dashboard.settings,
      href: `/${locale}/dashboard/settings`,
      icon: Settings,
    },
  ]

  const adminLink =
    user.role === "ADMIN" || user.role === "SUPER_ADMIN"
      ? { name: dict.admin.title, href: `/${locale}/admin`, icon: Shield }
      : null

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 280 }}
      className="sticky top-0 flex h-screen flex-col border-r border-border bg-card"
    >
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        {!collapsed && (
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">L</span>
            </div>
            <span className="text-lg font-semibold">{dict.dashboard.title}</span>
          </Link>
        )}
        {collapsed && (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">L</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 rounded-lg bg-primary/10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <item.icon className="relative h-5 w-5 shrink-0 transition-transform group-hover:scale-110" />
              {!collapsed && <span className="relative">{item.name}</span>}
              {(item.href === `/${locale}/dashboard/messages` && unreadCount > 0 ||
                item.href === `/${locale}/dashboard/private-chats` && unreadPrivateChatCount > 0) && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    "relative flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground",
                    collapsed ? "absolute -right-1 -top-1" : "ml-auto",
                  )}
                  style={collapsed ? { boxShadow: "0 0 0 2px hsl(var(--card))" } : {}}
                >
                  {(() => {
                    const count = item.href === `/${locale}/dashboard/private-chats` ? unreadPrivateChatCount : unreadCount
                    return count > 99 ? "99+" : count
                  })()}
                </motion.span>
              )}
            </Link>
          )
        })}

        {adminLink && (
          <>
            <div className="my-4 border-t border-border" />
            <Link
              href={adminLink.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith(adminLink.href)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
              )}
            >
              {pathname.startsWith(adminLink.href) && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 rounded-lg bg-primary/10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <adminLink.icon className="relative h-5 w-5 shrink-0 transition-transform group-hover:scale-110" />
              {!collapsed && <span className="relative">{adminLink.name}</span>}
            </Link>
          </>
        )}
      </nav>

      <div className="border-t border-border p-4">
        <form action="/api/auth/logout" method="POST">
          <Button
            type="submit"
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 text-muted-foreground hover:text-destructive",
              collapsed && "justify-center",
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{dict.admin.logout}</span>}
          </Button>
        </form>
      </div>
    </motion.aside>
  )
}
