"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { X, Plus, Mail } from "lucide-react"
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
  const [newDomain, setNewDomain] = useState("")
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
