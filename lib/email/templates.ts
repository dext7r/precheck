import type { Dictionary } from "@/lib/i18n/get-dictionary"

type ResetPasswordEmailOptions = {
  appName: string
  resetUrl: string
  dictionary: Dictionary
  expiresInHours: number
}

type PreApplicationReviewEmailOptions = {
  appName: string
  dictionary: Dictionary
  status: "APPROVED" | "REJECTED"
  reviewerName: string
  guidance: string
  inviteCode?: string | null
  inviteExpiresAt?: Date | null
  locale: string
}

type InviteCodeIssueEmailOptions = {
  appName: string
  dictionary: Dictionary
  issuerName: string
  code: string
  expiresAt?: Date | null
  note?: string
  locale: string
}

const replaceTokens = (value: string, tokens: Record<string, string>) => {
  return Object.entries(tokens).reduce(
    (result, [key, replacement]) => result.replaceAll(key, replacement),
    value,
  )
}

export function buildResetPasswordEmail({
  appName,
  resetUrl,
  dictionary,
  expiresInHours,
}: ResetPasswordEmailOptions) {
  const t = dictionary.auth.forgotPassword.emailTemplate
  const tokens = {
    "{appName}": appName,
    "{hours}": String(expiresInHours),
  }

  const subject = replaceTokens(t.subject, tokens)
  const title = replaceTokens(t.title, tokens)
  const intro = replaceTokens(t.intro, tokens)
  const expires = replaceTokens(t.expires, tokens)
  const ignore = replaceTokens(t.ignore, tokens)
  const footer = replaceTokens(t.footer, tokens)

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:24px;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.4;">${title}</h1>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4b5563;">${intro}</p>
                <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#4b5563;">${expires}</p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td bgcolor="#111827" style="border-radius:8px;">
                      <a href="${resetUrl}" style="display:inline-block;padding:12px 20px;color:#ffffff;text-decoration:none;font-size:14px;">${t.action}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 8px;font-size:12px;line-height:1.6;color:#6b7280;">${footer}</p>
                <p style="margin:0 0 24px;font-size:12px;line-height:1.6;color:#111827;word-break:break-all;">${resetUrl}</p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">${ignore}</p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">${appName}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const text = `${title}\n\n${intro}\n${expires}\n\n${t.action}: ${resetUrl}\n\n${footer}\n${resetUrl}\n\n${ignore}`

  return { subject, html, text }
}

export function buildPreApplicationReviewEmail({
  appName,
  dictionary,
  status,
  reviewerName,
  guidance,
  inviteCode,
  inviteExpiresAt,
  locale,
}: PreApplicationReviewEmailOptions) {
  const t =
    status === "APPROVED"
      ? dictionary.preApplication.emailTemplate.approved
      : dictionary.preApplication.emailTemplate.rejected

  const expiresAtText = inviteExpiresAt ? inviteExpiresAt.toLocaleString(locale) : ""

  const tokens = {
    "{appName}": appName,
    "{reviewer}": reviewerName,
    "{guidance}": guidance,
    "{code}": inviteCode ?? "",
    "{expiresAt}": expiresAtText,
  }

  const subject = replaceTokens(t.subject, tokens)
  const title = replaceTokens(t.title, tokens)
  const intro = replaceTokens(t.intro, tokens)
  const reviewerLine = replaceTokens(t.reviewer, tokens)
  const guidanceLine = replaceTokens(t.guidance, tokens)
  const inviteCodeLine = inviteCode ? replaceTokens(t.inviteCode, tokens) : ""
  const inviteExpiresLine =
    inviteExpiresAt && inviteCode ? replaceTokens(t.inviteExpires, tokens) : ""
  const footer = replaceTokens(t.footer, tokens)

  const detailLines = [reviewerLine, guidanceLine, inviteCodeLine, inviteExpiresLine].filter(
    Boolean,
  )

  const accentColor = status === "APPROVED" ? "#16a34a" : "#dc2626"

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:24px;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.4;color:${accentColor};">${title}</h1>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4b5563;">${intro}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">
                  <tr>
                    <td style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;">
                      ${detailLines
                        .map(
                          (line) =>
                            `<p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#111827;">${line}</p>`,
                        )
                        .join("")}
                    </td>
                  </tr>
                </table>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">${footer}</p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">${appName}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const textLines = [title, "", intro, "", ...detailLines, "", footer]

  return { subject, html, text: textLines.join("\n") }
}

export function buildInviteCodeIssueEmail({
  appName,
  dictionary,
  issuerName,
  code,
  expiresAt,
  note,
  locale,
}: InviteCodeIssueEmailOptions) {
  const t = dictionary.inviteCode.emailTemplate.issue
  const expiresAtText = expiresAt ? expiresAt.toLocaleString(locale) : ""

  const tokens = {
    "{appName}": appName,
    "{issuer}": issuerName,
    "{code}": code,
    "{expiresAt}": expiresAtText,
    "{note}": note ?? "",
  }

  const subject = replaceTokens(t.subject, tokens)
  const title = replaceTokens(t.title, tokens)
  const intro = replaceTokens(t.intro, tokens)
  const issuerLine = replaceTokens(t.issuer, tokens)
  const codeLine = replaceTokens(t.inviteCode, tokens)
  const expiresLine = expiresAt ? replaceTokens(t.inviteExpires, tokens) : ""
  const noteLine = note ? replaceTokens(t.note, tokens) : ""
  const footer = replaceTokens(t.footer, tokens)

  const detailLines = [issuerLine, codeLine, expiresLine, noteLine].filter(Boolean)

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:24px;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.4;color:#16a34a;">${title}</h1>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4b5563;">${intro}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">
                  <tr>
                    <td style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;">
                      ${detailLines
                        .map(
                          (line) =>
                            `<p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#111827;">${line}</p>`,
                        )
                        .join("")}
                    </td>
                  </tr>
                </table>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">${footer}</p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">${appName}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const textLines = [title, "", intro, "", ...detailLines, "", footer]

  return { subject, html, text: textLines.join("\n") }
}

/**
 * 验证码邮件模板
 */
export function buildVerificationCodeEmail({
  code,
  purpose,
  expiryMinutes = 5,
  locale = "zh",
}: {
  code: string
  purpose: "register" | "reset-password" | "change-email"
  expiryMinutes?: number
  locale?: string
}) {
  const purposeText = {
    register: locale === "zh" ? "注册账户" : "Register Account",
    "reset-password": locale === "zh" ? "重置密码" : "Reset Password",
    "change-email": locale === "zh" ? "更换邮箱" : "Change Email",
  }[purpose]

  const subject =
    locale === "zh"
      ? `【linux.do 预申请系统】邮箱验证码 - ${purposeText}`
      : `【linux.do Pre-application system】Verification Code - ${purposeText}`

  const title = locale === "zh" ? "邮箱验证" : "Email Verification"
  const intro =
    locale === "zh"
      ? `您正在${purposeText}，您的验证码是：`
      : `You are ${purposeText.toLowerCase()}, your verification code is:`
  const expiryText =
    locale === "zh"
      ? `此验证码将在 ${expiryMinutes} 分钟后失效`
      : `This code will expire in ${expiryMinutes} minutes`
  const warningText =
    locale === "zh"
      ? "如果这不是您的操作，请忽略此邮件"
      : "If you did not request this, please ignore this email"
  const footer =
    locale === "zh"
      ? "此邮件由系统自动发送，请勿回复。"
      : "This email was sent automatically, please do not reply."

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:24px;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.4;color:#2563eb;">${title}</h1>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4b5563;">${intro}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">
                  <tr>
                    <td style="background:#f3f4f6;border-radius:8px;padding:24px;text-align:center;">
                      <p style="margin:0;font-size:36px;font-weight:bold;color:#2563eb;letter-spacing:8px;font-family:monospace;">
                        ${code}
                      </p>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#6b7280;">
                  ⏰ ${expiryText}
                </p>
                <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#dc2626;">
                  ⚠️ ${warningText}
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">${footer}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const text = `${title}

${intro}

${code}

⏰ ${expiryText}

⚠️ ${warningText}

---
${footer}`

  return { subject, html, text }
}
