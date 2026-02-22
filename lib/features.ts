// 功能检测配置
// 根据环境变量是否配置来决定功能是否启用
// 使用 getter 确保运行时读取环境变量（而非构建时固化）

import { isEmailConfiguredSync } from "@/lib/email/mailer"

export const features = {
  // OAuth 登录
  oauth: {
    get github() { return !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) },
    get google() { return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) },
    get linuxdo() { return !!(process.env.LINUXDO_CLIENT_ID && process.env.LINUXDO_CLIENT_SECRET) },
  },
  // 数据库
  get database() { return !!process.env.DATABASE_URL },
  // 邮件服务（用于找回密码等）- 同步检查环境变量
  get email() { return isEmailConfiguredSync() },
  // 文件上传
  get fileUpload() { return !!process.env.BLOB_READ_WRITE_TOKEN },
  // Redis 缓存
  get redis() { return !!(process.env.REDIS_URL || process.env.KV_REST_API_URL) },
  // Cloudflare AI（用于 AI 审核）
  get cloudflareAI() { return !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN) },
}

// 获取启用的 OAuth 提供商列表
export function getEnabledOAuthProviders() {
  const providers: Array<{ id: string; name: string }> = []

  if (features.oauth.github) {
    providers.push({ id: "github", name: "GitHub" })
  }
  if (features.oauth.google) {
    providers.push({ id: "google", name: "Google" })
  }
  if (features.oauth.linuxdo) {
    providers.push({ id: "linuxdo", name: "Linux.do" })
  }

  return providers
}

// 检查是否有任何 OAuth 提供商启用
export function hasAnyOAuthProvider() {
  return features.oauth.github || features.oauth.google || features.oauth.linuxdo
}

// 检查认证功能是否完整可用
export function isAuthFullyConfigured() {
  return features.database
}

// 获取功能状态摘要（用于调试）
export function getFeaturesSummary() {
  return {
    oauthGithub: features.oauth.github,
    oauthGoogle: features.oauth.google,
    database: features.database,
    email: features.email,
    fileUpload: features.fileUpload,
    redis: features.redis,
  }
}
