"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { PostContent } from "@/components/posts/post-content"
import { Copy, Check, History, FileText, AlertCircle } from "lucide-react"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import {
  allowedEmailDomains,
  preApplicationGroups,
  preApplicationSources,
} from "@/lib/pre-application/constants"

type PreApplicationVersion = {
  id: string
  version: number
  essay: string
  source: string | null
  sourceDetail: string | null
  registerEmail: string
  group: string
  status: string
  createdAt: string
}

type PreApplicationRecord = {
  id: string
  essay: string
  source: string | null
  sourceDetail: string | null
  registerEmail: string
  queryToken: string | null
  group: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  guidance: string | null
  reviewedAt: string | null
  updatedAt: string
  createdAt: string
  version: number
  resubmitCount: number
  reviewedBy: { id: string; name: string | null; email: string } | null
  inviteCode: {
    id: string
    code: string
    expiresAt: string | null
    usedAt: string | null
    assignedAt: string | null
  } | null
  versions?: PreApplicationVersion[]
}

interface PreApplicationFormProps {
  locale: Locale
  dict: Dictionary
  initialRecords?: PreApplicationRecord[]
  maxResubmitCount?: number
  userEmail?: string
}

// Loading Skeleton 组件
function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-5 w-72" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <Skeleton className="h-10 w-24" />
        </CardContent>
      </Card>
    </div>
  )
}

export function PreApplicationForm({
  locale,
  dict,
  initialRecords,
  maxResubmitCount: initialMaxResubmit = 3,
  userEmail,
}: PreApplicationFormProps) {
  const t = dict.preApplication
  const essayMinChars = 50
  const [loading, setLoading] = useState(!initialRecords)
  const [submitting, setSubmitting] = useState(false)
  const [records, setRecords] = useState<PreApplicationRecord[]>(initialRecords || [])
  const [maxResubmitCount, setMaxResubmitCount] = useState(initialMaxResubmit)
  const [tokenCopied, setTokenCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<"form" | "history">("form")
  const [essayHint, setEssayHint] = useState(t.fields.essayHint)
  const [allowedDomains, setAllowedDomains] = useState<string[]>(allowedEmailDomains as any)
  const [formData, setFormData] = useState({
    essay: "",
    source: "",
    sourceDetail: "",
    registerEmail: userEmail || "",
    group: "GROUP_ONE",
  })

  const allowedDomainsText = useMemo(() => {
    const joiner = locale === "zh" ? "、" : ", "
    return allowedDomains.join(joiner)
  }, [locale, allowedDomains])

  const latest = records[0] ?? null
  const isEditing = Boolean(latest)
  const hasReviewInfo = Boolean(
    latest?.reviewedAt || latest?.reviewedBy || latest?.guidance || latest?.inviteCode,
  )
  const remainingResubmits = latest
    ? maxResubmitCount - (latest.resubmitCount || 0)
    : maxResubmitCount
  const canResubmit = latest?.status === "REJECTED" && remainingResubmits > 0

  const loadRecord = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/pre-application")
      if (!res.ok) throw new Error(t.loadFailed)
      const data = await res.json()
      const nextRecords = data.records || []
      setRecords(nextRecords)
      if (data.maxResubmitCount) setMaxResubmitCount(data.maxResubmitCount)
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("pre-application:updated", {
            detail: { count: nextRecords.length },
          }),
        )
      }
    } catch (error) {
      console.error("Pre-application load error:", error)
      toast.error(t.loadFailed)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!initialRecords) loadRecord()
  }, [])

  useEffect(() => {
    const loadSystemConfig = async () => {
      try {
        const res = await fetch("/api/public/system-config")
        if (res.ok) {
          const data = await res.json()
          if (data.preApplicationEssayHint) {
            setEssayHint(data.preApplicationEssayHint)
          }
          if (data.allowedEmailDomains && Array.isArray(data.allowedEmailDomains)) {
            setAllowedDomains(data.allowedEmailDomains)
          }
        }
      } catch (error) {
        console.error("Failed to load system config:", error)
      }
    }
    loadSystemConfig()
  }, [])

  useEffect(() => {
    if (!latest || latest.status === "APPROVED") return
    setFormData({
      essay: latest.essay || "",
      source: latest.source || "",
      sourceDetail: latest.sourceDetail || "",
      registerEmail: latest.registerEmail || "",
      group: latest.group || "GROUP_ONE",
    })
  }, [latest?.id])

  useEffect(() => {
    if (formData.source !== "OTHER" && formData.sourceDetail) {
      setFormData((prev) => ({ ...prev, sourceDetail: "" }))
    }
  }, [formData.source, formData.sourceDetail])

  const statusBadge = (status: PreApplicationRecord["status"]) => {
    const map: Record<string, { label: string; className: string }> = {
      PENDING: { label: t.status.pending, className: "bg-amber-100 text-amber-800" },
      APPROVED: { label: t.status.approved, className: "bg-emerald-100 text-emerald-700" },
      REJECTED: { label: t.status.rejected, className: "bg-rose-100 text-rose-700" },
    }
    const config = map[status] || map.PENDING
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const getSourceLabel = (value: string | null) => {
    if (!value) return t.fields.sourceOptional
    const item = preApplicationSources.find((source) => source.value === value)
    if (!item) return value
    const key = item.labelKey.split(".").pop() || ""
    return (t.sources as Record<string, string>)[key] || value
  }

  const getGroupLabel = (value: string) => {
    const item = preApplicationGroups.find((group) => group.value === value)
    if (!item) return value
    const key = item.labelKey.split(".").pop() || ""
    return (t.groups as Record<string, string>)[key] || value
  }

  const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleString(locale) : "-"

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (latest?.status === "APPROVED") {
        toast.error(t.alreadySubmitted)
        return
      }

      // 检查重新提交次数
      if (latest?.status === "REJECTED" && remainingResubmits <= 0) {
        toast.error(t.maxResubmitExceeded || `已达到最大重新提交次数限制 (${maxResubmitCount} 次)`)
        return
      }

      const method = latest ? "PUT" : "POST"
      const res = await fetch("/api/pre-application", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          essay: formData.essay,
          source: formData.source || null,
          sourceDetail: formData.source === "OTHER" ? formData.sourceDetail : null,
          registerEmail: formData.registerEmail,
          group: formData.group,
          version: latest?.version, // 乐观锁
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 409) {
          if (data?.error === "VERSION_CONFLICT") {
            toast.error(t.versionConflict || "数据已被修改，请刷新后重试")
            await loadRecord()
            return
          }
          toast.error(t.alreadySubmitted)
          return
        }
        if (data?.error === "ESSAY_TOO_SHORT") {
          toast.error(t.validation.essayTooShort.replace("{min}", String(essayMinChars)))
          return
        }
        if (data?.error === "MAX_RESUBMIT_EXCEEDED") {
          toast.error(data?.message || t.maxResubmitExceeded)
          return
        }
        throw new Error(data?.error || t.submitFailed)
      }

      toast.success(method === "PUT" ? t.updateSuccess : t.submitSuccess)
      await loadRecord()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.submitFailed)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <FormSkeleton />

  const hasHistory = latest?.versions && latest.versions.length > 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <p className="mt-1 text-muted-foreground">{t.description}</p>
      </div>

      {/* 驳回后重新提交次数警告 */}
      {latest?.status === "REJECTED" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30"
        >
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              {t.resubmitWarningTitle || "申请已被驳回"}
            </p>
            <p className="mt-1 text-amber-700 dark:text-amber-300">
              {canResubmit
                ? (t.resubmitRemaining || "您还可以重新提交 {count} 次").replace(
                    "{count}",
                    String(remainingResubmits),
                  )
                : t.maxResubmitExceeded || "已达到最大重新提交次数限制"}
            </p>
          </div>
        </motion.div>
      )}

      {latest && hasHistory ? (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "form" | "history")}>
          <TabsList className="mb-4">
            <TabsTrigger value="form" className="gap-2">
              <FileText className="h-4 w-4" />
              {t.currentApplication || "当前申请"}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              {t.versionHistory || "版本历史"}
              <Badge variant="secondary" className="ml-1">
                {latest.versions?.length || 0}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <TabsContent value="form" asChild>
              <motion.div
                key="form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                {renderMainContent()}
              </motion.div>
            </TabsContent>

            <TabsContent value="history" asChild>
              <motion.div
                key="history"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                {renderVersionHistory()}
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      ) : (
        renderMainContent()
      )}
    </div>
  )

  function renderMainContent() {
    return (
      <div className="space-y-6">
        {latest && hasReviewInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                {t.reviewInfoTitle}
                {statusBadge(latest.status)}
              </CardTitle>
              <CardDescription>
                {t.submittedAt}：{formatDate(latest.createdAt)} · {t.updatedAt}：
                {formatDate(latest.updatedAt)}
                {latest.version > 1 && ` · v${latest.version}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">{t.review.reviewer}</p>
                  <p className="font-medium">
                    {latest.reviewedBy?.name || latest.reviewedBy?.email || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.review.reviewedAt}</p>
                  <p className="font-medium">{formatDate(latest.reviewedAt)}</p>
                </div>
              </div>

              {latest.guidance && (
                <div>
                  <p className="text-sm text-muted-foreground">{t.review.guidance}</p>
                  <div className="mt-2 rounded-lg border bg-card p-4">
                    <PostContent content={latest.guidance} emptyMessage={t.review.guidance} />
                  </div>
                </div>
              )}

              {latest.inviteCode && (
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.invite.code}</p>
                    <p className="font-medium">{latest.inviteCode.code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t.invite.expiresAt}</p>
                    <p className="font-medium">{formatDate(latest.inviteCode.expiresAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t.invite.used}</p>
                    <p className="font-medium">
                      {latest.inviteCode.usedAt ? t.invite.used : t.invite.unused}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {latest && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                {hasReviewInfo ? t.formInfoTitle : t.status.label}
                {!hasReviewInfo && statusBadge(latest.status)}
              </CardTitle>
              <CardDescription>{t.submitted}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">{t.fields.registerEmail}</p>
                  <p className="font-medium">{latest.registerEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.fields.group}</p>
                  <p className="font-medium">{getGroupLabel(latest.group)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.fields.source}</p>
                  <p className="font-medium">{getSourceLabel(latest.source)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.fields.queryToken}</p>
                  {latest.queryToken ? (
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-medium tracking-widest">
                        {latest.queryToken}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(latest.queryToken!)
                            setTokenCopied(true)
                            toast.success(t.queryTokenCopied || "查询码已复制")
                            setTimeout(() => setTokenCopied(false), 2000)
                          } catch {
                            toast.error("复制失败")
                          }
                        }}
                      >
                        {tokenCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  ) : (
                    <p className="font-medium">-</p>
                  )}
                </div>
                {latest.sourceDetail && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t.fields.sourceDetail}</p>
                    <p className="font-medium">{latest.sourceDetail}</p>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground">{t.fields.essay}</p>
                <div className="mt-2 rounded-lg border bg-card p-4">
                  <PostContent content={latest.essay} emptyMessage={essayHint} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {(!latest ||
          (latest.status !== "APPROVED" && canResubmit) ||
          latest.status === "PENDING") && (
          <Card>
            <CardHeader>
              <CardTitle>
                {latest?.status === "REJECTED" ? t.resubmit || "重新提交" : t.submit}
              </CardTitle>
              <CardDescription>
                {t.allowedDomainsTitle}：{allowedDomainsText}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="essay">{t.fields.essay}</Label>
                <Textarea
                  id="essay"
                  value={formData.essay}
                  onChange={(event) => setFormData({ ...formData, essay: event.target.value })}
                  rows={6}
                  placeholder={essayHint}
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{essayHint}</span>
                  <span>
                    {formData.essay.length}/{essayMinChars}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t.fields.source}</Label>
                  <Select
                    value={formData.source}
                    onValueChange={(value) => setFormData({ ...formData, source: value })}
                    disabled={isEditing}
                  >
                    <SelectTrigger disabled={isEditing}>
                      <SelectValue placeholder={t.fields.sourceOptional} />
                    </SelectTrigger>
                    <SelectContent>
                      {preApplicationSources.map((source) => {
                        const key = source.labelKey.split(".").pop() || ""
                        return (
                          <SelectItem key={source.value} value={source.value}>
                            {(t.sources as Record<string, string>)[key]}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  {formData.source === "OTHER" && (
                    <Input
                      value={formData.sourceDetail}
                      onChange={(event) =>
                        setFormData({ ...formData, sourceDetail: event.target.value })
                      }
                      placeholder={t.fields.sourceDetail}
                      readOnly={isEditing}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registerEmail">{t.fields.registerEmail}</Label>
                  <Input
                    id="registerEmail"
                    type="email"
                    value={formData.registerEmail}
                    onChange={(event) =>
                      setFormData({ ...formData, registerEmail: event.target.value })
                    }
                    placeholder={t.fields.registerEmailHint}
                    readOnly={isEditing}
                  />
                  <p className="text-xs text-muted-foreground">{t.fields.registerEmailHint}</p>
                </div>

                <div className="space-y-2">
                  <Label>{t.fields.group}</Label>
                  <RadioGroup
                    value={formData.group}
                    onValueChange={(value) => setFormData({ ...formData, group: value })}
                    className="flex flex-col gap-2"
                  >
                    {preApplicationGroups.map((group) => {
                      const key = group.labelKey.split(".").pop() || ""
                      return (
                        <label key={group.value} className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value={group.value} />
                          {(t.groups as Record<string, string>)[key]}
                        </label>
                      )
                    })}
                  </RadioGroup>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitting || (latest?.status === "REJECTED" && !canResubmit)}
              >
                {submitting
                  ? t.submitting
                  : latest?.status === "REJECTED"
                    ? t.resubmit || "重新提交"
                    : latest
                      ? t.update
                      : t.submit}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  function renderVersionHistory() {
    if (!latest?.versions?.length) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t.noVersionHistory || "暂无版本历史"}
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-4">
        {latest.versions.map((version, index) => (
          <motion.div
            key={version.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className={index === 0 ? "border-primary/50" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    v{version.version}
                    {index === 0 && (
                      <Badge variant="secondary">{t.currentVersion || "当前版本"}</Badge>
                    )}
                    {statusBadge(version.status as PreApplicationRecord["status"])}
                  </CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(version.createdAt)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 text-sm md:grid-cols-3">
                  <div>
                    <span className="text-muted-foreground">{t.fields.registerEmail}：</span>
                    <span className="font-medium">{version.registerEmail}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t.fields.group}：</span>
                    <span className="font-medium">{getGroupLabel(version.group)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t.fields.source}：</span>
                    <span className="font-medium">{getSourceLabel(version.source)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{t.fields.essay}</p>
                  <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                    <PostContent content={version.essay} emptyMessage="" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    )
  }
}
