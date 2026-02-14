"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config"
import { getDictionary, type Dictionary } from "@/lib/i18n/get-dictionary"
import Link from "next/link"
import {
  Mail,
  ClipboardList,
  ChevronRight,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  Inbox,
  Gift,
  Settings,
  Ticket,
  MessageCircle,
  MessageSquare,
  Activity,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { inviteCodeStorageEnabled } from "@/lib/invite-code/client"

interface DashboardPageProps {
  params: Promise<{ locale: string }>
}

interface UserInfo {
  id: string
  name?: string | null
  email: string
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function DashboardPage({ params }: DashboardPageProps) {
  const [locale, setLocale] = useState<Locale>("en")
  const [dict, setDict] = useState<Dictionary | null>(null)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    params.then(({ locale: l }) => {
      const currentLocale = locales.includes(l as Locale) ? (l as Locale) : defaultLocale
      setLocale(currentLocale)
      getDictionary(currentLocale).then(setDict)
    })
  }, [params])

  useEffect(() => {
    // 获取用户信息
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => setUser(data.user))
      .catch(() => null)

    // 获取未读消息数
    fetch("/api/dashboard/messages?page=1&pageSize=100")
      .then((res) => res.json())
      .then((data) => {
        const count = (data.messages || []).filter(
          (m: { readAt: string | null }) => !m.readAt,
        ).length
        setUnreadCount(count)
      })
      .catch(() => null)
  }, [])

  if (!dict) return null

  const t = dict.dashboard as Record<string, unknown>

  const quickNavItems = [
    {
      href: `/${locale}/dashboard/messages`,
      icon: Mail,
      title: dict.dashboard.messages,
      description: dict.dashboard.inbox,
      badge: unreadCount > 0 ? unreadCount : null,
      gradient: "from-blue-500/10 via-blue-500/5 to-transparent",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      href: `/${locale}/dashboard/pre-application`,
      icon: ClipboardList,
      title: dict.dashboard.preApplication,
      description: dict.preApplication.description,
      gradient: "from-violet-500/10 via-violet-500/5 to-transparent",
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-600 dark:text-violet-400",
    },
    {
      href: `/${locale}/dashboard/tickets`,
      icon: Ticket,
      title: (t.tickets as string) || "Tickets",
      description: (t.ticketsDesc as string) || "View and manage your support tickets",
      gradient: "from-orange-500/10 via-orange-500/5 to-transparent",
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-600 dark:text-orange-400",
    },
    {
      href: `/${locale}/dashboard/chat`,
      icon: MessageCircle,
      title: (t.chat as string) || "Chat Room",
      description: (t.chatDesc as string) || "Chat with community members",
      gradient: "from-cyan-500/10 via-cyan-500/5 to-transparent",
      iconBg: "bg-cyan-500/10",
      iconColor: "text-cyan-600 dark:text-cyan-400",
    },
    {
      href: `/${locale}/dashboard/private-chats`,
      icon: MessageSquare,
      title: (t.privateChats as string) || "Private Messages",
      description: (t.privateChatsDesc as string) || "Private conversations with admins",
      gradient: "from-pink-500/10 via-pink-500/5 to-transparent",
      iconBg: "bg-pink-500/10",
      iconColor: "text-pink-600 dark:text-pink-400",
    },
    {
      href: `/${locale}/dashboard/feed`,
      icon: Activity,
      title: (t.feed as string) || "申请动态",
      description: (t.feedDesc as string) || "查看最近的预申请提交与审核状态",
      gradient: "from-teal-500/10 via-teal-500/5 to-transparent",
      iconBg: "bg-teal-500/10",
      iconColor: "text-teal-600 dark:text-teal-400",
    },
    {
      href: `/${locale}/dashboard/contribute`,
      icon: Gift,
      title: dict.dashboard.contribute,
      description: dict.dashboard.contributeDesc,
      gradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      href: `/${locale}/dashboard/settings`,
      icon: Settings,
      title: dict.dashboard.settings,
      description: dict.dashboard.manageSettings,
      gradient: "from-slate-500/10 via-slate-500/5 to-transparent",
      iconBg: "bg-slate-500/10",
      iconColor: "text-slate-600 dark:text-slate-400",
    },
  ]

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* 欢迎区域 */}
      <motion.div variants={item} className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent rounded-2xl" />
        <div className="relative p-6 md:p-8">
          <div className="flex items-start gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
              className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25"
            >
              <Sparkles className="h-7 w-7 text-primary-foreground" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                {dict.dashboard.title}
              </h1>
              <p className="mt-1 text-muted-foreground truncate">
                {dict.dashboard.welcome}, {user?.name || user?.email || "..."}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 快捷导航 */}
      <motion.div variants={item}>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          {dict.dashboard.quickNav}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickNavItems.map((navItem, index) => (
            <Link key={navItem.href} href={navItem.href} className="group">
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-shadow duration-300">
                  <div
                    className={cn(
                      "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                      navItem.gradient,
                    )}
                  />
                  <CardContent className="relative p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0">
                        <div
                          className={cn(
                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
                            navItem.iconBg,
                          )}
                        >
                          <navItem.icon className={cn("h-6 w-6", navItem.iconColor)} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold truncate">{navItem.title}</p>
                            {navItem.badge && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground"
                              >
                                {navItem.badge > 99 ? "99+" : navItem.badge}
                              </motion.span>
                            )}
                          </div>
                          <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                            {navItem.description}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/50 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* 预申请指南 */}
      {dict.dashboard.preApplicationGuide && (
        <motion.div variants={item}>
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                {dict.dashboard.preApplicationGuide.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-6">
                {dict.dashboard.preApplicationGuide.description}
              </p>
              <div className="grid gap-6 md:grid-cols-3">
                {/* 申请步骤 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">1</span>
                    </div>
                    <p className="font-medium text-sm">
                      {dict.dashboard.preApplicationGuide.stepsTitle}
                    </p>
                  </div>
                  <ul className="space-y-2 pl-8">
                    {dict.dashboard.preApplicationGuide.steps.map((step: string, i: number) => (
                      <li
                        key={step}
                        className="text-sm text-muted-foreground flex items-start gap-2"
                      >
                        <span className="text-blue-500 font-medium shrink-0">{i + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 状态说明 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10">
                      <Clock className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="font-medium text-sm">
                      {dict.dashboard.preApplicationGuide.statusTitle}
                    </p>
                  </div>
                  <ul className="space-y-2 pl-8">
                    {dict.dashboard.preApplicationGuide.statuses.map((status: string) => (
                      <li
                        key={status}
                        className="text-sm text-muted-foreground flex items-start gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{status}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 注意事项 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/10">
                      <Inbox className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                    </div>
                    <p className="font-medium text-sm">
                      {dict.dashboard.preApplicationGuide.rulesTitle}
                    </p>
                  </div>
                  <ul className="space-y-2 pl-8">
                    {dict.dashboard.preApplicationGuide.rules.map((rule: string) => (
                      <li
                        key={rule}
                        className="text-sm text-muted-foreground flex items-start gap-2"
                      >
                        <span className="text-rose-500 shrink-0">•</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}
