// 认证配置
export const authConfig = {
  // Session 配置
  session: {
    maxAge: 30 * 24 * 60 * 60, // 30 天
    updateAge: 24 * 60 * 60, // 24 小时更新一次
  },
  // OAuth 提供商
  providers: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
    linuxdo: {
      clientId: process.env.LINUXDO_CLIENT_ID || "",
      clientSecret: process.env.LINUXDO_CLIENT_SECRET || "",
    },
  },
  // 密码配置
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
  },
  // 重置密码 Token 过期时间
  resetTokenExpiry: 60 * 60 * 1000, // 1 小时
}

// OAuth 提供商配置
export const oauthProviders = [
  {
    id: "github",
    name: "GitHub",
    icon: "github",
  },
  {
    id: "google",
    name: "Google",
    icon: "google",
  },
  {
    id: "linuxdo",
    name: "Linux.do",
    icon: "linuxdo",
  },
] as const

export type OAuthProvider = (typeof oauthProviders)[number]["id"]
