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
  Users,
  Link as LinkIcon,
} from "lucide-react"
import type { Locale } from "@/lib/i18n/config"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import { cn } from "@/lib/utils"
import { resolveApiErrorMessage } from "@/lib/api/error-message"

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

type QQGroupConfig = {
  id: string
  name: string
  number: string
  url: string
  enabled: boolean
}

type SystemConfig = {
  preApplicationEssayHint: string
  allowedEmailDomains: string[]
  auditLogEnabled: boolean
  reviewTemplatesApprove: string[]
  reviewTemplatesReject: string[]
  reviewTemplatesDispute: string[]
  qqGroups: QQGroupConfig[]
  emailProvider: "env" | "api" | "smtp"
  selectedEmailApiConfigId: string | null
  smtpHost: string | null
  smtpPort: number | null
  smtpUser: string | null
  smtpPass: string | null
  smtpSecure: boolean
}

type EmailApiConfig = {
  id: string
  name: string
  host: string
  port: number
  user: string
  createdAt: string
  updatedAt: string
}

interface AdminSettingsFormProps {
  locale: Locale
  dict: Dictionary
}

type TabId = "general" | "security" | "email" | "qqGroups" | "templates" | "danger"

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

  // API 配置管理
  const [emailApiConfigs, setEmailApiConfigs] = useState<EmailApiConfig[]>([])
  const [apiConfigLoading, setApiConfigLoading] = useState(false)
  const [editingApiConfig, setEditingApiConfig] = useState<{
    id?: string
    name: string
    host: string
    port: number
    user: string
    pass: string
  } | null>(null)
  const [savingApiConfig, setSavingApiConfig] = useState(false)
  const [deletingApiConfigId, setDeletingApiConfigId] = useState<string | null>(null)

  const t = dict.admin

  const tabs: TabItem[] = [
    { id: "general", label: t.tabGeneral || "基础设置", icon: Globe },
    { id: "security", label: t.tabSecurity || "功能开关", icon: ToggleLeft },
    { id: "email", label: t.tabEmail || "邮件配置", icon: Mail },
    { id: "qqGroups", label: t.tabQQGroups || "QQ群管理", icon: Users },
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
        const [settingsRes, configRes, apiConfigsRes] = await Promise.all([
          fetch("/api/admin/settings"),
          fetch("/api/admin/system-config"),
          fetch("/api/admin/email-api-configs"),
        ])

        if (!settingsRes.ok) {
          const data = await settingsRes.json().catch(() => ({}))
          const message = resolveApiErrorMessage(data, dict) ?? t.settingsLoadFailed
          throw new Error(message)
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

        if (apiConfigsRes.ok) {
          const apiConfigsData = await apiConfigsRes.json()
          if (active) {
            setEmailApiConfigs(apiConfigsData)
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
        const message = resolveApiErrorMessage(data, dict) ?? t.settingsSaveFailed
        throw new Error(message)
      }

      if (!configRes.ok) {
        const data = await configRes.json().catch(() => ({}))
        const message = resolveApiErrorMessage(data, dict) ?? t.systemConfigSaveFailed
        throw new Error(message)
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
        const message = resolveApiErrorMessage(data, dict) ?? t.clearCacheFailed
        throw new Error(message)
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
        const message = resolveApiErrorMessage(data, dict) ?? t.resetDatabaseFailed
        throw new Error(message)
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
        const message = resolveApiErrorMessage(data, dict) ?? t.systemConfigTestEmailFailed
        throw new Error(message)
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

  // API 配置 CRUD 操作
  const loadApiConfigs = async () => {
    setApiConfigLoading(true)
    try {
      const res = await fetch("/api/admin/email-api-configs")
      if (res.ok) {
        const data = await res.json()
        setEmailApiConfigs(data)
      }
    } finally {
      setApiConfigLoading(false)
    }
  }

  const handleSaveApiConfig = async () => {
    if (!editingApiConfig) return
    setSavingApiConfig(true)
    try {
      const isUpdate = !!editingApiConfig.id
      const url = isUpdate
        ? `/api/admin/email-api-configs/${editingApiConfig.id}`
        : "/api/admin/email-api-configs"
      const res = await fetch(url, {
        method: isUpdate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingApiConfig.name,
          host: editingApiConfig.host,
          port: editingApiConfig.port,
          user: editingApiConfig.user,
          pass: editingApiConfig.pass,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const fallback = isUpdate ? "更新失败" : "创建失败"
        const message = resolveApiErrorMessage(data, dict) ?? fallback
        throw new Error(message)
      }
      toast.success(isUpdate ? "配置已更新" : "配置已创建")
      setEditingApiConfig(null)
      loadApiConfigs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败")
    } finally {
      setSavingApiConfig(false)
    }
  }

  const handleDeleteApiConfig = async (id: string) => {
    setDeletingApiConfigId(id)
    try {
      const res = await fetch(`/api/admin/email-api-configs/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message = resolveApiErrorMessage(data, dict) ?? "删除失败"
        throw new Error(message)
      }
      toast.success("配置已删除")
      // 如果删除的是当前选中的配置，清除选择
      if (systemConfig?.selectedEmailApiConfigId === id) {
        setSystemConfig({ ...systemConfig, selectedEmailApiConfigId: null })
      }
      loadApiConfigs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败")
    } finally {
      setDeletingApiConfigId(null)
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
                  {/* 邮件发送方式配置 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        {t.emailProviderLabel || "邮件发送方式"}
                      </CardTitle>
                      <CardDescription>
                        {t.emailProviderDesc || "选择邮件服务的配置来源"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* 发送方式选择 */}
                      <div className="space-y-3">
                        {(
                          [
                            {
                              value: "env",
                              label: t.emailProviderEnv || "使用环境变量",
                              desc: t.emailProviderEnvDesc || "从服务器环境变量读取邮件配置",
                            },
                            {
                              value: "api",
                              label: t.emailProviderApi || "使用 API 配置",
                              desc: t.emailProviderApiDesc || "使用 push.h7ml.cn API 代理发送邮件",
                            },
                            {
                              value: "smtp",
                              label: t.emailProviderSmtp || "使用 SMTP 配置",
                              desc: t.emailProviderSmtpDesc || "直接连接 SMTP 服务器发送邮件",
                            },
                          ] as const
                        ).map((option) => (
                          <label
                            key={option.value}
                            className={cn(
                              "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors",
                              systemConfig.emailProvider === option.value
                                ? "border-primary bg-primary/5"
                                : "border-border hover:bg-muted/50",
                            )}
                          >
                            <input
                              type="radio"
                              name="emailProvider"
                              value={option.value}
                              checked={systemConfig.emailProvider === option.value}
                              onChange={() =>
                                setSystemConfig({ ...systemConfig, emailProvider: option.value })
                              }
                              className="mt-1"
                            />
                            <div>
                              <p className="font-medium">{option.label}</p>
                              <p className="text-sm text-muted-foreground">{option.desc}</p>
                            </div>
                          </label>
                        ))}
                      </div>

                      {/* API 配置管理 */}
                      {systemConfig.emailProvider === "api" && (
                        <div className="pt-4 border-t space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{t.emailApiConfig || "API 配置"}</h4>
                            <Button
                              size="sm"
                              onClick={() =>
                                setEditingApiConfig({
                                  name: "",
                                  host: "smtp.qq.com",
                                  port: 587,
                                  user: "",
                                  pass: "",
                                })
                              }
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              新增配置
                            </Button>
                          </div>

                          {/* 配置列表 */}
                          {emailApiConfigs.length === 0 && !apiConfigLoading && (
                            <p className="text-sm text-muted-foreground py-4 text-center">
                              暂无 API 配置，请点击上方按钮新增
                            </p>
                          )}
                          {apiConfigLoading && (
                            <div className="flex justify-center py-4">
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                          )}
                          <div className="space-y-2">
                            {emailApiConfigs.map((config) => (
                              <div
                                key={config.id}
                                className={cn(
                                  "flex items-center justify-between p-3 rounded-lg border",
                                  systemConfig.selectedEmailApiConfigId === config.id
                                    ? "border-primary bg-primary/5"
                                    : "border-border",
                                )}
                              >
                                <label className="flex items-center gap-3 flex-1 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="selectedApiConfig"
                                    checked={systemConfig.selectedEmailApiConfigId === config.id}
                                    onChange={() =>
                                      setSystemConfig({
                                        ...systemConfig,
                                        selectedEmailApiConfigId: config.id,
                                      })
                                    }
                                  />
                                  <div>
                                    <p className="font-medium">{config.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {config.host}:{config.port} | {config.user}
                                    </p>
                                  </div>
                                </label>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      setEditingApiConfig({
                                        id: config.id,
                                        name: config.name,
                                        host: config.host,
                                        port: config.port,
                                        user: config.user,
                                        pass: "",
                                      })
                                    }
                                  >
                                    <Settings className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={
                                      deletingApiConfigId === config.id ||
                                      systemConfig.selectedEmailApiConfigId === config.id
                                    }
                                    onClick={() => handleDeleteApiConfig(config.id)}
                                  >
                                    {deletingApiConfigId === config.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* 编辑/新增弹窗 */}
                          {editingApiConfig && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                              <Card className="w-full max-w-md mx-4">
                                <CardHeader>
                                  <CardTitle>
                                    {editingApiConfig.id ? "编辑 API 配置" : "新增 API 配置"}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>配置名称</Label>
                                    <Input
                                      value={editingApiConfig.name}
                                      onChange={(e) =>
                                        setEditingApiConfig({
                                          ...editingApiConfig,
                                          name: e.target.value,
                                        })
                                      }
                                      placeholder="如：QQ邮箱配置"
                                    />
                                  </div>
                                  <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                      <Label>服务器地址</Label>
                                      <Input
                                        value={editingApiConfig.host}
                                        onChange={(e) =>
                                          setEditingApiConfig({
                                            ...editingApiConfig,
                                            host: e.target.value,
                                          })
                                        }
                                        placeholder="smtp.qq.com"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>端口</Label>
                                      <Input
                                        type="number"
                                        value={editingApiConfig.port}
                                        onChange={(e) =>
                                          setEditingApiConfig({
                                            ...editingApiConfig,
                                            port: Number(e.target.value) || 587,
                                          })
                                        }
                                        placeholder="587"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>用户名</Label>
                                    <Input
                                      value={editingApiConfig.user}
                                      onChange={(e) =>
                                        setEditingApiConfig({
                                          ...editingApiConfig,
                                          user: e.target.value,
                                        })
                                      }
                                      placeholder="your-email@qq.com"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>密码{editingApiConfig.id && "（留空则不修改）"}</Label>
                                    <Input
                                      type="password"
                                      value={editingApiConfig.pass}
                                      onChange={(e) =>
                                        setEditingApiConfig({
                                          ...editingApiConfig,
                                          pass: e.target.value,
                                        })
                                      }
                                      placeholder="••••••••"
                                    />
                                  </div>
                                </CardContent>
                                <div className="flex justify-end gap-2 p-6 pt-0">
                                  <Button
                                    variant="outline"
                                    onClick={() => setEditingApiConfig(null)}
                                  >
                                    取消
                                  </Button>
                                  <Button onClick={handleSaveApiConfig} disabled={savingApiConfig}>
                                    {savingApiConfig && (
                                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                    )}
                                    保存
                                  </Button>
                                </div>
                              </Card>
                            </div>
                          )}
                        </div>
                      )}

                      {/* SMTP 配置表单 */}
                      {systemConfig.emailProvider === "smtp" && (
                        <div className="pt-4 border-t space-y-4">
                          <h4 className="font-medium">{t.smtpConfig || "SMTP 配置"}</h4>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label>{t.smtpHost || "SMTP 服务器地址"}</Label>
                              <Input
                                value={systemConfig.smtpHost || ""}
                                onChange={(e) =>
                                  setSystemConfig({
                                    ...systemConfig,
                                    smtpHost: e.target.value || null,
                                  })
                                }
                                placeholder="smtp.gmail.com"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{t.smtpPort || "SMTP 端口"}</Label>
                              <Input
                                type="number"
                                value={systemConfig.smtpPort || ""}
                                onChange={(e) =>
                                  setSystemConfig({
                                    ...systemConfig,
                                    smtpPort: e.target.value ? Number(e.target.value) : null,
                                  })
                                }
                                placeholder="587"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{t.smtpUser || "SMTP 用户名"}</Label>
                              <Input
                                value={systemConfig.smtpUser || ""}
                                onChange={(e) =>
                                  setSystemConfig({
                                    ...systemConfig,
                                    smtpUser: e.target.value || null,
                                  })
                                }
                                placeholder="your-email@gmail.com"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{t.smtpPass || "SMTP 密码"}</Label>
                              <Input
                                type="password"
                                value={systemConfig.smtpPass || ""}
                                onChange={(e) =>
                                  setSystemConfig({
                                    ...systemConfig,
                                    smtpPass: e.target.value || null,
                                  })
                                }
                                placeholder="••••••••"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              id="smtpSecure"
                              checked={systemConfig.smtpSecure}
                              onCheckedChange={(v) =>
                                setSystemConfig({ ...systemConfig, smtpSecure: v })
                              }
                            />
                            <Label htmlFor="smtpSecure" className="cursor-pointer">
                              {t.smtpSecure || "使用 SSL/TLS"}
                            </Label>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

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
                          {systemConfig.emailProvider === "env"
                            ? t.emailProviderEnv || "环境变量"
                            : systemConfig.emailProvider === "api"
                              ? t.emailProviderApi || "API"
                              : t.emailProviderSmtp || "SMTP"}
                        </Badge>
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* QQ 群管理 */}
              {activeTab === "qqGroups" && systemConfig && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {t.qqGroupsTitle || "QQ 群配置"}
                    </CardTitle>
                    <CardDescription>
                      {t.qqGroupsDesc || "管理 QQ 群信息，配置后将在页脚和预申请页面显示"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {systemConfig.qqGroups.map((group, index) => (
                        <div
                          key={group.id}
                          className={cn(
                            "flex flex-col gap-3 p-4 rounded-lg border",
                            group.enabled
                              ? "border-primary/30 bg-primary/5"
                              : "border-border bg-muted/30 opacity-60",
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={group.enabled}
                                onCheckedChange={(v) => {
                                  const newGroups = [...systemConfig.qqGroups]
                                  newGroups[index] = { ...group, enabled: v }
                                  setSystemConfig({ ...systemConfig, qqGroups: newGroups })
                                }}
                              />
                              <span className="font-medium">{group.name || `群 ${index + 1}`}</span>
                              <Badge variant="secondary" className="text-xs">
                                {group.number}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newGroups = systemConfig.qqGroups.filter(
                                  (_, i) => i !== index,
                                )
                                setSystemConfig({ ...systemConfig, qqGroups: newGroups })
                              }}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">
                                {t.qqGroupName || "群名称"}
                              </Label>
                              <Input
                                value={group.name}
                                onChange={(e) => {
                                  const newGroups = [...systemConfig.qqGroups]
                                  newGroups[index] = { ...group, name: e.target.value }
                                  setSystemConfig({ ...systemConfig, qqGroups: newGroups })
                                }}
                                placeholder="一群"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">
                                {t.qqGroupNumber || "群号"}
                              </Label>
                              <Input
                                value={group.number}
                                onChange={(e) => {
                                  const newGroups = [...systemConfig.qqGroups]
                                  newGroups[index] = { ...group, number: e.target.value }
                                  setSystemConfig({ ...systemConfig, qqGroups: newGroups })
                                }}
                                placeholder="123456789"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">
                                {t.qqGroupUrl || "加群链接"}
                              </Label>
                              <div className="flex gap-1">
                                <Input
                                  value={group.url}
                                  onChange={(e) => {
                                    const newGroups = [...systemConfig.qqGroups]
                                    newGroups[index] = { ...group, url: e.target.value }
                                    setSystemConfig({ ...systemConfig, qqGroups: newGroups })
                                  }}
                                  placeholder="https://qm.qq.com/..."
                                />
                                {group.url && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="shrink-0 px-2"
                                    onClick={() => window.open(group.url, "_blank")}
                                  >
                                    <LinkIcon className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {systemConfig.qqGroups.length === 0 && (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        {t.qqGroupsEmpty || "暂无 QQ 群配置，请点击下方按钮添加"}
                      </p>
                    )}

                    <Button
                      variant="outline"
                      onClick={() => {
                        const newId = `GROUP_${Date.now()}`
                        const newGroup: QQGroupConfig = {
                          id: newId,
                          name: `群 ${systemConfig.qqGroups.length + 1}`,
                          number: "",
                          url: "",
                          enabled: true,
                        }
                        setSystemConfig({
                          ...systemConfig,
                          qqGroups: [...systemConfig.qqGroups, newGroup],
                        })
                      }}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t.qqGroupAdd || "添加 QQ 群"}
                    </Button>
                  </CardContent>
                </Card>
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
