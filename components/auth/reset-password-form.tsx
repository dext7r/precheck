"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, Mail, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getDictionaryEntry } from "@/lib/i18n/get-dictionary-entry"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

interface ResetPasswordFormProps {
  locale: Locale
  dict: Dictionary
}

interface UserInfo {
  email: string
  name: string | null
}

export function ResetPasswordForm({ locale, dict }: ResetPasswordFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [isLoading, setIsLoading] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [tokenError, setTokenError] = useState("")
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  })

  const t = dict.auth.resetPassword

  // 验证 token 并获取用户信息
  useEffect(() => {
    if (!token) {
      setIsValidating(false)
      return
    }

    const validateToken = async () => {
      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
        const data = await res.json()

        if (!res.ok) {
          setTokenError(resolveErrorMessage(data?.error))
        } else if (data.user) {
          setUserInfo(data.user)
        }
      } catch {
        setTokenError(t.invalidToken)
      } finally {
        setIsValidating(false)
      }
    }

    validateToken()
  }, [token, t.invalidToken])

  const resolveErrorMessage = (payload?: string | { code?: string; message?: string }) => {
    if (!payload) {
      return t.invalidToken
    }

    if (typeof payload === "string") {
      return payload
    }

    if (typeof payload.code === "string") {
      const dictValue = getDictionaryEntry(dict, payload.code)
      if (dictValue) {
        return dictValue
      }
    }

    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message
    }

    return t.invalidToken
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError(dict.auth.register.errors.passwordMismatch)
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: formData.password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(resolveErrorMessage(data?.error))
        return
      }

      setIsSuccess(true)
      // 跳转到后台
      setTimeout(() => {
        window.location.href = `/${locale}/dashboard`
      }, 1500)
    } catch {
      setError(t.invalidToken)
    } finally {
      setIsLoading(false)
    }
  }

  // 验证中
  if (isValidating) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 rounded-2xl border border-border/40 bg-card/50 p-8 text-center shadow-2xl backdrop-blur-xl"
      >
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">{t.submitting}</p>
      </motion.div>
    )
  }

  // Token 无效或已过期
  if (!token || tokenError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 rounded-2xl border border-border/40 bg-card/50 p-8 text-center shadow-2xl backdrop-blur-xl"
      >
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
          <p className="text-destructive">{tokenError || t.invalidToken}</p>
        </div>
        <Link href={`/${locale}/login`}>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t.backToLogin}
          </Button>
        </Link>
      </motion.div>
    )
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
          className="flex flex-col items-center gap-4 rounded-lg border border-border bg-muted/50 p-6"
        >
          <CheckCircle2 className="h-12 w-12 text-green-500" />
          <p className="text-center text-sm text-muted-foreground">{t.success}</p>
        </motion.div>
      ) : (
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

          {/* 用户信息展示（只读） */}
          {userInfo && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">{dict.auth.login.email}</p>
                  <p className="text-sm font-medium">{userInfo.email}</p>
                </div>
              </div>
              {userInfo.name && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">{dict.auth.register.name}</p>
                    <p className="text-sm font-medium">{userInfo.name}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t.password}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t.passwordPlaceholder}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={isLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t.confirmPassword}</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder={t.confirmPasswordPlaceholder}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>
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
