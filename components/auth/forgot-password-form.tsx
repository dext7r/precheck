"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

interface ForgotPasswordFormProps {
  locale: Locale
  dict: Dictionary
}

export function ForgotPasswordForm({ locale, dict }: ForgotPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [email, setEmail] = useState("")

  const t = dict.auth.forgotPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      setIsSuccess(true)
    } catch {
      // 即使失败也显示成功（安全考虑）
      setIsSuccess(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md space-y-8 rounded-2xl border border-border/40 bg-card/50 p-8 shadow-2xl backdrop-blur-xl"
    >
      <div className="text-center">
        <Link href={`/${locale}`} className="inline-flex items-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <span className="text-lg font-bold text-primary-foreground">L</span>
          </div>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="mt-2 text-muted-foreground">{t.description}</p>
      </div>

      {isSuccess ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-muted/50 p-6">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-center text-sm text-muted-foreground">{t.success}</p>
          </div>
          <Link href={`/${locale}/login`}>
            <Button variant="outline" className="w-full bg-transparent">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.backToLogin}
            </Button>
          </Link>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">{t.email}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.submitting}
              </>
            ) : (
              t.submit
            )}
          </Button>

          <Link href={`/${locale}/login`}>
            <Button variant="ghost" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.backToLogin}
            </Button>
          </Link>
        </form>
      )}
    </motion.div>
  )
}
