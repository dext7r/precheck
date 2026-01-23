import nodemailer from "nodemailer"

export type EmailPayload = {
  to: string
  subject: string
  html?: string
  text: string
}

// 邮件发送方式配置
const emailProvider = process.env.EMAIL_PROVIDER || "smtp"

// push.h7ml.cn API 配置
const emailApiUrl = process.env.EMAIL_API_URL || "https://push.h7ml.cn/forward"
const emailApiHost = process.env.EMAIL_API_HOST || "smtp.qq.com"
const emailApiPort = Number(process.env.EMAIL_API_PORT || "587")
const emailApiUser = process.env.EMAIL_API_USER
const emailApiPass = process.env.EMAIL_API_PASS
const emailApiFrom = process.env.EMAIL_API_FROM || emailApiUser

// 传统 SMTP 配置（备用）
const smtpHost = process.env.SMTP_HOST
const smtpPort = Number(process.env.SMTP_PORT || "587")
const smtpUser = process.env.SMTP_USER
const smtpPass = process.env.SMTP_PASS
const smtpSecure = process.env.SMTP_SECURE === "true"
const smtpFrom = process.env.SMTP_FROM || smtpUser

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
  if (!transporter || !smtpFrom) {
    throw new Error("SMTP not configured")
  }

  await transporter.sendMail({
    from: smtpFrom,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  })
}

/**
 * 发送邮件（自动选择发送方式）
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
  try {
    if (emailProvider === "api") {
      await sendEmailViaAPI(payload)
    } else {
      await sendEmailViaSMTP(payload)
    }
  } catch (error) {
    console.error("Email sending error:", error)
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
