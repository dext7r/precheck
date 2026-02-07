"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getDictionaryEntry } from "@/lib/i18n/get-dictionary-entry"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

interface ReactivateFormProps {
  locale: Locale
  dict: Dictionary
}

type ReactivateStatus = "loading" | "success" | "error" | "idle"

export function ReactivateForm({ locale, dict }: ReactivateFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<ReactivateStatus>("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [countdown, setCountdown] = useState(30)
  const [canRetry, setCanRetry] = useState(false)

  const t = dict.auth.reactivate

  const resolveErrorMessage = useCallback(
    (payload?: string | { code?: string; message?: string }) => {
      if (!payload) {
        return t.failedMessage
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

      return t.failedMessage
    },
    [dict, t.failedMessage],
  )

  // 激活账户
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    const reactivate = async () => {
      if (!token) {
        setStatus("error")
        setErrorMessage("缺少激活链接")
        setCanRetry(true)
        return
      }

      setStatus("loading")
      setErrorMessage("")

      try {
        const res = await fetch(`/api/auth/reactivate?token=${encodeURIComponent(token)}`)
        const data = await res.json()

        if (!res.ok) {
          setStatus("error")
          setErrorMessage(resolveErrorMessage(data?.error))
          setCanRetry(true)
          return
        }

        setStatus("success")
      } catch {
        setStatus("error")
        setErrorMessage("网络错误，请检查连接后重试")
        setCanRetry(true)
      }
    }

    reactivate()
  }, [token, resolveErrorMessage])

  // 成功状态下的倒计时和自动跳转
  useEffect(() => {
    if (status !== "success") return

    if (countdown <= 0) {
      router.push(`/${locale}/login`)
      return
    }

    const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    return () => clearTimeout(timer)
  }, [status, countdown, locale, router])

  // 加载状态
  if (status === "loading") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 rounded-2xl border border-border/40 bg-card/50 p-8 text-center shadow-2xl backdrop-blur-xl"
      >
        <div className="text-center">
          <Link href={`/${locale}`} className="inline-flex items-center gap-2 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <span className="text-lg font-bold text-primary-foreground">L</span>
            </div>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">激活账户</h1>
        </div>

        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">{t.activating}</p>
      </motion.div>
    )
  }

  // 成功状态
  if (status === "success") {
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
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <CheckCircle2 className="h-12 w-12 text-green-500" />
          <div className="text-center">
            <h2 className="text-xl font-bold">{t.success}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t.successDescription}</p>
          </div>
        </motion.div>

        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
          <p>
            将在 <span className="font-semibold text-foreground">{countdown}</span>{" "}
            秒后自动跳转到登录页面
          </p>
        </div>

        <div className="space-y-3">
          <Link href={`/${locale}/login`} className="block">
            <Button className="w-full">立即登录</Button>
          </Link>
          <Link href={`/${locale}/reset-password`} className="block">
            <Button variant="outline" className="w-full">
              重新设置密码
            </Button>
          </Link>
        </div>
      </motion.div>
    )
  }

  // 失败状态
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md space-y-8 rounded-2xl border border-border/40 bg-card/50 p-8 shadow-2xl backdrop-blur-xl"
    >
      <div className="text-center">
        <Link href={`/${locale}`} className="inline-flex items-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <span className="text-lg font-bold text-primary-foreground">L</span>
          </div>
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <h2 className="text-xl font-bold">激活失败</h2>
          <p className="mt-2 text-sm text-destructive">{errorMessage}</p>
        </div>
      </motion.div>

      <div className="space-y-3">
        {canRetry && token && (
          <button onClick={() => window.location.reload()} className="block w-full">
            <Button className="w-full">重试</Button>
          </button>
        )}
        <Link href={`/${locale}/login`}>
          <Button variant="outline" className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回登录
          </Button>
        </Link>
      </div>
    </motion.div>
  )
}
