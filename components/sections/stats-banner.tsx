"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Users, FileCheck, CheckCircle, Ticket } from "lucide-react"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

interface StatsBannerProps {
  dict: Dictionary
  locale: Locale
}

interface Stats {
  users_count: number
  applications_count: number
  approved_count: number
  invite_codes_count: number
}

function formatNumber(num: number): string {
  if (num >= 10000000) {
    return (num / 1000000).toFixed(1) + "M"
  }
  if (num >= 10000) {
    return (num / 1000).toFixed(0) + "K"
  }
  return num.toLocaleString()
}

export function StatsBanner({ dict }: StatsBannerProps) {
  const [stats, setStats] = useState<Stats | null>(null)

  const t = dict.homepage.stats ?? {
    members: "Members",
    applications: "Applications",
    approved: "Approved",
    inviteCodes: "Invite Codes",
  }

  useEffect(() => {
    fetch("/api/system-stats")
      .then((res) => res.json())
      .then(setStats)
      .catch(() => {
        setStats({
          users_count: 0,
          applications_count: 0,
          approved_count: 0,
          invite_codes_count: 0,
        })
      })
  }, [])

  const statItems = [
    {
      icon: Users,
      value: stats ? formatNumber(stats.users_count) : "—",
      label: t.members ?? "Members",
    },
    {
      icon: FileCheck,
      value: stats ? formatNumber(stats.applications_count) : "—",
      label: t.applications ?? "Applications",
    },
    {
      icon: CheckCircle,
      value: stats ? formatNumber(stats.approved_count) : "—",
      label: t.approved ?? "Approved",
    },
    {
      icon: Ticket,
      value: stats ? formatNumber(stats.invite_codes_count) : "—",
      label: t.inviteCodes ?? "Invite Codes",
    },
  ]

  return (
    <section className="relative py-8 border-y border-border/40 bg-muted/20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8"
        >
          {statItems.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="flex flex-col items-center text-center"
            >
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-2xl font-bold tracking-tight sm:text-3xl">{stat.value}</span>
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
