"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Turnstile } from "@/components/ui/turnstile"
import { OAuthButtons } from "./oauth-buttons"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""
const TURNSTILE_ENABLED = Boolean(TURNSTILE_SITE_KEY)

interface LoginFormProps {
  locale: Locale
  dict: Dictionary
  oauthProviders: Array<{ id: string; name: string }>
}

export function LoginForm({ locale, dict, oauthProviders }: LoginFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [turnstileToken, setTurnstileToken] = useState("")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  })

  const t = dict.auth.login
  const errorMap: Record<string, string> = {
    "Authentication service not configured": t.errors.serviceUnavailable,
    "Invalid email or password": t.errors.invalid,
    "Invalid email address": t.errors.invalidEmail,
    "Password is required": t.errors.passwordRequired,
    "Login failed": t.errors.failed,
  }

  const resolveErrorMessage = (message?: string) => {
    if (!message) {
      return t.errors.failed
    }
    return errorMap[message] || t.errors.failed
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (TURNSTILE_ENABLED && !turnstileToken) {
      setError(dict.auth.errors?.turnstileRequired || "Please complete the verification")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          turnstileToken: TURNSTILE_ENABLED ? turnstileToken : undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(resolveErrorMessage(data?.error))
        setError(resolveErrorMessage(data?.error))
        return
      }

      // 登录成功，显示提示并跳转
      toast.success(t.success)
      setTimeout(() => {
        window.location.href = `/${locale}/dashboard`
      }, 500)
    } catch (err) {
      console.error("Login error:", err)
      setError(t.errors.failed)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuth = (provider: string) => {
    window.location.href = `/api/auth/${provider}`
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
              id="email"
              type="email"
              placeholder=" "
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={isLoading}
              className="peer pt-6 pb-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <Label
              htmlFor="email"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-300 peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs"
            >
              {t.email}
            </Label>
          </div>

          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder=" "
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              disabled={isLoading}
              className="peer pt-6 pb-2 pr-10 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <Label
              htmlFor="password"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-300 peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs"
            >
              {t.password}
            </Label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={formData.rememberMe}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, rememberMe: checked as boolean })
              }
            />
            <Label htmlFor="remember" className="text-sm font-normal">
              {t.rememberMe}
            </Label>
          </div>
          <Link
            href={`/${locale}/forgot-password`}
            className="text-sm font-medium text-primary hover:text-primary/80"
          >
            {t.forgotPassword}
          </Link>
        </div>

        {TURNSTILE_ENABLED && (
          <Turnstile
            siteKey={TURNSTILE_SITE_KEY}
            onVerify={(token) => setTurnstileToken(token)}
            onError={() => setTurnstileToken("")}
            onExpire={() => setTurnstileToken("")}
          />
        )}

        <Button
          type="submit"
          className="group relative w-full overflow-hidden"
          disabled={isLoading || (TURNSTILE_ENABLED && !turnstileToken)}
        >
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
                {t.submitting}
              </>
            ) : (
              t.submit
            )}
          </span>
        </Button>

        <OAuthButtons
          providers={oauthProviders}
          isLoading={isLoading}
          onOAuth={handleOAuth}
          dict={{ orContinueWith: t.orContinueWith }}
        />

        <p className="text-center text-sm text-muted-foreground">
          {t.noAccount}{" "}
          <Link
            href={`/${locale}/register`}
            className="font-medium text-primary hover:text-primary/80"
          >
            {t.register}
          </Link>
        </p>
      </form>
    </motion.div>
  )
}
