"use client"

import { motion } from "framer-motion"
import { BookOpen, Eye, FileText, PenLine } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export type StatsIconName = "fileText" | "bookOpen" | "penLine" | "eye"

const iconMap: Record<StatsIconName, LucideIcon> = {
  fileText: FileText,
  bookOpen: BookOpen,
  penLine: PenLine,
  eye: Eye,
}

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon: StatsIconName
  trend?: {
    value: number
    isPositive: boolean
  }
  trendLabel?: string
  index?: number
}

export function StatsCard({
  title,
  value,
  description,
  icon,
  trend,
  trendLabel,
  index = 0,
}: StatsCardProps) {
  const Icon = iconMap[icon]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Card className="group relative overflow-hidden transition-shadow hover:shadow-lg hover:shadow-primary/10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <CardContent className="relative p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                className="text-3xl font-bold"
              >
                {value}
              </motion.p>
              {description && <p className="text-xs text-muted-foreground">{description}</p>}
              {trend && (
                <p
                  className={`text-xs font-medium ${trend.isPositive ? "text-green-500" : "text-red-500"}`}
                >
                  {trend.isPositive ? "+" : ""}
                  {trend.value}% {trendLabel || "from last month"}
                </p>
              )}
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 to-primary opacity-0 transition-opacity group-hover:opacity-100" />
      </Card>
    </motion.div>
  )
}
