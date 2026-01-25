"use client"

import { motion } from "framer-motion"
import { CheckCircle2, FileEdit, Shield, UserPlus } from "lucide-react"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

const icons = [FileEdit, Shield, CheckCircle2, UserPlus]

interface ProcessSectionProps {
  dict: Dictionary
  locale: Locale
}

export function ProcessSection({ dict }: ProcessSectionProps) {
  const { title, subtitle, steps } = dict.homepage.process

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* 背景 */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />

      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-3">{title}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
        </motion.div>

        {/* 桌面端：横向布局 */}
        <div className="hidden md:block relative">
          {/* 连接线 */}
          <div className="absolute top-12 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-primary/10 via-primary/30 to-primary/10" />

          <div className="grid gap-8 md:grid-cols-4">
            {steps.map((step: { title: string; description: string }, index: number) => {
              const Icon = icons[index]
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="relative group"
                >
                  <div className="flex flex-col items-center text-center">
                    <motion.div
                      className="relative z-10 mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30 ring-4 ring-background transition-transform duration-300 group-hover:scale-110"
                      whileHover={{ rotate: [0, -5, 5, 0] }}
                      transition={{ duration: 0.5 }}
                    >
                      <Icon className="h-10 w-10 text-primary-foreground" />
                    </motion.div>

                    {/* 步骤编号 */}
                    <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-background text-foreground text-xs font-bold ring-2 ring-primary/20 shadow-md">
                      {index + 1}
                    </div>

                    <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  {/* 箭头 */}
                  {index < steps.length - 1 && (
                    <motion.div
                      className="absolute top-12 -right-4 text-muted-foreground/40"
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </motion.div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* 移动端：垂直时间线 */}
        <div className="md:hidden relative">
          {/* 垂直连接线 */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 via-primary/20 to-primary/10" />

          <div className="space-y-8">
            {steps.map((step: { title: string; description: string }, index: number) => {
              const Icon = icons[index]
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="relative flex gap-4"
                >
                  {/* 圆形图标 */}
                  <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30">
                    <Icon className="h-6 w-6 text-primary-foreground" />
                    {/* 步骤编号 */}
                    <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-background text-foreground text-xs font-bold ring-1 ring-primary/20">
                      {index + 1}
                    </div>
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 pt-1">
                    <h3 className="font-semibold mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
