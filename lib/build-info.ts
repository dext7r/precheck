// 构建信息（从环境变量获取，构建时注入）
export const buildInfo = {
  // 构建时间 (UTC+8)
  buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || "unknown",
  // Git commit 完整 hash
  commitHash: process.env.NEXT_PUBLIC_COMMIT_HASH || "unknown",
  // Git commit 短 hash
  commitHashShort: process.env.NEXT_PUBLIC_COMMIT_HASH_SHORT || "unknown",
  // Git commit 时间 (ISO 8601)
  commitTime: process.env.NEXT_PUBLIC_COMMIT_TIME || "",
  // Git commit 作者
  commitAuthor: process.env.NEXT_PUBLIC_COMMIT_AUTHOR || "unknown",
  // Git commit 作者邮箱
  commitAuthorEmail: process.env.NEXT_PUBLIC_COMMIT_AUTHOR_EMAIL || "",
  // GitHub 仓库地址
  repoUrl: "https://github.com/dext7r/precheck",
}

// 获取 commit 链接
export function getCommitUrl(hash: string = buildInfo.commitHash): string {
  return `${buildInfo.repoUrl}/commit/${hash}`
}

// 获取作者 GitHub 主页链接（如果邮箱是 GitHub noreply 格式）
export function getAuthorUrl(): string | null {
  const email = buildInfo.commitAuthorEmail
  // GitHub noreply 邮箱格式: 12345678+username@users.noreply.github.com
  const match = email.match(/^\d+\+(.+)@users\.noreply\.github\.com$/)
  if (match) {
    return `https://github.com/${match[1]}`
  }
  // 尝试用作者名作为 GitHub 用户名（可能不准确）
  if (buildInfo.commitAuthor && buildInfo.commitAuthor !== "unknown") {
    return `https://github.com/${buildInfo.commitAuthor}`
  }
  return null
}

// 格式化 commit 时间为 UTC+8
export function formatCommitTime(locale: string = "zh"): string {
  if (!buildInfo.commitTime) return ""
  try {
    const date = new Date(buildInfo.commitTime)
    return date.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  } catch {
    return buildInfo.commitTime
  }
}
