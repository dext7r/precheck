import { db } from "@/lib/db"
import { authConfig } from "./config"
import { features } from "@/lib/features"
import { getSiteSettings } from "@/lib/site-settings"
import { writeAuditLog } from "@/lib/audit"
import type { OAuthProvider } from "./config"

interface OAuthProfile {
  id: string
  email: string
  name?: string
  avatar?: string
}

// GitHub OAuth
export async function getGitHubAuthUrl(): Promise<string | null> {
  if (!features.oauth.github) {
    return null
  }
  const params = new URLSearchParams({
    client_id: authConfig.providers.github.clientId,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/github`,
    scope: "user:email",
  })
  return `https://github.com/login/oauth/authorize?${params}`
}

export async function getGitHubProfile(code: string): Promise<OAuthProfile | null> {
  if (!features.oauth.github) {
    return null
  }
  try {
    // 获取 access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: authConfig.providers.github.clientId,
        client_secret: authConfig.providers.github.clientSecret,
        code,
      }),
    })
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) return null

    // 获取用户信息
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })
    const userData = await userRes.json()

    // 获取邮箱
    const emailRes = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })
    const emails = await emailRes.json()
    const primaryEmail =
      emails.find((e: { primary: boolean }) => e.primary)?.email || userData.email

    return {
      id: String(userData.id),
      email: primaryEmail,
      name: userData.name || userData.login,
      avatar: userData.avatar_url,
    }
  } catch {
    return null
  }
}

// Google OAuth
export async function getGoogleAuthUrl(): Promise<string | null> {
  if (!features.oauth.google) {
    return null
  }
  const params = new URLSearchParams({
    client_id: authConfig.providers.google.clientId,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`,
    response_type: "code",
    scope: "openid email profile",
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function getGoogleProfile(code: string): Promise<OAuthProfile | null> {
  if (!features.oauth.google) {
    return null
  }
  try {
    // 获取 access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: authConfig.providers.google.clientId,
        client_secret: authConfig.providers.google.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`,
      }),
    })
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) return null

    // 获取用户信息
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })
    const userData = await userRes.json()

    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      avatar: userData.picture,
    }
  } catch {
    return null
  }
}

// 处理 OAuth 登录/注册
export async function handleOAuthSignIn(
  provider: OAuthProvider,
  profile: OAuthProfile,
  request?: Request,
) {
  if (!db) {
    throw new Error("Database not configured")
  }

  const settings = await getSiteSettings()
  if (!settings.oauthLogin) {
    throw new Error("OAuth login is disabled")
  }

  // 查找已存在的 OAuth 账号
  const existingAccount = await db.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId: profile.id,
      },
    },
    include: { user: true },
  })

  if (existingAccount) {
    return existingAccount.user
  }

  // 查找已存在的用户（通过邮箱）
  const existingUser = await db.user.findUnique({
    where: { email: profile.email },
  })

  if (existingUser) {
    // 关联 OAuth 账号到现有用户
    const account = await db.account.create({
      data: {
        userId: existingUser.id,
        type: "oauth",
        provider,
        providerAccountId: profile.id,
      },
    })
    await writeAuditLog(db, {
      action: "OAUTH_ACCOUNT_LINK",
      entityType: "ACCOUNT",
      entityId: account.id,
      actor: existingUser,
      after: account,
      metadata: { provider },
      request,
    })
    return existingUser
  }

  if (!settings.userRegistration) {
    throw new Error("User registration is disabled")
  }

  // 创建新用户和 OAuth 账号
  const newUser = await db.user.create({
    data: {
      email: profile.email,
      name: profile.name,
      avatar: profile.avatar,
      emailVerified: new Date(),
      accounts: {
        create: {
          type: "oauth",
          provider,
          providerAccountId: profile.id,
        },
      },
    },
  })

  await writeAuditLog(db, {
    action: "USER_REGISTER_OAUTH",
    entityType: "USER",
    entityId: newUser.id,
    actor: newUser,
    after: newUser,
    metadata: { provider },
    request,
  })

  return newUser
}
