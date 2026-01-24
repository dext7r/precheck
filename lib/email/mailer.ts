import nodemailer from "nodemailer"
import { db } from "@/lib/db"

export type EmailPayload = {
  to: string
  subject: string
  html?: string
  text: string
  from?: string
  fromName?: string
}

type EmailConfig = {
  provider: "env" | "api" | "smtp"
  apiHost?: string | null
  apiPort?: number | null
  apiUser?: string | null
  apiPass?: string | null
  smtpHost?: string | null
  smtpPort?: number | null
  smtpUser?: string | null
  smtpPass?: string | null
  smtpSecure?: boolean
}

// 环境变量配置（作为 fallback）
const envEmailProvider = process.env.EMAIL_PROVIDER || "smtp"
const envEmailApiUrl = process.env.EMAIL_API_URL || "https://push.h7ml.cn/forward"
const envEmailApiHost = process.env.EMAIL_API_HOST || "smtp.qq.com"
const envEmailApiPort = Number(process.env.EMAIL_API_PORT || "587")
const envEmailApiUser = process.env.EMAIL_API_USER
const envEmailApiPass = process.env.EMAIL_API_PASS
const envSmtpHost = process.env.SMTP_HOST
const envSmtpPort = Number(process.env.SMTP_PORT || "587")
const envSmtpUser = process.env.SMTP_USER
const envSmtpPass = process.env.SMTP_PASS
const envSmtpSecure = process.env.SMTP_SECURE === "true"

/**
 * 获取邮件配置（优先从数据库，否则使用环境变量）
 */
async function getEmailConfig(): Promise<EmailConfig> {
  if (!db) {
    return {
      provider: envEmailProvider === "api" ? "api" : "smtp",
      apiHost: envEmailApiHost,
      apiPort: envEmailApiPort,
      apiUser: envEmailApiUser,
      apiPass: envEmailApiPass,
      smtpHost: envSmtpHost,
      smtpPort: envSmtpPort,
      smtpUser: envSmtpUser,
      smtpPass: envSmtpPass,
      smtpSecure: envSmtpSecure,
    }
  }

  const settings = await db.siteSettings.findUnique({
    where: { id: "global" },
    select: {
      emailProvider: true,
      selectedEmailApiConfigId: true,
      smtpHost: true,
      smtpPort: true,
      smtpUser: true,
      smtpPass: true,
      smtpSecure: true,
    },
  })

  // 使用环境变量配置
  if (!settings || settings.emailProvider === "env") {
    return {
      provider: envEmailProvider === "api" ? "api" : "smtp",
      apiHost: envEmailApiHost,
      apiPort: envEmailApiPort,
      apiUser: envEmailApiUser,
      apiPass: envEmailApiPass,
      smtpHost: envSmtpHost,
      smtpPort: envSmtpPort,
      smtpUser: envSmtpUser,
      smtpPass: envSmtpPass,
      smtpSecure: envSmtpSecure,
    }
  }

  // 使用数据库 API 配置
  if (settings.emailProvider === "api" && settings.selectedEmailApiConfigId) {
    const apiConfig = await db.emailApiConfig.findUnique({
      where: { id: settings.selectedEmailApiConfigId },
    })
    if (apiConfig) {
      return {
        provider: "api",
        apiHost: apiConfig.host,
        apiPort: apiConfig.port,
        apiUser: apiConfig.user,
        apiPass: apiConfig.pass,
        smtpHost: null,
        smtpPort: null,
        smtpUser: null,
        smtpPass: null,
        smtpSecure: false,
      }
    }
  }

  // 使用数据库 SMTP 配置
  return {
    provider: settings.emailProvider as "api" | "smtp",
    apiHost: null,
    apiPort: null,
    apiUser: null,
    apiPass: null,
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpUser: settings.smtpUser,
    smtpPass: settings.smtpPass,
    smtpSecure: settings.smtpSecure,
  }
}

/**
 * 使用 push.h7ml.cn API 发送邮件
 */
async function sendEmailViaAPI(payload: EmailPayload, config: EmailConfig): Promise<void> {
  const apiUser = config.apiUser
  const apiPass = config.apiPass
  const apiHost = config.apiHost || envEmailApiHost
  const apiPort = config.apiPort || envEmailApiPort

  if (!apiUser || !apiPass) {
    throw new Error("EMAIL_API_USER and EMAIL_API_PASS must be configured")
  }

  const fromEmail = payload.from || apiUser
  const fromField = payload.fromName ? `${payload.fromName} <${fromEmail}>` : fromEmail

  const requestBody = {
    title: payload.subject,
    desp: payload.html || payload.text,
    type: "CustomEmail",
    config: {
      EMAIL_TYPE: payload.html ? "html" : "text",
      EMAIL_TO_ADDRESS: payload.to,
      EMAIL_AUTH_USER: apiUser,
      EMAIL_AUTH_PASS: apiPass,
      EMAIL_HOST: apiHost,
      EMAIL_PORT: apiPort,
      EMAIL_FROM_ADDRESS: fromField,
    },
    option: {},
  }

  const response = await fetch(envEmailApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "*/*",
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error")
    throw new Error(`Email API request failed: ${response.status} - ${errorText}`)
  }

  const result = await response.json()

  if (result.message !== "OK") {
    throw new Error(`Email sending failed: ${result.message || "Unknown error"}`)
  }
}

/**
 * 使用传统 SMTP 发送邮件
 */
async function sendEmailViaSMTP(payload: EmailPayload, config: EmailConfig): Promise<void> {
  const host = config.smtpHost
  const port = config.smtpPort || 587
  const user = config.smtpUser
  const pass = config.smtpPass
  const secure = config.smtpSecure ?? false

  if (!host || !user || !pass) {
    throw new Error("SMTP not configured")
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  })

  const fromEmail = payload.from || user
  const fromField = payload.fromName ? `${payload.fromName} <${fromEmail}>` : fromEmail

  await transporter.sendMail({
    from: fromField,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  })
}

/**
 * 发送邮件（自动选择发送方式）并记录日志
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
  const config = await getEmailConfig()
  const provider = config.provider
  let logId: string | undefined

  try {
    if (db) {
      const log = await db.emailLog.create({
        data: {
          to: payload.to,
          subject: payload.subject,
          status: "PENDING",
          provider,
          metadata: {
            html: payload.html,
            text: payload.text,
            from: payload.from,
            fromName: payload.fromName,
          },
        },
      })
      logId = log.id
    }

    if (provider === "api") {
      await sendEmailViaAPI(payload, config)
    } else {
      await sendEmailViaSMTP(payload, config)
    }

    if (db && logId) {
      await db.emailLog.update({
        where: { id: logId },
        data: { status: "SUCCESS" },
      })
    }
  } catch (error) {
    console.error("Email sending error:", error)
    if (db && logId) {
      await db.emailLog
        .update({
          where: { id: logId },
          data: {
            status: "FAILED",
            errorMessage: error instanceof Error ? error.message : String(error),
          },
        })
        .catch(() => {})
    }
    throw error
  }
}

/**
 * 检查邮件服务是否已配置
 */
export async function isEmailConfigured(): Promise<boolean> {
  const config = await getEmailConfig()

  if (config.provider === "api") {
    return !!(config.apiUser && config.apiPass)
  }
  return !!(config.smtpHost && config.smtpUser && config.smtpPass)
}

/**
 * 同步检查邮件服务配置（仅检查环境变量，用于初始化场景）
 */
export function isEmailConfiguredSync(): boolean {
  if (envEmailProvider === "api") {
    return !!(envEmailApiUser && envEmailApiPass)
  }
  return !!(envSmtpHost && envSmtpUser && envSmtpPass)
}
