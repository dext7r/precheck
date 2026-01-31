"use client"

import { motion } from "framer-motion"
import { Heart, Smile, Users, Award } from "lucide-react"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

interface TrustSectionProps {
  dict: Dictionary
  locale: Locale
}

const features = [{ icon: Heart }, { icon: Smile }, { icon: Users }, { icon: Award }]

export function TrustSection({ dict }: TrustSectionProps) {
  const t = dict.homepage.trust ?? {
    title: "Why Pre-Application System",
    subtitle: "Sincere, Friendly, United, Professional - Building a community we're proud of",
    items: [
      { title: "Sincere", description: "Be genuine and honest, reject deception" },
      { title: "Friendly", description: "Help every member warmly, reject arrogance" },
      { title: "United", description: "Build an ideal community together, reject isolation" },
      { title: "Professional", description: "Pursue excellence, reject mediocrity" },
    ],
  }

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-3">{t.title}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t.subtitle}</p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {t.items.map((item: { title: string; description: string }, index: number) => {
            const feature = features[index]
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="group flex flex-col items-center text-center p-6 rounded-xl border border-border/40 bg-card/30 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:bg-card/50"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-primary bg-primary/10 transition-transform duration-300 group-hover:scale-110">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
