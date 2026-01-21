"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
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

interface AdminSettingsFormProps {
  locale: Locale
  dict: Dictionary
}

export function AdminSettingsForm({ locale, dict }: AdminSettingsFormProps) {
  const router = useRouter()
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [savingSite, setSavingSite] = useState(false)
  const [savingToggles, setSavingToggles] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [dangerLoading, setDangerLoading] = useState(false)

  const t = dict.admin

  useEffect(() => {
    let active = true
    const loadSettings = async () => {
      setLoading(true)
      setError("")
      try {
        const res = await fetch("/api/admin/settings")
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error || t.settingsLoadFailed)
        }
        const data = await res.json()
        if (active) {
          setSettings(data)
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
    loadSettings()
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
