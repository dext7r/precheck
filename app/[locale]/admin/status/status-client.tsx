"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
}

const serviceConfig: Record<string, { icon: typeof Database; labelKey: string }> = {
  database: { icon: Database, labelKey: "statusServiceDatabase" },
  redis: { icon: Server, labelKey: "statusServiceRedis" },
  email: { icon: Mail, labelKey: "statusServiceEmail" },
  turnstile: { icon: Shield, labelKey: "statusServiceTurnstile" },
  oauthGithub: { icon: Shield, labelKey: "statusServiceOAuthGitHub" },
  oauthGoogle: { icon: Shield, labelKey: "statusServiceOAuthGoogle" },
  cloudflareAI: { icon: Cloud, labelKey: "statusServiceCloudflareAI" },
  fileUpload: { icon: Upload, labelKey: "statusServiceFileUpload" },
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
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

export function StatusClient({ dict }: StatusClientProps) {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

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
    }
  }, [])

  useEffect(() => {
    fetchHealth()
  }, [fetchHealth])

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

  return (
    <div className="space-y-6">
      {/* 头部：整体状态 + 刷新 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <OverallStatusIndicator status={data.status} t={t} />
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {(t.statusLastCheck as string) || "Last checked"}:{" "}
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">
                  {(t.statusUptime as string) || "Uptime"}
                </div>
                <div className="font-medium">{formatUptime(data.uptime)}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <Server className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">
                  {(t.statusEnvironment as string) || "Environment"}
                </div>
                <div className="font-medium">{data.environment}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">
                  {(t.statusBuildTime as string) || "Build Time"}
                </div>
                <div className="font-medium text-sm">
                  {data.deployment.buildTime !== "unknown"
                    ? new Date(data.deployment.buildTime).toLocaleString()
                    : "N/A"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <Cloud className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">
                  {(t.statusPlatform as string) || "Platform"}
                </div>
                <div className="font-medium">
                  {data.deployment.platform !== "unknown" ? data.deployment.platform : "N/A"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <GitBranch className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">
                  {(t.statusGitBranch as string) || "Git Branch"}
                </div>
                <div className="font-medium font-mono text-sm">
                  {data.deployment.git.branch !== "unknown" ? data.deployment.git.branch : "N/A"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <GitCommit className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">
                  {(t.statusGitCommit as string) || "Git Commit"}
                </div>
                <div className="font-medium font-mono text-sm">
                  {data.deployment.git.commitShort !== "unknown"
                    ? data.deployment.git.commitShort
                    : "N/A"}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
