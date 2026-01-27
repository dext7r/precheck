"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight, Search, Sparkles } from "lucide-react"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

interface CTASectionProps {
  dict: Dictionary
  locale: Locale
}

export function CTASection({ dict, locale }: CTASectionProps) {
  const { title, subtitle, applyButton, queryButton, trustIndicators } = dict.homepage.cta

  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* 背景渐变 */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-primary/10" />

      {/* 网格背景 */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      {/* 浮动光球 */}
      <motion.div
        className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-primary/20 blur-3xl"
        animate={{ x: [0, 60, 0], y: [0, 40, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-primary/15 blur-3xl"
        animate={{ x: [0, -40, 0], y: [0, 60, 0], scale: [1, 0.9, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/2 right-1/3 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
        animate={{ x: [0, 30, 0], y: [0, -30, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* 徽章 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary"
          >
            <Sparkles className="h-4 w-4" />
            <span>开启您的社区之旅</span>
          </motion.div>

          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl mb-6 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
            {title}
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link href={`/${locale}/dashboard/pre-application`}>
                <Button size="lg" variant="glow" className="group min-w-[220px] h-12 text-base">
                  {applyButton}
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link href={`/${locale}/query-invite-codes`}>
                <Button
                  size="lg"
                  variant="outline"
                  className="min-w-[220px] h-12 text-base bg-background/50 backdrop-blur-sm"
                >
                  <Search className="mr-2 h-5 w-5" />
                  {queryButton}
                </Button>
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* 信任指标 */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-muted-foreground"
        >
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            <span>{trustIndicators.fastReview}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75"
                style={{ animationDelay: "0.2s" }}
              />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            <span>{trustIndicators.transparent}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75"
                style={{ animationDelay: "0.4s" }}
              />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            <span>{trustIndicators.friendly}</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
