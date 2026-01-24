import nodemailer from "nodemailer"
import { db } from "@/lib/db"

export type EmailPayload = {
  to: string
  subject: string
  html?: string
  text: string
  from?: string // 可选：发件人地址（默认使用 EMAIL_API_USER）
  fromName?: string // 可选：发件人显示名称
}

// 邮件发送方式配置
const emailProvider = process.env.EMAIL_PROVIDER || "smtp"

// push.h7ml.cn API 配置
const emailApiUrl = process.env.EMAIL_API_URL || "https://push.h7ml.cn/forward"
const emailApiHost = process.env.EMAIL_API_HOST || "smtp.qq.com"
const emailApiPort = Number(process.env.EMAIL_API_PORT || "587")
const emailApiUser = process.env.EMAIL_API_USER
const emailApiPass = process.env.EMAIL_API_PASS
// 默认发件人（可被 payload.from 覆盖）
const emailApiDefaultFrom = process.env.EMAIL_API_FROM || emailApiUser

// 传统 SMTP 配置（备用）
const smtpHost = process.env.SMTP_HOST
const smtpPort = Number(process.env.SMTP_PORT || "587")
const smtpUser = process.env.SMTP_USER
const smtpPass = process.env.SMTP_PASS
const smtpSecure = process.env.SMTP_SECURE === "true"
// 默认发件人（可被 payload.from 覆盖）
const smtpDefaultFrom = process.env.SMTP_FROM || smtpUser

// Nodemailer 传输器（仅在 SMTP 模式下使用）
const transporter =
  smtpHost && smtpUser && smtpPass
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      })
    : null

/**
 * 使用 push.h7ml.cn API 发送邮件
 */
async function sendEmailViaAPI(payload: EmailPayload): Promise<void> {
  if (!emailApiUser || !emailApiPass) {
    throw new Error("EMAIL_API_USER and EMAIL_API_PASS must be configured")
  }

  // 使用用户指定的发件人，或使用默认值
  const fromEmail = payload.from || emailApiDefaultFrom || emailApiUser

  // 构建发件人字段（支持显示名称）
  const fromField = payload.fromName ? `${payload.fromName} <${fromEmail}>` : fromEmail

  const requestBody = {
    title: payload.subject,
    desp: payload.html || payload.text,
    type: "CustomEmail",
    config: {
      EMAIL_TYPE: payload.html ? "html" : "text",
      EMAIL_TO_ADDRESS: payload.to,
      EMAIL_AUTH_USER: emailApiUser,
      EMAIL_AUTH_PASS: emailApiPass,
      EMAIL_HOST: emailApiHost,
      EMAIL_PORT: emailApiPort,
      EMAIL_FROM_ADDRESS: fromField, // 使用动态发件人
    },
    option: {},
  }

  const response = await fetch(emailApiUrl, {
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
async function sendEmailViaSMTP(payload: EmailPayload): Promise<void> {
  if (!transporter || !smtpDefaultFrom) {
    throw new Error("SMTP not configured")
  }

  // 使用用户指定的发件人，或使用默认值
  const fromEmail = payload.from || smtpDefaultFrom

  // 构建发件人字段（支持显示名称）
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
  const provider = emailProvider === "api" ? "api" : "smtp"
  let logId: string | undefined

  try {
    // 创建待处理日志
    if (db) {
      const log = await db.emailLog.create({
        data: {
          to: payload.to,
          subject: payload.subject,
          status: "PENDING",
          provider,
          metadata: {
            hasHtml: !!payload.html,
            from: payload.from,
            fromName: payload.fromName,
          },
        },
      })
      logId = log.id
    }

    if (emailProvider === "api") {
      await sendEmailViaAPI(payload)
    } else {
      await sendEmailViaSMTP(payload)
    }

    // 更新日志状态为成功
    if (db && logId) {
      await db.emailLog.update({
        where: { id: logId },
        data: { status: "SUCCESS" },
      })
    }
  } catch (error) {
    console.error("Email sending error:", error)
    // 更新日志状态为失败
    if (db && logId) {
      await db.emailLog.update({
        where: { id: logId },
        data: {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      }).catch(() => {})
    }
    throw error
  }
}

/**
 * 检查邮件服务是否已配置
 */
export function isEmailConfigured(): boolean {
  if (emailProvider === "api") {
    return !!(emailApiUser && emailApiPass)
  }
  return !!(smtpHost && smtpUser && smtpPass)
}
