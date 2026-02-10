"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Activity,
  RefreshCw,
  Database,
  Server,
  Mail,
  Shield,
  Cloud,
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MinusCircle,
  Clock,
  GitBranch,
  GitCommit,
  ExternalLink,
  User,
  Cpu,
  FileText,
  Globe,
} from "lucide-react"
import type { Dictionary } from "@/lib/i18n/get-dictionary"

interface StatusClientProps {
  dict: Dictionary
}

type ServiceStatus = "up" | "down" | "degraded" | "unconfigured"

interface ServiceInfo {
  status: ServiceStatus
  latency?: number
}

interface HealthData {
  status: "ok" | "degraded" | "down"
  timestamp: string
  uptime: number
  environment: string
  services?: Record<string, ServiceInfo>
  deployment: {
    buildTime: string
    platform: string
    platformUrl: string
    git: {
      commitHash: string
      commitShort: string
      commitMessage: string
      author: string
      repo: string
      branch: string
    }
  }
  runtime?: {
    nodeVersion: string
    memoryUsage: {
      rss: number
      heapUsed: number
      heapTotal: number
      external: number
    }
  }
}

const serviceConfig: Record<string, { icon: typeof Database; labelKey: string }> = {
  database: { icon: Database, labelKey: "statusServiceDatabase" },
  redis: { icon: Server, labelKey: "statusServiceRedis" },
  email: { icon: Mail, labelKey: "statusServiceEmail" },
  turnstile: { icon: Shield, labelKey: "statusServiceTurnstile" },
  oauthGithub: { icon: Shield, labelKey: "statusServiceOAuthGitHub" },
  oauthGoogle: { icon: Shield, labelKey: "statusServiceOAuthGoogle" },
  oauthLinuxdo: { icon: Shield, labelKey: "statusServiceOAuthLinuxDo" },
  cloudflareAI: { icon: Cloud, labelKey: "statusServiceCloudflareAI" },
  fileUpload: { icon: Upload, labelKey: "statusServiceFileUpload" },
}

const AUTO_REFRESH_INTERVAL = 30

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function StatusBadge({ status, t }: { status: ServiceStatus; t: Record<string, unknown> }) {
  const config: Record<
    ServiceStatus,
    { icon: typeof CheckCircle; color: string; labelKey: string }
  > = {
    up: {
      icon: CheckCircle,
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      labelKey: "statusServiceUp",
    },
    down: {
      icon: XCircle,
      color: "bg-red-500/10 text-red-600 dark:text-red-400",
      labelKey: "statusServiceDown",
    },
    degraded: {
      icon: AlertTriangle,
      color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      labelKey: "statusServiceDegraded",
    },
    unconfigured: {
      icon: MinusCircle,
      color: "bg-slate-500/10 text-slate-500 dark:text-slate-400",
      labelKey: "statusServiceUnconfigured",
    },
  }

  const { icon: Icon, color, labelKey } = config[status]

  return (
    <Badge variant="secondary" className={`gap-1 ${color}`}>
      <Icon className="h-3 w-3" />
      {(t[labelKey] as string) || status}
    </Badge>
  )
}

function OverallStatusIndicator({
  status,
  t,
}: {
  status: "ok" | "degraded" | "down"
  t: Record<string, unknown>
}) {
  const config: Record<
    "ok" | "degraded" | "down",
    { color: string; bgColor: string; labelKey: string }
  > = {
    ok: {
      color: "bg-emerald-500",
      bgColor: "bg-emerald-500/10",
      labelKey: "statusOk",
    },
    degraded: {
      color: "bg-amber-500",
      bgColor: "bg-amber-500/10",
      labelKey: "statusDegraded",
    },
    down: {
      color: "bg-red-500",
      bgColor: "bg-red-500/10",
      labelKey: "statusDown",
    },
  }

  const { color, bgColor, labelKey } = config[status]

  return (
    <div className={`flex items-center gap-3 rounded-lg p-4 ${bgColor}`}>
      <div className={`h-4 w-4 rounded-full ${color} animate-pulse`} />
      <span className="text-lg font-medium">{(t[labelKey] as string) || status}</span>
    </div>
  )
}

function InfoCell({
  icon: Icon,
  label,
  value,
  mono = false,
  href,
}: {
  icon: typeof Clock
  label: string
  value: string
  mono?: boolean
  href?: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-4">
      <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-sm text-muted-foreground">{label}</div>
        {href && value !== "N/A" ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 text-sm font-medium hover:underline ${mono ? "font-mono" : ""}`}
          >
            {value}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <div className={`text-sm font-medium truncate ${mono ? "font-mono" : ""}`}>{value}</div>
        )}
      </div>
    </div>
  )
}

export function StatusClient({ dict }: StatusClientProps) {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [countdown, setCountdown] = useState(AUTO_REFRESH_INTERVAL)
  const countdownRef = useRef(AUTO_REFRESH_INTERVAL)

  const t = dict.admin as Record<string, unknown>

  const fetchHealth = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await fetch("/api/health", { cache: "no-store" })
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error("Failed to fetch health:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
      countdownRef.current = AUTO_REFRESH_INTERVAL
      setCountdown(AUTO_REFRESH_INTERVAL)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
  }, [fetchHealth])

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return
    const timer = setInterval(() => {
      countdownRef.current -= 1
      setCountdown(countdownRef.current)
      if (countdownRef.current <= 0) {
        fetchHealth(true)
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [autoRefresh, fetchHealth])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load status
        </CardContent>
      </Card>
    )
  }

  const git = data.deployment.git
  const repoUrl = git.repo !== "unknown" ? `https://github.com/${git.repo}` : undefined
  const commitUrl =
    repoUrl && git.commitHash !== "unknown" ? `${repoUrl}/commit/${git.commitHash}` : undefined
  const branchUrl =
    repoUrl && git.branch !== "unknown" ? `${repoUrl}/tree/${git.branch}` : undefined
  const platformUrl =
    data.deployment.platformUrl !== "unknown" ? data.deployment.platformUrl : undefined

  return (
    <div className="space-y-6">
      {/* 头部：整体状态 + 刷新 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <OverallStatusIndicator status={data.status} t={t} />
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} className="scale-90" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {autoRefresh
                ? `${(t.statusAutoRefresh as string) || "Auto"} (${countdown}s)`
                : (t.statusAutoRefreshOff as string) || "Auto off"}
            </span>
          </div>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {new Date(data.timestamp).toLocaleString()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchHealth(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing
              ? (t.statusRefreshing as string) || "Refreshing..."
              : (t.statusRefresh as string) || "Refresh"}
          </Button>
        </div>
      </div>

      {/* 服务状态卡片 */}
      {data.services && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {(t.statusServices as string) || "Services"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(data.services).map(([key, info]) => {
                const config = serviceConfig[key]
                if (!config) return null
                const Icon = config.icon
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{(t[config.labelKey] as string) || key}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={info.status} t={t} />
                      {info.latency !== undefined && (
                        <span className="text-xs text-muted-foreground">{info.latency}ms</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 部署信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            {(t.statusDeployment as string) || "Deployment Info"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoCell
              icon={Clock}
              label={(t.statusUptime as string) || "Uptime"}
              value={formatUptime(data.uptime)}
            />
            <InfoCell
              icon={Server}
              label={(t.statusEnvironment as string) || "Environment"}
              value={data.environment}
            />
            <InfoCell
              icon={Clock}
              label={(t.statusBuildTime as string) || "Build Time"}
              value={
                data.deployment.buildTime !== "unknown"
                  ? new Date(data.deployment.buildTime).toLocaleString()
                  : "N/A"
              }
            />
            <InfoCell
              icon={Cloud}
              label={(t.statusPlatform as string) || "Platform"}
              value={data.deployment.platform !== "unknown" ? data.deployment.platform : "N/A"}
              href={platformUrl}
            />
            <InfoCell
              icon={Globe}
              label={(t.statusRepo as string) || "Repository"}
              value={git.repo !== "unknown" ? git.repo : "N/A"}
              mono
              href={repoUrl}
            />
            <InfoCell
              icon={GitBranch}
              label={(t.statusGitBranch as string) || "Branch"}
              value={git.branch !== "unknown" ? git.branch : "N/A"}
              mono
              href={branchUrl}
            />
            <InfoCell
              icon={GitCommit}
              label={(t.statusGitCommit as string) || "Commit"}
              value={git.commitShort !== "unknown" ? git.commitShort : "N/A"}
              mono
              href={commitUrl}
            />
            <InfoCell
              icon={User}
              label={(t.statusGitAuthor as string) || "Author"}
              value={git.author !== "unknown" ? git.author : "N/A"}
            />
            <InfoCell
              icon={FileText}
              label={(t.statusGitMessage as string) || "Commit Message"}
              value={git.commitMessage !== "unknown" ? git.commitMessage : "N/A"}
            />
          </div>
        </CardContent>
      </Card>

      {/* 系统运行时 */}
      {data.runtime && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              {(t.statusRuntime as string) || "Runtime"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <InfoCell
                icon={Cpu}
                label={(t.statusNodeVersion as string) || "Node.js"}
                value={data.runtime.nodeVersion}
                mono
              />
              <InfoCell
                icon={Server}
                label={(t.statusMemRss as string) || "RSS"}
                value={formatBytes(data.runtime.memoryUsage.rss)}
              />
              <InfoCell
                icon={Server}
                label={(t.statusMemHeap as string) || "Heap Used / Total"}
                value={`${formatBytes(data.runtime.memoryUsage.heapUsed)} / ${formatBytes(data.runtime.memoryUsage.heapTotal)}`}
              />
              <InfoCell
                icon={Server}
                label={(t.statusMemExternal as string) || "External"}
                value={formatBytes(data.runtime.memoryUsage.external)}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
