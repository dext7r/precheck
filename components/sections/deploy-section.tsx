"use client"

import { motion } from "framer-motion"
import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CodeBlock } from "@/components/ui/code-block"
import type { Dictionary } from "@/lib/i18n/get-dictionary"

interface DeploySectionProps {
  dict: Dictionary
}

export function DeploySection({ dict }: DeploySectionProps) {
  const platforms = [
    {
      name: "Vercel",
      description: dict.deploy.platforms.vercel,
      url: "https://vercel.com/new",
      recommended: true,
      icon: (
        <svg viewBox="0 0 76 76" fill="currentColor" className="h-8 w-8">
          <path d="M38 0L76 76H0L38 0z" />
        </svg>
      ),
    },
    {
      name: "Netlify",
      description: dict.deploy.platforms.netlify,
      url: "https://app.netlify.com/start",
      icon: (
        <svg viewBox="0 0 256 256" fill="currentColor" className="h-8 w-8">
          <path d="M128 0L256 128L128 256L0 128L128 0z" />
        </svg>
      ),
    },
    {
      name: "Railway",
      description: dict.deploy.platforms.railway,
      url: "https://railway.app/new",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-8 w-8"
        >
          <path d="M4 12h16M4 6h16M4 18h16" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      name: "Fly.io",
      description: dict.deploy.platforms.flyio,
      url: "https://fly.io",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
        </svg>
      ),
    },
    {
      name: "Deno Deploy",
      description: dict.deploy.platforms.deno,
      url: "https://deno.com/deploy",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="4" fill="hsl(var(--background))" />
        </svg>
      ),
    },
    {
      name: "Render",
      description: dict.deploy.platforms.render,
      url: "https://render.com",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
          <path d="M12 2L22 8.5V15.5L12 22L2 15.5V8.5L12 2z" />
        </svg>
      ),
    },
  ]

  const dockerCode = `# Build and run with Docker Compose
docker compose up -d

# Or build manually
docker build -t next-starter .
docker run -p 3000:3000 next-starter`

  return (
    <section id="deploy" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{dict.deploy.title}</h2>
          <p className="mt-4 text-lg text-muted-foreground">{dict.deploy.description}</p>
        </motion.div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {platforms.map((platform, index) => (
            <motion.div
              key={platform.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card
                className={`group h-full transition-all hover:border-primary/50 hover:shadow-lg ${platform.recommended ? "ring-2 ring-primary/20" : ""}`}
              >
                <CardHeader>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="rounded-lg bg-primary/10 p-2 transition-colors group-hover:bg-primary/20">
                      {platform.icon}
                    </div>
                    {platform.recommended && (
                      <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                        {dict.deploy.recommended}
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-lg">{platform.name}</CardTitle>
                  <CardDescription>{platform.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" size="sm" className="w-full bg-transparent" asChild>
                    <a href={platform.url} target="_blank" rel="noopener noreferrer">
                      {dict.deploy.deployBtn}
                      <ExternalLink className="ml-2 h-3.5 w-3.5" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-12 rounded-xl border border-border bg-muted/50 p-6"
        >
          <h3 className="font-semibold">{dict.deploy.dockerTitle}</h3>
          <div className="mt-4">
            <CodeBlock code={dockerCode} language="bash" />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
