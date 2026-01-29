"use client"

import type React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import { Loader2, MessageCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface QQVerifyFormProps {
  locale: string
  redirectUrl?: string
  dict: {
    title: string
    description: string
    qqNumber: string
    code: string
    submit: string
    submitting: string
    success: string
    howToGetCode: string
    step1: string
    step2: string
    step3: string
    errors: {
      invalidQQ: string
      invalidCode: string
      failed: string
    }
  }
}

export function QQVerifyForm({ locale, redirectUrl, dict }: QQVerifyFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({ qqNumber: "", code: "" })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const res = await fetch("/api/qq-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || dict.errors.failed)
        return
      }

      toast.success(dict.success)
      setTimeout(() => {
        window.location.href = redirectUrl || `/${locale}/guest/apply`
      }, 500)
    } catch {
      setError(dict.errors.failed)
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
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
          <MessageCircle className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{dict.title}</h1>
        <p className="mt-2 text-muted-foreground">{dict.description}</p>
      </div>

      <div className="rounded-lg bg-muted/50 p-4 space-y-2">
        <p className="text-sm font-medium text-foreground">{dict.howToGetCode}</p>
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
          <li>{dict.step1}</li>
          <li>{dict.step2}</li>
          <li>{dict.step3}</li>
        </ol>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </motion.div>
        )}

        <div className="space-y-4">
          <div className="relative">
            <Input
              id="qqNumber"
              type="text"
              placeholder=" "
              value={formData.qqNumber}
              onChange={(e) =>
                setFormData({ ...formData, qqNumber: e.target.value.replace(/\D/g, "").slice(0, 11) })
              }
              required
              disabled={isLoading}
              maxLength={11}
              className="peer pt-6 pb-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <Label
              htmlFor="qqNumber"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-300 peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs"
            >
              {dict.qqNumber}
            </Label>
          </div>

          <div className="relative">
            <Input
              id="code"
              type="text"
              placeholder=" "
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value.replace(/\D/g, "").slice(0, 6) })
              }
              required
              disabled={isLoading}
              maxLength={6}
              className="peer pt-6 pb-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <Label
              htmlFor="code"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-300 peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs"
            >
              {dict.code}
            </Label>
          </div>
        </div>

        <Button type="submit" className="group relative w-full overflow-hidden" disabled={isLoading}>
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80"
            initial={{ x: "-100%" }}
            whileHover={{ x: 0 }}
            transition={{ duration: 0.3 }}
          />
          <span className="relative z-10 flex items-center justify-center">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {dict.submitting}
              </>
            ) : (
              dict.submit
            )}
          </span>
        </Button>
      </form>
    </motion.div>
  )
}
