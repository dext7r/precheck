"use client"

import { motion } from "framer-motion"
import { Boxes, Database, Globe, Layers, Lock, Palette, Rocket, Sparkles, Zap } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Dictionary } from "@/lib/i18n/get-dictionary"

interface FeaturesSectionProps {
  dict: Dictionary
}

export function FeaturesSection({ dict }: FeaturesSectionProps) {
  const features = [
    {
      icon: Zap,
      title: dict.features.items.fast.title,
      description: dict.features.items.fast.description,
    },
    {
      icon: Palette,
      title: dict.features.items.ui.title,
      description: dict.features.items.ui.description,
    },
    {
      icon: Database,
      title: dict.features.items.database.title,
      description: dict.features.items.database.description,
    },
    {
      icon: Globe,
      title: dict.features.items.deploy.title,
      description: dict.features.items.deploy.description,
    },
    {
      icon: Boxes,
      title: dict.features.items.docker.title,
      description: dict.features.items.docker.description,
    },
    {
      icon: Lock,
      title: dict.features.items.typeSafe.title,
      description: dict.features.items.typeSafe.description,
    },
    {
      icon: Layers,
      title: dict.features.items.modular.title,
      description: dict.features.items.modular.description,
    },
    {
      icon: Rocket,
      title: dict.features.items.cicd.title,
      description: dict.features.items.cicd.description,
    },
    {
      icon: Sparkles,
      title: dict.features.items.dx.title,
      description: dict.features.items.dx.description,
    },
  ]

  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{dict.features.title}</h2>
          <p className="mt-4 text-lg text-muted-foreground">{dict.features.description}</p>
        </motion.div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -8, scale: 1.02 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group"
            >
              <Card variant="glass" className="h-full relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-transform duration-300 group-hover:scale-110">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="mt-4">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
