"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { toast } from "sonner"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Copy, Check, Search, Loader2 } from "lucide-react"
import { getDictionaryEntry } from "@/lib/i18n/get-dictionary-entry"
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
  status: "PENDING" | "APPROVED" | "REJECTED"
  guidance: string | null
  reviewedAt: string | null
  createdAt: string
  inviteCode: InviteCodeResult | null
}

type QueryResult = InviteCodesQueryResult | PreApplicationQueryResult

interface QueryInviteCodesFormProps {
  locale: Locale
  dict: Dictionary
}

interface ApiErrorPayload {
  error?: {
    code?: string
    message?: string
  }
}

export function QueryInviteCodesForm({ locale, dict }: QueryInviteCodesFormProps) {
  const t = dict.queryInviteCodes ?? {}
  const searchParams = useSearchParams()
  const [token, setToken] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [queried, setQueried] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [error, setError] = useState("")

  const getFullUrl = (code: string) => `https://linux.do/invites/${code}`

  const resolveApiErrorMessage = (payload: ApiErrorPayload | null) => {
    const error = payload?.error
    if (!error) {
      return undefined
    }

    if (typeof error.message === "string" && error.message.trim()) {
      return error.message
    }

    if (typeof error.code === "string") {
      return getDictionaryEntry(dict, error.code)
    }

    return undefined
  }

  const handleQuery = async (queryToken?: string) => {
    const trimmedToken = (queryToken || token).trim().toUpperCase()
    if (!trimmedToken) {
      toast.error(t.tokenRequired)
      return
    }
    setLoading(true)
    setQueried(false)
    setResult(null)
    setError("")
    try {
      const res = await fetch(
        `/api/public/query-invite-codes?token=${encodeURIComponent(trimmedToken)}`,
      )
      const payload = await res.json().catch(() => null)

      if (!res.ok || !payload) {
        const message = resolveApiErrorMessage(payload) ?? t.queryFailed
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

  // 自动从URL参数读取queryCode并查询
  useEffect(() => {
    const queryCode = searchParams.get("queryCode")
    if (queryCode) {
      const upperCode = queryCode.trim().toUpperCase()
      setToken(upperCode)
      handleQuery(upperCode)
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

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      PENDING: {
        label: t.statusPending,
        className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      },
      APPROVED: {
        label: t.statusApproved,
        className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      },
      REJECTED: {
        label: t.statusRejected,
        className: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
      },
    }
    const item = config[status] || config.PENDING
    return <Badge className={item.className}>{item.label}</Badge>
  }

  const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleString(locale) : "-"

  const renderInviteCodesResult = (data: InviteCodesQueryResult) => {
    if (data.inviteCodes.length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-8 text-center text-muted-foreground"
        >
          {t.noInviteCodes}
        </motion.div>
      )
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h3 className="text-sm font-medium text-muted-foreground">{t.result}</h3>
        {data.inviteCodes.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-4 ${
              isExpired(item.expiresAt) ? "opacity-50" : ""
            }`}
          >
            <div className="min-w-0 flex-1 space-y-2">
              <p className="truncate font-mono text-sm font-medium">{getFullUrl(item.code)}</p>
              <Badge
                variant={isExpired(item.expiresAt) ? "destructive" : "secondary"}
                className="text-xs"
              >
                {getExpiryText(item.expiresAt)}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-3 shrink-0 hover:bg-primary/10"
              onClick={() => handleCopy(item.code, index)}
              disabled={isExpired(item.expiresAt)}
            >
              {copiedIndex === index ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </motion.div>
        ))}
      </motion.div>
    )
  }

  const renderPreApplicationResult = (data: PreApplicationQueryResult) => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <h3 className="text-sm font-medium text-muted-foreground">{t.applicationStatus}</h3>

        <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t.statusLabel}</span>
            {getStatusBadge(data.status)}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t.submittedAt}</span>
            <span className="text-sm">{formatDate(data.createdAt)}</span>
          </div>

          {data.reviewedAt && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t.reviewedAt}</span>
              <span className="text-sm">{formatDate(data.reviewedAt)}</span>
            </div>
          )}

          {data.guidance && (
            <div className="pt-3 border-t border-border/60">
              <p className="text-sm text-muted-foreground mb-2">{t.guidance}</p>
              <p className="text-sm whitespace-pre-wrap bg-background/50 rounded-lg p-3">
                {data.guidance}
              </p>
            </div>
          )}
        </div>

        {data.status === "APPROVED" && data.inviteCode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-medium text-muted-foreground">{t.inviteCodeTitle}</h3>
            <div
              className={`flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-4 ${
                data.inviteCode.used || isExpired(data.inviteCode.expiresAt) ? "opacity-50" : ""
              }`}
            >
              <div className="min-w-0 flex-1 space-y-2">
                <p className="truncate font-mono text-sm font-medium">
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
                variant="ghost"
                size="icon"
                className="ml-3 shrink-0 hover:bg-primary/10"
                onClick={() => handleCopy(data.inviteCode!.code, 0)}
                disabled={data.inviteCode.used || isExpired(data.inviteCode.expiresAt)}
              >
                {copiedIndex === 0 ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {data.status === "APPROVED" && !data.inviteCode && (
          <div className="py-4 text-center text-muted-foreground">
            {t.noInviteCode}
          </div>
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
        <Link href={`/${locale}`} className="inline-flex items-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Search className="h-5 w-5 text-primary-foreground" />
          </div>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="mt-2 text-muted-foreground">{t.description}</p>
      </div>

      <div className="space-y-6">
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
          className="group relative w-full overflow-hidden"
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
                <Search className="mr-2 h-4 w-4" />
                {t.submit}
              </>
            )}
          </span>
        </Button>

        {queried && !result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-6 text-center text-muted-foreground"
          >
            {t.notFound}
          </motion.div>
        )}

        {result?.type === "invite_codes" && renderInviteCodesResult(result)}
        {result?.type === "pre_application" && renderPreApplicationResult(result)}
      </div>
    </motion.div>
  )
}
