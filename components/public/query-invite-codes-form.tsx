"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Copy,
  Check,
  Search,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Ticket,
  SearchX,
  FileText,
  UserCheck,
  Sparkles,
  AlertTriangle,
} from "lucide-react"
import { resolveApiErrorMessage } from "@/lib/api/error-message"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

interface InviteCodeResult {
  code: string
  expiresAt: string | null
  used?: boolean
}

interface InviteCodesQueryResult {
  type: "invite_codes"
  inviteCodes: InviteCodeResult[]
  queriedAt: string
}

interface PreApplicationQueryResult {
  type: "pre_application"
  status: "PENDING" | "APPROVED" | "REJECTED" | "DISPUTED"
  guidance: string | null
  reviewedAt: string | null
  createdAt: string
  inviteCode: InviteCodeResult | null
}

type PreApplicationStatus = PreApplicationQueryResult["status"]

type QueryResult = InviteCodesQueryResult | PreApplicationQueryResult

interface QueryInviteCodesFormProps {
  locale: Locale
  dict: Dictionary
}

export function QueryInviteCodesForm({ locale, dict }: QueryInviteCodesFormProps) {
  const t = dict.queryInviteCodes ?? {}
  const searchParams = useSearchParams()
  const [token, setToken] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [queried, setQueried] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [error, setError] = useState("")

  const getFullUrl = (code: string) => {
    // 如果 code 已经是完整 URL，提取纯代码部分
    const match = code.match(/(?:https?:\/\/linux\.do)?\/invites\/([A-Za-z0-9_-]+)/i)
    const pureCode = match?.[1] || code
    return `https://linux.do/invites/${pureCode}`
  }

  const handleQuery = async (queryToken?: string, queryEmail?: string) => {
    const trimmedToken = (queryToken || token).trim().toUpperCase()
    const emailInput = (queryEmail ?? email).trim()
    if (!emailInput) {
      toast.error((t as Record<string, string>).emailRequired || "请输入邮箱")
      return
    }
    const emailLower = emailInput.toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailLower)) {
      toast.error((t as Record<string, string>).emailInvalid || "邮箱格式不正确")
      return
    }
    if (!trimmedToken) {
      toast.error(t.tokenRequired)
      return
    }
    setLoading(true)
    setQueried(false)
    setResult(null)
    setError("")
    try {
      const params = new URLSearchParams({
        token: trimmedToken,
        email: emailLower,
      })
      const res = await fetch(`/api/public/query-invite-codes?${params.toString()}`)
      const payload = await res.json().catch(() => null)

      if (!res.ok || !payload) {
        const message = resolveApiErrorMessage(payload, dict) ?? t.queryFailed
        throw new Error(message)
      }

      setResult(payload as QueryResult)
      setQueried(true)
    } catch (err) {
      console.error("Query invite codes failed:", err)
      const message = err instanceof Error ? err.message : t.queryFailed
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const queryCode = searchParams.get("queryCode")
    const queryEmail = searchParams.get("email")
    if (queryEmail) {
      setEmail(queryEmail.trim())
    }
    if (queryCode) {
      const upperCode = queryCode.trim().toUpperCase()
      setToken(upperCode)
      handleQuery(upperCode, queryEmail ?? undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCopy = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(getFullUrl(code))
      setCopiedIndex(index)
      toast.success(t.copied)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch {
      toast.error(t.copyFailed)
    }
  }

  const getExpiryText = (expiresAt: string | null) => {
    if (!expiresAt) return t.noExpiry
    const date = new Date(expiresAt)
    const now = Date.now()
    if (date.getTime() <= now) return t.expired
    return `${t.expiresAt} ${date.toLocaleString(locale)}`
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt).getTime() <= Date.now()
  }

  const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleString(locale) : "-"

  // 进度步骤组件
  const ProgressSteps = ({ status }: { status: PreApplicationStatus }) => {
    const steps = [
      { key: "submitted", icon: FileText, label: t.stepSubmitted || "已提交" },
      { key: "reviewing", icon: UserCheck, label: t.stepReviewing || "审核中" },
      {
        key: "result",
        icon:
          status === "APPROVED"
            ? Sparkles
            : status === "REJECTED" || status === "DISPUTED"
              ? XCircle
              : Clock,
        label:
          status === "APPROVED"
            ? t.stepApproved || "已通过"
            : status === "REJECTED"
              ? t.stepRejected || "未通过"
              : status === "DISPUTED"
                ? t.stepDisputed || "待补充"
                : (t as Record<string, string>).stepWaiting || "等待结果",
      },
    ]

    const currentStep = status === "PENDING" ? 1 : 2

    return (
      <div className="flex items-center justify-between mb-6">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isActive = index <= currentStep
          const isCurrent = index === currentStep
          const isLast = index === steps.length - 1

          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <motion.div
                  initial={false}
                  animate={
                    isCurrent && status === "PENDING"
                      ? { scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }
                      : { scale: 1, opacity: 1 }
                  }
                  transition={
                    isCurrent && status === "PENDING"
                      ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                      : {}
                  }
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 ${
                    isActive
                      ? status === "REJECTED" && isLast
                        ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                        : status === "APPROVED" && isLast
                          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground/50"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </motion.div>
                <span
                  className={`mt-2 text-xs font-medium ${
                    isActive ? "text-foreground" : "text-muted-foreground/50"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div className="flex-1 mx-2 mt-[-1.5rem]">
                  <div
                    className={`h-0.5 rounded-full transition-colors duration-300 ${
                      index < currentStep
                        ? "bg-primary"
                        : index === currentStep && status !== "PENDING"
                          ? status === "APPROVED"
                            ? "bg-emerald-500"
                            : "bg-rose-500"
                          : "bg-border"
                    }`}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // 状态卡片
  const StatusCard = ({ data }: { data: PreApplicationQueryResult }) => {
    const statusConfig = {
      PENDING: {
        bgClass:
          "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20",
        borderClass: "border-amber-200/60 dark:border-amber-800/40",
        iconBg: "bg-amber-100 dark:bg-amber-900/40",
        iconClass: "text-amber-600 dark:text-amber-400",
        title: t.pendingTitle || "申请正在审核中",
        message:
          t.pendingMessage ||
          "我们正在认真审核您的申请，请耐心等待。通常会在 1-3 个工作日内完成审核。",
      },
      APPROVED: {
        bgClass:
          "bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20",
        borderClass: "border-emerald-200/60 dark:border-emerald-800/40",
        iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
        iconClass: "text-emerald-600 dark:text-emerald-400",
        title: t.approvedTitle || "恭喜，申请已通过！",
        message: t.approvedMessage || "欢迎加入 linux.do 社区！请使用下方的邀请码完成注册。",
      },
      REJECTED: {
        bgClass:
          "bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/20 dark:to-red-950/20",
        borderClass: "border-rose-200/60 dark:border-rose-800/40",
        iconBg: "bg-rose-100 dark:bg-rose-900/40",
        iconClass: "text-rose-600 dark:text-rose-400",
        title: t.rejectedTitle || "申请未通过",
        message: t.rejectedMessage || "很遗憾，您的申请暂未通过审核。请查看审核意见了解详情。",
      },
      DISPUTED: {
        bgClass:
          "bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-950/20 dark:via-slate-900/20 dark:to-amber-900/20",
        borderClass: "border-rose-200/60 dark:border-rose-800/40",
        iconBg: "bg-rose-100 dark:bg-rose-900/40",
        iconClass: "text-rose-600 dark:text-rose-200",
        title: t.disputedTitle || "Application marked as disputed",
        message:
          t.disputedMessage ||
          "An admin marked this application for further review. Please wait for follow-up.",
      },
    }

    const defaultConfig = statusConfig["PENDING"]
    const config = statusConfig[data.status] ?? defaultConfig
    const StatusIcon = (() => {
      if (data.status === "PENDING") return Clock
      if (data.status === "APPROVED") return CheckCircle2
      if (data.status === "DISPUTED") return AlertTriangle
      return XCircle
    })()

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`relative overflow-hidden rounded-2xl border p-5 ${config.bgClass} ${config.borderClass}`}
      >
        {/* 装饰性背景 */}
        <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] pointer-events-none">
          <StatusIcon className="w-full h-full" />
        </div>

        <div className="relative flex gap-4">
          <motion.div
            animate={
              data.status === "PENDING" ? { scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] } : {}
            }
            transition={
              data.status === "PENDING" ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : {}
            }
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${config.iconBg}`}
          >
            <StatusIcon className={`h-6 w-6 ${config.iconClass}`} />
          </motion.div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">{config.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{config.message}</p>
          </div>
        </div>

        {/* 提交时间信息 */}
        <div className="mt-4 pt-4 border-t border-border/40 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t.submittedAt}</span>
            <span className="font-medium">{formatDate(data.createdAt)}</span>
          </div>
          {data.reviewedAt && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{t.reviewedAt}</span>
              <span className="font-medium">{formatDate(data.reviewedAt)}</span>
            </div>
          )}
        </div>

        {/* 审核意见 */}
        {data.guidance && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 pt-4 border-t border-border/40"
          >
            <p className="text-sm font-medium text-muted-foreground mb-2">{t.guidance}</p>
            <div className="rounded-xl bg-background/60 p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {data.guidance}
            </div>
          </motion.div>
        )}
      </motion.div>
    )
  }

  const renderInviteCodesResult = (data: InviteCodesQueryResult) => {
    if (data.inviteCodes.length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center py-8 text-center"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
            <SearchX className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-muted-foreground">{t.noInviteCodes}</p>
        </motion.div>
      )
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium text-muted-foreground">{t.result}</h3>
        </div>
        {data.inviteCodes.map((item, index) => {
          const expired = isExpired(item.expiresAt)
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              className="group relative"
            >
              <div
                className={`absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 opacity-0 blur transition-opacity duration-300 ${
                  !expired ? "group-hover:opacity-100" : ""
                }`}
              />
              <div
                className={`relative flex items-center justify-between rounded-xl border bg-card/80 p-4 backdrop-blur-sm transition-all duration-200 ${
                  expired
                    ? "border-border/40 opacity-50"
                    : "border-border/60 group-hover:border-primary/30"
                }`}
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="truncate font-mono text-sm font-medium">{getFullUrl(item.code)}</p>
                  <Badge variant={expired ? "destructive" : "secondary"} className="text-xs">
                    {getExpiryText(item.expiresAt)}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`ml-3 shrink-0 transition-all duration-200 ${
                    !expired ? "hover:bg-primary/10 hover:text-primary active:scale-95" : ""
                  }`}
                  onClick={() => handleCopy(item.code, index)}
                  disabled={expired}
                >
                  <AnimatePresence mode="wait">
                    {copiedIndex === index ? (
                      <motion.span
                        key="check"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                      >
                        <Check className="h-4 w-4 text-emerald-500" />
                      </motion.span>
                    ) : (
                      <motion.span key="copy" initial={{ scale: 1 }} exit={{ scale: 0 }}>
                        <Copy className="h-4 w-4" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    )
  }

  const renderPreApplicationResult = (data: PreApplicationQueryResult) => {
    const codeDisabled =
      data.inviteCode && (data.inviteCode.used || isExpired(data.inviteCode.expiresAt))
    const statusLabels: Record<PreApplicationStatus, string> = {
      PENDING: t.statusPending || "审核中",
      APPROVED: t.statusApproved || "已通过",
      REJECTED: t.statusRejected || "未通过",
      DISPUTED: t.statusDisputed || "争议中",
    }

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{t.applicationStatus}</p>
            <h3 className="text-lg font-semibold">{statusLabels[data.status]}</h3>
          </div>
          <Badge
            variant={
              data.status === "APPROVED"
                ? "default"
                : data.status === "REJECTED"
                  ? "destructive"
                  : data.status === "PENDING"
                    ? "outline"
                    : "secondary"
            }
          >
            {statusLabels[data.status]}
          </Badge>
        </div>
        {/* 进度指示器 */}
        <ProgressSteps status={data.status} />

        {/* 状态卡片 */}
        <StatusCard data={data} />

        {/* 邀请码区域 */}
        {data.status === "APPROVED" && data.inviteCode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              <h3 className="text-sm font-medium">{t.inviteCodeTitle}</h3>
            </div>
            <div className="group relative">
              <div
                className={`absolute -inset-0.5 rounded-xl bg-gradient-to-r from-emerald-500/30 via-primary/20 to-emerald-500/30 opacity-0 blur transition-opacity duration-300 ${
                  !codeDisabled ? "group-hover:opacity-100" : ""
                }`}
              />
              <div
                className={`relative flex items-center justify-between rounded-xl border-2 bg-card p-4 transition-all duration-200 ${
                  codeDisabled
                    ? "border-border/40 opacity-50"
                    : "border-emerald-200 dark:border-emerald-800/50 group-hover:border-emerald-400"
                }`}
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="truncate font-mono text-sm font-semibold">
                    {getFullUrl(data.inviteCode.code)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={isExpired(data.inviteCode.expiresAt) ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {getExpiryText(data.inviteCode.expiresAt)}
                    </Badge>
                    {data.inviteCode.used && (
                      <Badge variant="outline" className="text-xs">
                        {t.used}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant={codeDisabled ? "ghost" : "default"}
                  size="sm"
                  className={`ml-3 shrink-0 transition-all duration-200 ${
                    !codeDisabled ? "bg-emerald-600 hover:bg-emerald-700 active:scale-95" : ""
                  }`}
                  onClick={() => handleCopy(data.inviteCode!.code, 0)}
                  disabled={!!codeDisabled}
                >
                  <AnimatePresence mode="wait">
                    {copiedIndex === 0 ? (
                      <motion.span
                        key="check"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="flex items-center gap-1.5"
                      >
                        <Check className="h-4 w-4" />
                        {t.copied}
                      </motion.span>
                    ) : (
                      <motion.span key="copy" className="flex items-center gap-1.5">
                        <Copy className="h-4 w-4" />
                        {t.copyCode}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {data.status === "APPROVED" && !data.inviteCode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center py-6 text-center"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
              <Ticket className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">{t.noInviteCode}</p>
          </motion.div>
        )}
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
        <Link href={`/${locale}`} className="group inline-flex items-center gap-2 mb-8">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary transition-transform duration-200 group-hover:scale-105">
            <div className="absolute inset-0 rounded-xl bg-primary/50 blur-md opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            <Search className="relative h-5 w-5 text-primary-foreground" />
          </div>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="mt-2 text-muted-foreground">{t.description}</p>
      </div>

      <div className="space-y-6">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, height: 0 }}
              animate={{ opacity: 1, scale: 1, height: "auto" }}
              exit={{ opacity: 0, scale: 0.95, height: 0 }}
              className="overflow-hidden rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          <div className="relative">
            <Input
              id="queryEmail"
              type="email"
              placeholder=" "
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleQuery()
              }}
              disabled={loading}
              className="peer pt-6 pb-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <Label
              htmlFor="queryEmail"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-300 peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs"
            >
              {t.emailLabel || "Email"}
            </Label>
          </div>
          <div className="relative">
            <Input
              id="queryToken"
              type="text"
              placeholder=" "
              value={token}
              onChange={(e) => setToken(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleQuery()
              }}
              disabled={loading}
              maxLength={12}
              className="peer pt-6 pb-2 font-mono tracking-widest focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <Label
              htmlFor="queryToken"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-300 peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs"
            >
              {t.placeholder}
            </Label>
          </div>
        </div>

        <Button
          onClick={() => handleQuery()}
          className="group relative w-full overflow-hidden transition-transform duration-150 active:scale-[0.98]"
          disabled={loading}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80"
            initial={{ x: "-100%" }}
            whileHover={{ x: 0 }}
            transition={{ duration: 0.3 }}
          />
          <span className="relative z-10 flex items-center justify-center">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.submit}
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                {t.submit}
              </>
            )}
          </span>
        </Button>

        <AnimatePresence mode="wait">
          {queried && !result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center py-8 text-center"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                <SearchX className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground">{t.notFound}</p>
            </motion.div>
          )}

          {result?.type === "invite_codes" && renderInviteCodesResult(result)}
          {result?.type === "pre_application" && renderPreApplicationResult(result)}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
