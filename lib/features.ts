// 功能检测配置
// 根据环境变量是否配置来决定功能是否启用

// 检查邮件服务配置（支持 API 和 SMTP 两种方式）
const isEmailConfigured = () => {
  const emailProvider = process.env.EMAIL_PROVIDER || "smtp"
  if (emailProvider === "api") {
    return !!(process.env.EMAIL_API_USER && process.env.EMAIL_API_PASS)
  }
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

export const features = {
  // OAuth 登录
  oauth: {
    github: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  },
  // 数据库
  database: !!process.env.DATABASE_URL,
  // 邮件服务（用于找回密码等）
  email: isEmailConfigured(),
  // 文件上传
  fileUpload: !!process.env.BLOB_READ_WRITE_TOKEN,
  // Redis 缓存
  redis: !!process.env.KV_REST_API_URL,
} as const

// 获取启用的 OAuth 提供商列表
export function getEnabledOAuthProviders() {
  const providers: Array<{ id: string; name: string }> = []

  if (features.oauth.github) {
    providers.push({ id: "github", name: "GitHub" })
  }
  if (features.oauth.google) {
    providers.push({ id: "google", name: "Google" })
  }

  return providers
}

// 检查是否有任何 OAuth 提供商启用
export function hasAnyOAuthProvider() {
  return features.oauth.github || features.oauth.google
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
