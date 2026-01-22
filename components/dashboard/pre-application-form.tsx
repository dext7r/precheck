"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { PostContent } from "@/components/posts/post-content"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { allowedEmailDomains, preApplicationGroups, preApplicationSources } from "@/lib/pre-application/constants"

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
  reviewedBy: { id: string; name: string | null; email: string } | null
  inviteCode: {
    id: string
    code: string
    expiresAt: string | null
    usedAt: string | null
    assignedAt: string | null
  } | null
}

interface PreApplicationFormProps {
  locale: Locale
  dict: Dictionary
}

export function PreApplicationForm({ locale, dict }: PreApplicationFormProps) {
  const t = dict.preApplication
  const essayMinChars = 50
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [records, setRecords] = useState<PreApplicationRecord[]>([])
  const [formData, setFormData] = useState({
    essay: "",
    source: "",
    sourceDetail: "",
    registerEmail: "",
    queryToken: "",
    group: "GROUP_ONE",
  })

  const allowedDomainsText = useMemo(() => {
    const joiner = locale === "zh" ? "、" : ", "
    return allowedEmailDomains.join(joiner)
  }, [locale])

  const latest = records[0] ?? null
  const isEditing = Boolean(latest)
  const hasReviewInfo = Boolean(
    latest?.reviewedAt || latest?.reviewedBy || latest?.guidance || latest?.inviteCode,
  )

  const loadRecord = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/pre-application")
      if (!res.ok) {
        throw new Error(t.loadFailed)
      }
      const data = await res.json()
      const nextRecords = data.records || []
      setRecords(nextRecords)
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("pre-application:updated", {
            detail: { count: nextRecords.length },
          }),
        )
      }
      if (nextRecords.length === 0) {
        try {
          const meRes = await fetch("/api/auth/me")
          if (meRes.ok) {
            const meData = await meRes.json()
            const email = meData?.user?.email || ""
            if (email) {
              setFormData((prev) =>
                prev.registerEmail ? prev : { ...prev, registerEmail: email },
              )
            }
          }
        } catch (error) {
          console.error("Failed to load user email:", error)
        }
      }
    } catch (error) {
      console.error("Pre-application load error:", error)
      toast.error(t.loadFailed)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecord()
  }, [])

  useEffect(() => {
    if (!latest || latest.status === "APPROVED") return
    setFormData({
      essay: latest.essay || "",
      source: latest.source || "",
      sourceDetail: latest.sourceDetail || "",
      registerEmail: latest.registerEmail || "",
      queryToken: latest.queryToken || "",
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

      const method = latest ? "PUT" : "POST"
      const res = await fetch("/api/pre-application", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          essay: formData.essay,
          source: formData.source || null,
          sourceDetail: formData.source === "OTHER" ? formData.sourceDetail : null,
          registerEmail: formData.registerEmail,
          queryToken: formData.queryToken || null,
          group: formData.group,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 409) {
          toast.error(t.alreadySubmitted)
          return
        }
        if (data?.error === "ESSAY_TOO_SHORT") {
          toast.error(t.validation.essayTooShort.replace("{min}", String(essayMinChars)))
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

  if (loading) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <p className="text-muted-foreground">{dict.dashboard.loading}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <p className="mt-1 text-muted-foreground">{t.description}</p>
      </div>

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
                <p className="font-medium">{latest.queryToken || "-"}</p>
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
                <PostContent content={latest.essay} emptyMessage={t.fields.essayHint} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(!latest || latest.status !== "APPROVED") && (
        <Card>
          <CardHeader>
            <CardTitle>{t.submit}</CardTitle>
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
                placeholder={t.fields.essayHint}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t.fields.essayHint}</span>
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
                <Label htmlFor="queryToken">{t.fields.queryToken}</Label>
                <Input
                  id="queryToken"
                  value={formData.queryToken}
                  onChange={(event) =>
                    setFormData({ ...formData, queryToken: event.target.value })
                  }
                  placeholder={t.fields.queryTokenHint}
                  readOnly={isEditing}
                />
                <p className="text-xs text-muted-foreground">{t.fields.queryTokenHint}</p>
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

            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? t.submitting : latest ? t.update : t.submit}
            </Button>
          </CardContent>
        </Card>
      )}

    </div>
  )
}
