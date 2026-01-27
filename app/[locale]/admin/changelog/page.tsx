import { readFile } from "fs/promises"
import { join } from "path"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { History, Plus, Wrench, Trash2, AlertTriangle, Bug, Shield } from "lucide-react"

interface ChangelogPageProps {
  params: Promise<{ locale: string }>
}

type ChangeType = "added" | "changed" | "deprecated" | "removed" | "fixed" | "security"

interface Change {
  type: ChangeType
  content: string
}

interface Version {
  version: string
  date: string | null
  changes: Change[]
}

interface ChangelogData {
  versions: Version[]
}

const typeConfig: Record<
  ChangeType,
  { label: string; labelEn: string; icon: typeof Plus; color: string }
> = {
  added: {
    label: "新增",
    labelEn: "Added",
    icon: Plus,
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  changed: {
    label: "变更",
    labelEn: "Changed",
    icon: Wrench,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  deprecated: {
    label: "废弃",
    labelEn: "Deprecated",
    icon: AlertTriangle,
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  removed: {
    label: "移除",
    labelEn: "Removed",
    icon: Trash2,
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  fixed: {
    label: "修复",
    labelEn: "Fixed",
    icon: Bug,
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  security: {
    label: "安全",
    labelEn: "Security",
    icon: Shield,
    color: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
}

async function getChangelog(): Promise<ChangelogData | null> {
  try {
    const filePath = join(process.cwd(), "data/changelog.json")
    const content = await readFile(filePath, "utf-8")
    return JSON.parse(content)
  } catch {
    return null
  }
}

export default async function ChangelogPage({ params }: ChangelogPageProps) {
  const { locale } = await params
  const currentLocale = locales.includes(locale as Locale) ? (locale as Locale) : defaultLocale
  const dict = await getDictionary(currentLocale)
  const data = await getChangelog()

  const t = dict.admin as Record<string, unknown>
  const isZh = currentLocale === "zh"

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg shadow-blue-500/25">
          <History className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {(t.changelog as string) || "更新日志"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {(t.changelogDesc as string) || "查看系统更新记录"}
          </p>
        </div>
      </div>

      {data?.versions.map((version, idx) => (
        <Card key={version.version} className={idx === 0 ? "border-primary/50" : ""}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg font-mono">{version.version}</CardTitle>
              {version.date && (
                <span className="text-sm text-muted-foreground">{version.date}</span>
              )}
              {idx === 0 && !version.date && (
                <Badge variant="secondary" className="text-xs">
                  {isZh ? "开发中" : "In Progress"}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {version.changes.map((change, i) => {
                const config = typeConfig[change.type]
                const Icon = config.icon
                return (
                  <li key={i} className="flex items-start gap-2">
                    <Badge variant="secondary" className={`shrink-0 gap-1 ${config.color}`}>
                      <Icon className="h-3 w-3" />
                      {isZh ? config.label : config.labelEn}
                    </Badge>
                    <span className="text-sm">{change.content}</span>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      ))}

      {!data && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {isZh ? "暂无更新日志" : "No changelog available"}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
