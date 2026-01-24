"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
  LayoutDashboard,
  Users,
  Settings,
  Shield,
  Mail,
  ClipboardList,
  Key,
  ScrollText,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Home,
  Cog,
  Send,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

interface AdminSidebarProps {
  locale: Locale
  dict: Dictionary
  user?: { id: string; name?: string | null; email: string; role: string }
}

export function AdminSidebar({ locale, dict, user }: AdminSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const navigation = [
    { name: dict.dashboard.overview, href: `/${locale}/admin`, icon: LayoutDashboard },
    { name: dict.admin.users, href: `/${locale}/admin/users`, icon: Users },
    {
      name: dict.admin.preApplications,
      href: `/${locale}/admin/pre-applications`,
      icon: ClipboardList,
    },
    { name: dict.admin.inviteCodes, href: `/${locale}/admin/invite-codes`, icon: Key },
    { name: dict.admin.messages, href: `/${locale}/admin/messages`, icon: Mail },
    { name: dict.admin.emailLogs, href: `/${locale}/admin/email-logs`, icon: Send },
    { name: dict.admin.auditLogs, href: `/${locale}/admin/audit-logs`, icon: ScrollText },
    { name: dict.admin.settings, href: `/${locale}/admin/settings`, icon: Settings },
  ]

  if (user?.role === "SUPER_ADMIN") {
    navigation.push({
      name: dict.admin.systemConfig,
      href: `/${locale}/admin/system-config`,
      icon: Cog,
    })
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 280 }}
      className="sticky top-0 flex h-screen flex-col border-r border-border bg-card"
    >
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive">
              <Shield className="h-4 w-4 text-destructive-foreground" />
            </div>
            <span className="text-lg font-semibold">{dict.admin.title}</span>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-destructive">
            <Shield className="h-4 w-4 text-destructive-foreground" />
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
          const isActive =
            pathname === item.href ||
            (item.href !== `/${locale}/admin` && pathname.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}

        <div className="my-4 border-t border-border" />

        <Link
          href={`/${locale}/dashboard`}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <Home className="h-5 w-5 shrink-0" />
          {!collapsed && <span>{dict.admin.backToDashboard}</span>}
        </Link>
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
