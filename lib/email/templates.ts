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
  essay?: string
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

type VerificationCodeEmailOptions = {
  appName: string
  dictionary: Dictionary
  code: string
  purpose: "register" | "reset-password" | "change-email" | "login"
  expiryMinutes?: number
  locale?: string
}

const replaceTokens = (value: string, tokens: Record<string, string>) => {
  return Object.entries(tokens).reduce(
    (result, [key, replacement]) => result.replaceAll(key, replacement),
    value,
  )
}

// 统一的邮件基础样式
const baseStyles = {
  body: 'margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;',
  container:
    "max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05),0 10px 20px rgba(0,0,0,0.05);",
  content: "padding:32px;",
  title: "margin:0 0 16px;font-size:24px;font-weight:700;line-height:1.3;color:#111827;",
  text: "margin:0 0 24px;font-size:15px;line-height:1.7;color:#4b5563;",
  footer: "margin:0;font-size:13px;line-height:1.6;color:#9ca3af;",
  brand: "margin:0;font-size:12px;color:#9ca3af;",
}

// 生成邮件 HTML 骨架
function wrapEmailHtml(
  subject: string,
  appName: string,
  accentColor: string,
  content: string,
): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="${baseStyles.body}">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="${baseStyles.container}">
            <tr>
              <td style="background:${accentColor};height:6px;"></td>
            </tr>
            <tr>
              <td style="${baseStyles.content}">
                ${content}
              </td>
            </tr>
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr>
              <td align="center">
                <p style="${baseStyles.brand}">${appName}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
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

  const content = `
    <h1 style="${baseStyles.title}">${title}</h1>
    <p style="${baseStyles.text}">${intro}</p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#6b7280;">
      <span style="display:inline-block;margin-right:6px;">&#9202;</span>${expires}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%);border-radius:8px;">
          <a href="${resetUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">${t.action}</a>
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;background:#f9fafb;border-radius:8px;padding:16px;">
      <tr>
        <td>
          <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#6b7280;">${footer}</p>
          <p style="margin:0;font-size:12px;line-height:1.6;color:#3b82f6;word-break:break-all;">${resetUrl}</p>
        </td>
      </tr>
    </table>
    <p style="${baseStyles.footer}">${ignore}</p>`

  const html = wrapEmailHtml(subject, appName, "#3b82f6", content)
  const text = `${title}\n\n${intro}\n${expires}\n\n${t.action}: ${resetUrl}\n\n${footer}\n${resetUrl}\n\n${ignore}`

  return { subject, html, text }
}

export function buildPreApplicationReviewEmail({
  appName,
  dictionary,
  status,
  reviewerName,
  guidance,
  essay,
  inviteCode,
  inviteExpiresAt,
  locale,
}: PreApplicationReviewEmailOptions) {
  const t =
    status === "APPROVED"
      ? dictionary.preApplication.emailTemplate.approved
      : dictionary.preApplication.emailTemplate.rejected

  const expiresAtText = inviteExpiresAt ? inviteExpiresAt.toLocaleString(locale) : ""
  const isApproved = status === "APPROVED"

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
  const essayTitle = t.essayTitle ?? (locale === "zh" ? "你的申请内容" : "Your Application")

  const accentColor = isApproved ? "#10b981" : "#ef4444"
  const accentBg = isApproved ? "#ecfdf5" : "#fef2f2"
  const accentBorder = isApproved ? "#a7f3d0" : "#fecaca"
  const badgeText = isApproved
    ? locale === "zh"
      ? "&#10003; 审核通过"
      : "&#10003; Approved"
    : locale === "zh"
      ? "&#10007; 审核驳回"
      : "&#10007; Rejected"

  const inviteCodeBlock =
    isApproved && inviteCode
      ? `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;">
      <tr>
        <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:12px;padding:24px;text-align:center;">
          <p style="margin:0 0 8px;font-size:12px;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:1px;">
            ${locale === "zh" ? "你的邀请码" : "Your Invite Code"}
          </p>
          <p style="margin:0 0 12px;font-size:28px;font-weight:bold;color:#ffffff;letter-spacing:3px;font-family:monospace;">
            ${inviteCode}
          </p>
          ${
            inviteExpiresAt
              ? `<p style="margin:0;font-size:12px;color:rgba(255,255,255,0.7);">
              &#9200; ${locale === "zh" ? "有效期至" : "Expires"}: ${expiresAtText}
            </p>`
              : ""
          }
        </td>
      </tr>
    </table>`
      : ""

  const essayBlock = essay
    ? `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">
      <tr>
        <td style="background:#f9fafb;border-radius:8px;padding:16px;border-left:4px solid #6366f1;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#6366f1;text-transform:uppercase;letter-spacing:0.5px;">
            ${essayTitle}
          </p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;white-space:pre-wrap;">
            ${essay}
          </p>
        </td>
      </tr>
    </table>`
    : ""

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr>
        <td style="background:${accentBg};border:1px solid ${accentBorder};border-radius:20px;padding:6px 14px;">
          <span style="font-size:13px;font-weight:600;color:${accentColor};">
            ${badgeText}
          </span>
        </td>
      </tr>
    </table>
    <h1 style="${baseStyles.title}">${title}</h1>
    <p style="${baseStyles.text}">${intro}</p>
    ${essayBlock}
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">
      <tr>
        <td style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding:0 0 12px;border-bottom:1px solid #e5e7eb;">
                <p style="margin:0;font-size:13px;color:#6b7280;">${locale === "zh" ? "审核管理员" : "Reviewer"}</p>
                <p style="margin:4px 0 0;font-size:15px;font-weight:500;color:#111827;">${reviewerName}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 0 0;">
                <p style="margin:0;font-size:13px;color:#6b7280;">${locale === "zh" ? "指导意见" : "Guidance"}</p>
                <p style="margin:4px 0 0;font-size:15px;line-height:1.6;color:#111827;white-space:pre-wrap;">${guidance}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    ${inviteCodeBlock}
    <p style="${baseStyles.footer}">${footer}</p>`

  const html = wrapEmailHtml(subject, appName, accentColor, content)

  const textLines = [
    title,
    "",
    intro,
    "",
    ...(essay ? [`${essayTitle}:`, essay, ""] : []),
    reviewerLine,
    guidanceLine,
    ...(inviteCodeLine ? [inviteCodeLine] : []),
    ...(inviteExpiresLine ? [inviteExpiresLine] : []),
    "",
    footer,
  ]

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
  const expiresLine = expiresAt ? replaceTokens(t.inviteExpires, tokens) : ""
  const noteLine = note ? replaceTokens(t.note, tokens) : ""
  const footer = replaceTokens(t.footer, tokens)

  const content = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;line-height:1.3;color:#16a34a;">${title}</h1>
    <p style="${baseStyles.text}">${intro}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">
      <tr>
        <td style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);border-radius:12px;padding:24px;text-align:center;">
          <p style="margin:0 0 8px;font-size:12px;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:1px;">
            ${locale === "zh" ? "你的邀请码" : "Your Invite Code"}
          </p>
          <p style="margin:0 0 12px;font-size:28px;font-weight:bold;color:#ffffff;letter-spacing:3px;font-family:monospace;">
            ${code}
          </p>
          ${
            expiresAt
              ? `<p style="margin:0;font-size:12px;color:rgba(255,255,255,0.7);">
              &#9200; ${locale === "zh" ? "有效期至" : "Expires"}: ${expiresAtText}
            </p>`
              : ""
          }
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">
      <tr>
        <td style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding:0 0 12px;border-bottom:1px solid #e5e7eb;">
                <p style="margin:0;font-size:13px;color:#6b7280;">${locale === "zh" ? "发放管理员" : "Issued By"}</p>
                <p style="margin:4px 0 0;font-size:15px;font-weight:500;color:#111827;">${issuerName}</p>
              </td>
            </tr>
            ${
              note
                ? `<tr>
              <td style="padding:12px 0 0;">
                <p style="margin:0;font-size:13px;color:#6b7280;">${locale === "zh" ? "备注" : "Note"}</p>
                <p style="margin:4px 0 0;font-size:15px;line-height:1.6;color:#111827;white-space:pre-wrap;">${note}</p>
              </td>
            </tr>`
                : ""
            }
          </table>
        </td>
      </tr>
    </table>
    <p style="${baseStyles.footer}">${footer}</p>`

  const html = wrapEmailHtml(subject, appName, "#10b981", content)

  const detailLines = [issuerLine, expiresLine, noteLine].filter(Boolean)
  const textLines = [
    title,
    "",
    intro,
    "",
    `${locale === "zh" ? "邀请码" : "Invite Code"}: ${code}`,
    ...detailLines,
    "",
    footer,
  ]

  return { subject, html, text: textLines.join("\n") }
}

export function buildVerificationCodeEmail({
  appName,
  dictionary,
  code,
  purpose,
  expiryMinutes = 5,
}: VerificationCodeEmailOptions) {
  const t = dictionary.auth.verificationCodeEmail
  const purposeText = t.purposes[purpose]

  const tokens = {
    "{appName}": appName,
    "{purpose}": purposeText,
    "{minutes}": String(expiryMinutes),
  }

  const subject = replaceTokens(t.subject, tokens)
  const title = t.title
  const intro = replaceTokens(t.intro, tokens)
  const expiryText = replaceTokens(t.expires, tokens)
  const warningText = t.warning
  const footer = t.footer

  const content = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;line-height:1.3;color:#2563eb;">${title}</h1>
    <p style="${baseStyles.text}">${intro}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">
      <tr>
        <td style="background:linear-gradient(135deg,#3b82f6 0%,#6366f1 100%);border-radius:12px;padding:28px;text-align:center;">
          <p style="margin:0;font-size:36px;font-weight:bold;color:#ffffff;letter-spacing:8px;font-family:monospace;">
            ${code}
          </p>
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">
      <tr>
        <td style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:12px 16px;">
          <p style="margin:0 0 4px;font-size:14px;line-height:1.6;color:#92400e;">
            &#9200; ${expiryText}
          </p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#b45309;">
            &#9888; ${warningText}
          </p>
        </td>
      </tr>
    </table>
    <p style="${baseStyles.footer}">${footer}</p>`

  const html = wrapEmailHtml(subject, appName, "#2563eb", content)

  const text = `${title}

${intro}

${code}

${expiryText}

${warningText}

---
${footer}`

  return { subject, html, text }
}
