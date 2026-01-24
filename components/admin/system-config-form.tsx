"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { X, Plus, Mail, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import type { Locale } from "@/lib/i18n/config"
import type { Dictionary } from "@/lib/i18n/get-dictionary"

interface SystemConfigFormProps {
  locale: Locale
  dict: Dictionary
}

export function SystemConfigForm({ locale, dict }: SystemConfigFormProps) {
  const t = dict.admin
  const [essayHint, setEssayHint] = useState("")
  const [emailDomains, setEmailDomains] = useState<string[]>([])
  const [auditLogEnabled, setAuditLogEnabled] = useState(false)
  const [reviewTemplatesApprove, setReviewTemplatesApprove] = useState<string[]>([])
  const [reviewTemplatesReject, setReviewTemplatesReject] = useState<string[]>([])
  const [reviewTemplatesDispute, setReviewTemplatesDispute] = useState<string[]>([])
  const [newDomain, setNewDomain] = useState("")
  const [newTemplateApprove, setNewTemplateApprove] = useState("")
  const [newTemplateReject, setNewTemplateReject] = useState("")
  const [newTemplateDispute, setNewTemplateDispute] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [testEmailAddress, setTestEmailAddress] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    fetchConfig()
  }, [])

  async function fetchConfig() {
    try {
      const res = await fetch("/api/admin/system-config")
      if (!res.ok) throw new Error("Failed to fetch")

      const data = await res.json()
      setEssayHint(data.preApplicationEssayHint)
      setEmailDomains(data.allowedEmailDomains)
      setAuditLogEnabled(data.auditLogEnabled ?? false)
      setReviewTemplatesApprove(data.reviewTemplatesApprove ?? [])
      setReviewTemplatesReject(data.reviewTemplatesReject ?? [])
      setReviewTemplatesDispute(data.reviewTemplatesDispute ?? [])
    } catch {
      setMessage({ type: "error", text: t.systemConfigLoadFailed })
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch("/api/admin/system-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preApplicationEssayHint: essayHint,
          allowedEmailDomains: emailDomains,
          auditLogEnabled,
          reviewTemplatesApprove,
          reviewTemplatesReject,
          reviewTemplatesDispute,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || t.systemConfigSaveFailed)
      }

      setMessage({ type: "success", text: t.systemConfigSaveSuccess })
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : t.systemConfigSaveFailed,
      })
    } finally {
      setSaving(false)
    }
  }

  function handleAddDomain() {
    const domain = newDomain.trim().toLowerCase()
    if (!domain) return

    if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
      setMessage({ type: "error", text: t.systemConfigEmailDomainInvalid })
      return
    }

    if (emailDomains.includes(domain)) {
      setMessage({ type: "error", text: t.systemConfigEmailDomainExists })
      return
    }

    setEmailDomains([...emailDomains, domain])
    setNewDomain("")
    setMessage(null)
  }

  function handleRemoveDomain(domain: string) {
    setEmailDomains(emailDomains.filter((d) => d !== domain))
  }

  function handleAddTemplate(
    type: "approve" | "reject" | "dispute",
    value: string,
    setValue: (v: string) => void,
  ) {
    const text = value.trim()
    if (!text) return

    if (type === "approve") {
      if (reviewTemplatesApprove.includes(text)) return
      setReviewTemplatesApprove([...reviewTemplatesApprove, text])
    } else if (type === "reject") {
      if (reviewTemplatesReject.includes(text)) return
      setReviewTemplatesReject([...reviewTemplatesReject, text])
    } else {
      if (reviewTemplatesDispute.includes(text)) return
      setReviewTemplatesDispute([...reviewTemplatesDispute, text])
    }
    setValue("")
    setMessage(null)
  }

  function handleRemoveTemplate(type: "approve" | "reject" | "dispute", text: string) {
    if (type === "approve") {
      setReviewTemplatesApprove(reviewTemplatesApprove.filter((t) => t !== text))
    } else if (type === "reject") {
      setReviewTemplatesReject(reviewTemplatesReject.filter((t) => t !== text))
    } else {
      setReviewTemplatesDispute(reviewTemplatesDispute.filter((t) => t !== text))
    }
  }

  async function handleTestEmail() {
    if (!testEmailAddress || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmailAddress)) {
      setMessage({ type: "error", text: t.systemConfigTestEmailInvalid })
      return
    }

    setTestingEmail(true)
    setMessage(null)

    try {
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmailAddress }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || t.systemConfigTestEmailFailed)
      }

      const result = await res.json()
      setMessage({
        type: "success",
        text: t.systemConfigTestEmailSuccess
          .replace("{email}", testEmailAddress)
          .replace("{provider}", result.provider),
      })
      setTestEmailAddress("")
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : t.systemConfigTestEmailFailed,
      })
    } finally {
      setTestingEmail(false)
    }
  }

  if (loading) {
    return <div>{t.systemConfigLoading}</div>
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="essayHint">{t.systemConfigEssayHint}</Label>
            <p className="text-sm text-muted-foreground mb-2">{t.systemConfigEssayHintDesc}</p>
            <Textarea
              id="essayHint"
              value={essayHint}
              onChange={(e) => setEssayHint(e.target.value)}
              rows={3}
              placeholder={t.systemConfigEssayHintPlaceholder}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auditLog">{t.systemConfigAuditLog}</Label>
              <p className="text-sm text-muted-foreground">{t.systemConfigAuditLogDesc}</p>
            </div>
            <Switch id="auditLog" checked={auditLogEnabled} onCheckedChange={setAuditLogEnabled} />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label>{t.systemConfigEmailDomains}</Label>
            <p className="text-sm text-muted-foreground mb-2">{t.systemConfigEmailDomainsDesc}</p>
          </div>

          <div className="flex gap-2">
            <Input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder={t.systemConfigEmailDomainPlaceholder}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAddDomain()
                }
              }}
            />
            <Button onClick={handleAddDomain} type="button">
              <Plus className="h-4 w-4 mr-1" />
              {t.systemConfigEmailDomainAdd}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
            {emailDomains.map((domain) => (
              <div
                key={domain}
                className="flex items-center justify-between px-3 py-2 bg-muted rounded-md"
              >
                <span className="text-sm">{domain}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveDomain(domain)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {emailDomains.length === 0 && (
            <p className="text-sm text-muted-foreground">{t.systemConfigEmailDomainEmpty}</p>
          )}
        </div>
      </Card>

      {/* 审核通过模板 */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <div>
              <Label>{t.reviewTemplatesApprove}</Label>
              <p className="text-sm text-muted-foreground">{t.reviewTemplatesApproveDesc}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Textarea
              value={newTemplateApprove}
              onChange={(e) => setNewTemplateApprove(e.target.value)}
              placeholder={t.reviewTemplatePlaceholder}
              rows={2}
              className="flex-1"
            />
            <Button
              onClick={() =>
                handleAddTemplate("approve", newTemplateApprove, setNewTemplateApprove)
              }
              type="button"
              className="shrink-0"
            >
              <Plus className="h-4 w-4 mr-1" />
              {t.reviewTemplateAdd}
            </Button>
          </div>

          <div className="space-y-2">
            {reviewTemplatesApprove.map((text, index) => (
              <div
                key={index}
                className="flex items-start justify-between gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-md"
              >
                <span className="text-sm flex-1">{text}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveTemplate("approve", text)}
                  className="h-6 w-6 p-0 shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {reviewTemplatesApprove.length === 0 && (
              <p className="text-sm text-muted-foreground">{t.reviewTemplatesEmpty}</p>
            )}
          </div>
        </div>
      </Card>

      {/* 审核驳回模板 */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <div>
              <Label>{t.reviewTemplatesReject}</Label>
              <p className="text-sm text-muted-foreground">{t.reviewTemplatesRejectDesc}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Textarea
              value={newTemplateReject}
              onChange={(e) => setNewTemplateReject(e.target.value)}
              placeholder={t.reviewTemplatePlaceholder}
              rows={2}
              className="flex-1"
            />
            <Button
              onClick={() => handleAddTemplate("reject", newTemplateReject, setNewTemplateReject)}
              type="button"
              className="shrink-0"
            >
              <Plus className="h-4 w-4 mr-1" />
              {t.reviewTemplateAdd}
            </Button>
          </div>

          <div className="space-y-2">
            {reviewTemplatesReject.map((text, index) => (
              <div
                key={index}
                className="flex items-start justify-between gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-md"
              >
                <span className="text-sm flex-1">{text}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveTemplate("reject", text)}
                  className="h-6 w-6 p-0 shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {reviewTemplatesReject.length === 0 && (
              <p className="text-sm text-muted-foreground">{t.reviewTemplatesEmpty}</p>
            )}
          </div>
        </div>
      </Card>

      {/* 标记争议模板 */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div>
              <Label>{t.reviewTemplatesDispute}</Label>
              <p className="text-sm text-muted-foreground">{t.reviewTemplatesDisputeDesc}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Textarea
              value={newTemplateDispute}
              onChange={(e) => setNewTemplateDispute(e.target.value)}
              placeholder={t.reviewTemplatePlaceholder}
              rows={2}
              className="flex-1"
            />
            <Button
              onClick={() =>
                handleAddTemplate("dispute", newTemplateDispute, setNewTemplateDispute)
              }
              type="button"
              className="shrink-0"
            >
              <Plus className="h-4 w-4 mr-1" />
              {t.reviewTemplateAdd}
            </Button>
          </div>

          <div className="space-y-2">
            {reviewTemplatesDispute.map((text, index) => (
              <div
                key={index}
                className="flex items-start justify-between gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-md"
              >
                <span className="text-sm flex-1">{text}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveTemplate("dispute", text)}
                  className="h-6 w-6 p-0 shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {reviewTemplatesDispute.length === 0 && (
              <p className="text-sm text-muted-foreground">{t.reviewTemplatesEmpty}</p>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="testEmail">{t.systemConfigTestEmail}</Label>
            <p className="text-sm text-muted-foreground mb-2">{t.systemConfigTestEmailDesc}</p>
          </div>

          <div className="flex gap-2">
            <Input
              id="testEmail"
              type="email"
              value={testEmailAddress}
              onChange={(e) => setTestEmailAddress(e.target.value)}
              placeholder={t.systemConfigTestEmailPlaceholder}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleTestEmail()
                }
              }}
            />
            <Button onClick={handleTestEmail} type="button" disabled={testingEmail}>
              <Mail className="h-4 w-4 mr-1" />
              {testingEmail ? t.systemConfigTestEmailSending : t.systemConfigTestEmailSend}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            {t.systemConfigEmailProvider}:
            <strong className="ml-1">
              {process.env.NEXT_PUBLIC_EMAIL_PROVIDER || t.systemConfigEmailProviderNotConfigured}
            </strong>
          </p>
        </div>
      </Card>

      {message && (
        <div
          className={`p-4 rounded-md ${
            message.type === "success"
              ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400"
              : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || emailDomains.length === 0}>
          {saving ? t.systemConfigSaving : t.systemConfigSave}
        </Button>
      </div>
    </div>
  )
}
