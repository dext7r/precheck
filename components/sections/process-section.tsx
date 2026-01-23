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
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            {title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {subtitle}
          </p>
        </motion.div>

        <div className="relative">
          {/* Connection line (hidden on mobile) */}
          <div className="absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent hidden md:block" />

          <div className="grid gap-8 md:grid-cols-4">
            {steps.map((step: { title: string; description: string }, index: number) => {
              const Icon = icons[index]
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="relative"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="relative z-10 mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30 ring-4 ring-background">
                      <Icon className="h-10 w-10 text-primary-foreground" />
                    </div>

                    {/* Step number */}
                    <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground text-sm font-bold ring-2 ring-background">
                      {index + 1}
                    </div>

                    <h3 className="mb-2 text-xl font-semibold">{step.title}</h3>
                    <p className="text-muted-foreground">
                      {step.description}
                    </p>
                  </div>

                  {/* Arrow (hidden on last item and mobile) */}
                  {index < steps.length - 1 && (
                    <div className="absolute top-12 -right-4 hidden md:block text-primary/30">
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
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
