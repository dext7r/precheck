"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
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
  Loader2,
  Save,
  Globe,
  ToggleLeft,
  MessageSquare,
  Trash2,
  RefreshCw,
  ChevronDown,
} from "lucide-react"
import type { Locale } from "@/lib/i18n/config"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import { cn } from "@/lib/utils"

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

type TabId = "general" | "security" | "email" | "templates" | "danger"

interface TabItem {
  id: TabId
  label: string
  icon: React.ElementType
  color?: string
}

export function AdminSettingsForm({ locale, dict }: AdminSettingsFormProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>("general")
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null)
  const [initialSettings, setInitialSettings] = useState<SiteSettings | null>(null)
  const [initialSystemConfig, setInitialSystemConfig] = useState<SystemConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [dangerLoading, setDangerLoading] = useState(false)

  const [newDomain, setNewDomain] = useState("")
  const [newTemplateApprove, setNewTemplateApprove] = useState("")
  const [newTemplateReject, setNewTemplateReject] = useState("")
  const [newTemplateDispute, setNewTemplateDispute] = useState("")
  const [testingEmail, setTestingEmail] = useState(false)
  const [testEmailAddress, setTestEmailAddress] = useState("")

  const t = dict.admin

  const tabs: TabItem[] = [
    { id: "general", label: t.tabGeneral || "基础设置", icon: Globe },
    { id: "security", label: t.tabSecurity || "功能开关", icon: ToggleLeft },
    { id: "email", label: t.tabEmail || "邮件配置", icon: Mail },
    { id: "templates", label: t.tabTemplates || "审核模板", icon: MessageSquare },
    {
      id: "danger",
      label: t.tabDanger || "危险操作",
      icon: AlertTriangle,
      color: "text-destructive",
    },
  ]

  const hasChanges = useMemo(() => {
    if (!settings || !initialSettings) return false
    if (!systemConfig || !initialSystemConfig) return false

    const settingsChanged = JSON.stringify(settings) !== JSON.stringify(initialSettings)
    const configChanged = JSON.stringify(systemConfig) !== JSON.stringify(initialSystemConfig)

    return settingsChanged || configChanged
  }, [settings, initialSettings, systemConfig, initialSystemConfig])

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
          setInitialSettings(settingsData)
        }

        if (configRes.ok) {
          const configData = await configRes.json()
          if (active) {
            setSystemConfig(configData)
            setInitialSystemConfig(configData)
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

  const handleSaveAll = async () => {
    if (!settings || !systemConfig) return
    setSaving(true)
    setError("")

    try {
      const [settingsRes, configRes] = await Promise.all([
        fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        }),
        fetch("/api/admin/system-config", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(systemConfig),
        }),
      ])

      if (!settingsRes.ok) {
        const data = await settingsRes.json().catch(() => ({}))
        throw new Error(data?.error || t.settingsSaveFailed)
      }

      if (!configRes.ok) {
        const data = await configRes.json().catch(() => ({}))
        throw new Error(data?.error || t.systemConfigSaveFailed)
      }

      const updatedSettings = await settingsRes.json()
      setSettings(updatedSettings)
      setInitialSettings(updatedSettings)
      setInitialSystemConfig({ ...systemConfig })

      toast.success(t.settingsSaved)
    } catch (err) {
      const message = err instanceof Error ? err.message : t.settingsSaveFailed
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
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

  // 功能开关项组件
  const ToggleItem = ({
    title,
    description,
    checked,
    onCheckedChange,
    icon: Icon,
  }: {
    title: string
    description: string
    checked: boolean
    onCheckedChange: (v: boolean) => void
    icon?: React.ElementType
  }) => (
    <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        {Icon && (
          <div
            className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
              checked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )

  // 模板列表组件
  const TemplateList = ({
    items,
    onRemove,
    emptyText,
    colorClass,
  }: {
    items: string[]
    onRemove: (text: string) => void
    emptyText: string
    colorClass: string
  }) => (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {items.map((text, index) => (
          <motion.div
            key={text}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "flex items-start justify-between gap-2 rounded-lg px-3 py-2.5",
              colorClass,
            )}
          >
            <span className="text-sm flex-1 leading-relaxed">{text}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(text)}
              className="h-6 w-6 p-0 shrink-0 opacity-60 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>
      {items.length === 0 && <p className="text-sm text-muted-foreground py-2">{emptyText}</p>}
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!settings) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error || t.settingsLoadFailed}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 页面标题和保存按钮 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t.settings}</h1>
          <p className="mt-1 text-sm sm:text-base text-muted-foreground">
            {t.configureSystemSettings}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <AnimatePresence>
            {hasChanges && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                <Badge
                  variant="outline"
                  className="text-xs sm:text-sm bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                >
                  {t.unsavedChanges || "有未保存的修改"}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
          <Button onClick={handleSaveAll} disabled={saving || !hasChanges} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="hidden sm:inline">
              {saving ? t.saving : t.saveAll || "保存所有修改"}
            </span>
            <span className="sm:hidden">{saving ? t.saving : t.save}</span>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 移动端可折叠导航 */}
      <div className="lg:hidden">
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 rounded-lg border border-border/50"
        >
          <div className="flex items-center gap-2">
            {(() => {
              const currentTab = tabs.find((t) => t.id === activeTab)
              const Icon = currentTab?.icon || Settings
              return (
                <>
                  <Icon className={cn("h-4 w-4", currentTab?.color)} />
                  <span className={cn("text-sm font-medium", currentTab?.color)}>
                    {currentTab?.label}
                  </span>
                </>
              )
            })()}
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              mobileNavOpen && "rotate-180",
            )}
          />
        </button>
        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-2 p-2 bg-muted/30 rounded-lg border border-border/50 space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id)
                        setMobileNavOpen(false)
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        tab.color && !isActive && tab.color,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 主内容区：侧边导航 + 内容面板 */}
      <div className="flex gap-6">
        {/* PC端侧边导航 */}
        <nav className="hidden lg:block w-48 shrink-0">
          <div className="sticky top-6 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    tab.color && !isActive && tab.color,
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </nav>

        {/* 内容面板 */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* 基础设置 */}
              {activeTab === "general" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      {t.siteSettings}
                    </CardTitle>
                    <CardDescription>{t.siteSettingsDesc}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="siteName">{t.siteName}</Label>
                        <Input
                          id="siteName"
                          value={settings.siteName}
                          onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="siteDescription">{t.siteDescription}</Label>
                        <Input
                          id="siteDescription"
                          value={settings.siteDescription}
                          onChange={(e) =>
                            setSettings({ ...settings, siteDescription: e.target.value })
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="contactEmail">{t.contactEmail}</Label>
                        <Input
                          id="contactEmail"
                          type="email"
                          value={settings.contactEmail}
                          onChange={(e) =>
                            setSettings({ ...settings, contactEmail: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    {systemConfig && (
                      <div className="pt-6 border-t">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <Label>{t.systemConfigEssayHint}</Label>
                        </div>
                        <Textarea
                          value={systemConfig.preApplicationEssayHint}
                          onChange={(e) =>
                            setSystemConfig({
                              ...systemConfig,
                              preApplicationEssayHint: e.target.value,
                            })
                          }
                          rows={3}
                          placeholder={t.systemConfigEssayHintPlaceholder}
                        />
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          {t.systemConfigEssayHintDesc}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 功能开关 */}
              {activeTab === "security" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ToggleLeft className="h-5 w-5" />
                      {t.featureToggles}
                    </CardTitle>
                    <CardDescription>{t.featureTogglesDesc}</CardDescription>
                  </CardHeader>
                  <CardContent className="divide-y">
                    <ToggleItem
                      title={t.userRegistration}
                      description={t.userRegistrationDesc}
                      checked={settings.userRegistration}
                      onCheckedChange={(v) => setSettings({ ...settings, userRegistration: v })}
                    />
                    <ToggleItem
                      title={t.oauthLogin}
                      description={t.oauthLoginDesc}
                      checked={settings.oauthLogin}
                      onCheckedChange={(v) => setSettings({ ...settings, oauthLogin: v })}
                    />
                    <ToggleItem
                      title={t.emailNotifications}
                      description={t.emailNotificationsDesc}
                      checked={settings.emailNotifications}
                      onCheckedChange={(v) => setSettings({ ...settings, emailNotifications: v })}
                    />
                    <ToggleItem
                      title={t.postModeration}
                      description={t.postModerationDesc}
                      checked={settings.postModeration}
                      onCheckedChange={(v) => setSettings({ ...settings, postModeration: v })}
                    />
                    <ToggleItem
                      title={t.maintenanceMode}
                      description={t.maintenanceModeDescription}
                      checked={settings.maintenanceMode}
                      onCheckedChange={(v) => setSettings({ ...settings, maintenanceMode: v })}
                    />
                    {systemConfig && (
                      <ToggleItem
                        icon={Shield}
                        title={t.systemConfigAuditLog}
                        description={t.systemConfigAuditLogDesc}
                        checked={systemConfig.auditLogEnabled}
                        onCheckedChange={(v) =>
                          setSystemConfig({ ...systemConfig, auditLogEnabled: v })
                        }
                      />
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 邮件配置 */}
              {activeTab === "email" && systemConfig && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        {t.systemConfigEmailDomains}
                      </CardTitle>
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
                        <Button onClick={handleAddDomain} type="button" className="shrink-0">
                          <Plus className="h-4 w-4 mr-1" />
                          {t.systemConfigEmailDomainAdd}
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <AnimatePresence mode="popLayout">
                          {systemConfig.allowedEmailDomains.map((domain) => (
                            <motion.div
                              key={domain}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="group flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 bg-primary/5 border border-primary/20 rounded-full"
                            >
                              <span className="text-sm">{domain}</span>
                              <button
                                onClick={() => handleRemoveDomain(domain)}
                                className="p-0.5 rounded-full hover:bg-primary/10 transition-colors"
                              >
                                <X className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                      {systemConfig.allowedEmailDomains.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          {t.systemConfigEmailDomainEmpty}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        {t.systemConfigTestEmail}
                      </CardTitle>
                      <CardDescription>{t.systemConfigTestEmailDesc}</CardDescription>
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
                        <Button
                          onClick={handleTestEmail}
                          type="button"
                          disabled={testingEmail}
                          variant="outline"
                          className="shrink-0"
                        >
                          {testingEmail ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Mail className="h-4 w-4 mr-1" />
                          )}
                          {testingEmail
                            ? t.systemConfigTestEmailSending
                            : t.systemConfigTestEmailSend}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t.systemConfigEmailProvider}:
                        <Badge variant="secondary" className="ml-2">
                          {process.env.NEXT_PUBLIC_EMAIL_PROVIDER ||
                            t.systemConfigEmailProviderNotConfigured}
                        </Badge>
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* 审核模板 */}
              {activeTab === "templates" && systemConfig && (
                <div className="space-y-6">
                  {/* 通过模板 */}
                  <Card className="border-emerald-200/50 dark:border-emerald-800/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                          <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        {t.reviewTemplatesApprove}
                      </CardTitle>
                      <CardDescription>{t.reviewTemplatesApproveDesc}</CardDescription>
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
                          className="shrink-0 self-end"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {t.reviewTemplateAdd}
                        </Button>
                      </div>
                      <TemplateList
                        items={systemConfig.reviewTemplatesApprove}
                        onRemove={(text) => handleRemoveTemplate("approve", text)}
                        emptyText={t.reviewTemplatesEmpty}
                        colorClass="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/30"
                      />
                    </CardContent>
                  </Card>

                  {/* 拒绝模板 */}
                  <Card className="border-rose-200/50 dark:border-rose-800/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40">
                          <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                        </div>
                        {t.reviewTemplatesReject}
                      </CardTitle>
                      <CardDescription>{t.reviewTemplatesRejectDesc}</CardDescription>
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
                          className="shrink-0 self-end"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {t.reviewTemplateAdd}
                        </Button>
                      </div>
                      <TemplateList
                        items={systemConfig.reviewTemplatesReject}
                        onRemove={(text) => handleRemoveTemplate("reject", text)}
                        emptyText={t.reviewTemplatesEmpty}
                        colorClass="bg-rose-50 dark:bg-rose-900/20 border border-rose-200/50 dark:border-rose-800/30"
                      />
                    </CardContent>
                  </Card>

                  {/* 申诉模板 */}
                  <Card className="border-amber-200/50 dark:border-amber-800/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        {t.reviewTemplatesDispute}
                      </CardTitle>
                      <CardDescription>{t.reviewTemplatesDisputeDesc}</CardDescription>
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
                          className="shrink-0 self-end"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {t.reviewTemplateAdd}
                        </Button>
                      </div>
                      <TemplateList
                        items={systemConfig.reviewTemplatesDispute}
                        onRemove={(text) => handleRemoveTemplate("dispute", text)}
                        emptyText={t.reviewTemplatesEmpty}
                        colorClass="bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-800/30"
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* 危险区域 */}
              {activeTab === "danger" && (
                <Card className="border-destructive/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                      {t.dangerZone}
                    </CardTitle>
                    <CardDescription>{t.dangerZoneDesc}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                          <RefreshCw className="h-5 w-5 text-destructive" />
                        </div>
                        <div>
                          <p className="font-medium">{t.clearCache}</p>
                          <p className="text-sm text-muted-foreground">{t.clearCacheDesc}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => setClearOpen(true)}
                      >
                        {t.clearCacheBtn}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                          <Trash2 className="h-5 w-5 text-destructive" />
                        </div>
                        <div>
                          <p className="font-medium">{t.resetDatabase}</p>
                          <p className="text-sm text-muted-foreground">{t.resetDatabaseDesc}</p>
                        </div>
                      </div>
                      <Button variant="destructive" onClick={() => setResetOpen(true)}>
                        {t.resetDatabaseBtn}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
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
