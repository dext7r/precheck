"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Eye, EyeOff, Loader2, Check, X, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { OAuthButtons } from "./oauth-buttons"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

interface RegisterFormProps {
  locale: Locale
  dict: Dictionary
  oauthProviders: Array<{ id: string; name: string }>
}

export function RegisterForm({ locale, dict, oauthProviders }: RegisterFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    verificationCode: "",
    agreeTerms: false,
  })
  const [sendingCode, setSendingCode] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const t = dict.auth.register
  const errorMap: Record<string, string> = {
    "Registration service not configured": t.errors.serviceUnavailable,
    "User registration is disabled": t.errors.registrationDisabled,
    "Email already registered": t.errors.emailExists,
    "Invalid email address": t.errors.invalidEmail,
    "Name must be at least 2 characters": t.errors.nameTooShort,
    "Registration failed": t.errors.failed,
  }

  const resolveErrorMessage = (message?: string) => {
    if (!message) {
      return t.errors.failed
    }
    if (errorMap[message]) {
      return errorMap[message]
    }
    if (message.startsWith("Password must be at least")) {
      return t.errors.passwordTooShort
    }
    if (message.includes("uppercase")) {
      return t.errors.passwordUppercase
    }
    if (message.includes("lowercase")) {
      return t.errors.passwordLowercase
    }
    if (message.includes("number")) {
      return t.errors.passwordNumber
    }
    return t.errors.failed
  }

  // 密码强度验证
  const passwordChecks = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    lowercase: /[a-z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
  }

  const isPasswordValid = Object.values(passwordChecks).every(Boolean)

  // 倒计时效果
  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // 发送验证码
  const handleSendCode = async () => {
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError(t.errors.invalidEmail)
      return
    }

    setSendingCode(true)
    setError("")

    try {
      const res = await fetch("/api/auth/send-verification-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, purpose: "register" }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 429 && data.waitSeconds) {
          setCountdown(data.waitSeconds)
          setError(`请等待 ${data.waitSeconds} 秒后再次发送`)
        } else {
          setError(data.error || "发送验证码失败")
        }
        return
      }

      setCountdown(60)
      setError("")
    } catch {
      setError("发送验证码失败，请稍后重试")
    } finally {
      setSendingCode(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError(t.errors.passwordMismatch)
      setIsLoading(false)
      return
    }

    if (!isPasswordValid) {
      setError(t.errors.weakPassword)
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          verificationCode: formData.verificationCode,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(resolveErrorMessage(data?.error))
        return
      }

      router.push(`/${locale}/dashboard`)
      router.refresh()
    } catch {
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
              id="name"
              type="text"
              placeholder=" "
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isLoading}
              className="peer pt-6 pb-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <Label
              htmlFor="name"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-300 peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs"
            >
              {t.name}
            </Label>
          </div>

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

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="verificationCode"
                type="text"
                placeholder=" "
                value={formData.verificationCode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    verificationCode: e.target.value.replace(/\D/g, "").slice(0, 6),
                  })
                }
                required
                disabled={isLoading}
                maxLength={6}
                className="peer pt-6 pb-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <Label
                htmlFor="verificationCode"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-300 peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs"
              >
                验证码
              </Label>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleSendCode}
              disabled={sendingCode || countdown > 0 || isLoading}
              className="whitespace-nowrap"
            >
              {sendingCode ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  发送中
                </>
              ) : countdown > 0 ? (
                `${countdown}秒后重试`
              ) : (
                <>
                  <Mail className="mr-1 h-3 w-3" />
                  发送验证码
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2">
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
            {formData.password && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  {passwordChecks.length ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <X className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span
                    className={passwordChecks.length ? "text-green-500" : "text-muted-foreground"}
                  >
                    {t.passwordChecks.length}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {passwordChecks.uppercase ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <X className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span
                    className={
                      passwordChecks.uppercase ? "text-green-500" : "text-muted-foreground"
                    }
                  >
                    {t.passwordChecks.uppercase}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {passwordChecks.lowercase ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <X className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span
                    className={
                      passwordChecks.lowercase ? "text-green-500" : "text-muted-foreground"
                    }
                  >
                    {t.passwordChecks.lowercase}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {passwordChecks.number ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <X className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span
                    className={passwordChecks.number ? "text-green-500" : "text-muted-foreground"}
                  >
                    {t.passwordChecks.number}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <Input
              id="confirmPassword"
              type="password"
              placeholder=" "
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              disabled={isLoading}
              className="peer pt-6 pb-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <Label
              htmlFor="confirmPassword"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-300 peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs"
            >
              {t.confirmPassword}
            </Label>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <Checkbox
            id="terms"
            checked={formData.agreeTerms}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, agreeTerms: checked as boolean })
            }
            required
          />
          <Label htmlFor="terms" className="text-sm font-normal leading-relaxed">
            {t.terms}
          </Label>
        </div>

        <Button
          type="submit"
          className="group relative w-full overflow-hidden"
          disabled={isLoading || !formData.agreeTerms}
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
          {t.hasAccount}{" "}
          <Link
            href={`/${locale}/login`}
            className="font-medium text-primary hover:text-primary/80"
          >
            {t.login}
          </Link>
        </p>
      </form>
    </motion.div>
  )
}
