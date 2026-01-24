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

  // 颜色配置
  const accentColor = isApproved ? "#10b981" : "#ef4444"
  const accentBg = isApproved ? "#ecfdf5" : "#fef2f2"
  const accentBorder = isApproved ? "#a7f3d0" : "#fecaca"
  const badgeText = isApproved
    ? locale === "zh"
      ? "✓ 审核通过"
      : "✓ Approved"
    : locale === "zh"
      ? "✗ 审核驳回"
      : "✗ Rejected"

  // 构建邀请码区块（仅通过时显示）
  const inviteCodeBlock =
    isApproved && inviteCode
      ? `
                <!-- 邀请码高亮区块 -->
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
                          ⏰ ${locale === "zh" ? "有效期至" : "Expires"}: ${expiresAtText}
                        </p>`
                          : ""
                      }
                    </td>
                  </tr>
                </table>`
      : ""

  // 构建申请内容区块
  const essayBlock = essay
    ? `
                <!-- 申请内容区块 -->
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

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <!-- 主容器 -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05),0 10px 20px rgba(0,0,0,0.05);">
            <!-- 顶部状态条 -->
            <tr>
              <td style="background:${accentColor};height:6px;"></td>
            </tr>
            <!-- 内容区 -->
            <tr>
              <td style="padding:32px;">
                <!-- 状态徽章 -->
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
                  <tr>
                    <td style="background:${accentBg};border:1px solid ${accentBorder};border-radius:20px;padding:6px 14px;">
                      <span style="font-size:13px;font-weight:600;color:${accentColor};">
                        ${badgeText}
                      </span>
                    </td>
                  </tr>
                </table>

                <!-- 标题 -->
                <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;line-height:1.3;color:#111827;">
                  ${title}
                </h1>

                <!-- 介绍文字 -->
                <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#4b5563;">
                  ${intro}
                </p>

                ${essayBlock}

                <!-- 审核详情卡片 -->
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

                <!-- 页脚 -->
                <p style="margin:0;font-size:13px;line-height:1.6;color:#9ca3af;">
                  ${footer}
                </p>
              </td>
            </tr>
          </table>

          <!-- 底部品牌 -->
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr>
              <td align="center">
                <p style="margin:0;font-size:12px;color:#9ca3af;">${appName}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

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
