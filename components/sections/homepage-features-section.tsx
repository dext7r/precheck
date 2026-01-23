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
        staggerChildren: 0.1,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  }

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            {title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {subtitle}
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid gap-6 md:grid-cols-3"
        >
          {items.map((feature: { title: string; description: string }, index: number) => {
            const Icon = icons[index]
            return (
              <motion.div key={index} variants={item}>
                <Card className="relative overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 h-full">
                  <CardHeader className="pb-8">
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-primary/5 blur-2xl" />
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
