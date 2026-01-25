"use client"

import { useEffect, useState } from "react"
import { GitCommit } from "lucide-react"

interface BuildInfo {
  source: "build" | "github"
  commitHash: string
  commitHashShort: string
  commitTime: string
  commitAuthor: string
  commitUrl: string
  repoUrl: string
  buildTime: string
  authorGitHub?: string | null
}

interface BuildInfoDisplayProps {
  locale: string
}

export function BuildInfoDisplay({ locale }: BuildInfoDisplayProps) {
  const [info, setInfo] = useState<BuildInfo | null>(null)

  useEffect(() => {
    fetch("/api/build-info?source=github")
      .then((res) => res.json())
      .then(setInfo)
      .catch(() => {})
  }, [])

  if (!info || info.commitHash === "unknown") return null

  // 格式化时间为 UTC+8
  const formatTime = (isoTime: string) => {
    if (!isoTime) return ""
    try {
      return new Date(isoTime).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    } catch {
      return isoTime
    }
  }

  const authorUrl = info.authorGitHub
    ? `https://github.com/${info.authorGitHub}`
    : `https://github.com/${info.commitAuthor}`

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground/70">
      <span className="inline-flex items-center gap-1">
        <GitCommit className="h-3 w-3" />
        <a
          href={info.commitUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono hover:text-primary hover:underline"
          title={info.commitHash}
        >
          {info.commitHashShort}
        </a>
      </span>
      <a
        href={authorUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-primary hover:underline"
      >
        @{info.authorGitHub || info.commitAuthor}
      </a>
      {info.commitTime && (
        <span title={locale === "zh" ? "提交时间" : "Commit time"}>
          {formatTime(info.commitTime)}
        </span>
      )}
      <span title={locale === "zh" ? "构建时间" : "Build time"}>
        {locale === "zh" ? "构建" : "Built"}: {info.buildTime}
      </span>
    </div>
  )
}
