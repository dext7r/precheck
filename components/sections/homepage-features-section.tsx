"use client"

import { motion } from "framer-motion"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Search, Gift } from "lucide-react"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

const icons = [FileText, Search, Gift]

interface HomepageFeaturesSectionProps {
  dict: Dictionary
  locale: Locale
}

export function HomepageFeaturesSection({ dict }: HomepageFeaturesSectionProps) {
  const { title, subtitle, items } = dict.homepage.features

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
    },
  }

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">{title}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid gap-8 md:grid-cols-3"
        >
          {items.map((feature: { title: string; description: string }, index: number) => {
            const Icon = icons[index]
            return (
              <motion.div key={index} variants={item} className="group">
                <Card className="relative overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-2 h-full">
                  {/* 渐变边框效果 */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/30 via-primary/20 to-primary/30 rounded-xl" />
                  <div className="absolute inset-[1px] bg-card/95 rounded-[11px]" />

                  <CardHeader className="relative pb-8">
                    <motion.div
                      className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 transition-all duration-300 group-hover:bg-primary group-hover:ring-primary group-hover:shadow-lg group-hover:shadow-primary/25"
                      whileHover={{ scale: 1.05, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <Icon className="h-7 w-7 text-primary transition-colors duration-300 group-hover:text-primary-foreground" />
                    </motion.div>
                    <CardTitle className="text-xl mb-3">{feature.title}</CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>

                  {/* 装饰光球 */}
                  <div className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl transition-all duration-500 group-hover:bg-primary/10 group-hover:scale-150" />
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
