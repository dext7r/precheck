"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import {
  X,
  Plus,
  Mail,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  Shield,
  FileText,
  Sparkles,
} from "lucide-react"
import type { Locale } from "@/lib/i18n/config"
import type { Dictionary } from "@/lib/i18n/get-dictionary"

type SiteSettings = {
  siteName: string
  siteDescription: string
  contactEmail: string
  userRegistration: boolean
  oauthLogin: boolean
  emailNotifications: boolean
  postModeration: boolean
  maintenanceMode: boolean
}

type SystemConfig = {
  preApplicationEssayHint: string
  allowedEmailDomains: string[]
  auditLogEnabled: boolean
  reviewTemplatesApprove: string[]
  reviewTemplatesReject: string[]
  reviewTemplatesDispute: string[]
}

interface AdminSettingsFormProps {
  locale: Locale
  dict: Dictionary
}

export function AdminSettingsForm({ locale, dict }: AdminSettingsFormProps) {
  const router = useRouter()
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [savingSite, setSavingSite] = useState(false)
  const [savingToggles, setSavingToggles] = useState(false)
  const [savingSystemConfig, setSavingSystemConfig] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [dangerLoading, setDangerLoading] = useState(false)

  // System config states
  const [newDomain, setNewDomain] = useState("")
  const [newTemplateApprove, setNewTemplateApprove] = useState("")
  const [newTemplateReject, setNewTemplateReject] = useState("")
  const [newTemplateDispute, setNewTemplateDispute] = useState("")
  const [testingEmail, setTestingEmail] = useState(false)
  const [testEmailAddress, setTestEmailAddress] = useState("")

  const t = dict.admin

  useEffect(() => {
    let active = true
    const loadData = async () => {
      setLoading(true)
      setError("")
      try {
        const [settingsRes, configRes] = await Promise.all([
          fetch("/api/admin/settings"),
          fetch("/api/admin/system-config"),
        ])

        if (!settingsRes.ok) {
          const data = await settingsRes.json().catch(() => ({}))
          throw new Error(data?.error || t.settingsLoadFailed)
        }

        const settingsData = await settingsRes.json()
        if (active) {
          setSettings(settingsData)
        }

        if (configRes.ok) {
          const configData = await configRes.json()
          if (active) {
            setSystemConfig(configData)
          }
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : t.settingsLoadFailed)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }
    loadData()
    return () => {
      active = false
    }
  }, [t.settingsLoadFailed])

  const updateSettings = async (payload: Partial<SiteSettings>) => {
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.error || t.settingsSaveFailed)
    }

    return (await res.json()) as SiteSettings
  }

  const handleSiteSave = async () => {
    if (!settings) return
    setSavingSite(true)
    setError("")
    try {
      const updated = await updateSettings({
        siteName: settings.siteName,
        siteDescription: settings.siteDescription,
        contactEmail: settings.contactEmail,
      })
      setSettings(updated)
      toast.success(t.settingsSaved)
    } catch (err) {
      const message = err instanceof Error ? err.message : t.settingsSaveFailed
      setError(message)
      toast.error(message)
    } finally {
      setSavingSite(false)
    }
  }

  const handleToggleSave = async () => {
    if (!settings) return
    setSavingToggles(true)
    setError("")
    try {
      const updated = await updateSettings({
        userRegistration: settings.userRegistration,
        oauthLogin: settings.oauthLogin,
        emailNotifications: settings.emailNotifications,
        postModeration: settings.postModeration,
        maintenanceMode: settings.maintenanceMode,
      })
      setSettings(updated)
      toast.success(t.settingsSaved)
    } catch (err) {
      const message = err instanceof Error ? err.message : t.settingsSaveFailed
      setError(message)
      toast.error(message)
    } finally {
      setSavingToggles(false)
    }
  }

  const handleClearCache = async () => {
    setDangerLoading(true)
    try {
      const res = await fetch("/api/admin/clear-cache", { method: "POST" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || t.clearCacheFailed)
      }
      toast.success(t.clearCacheSuccess)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.clearCacheFailed)
    } finally {
      setDangerLoading(false)
      setClearOpen(false)
    }
  }

  const handleResetDatabase = async () => {
    setDangerLoading(true)
    try {
      const res = await fetch("/api/admin/reset-database", { method: "POST" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || t.resetDatabaseFailed)
      }
      toast.success(t.resetDatabaseSuccess)
      router.push(`/${locale}/login`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.resetDatabaseFailed)
    } finally {
      setDangerLoading(false)
      setResetOpen(false)
    }
  }

  const handleSystemConfigSave = async () => {
    if (!systemConfig) return
    setSavingSystemConfig(true)
    setError("")
    try {
      const res = await fetch("/api/admin/system-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(systemConfig),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || t.systemConfigSaveFailed)
      }
      toast.success(t.systemConfigSaveSuccess)
    } catch (err) {
      const message = err instanceof Error ? err.message : t.systemConfigSaveFailed
      setError(message)
      toast.error(message)
    } finally {
      setSavingSystemConfig(false)
    }
  }

  const handleAddDomain = () => {
    if (!systemConfig) return
    const domain = newDomain.trim().toLowerCase()
    if (!domain) return
    if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
      toast.error(t.systemConfigEmailDomainInvalid)
      return
    }
    if (systemConfig.allowedEmailDomains.includes(domain)) {
      toast.error(t.systemConfigEmailDomainExists)
      return
    }
    setSystemConfig({
      ...systemConfig,
      allowedEmailDomains: [...systemConfig.allowedEmailDomains, domain],
    })
    setNewDomain("")
  }

  const handleRemoveDomain = (domain: string) => {
    if (!systemConfig) return
    setSystemConfig({
      ...systemConfig,
      allowedEmailDomains: systemConfig.allowedEmailDomains.filter((d) => d !== domain),
    })
  }

  const handleAddTemplate = (
    type: "approve" | "reject" | "dispute",
    value: string,
    setValue: (v: string) => void,
  ) => {
    if (!systemConfig) return
    const text = value.trim()
    if (!text) return

    if (type === "approve") {
      if (systemConfig.reviewTemplatesApprove.includes(text)) return
      setSystemConfig({
        ...systemConfig,
        reviewTemplatesApprove: [...systemConfig.reviewTemplatesApprove, text],
      })
    } else if (type === "reject") {
      if (systemConfig.reviewTemplatesReject.includes(text)) return
      setSystemConfig({
        ...systemConfig,
        reviewTemplatesReject: [...systemConfig.reviewTemplatesReject, text],
      })
    } else {
      if (systemConfig.reviewTemplatesDispute.includes(text)) return
      setSystemConfig({
        ...systemConfig,
        reviewTemplatesDispute: [...systemConfig.reviewTemplatesDispute, text],
      })
    }
    setValue("")
  }

  const handleRemoveTemplate = (type: "approve" | "reject" | "dispute", text: string) => {
    if (!systemConfig) return
    if (type === "approve") {
      setSystemConfig({
        ...systemConfig,
        reviewTemplatesApprove: systemConfig.reviewTemplatesApprove.filter((t) => t !== text),
      })
    } else if (type === "reject") {
      setSystemConfig({
        ...systemConfig,
        reviewTemplatesReject: systemConfig.reviewTemplatesReject.filter((t) => t !== text),
      })
    } else {
      setSystemConfig({
        ...systemConfig,
        reviewTemplatesDispute: systemConfig.reviewTemplatesDispute.filter((t) => t !== text),
      })
    }
  }

  const handleTestEmail = async () => {
    if (!testEmailAddress || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmailAddress)) {
      toast.error(t.systemConfigTestEmailInvalid)
      return
    }
    setTestingEmail(true)
    try {
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmailAddress }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || t.systemConfigTestEmailFailed)
      }
      const result = await res.json()
      toast.success(
        t.systemConfigTestEmailSuccess
          .replace("{email}", testEmailAddress)
          .replace("{provider}", result.provider),
      )
      setTestEmailAddress("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.systemConfigTestEmailFailed)
    } finally {
      setTestingEmail(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t.loading}</p>
  }

  if (!settings) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error || t.settingsLoadFailed}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t.settings}</h1>
        <p className="mt-1 text-muted-foreground">{t.configureSystemSettings}</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t.siteSettings}</CardTitle>
            <CardDescription>{t.siteSettingsDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="siteName">{t.siteName}</Label>
              <Input
                id="siteName"
                value={settings.siteName}
                onChange={(event) => setSettings({ ...settings, siteName: event.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="siteDescription">{t.siteDescription}</Label>
              <Input
                id="siteDescription"
                value={settings.siteDescription}
                onChange={(event) =>
                  setSettings({ ...settings, siteDescription: event.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contactEmail">{t.contactEmail}</Label>
              <Input
                id="contactEmail"
                type="email"
                value={settings.contactEmail}
                onChange={(event) => setSettings({ ...settings, contactEmail: event.target.value })}
              />
            </div>
            <Button onClick={handleSiteSave} disabled={savingSite}>
              {savingSite ? t.saving : t.save}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.featureToggles}</CardTitle>
            <CardDescription>{t.featureTogglesDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t.userRegistration}</p>
                <p className="text-sm text-muted-foreground">{t.userRegistrationDesc}</p>
              </div>
              <Switch
                checked={settings.userRegistration}
                onCheckedChange={(value) => setSettings({ ...settings, userRegistration: value })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t.oauthLogin}</p>
                <p className="text-sm text-muted-foreground">{t.oauthLoginDesc}</p>
              </div>
              <Switch
                checked={settings.oauthLogin}
                onCheckedChange={(value) => setSettings({ ...settings, oauthLogin: value })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t.emailNotifications}</p>
                <p className="text-sm text-muted-foreground">{t.emailNotificationsDesc}</p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(value) => setSettings({ ...settings, emailNotifications: value })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t.postModeration}</p>
                <p className="text-sm text-muted-foreground">{t.postModerationDesc}</p>
              </div>
              <Switch
                checked={settings.postModeration}
                onCheckedChange={(value) => setSettings({ ...settings, postModeration: value })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t.maintenanceMode}</p>
                <p className="text-sm text-muted-foreground">{t.maintenanceModeDescription}</p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(value) => setSettings({ ...settings, maintenanceMode: value })}
              />
            </div>
            <Button onClick={handleToggleSave} disabled={savingToggles}>
              {savingToggles ? t.saving : t.save}
            </Button>
          </CardContent>
        </Card>

        {systemConfig && (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <div>
                    <CardTitle>{t.systemConfigEssayHint}</CardTitle>
                    <CardDescription>{t.systemConfigEssayHintDesc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={systemConfig.preApplicationEssayHint}
                  onChange={(e) =>
                    setSystemConfig({ ...systemConfig, preApplicationEssayHint: e.target.value })
                  }
                  rows={3}
                  placeholder={t.systemConfigEssayHintPlaceholder}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  <div>
                    <CardTitle>{t.systemConfigAuditLog}</CardTitle>
                    <CardDescription>{t.systemConfigAuditLogDesc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Switch
                  id="auditLog"
                  checked={systemConfig.auditLogEnabled}
                  onCheckedChange={(value) =>
                    setSystemConfig({ ...systemConfig, auditLogEnabled: value })
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.systemConfigEmailDomains}</CardTitle>
                <CardDescription>{t.systemConfigEmailDomainsDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {systemConfig.allowedEmailDomains.map((domain) => (
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
                {systemConfig.allowedEmailDomains.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t.systemConfigEmailDomainEmpty}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  <div>
                    <CardTitle>{t.reviewTemplatesApprove}</CardTitle>
                    <CardDescription>{t.reviewTemplatesApproveDesc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  {systemConfig.reviewTemplatesApprove.map((text, index) => (
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
                  {systemConfig.reviewTemplatesApprove.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t.reviewTemplatesEmpty}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <CardTitle>{t.reviewTemplatesReject}</CardTitle>
                    <CardDescription>{t.reviewTemplatesRejectDesc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Textarea
                    value={newTemplateReject}
                    onChange={(e) => setNewTemplateReject(e.target.value)}
                    placeholder={t.reviewTemplatePlaceholder}
                    rows={2}
                    className="flex-1"
                  />
                  <Button
                    onClick={() =>
                      handleAddTemplate("reject", newTemplateReject, setNewTemplateReject)
                    }
                    type="button"
                    className="shrink-0"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t.reviewTemplateAdd}
                  </Button>
                </div>
                <div className="space-y-2">
                  {systemConfig.reviewTemplatesReject.map((text, index) => (
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
                  {systemConfig.reviewTemplatesReject.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t.reviewTemplatesEmpty}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <div>
                    <CardTitle>{t.reviewTemplatesDispute}</CardTitle>
                    <CardDescription>{t.reviewTemplatesDisputeDesc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  {systemConfig.reviewTemplatesDispute.map((text, index) => (
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
                  {systemConfig.reviewTemplatesDispute.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t.reviewTemplatesEmpty}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  <div>
                    <CardTitle>{t.systemConfigTestEmail}</CardTitle>
                    <CardDescription>{t.systemConfigTestEmailDesc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
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
                    {process.env.NEXT_PUBLIC_EMAIL_PROVIDER ||
                      t.systemConfigEmailProviderNotConfigured}
                  </strong>
                </p>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={handleSystemConfigSave}
                disabled={savingSystemConfig || systemConfig.allowedEmailDomains.length === 0}
              >
                {savingSystemConfig ? t.systemConfigSaving : t.systemConfigSave}
              </Button>
            </div>
          </>
        )}

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">{t.dangerZone}</CardTitle>
            <CardDescription>{t.dangerZoneDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-4">
              <div>
                <p className="font-medium">{t.clearCache}</p>
                <p className="text-sm text-muted-foreground">{t.clearCacheDesc}</p>
              </div>
              <Button
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground bg-transparent"
                onClick={() => setClearOpen(true)}
              >
                {t.clearCacheBtn}
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-4">
              <div>
                <p className="font-medium">{t.resetDatabase}</p>
                <p className="text-sm text-muted-foreground">{t.resetDatabaseDesc}</p>
              </div>
              <Button variant="destructive" onClick={() => setResetOpen(true)}>
                {t.resetDatabaseBtn}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title={t.clearCacheConfirmTitle}
        description={t.clearCacheConfirmDesc}
        confirmLabel={t.confirm}
        cancelLabel={t.cancel}
        onConfirm={handleClearCache}
        confirming={dangerLoading}
        destructive
      />
      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title={t.resetDatabaseConfirmTitle}
        description={t.resetDatabaseConfirmDesc}
        confirmLabel={t.confirm}
        cancelLabel={t.cancel}
        onConfirm={handleResetDatabase}
        confirming={dangerLoading}
        destructive
      />
    </div>
  )
}
