"use client"

import Link from "next/link"
import { ArrowRight, Search, Sparkles, UserPlus, ClipboardCheck } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

interface HeroSectionProps {
  dict: Dictionary
  locale: Locale
}

export function HeroSection({ dict, locale }: HeroSectionProps) {
  const heroActions = dict.hero.actions
  const actions = [
    {
      icon: UserPlus,
      title: heroActions?.apply?.title,
      description: heroActions?.apply?.description,
      href: `/${locale}/dashboard/pre-application`,
      primary: true,
    },
    {
      icon: Search,
      title: heroActions?.query?.title,
      description: heroActions?.query?.description,
      href: `/${locale}/query-invite-codes`,
      primary: false,
    },
  ]

  return (
    <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden flex items-center">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
      <motion.div
        className="absolute inset-0 -z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <motion.div
          className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-primary/20 blur-3xl"
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/3 right-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
          animate={{ x: [0, -30, 0], y: [0, 50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.15,
              },
            },
          }}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
            <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {dict.hero.badge}
            </Badge>
          </motion.div>

          <motion.h1
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
          >
            {dict.hero.title}{" "}
            <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent animate-gradient">
              {dict.hero.titleHighlight}
            </span>
          </motion.h1>

          <motion.p
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            className="mt-6 text-pretty text-lg text-muted-foreground sm:text-xl"
          >
            {dict.hero.description}
          </motion.p>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            className="mt-12 grid gap-6 sm:grid-cols-2"
          >
            {actions.map((action, index) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="group"
              >
                <Link href={action.href}>
                  <Card
                    className={`h-full cursor-pointer transition-all ${
                      action.primary
                        ? "border-primary/50 bg-primary/5 hover:border-primary hover:bg-primary/10"
                        : "hover:border-primary/50 hover:bg-primary/5"
                    }`}
                  >
                    <CardHeader className="pb-2">
                      <div
                        className={`mb-2 flex h-12 w-12 items-center justify-center rounded-lg transition-colors ${
                          action.primary
                            ? "bg-primary text-primary-foreground"
                            : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                        }`}
                      >
                        <action.icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        {action.title}
                        <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base">{action.description}</CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-12 flex items-center justify-center gap-2 text-sm text-muted-foreground"
          >
            <ClipboardCheck className="h-4 w-4" />
            <span>{dict.hero.tip}</span>
            <Button variant="link" asChild className="h-auto p-0">
              <Link href={`/${locale}/login`}>{dict.nav.login}</Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
