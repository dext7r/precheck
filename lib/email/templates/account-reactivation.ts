import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { EmailPayload } from "@/lib/email/mailer"

type AccountReactivationEmailOptions = {
  appName: string
  reactivateUrl: string
  dictionary: Dictionary
  expiresInHours: number
  locale: string
}

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

const replaceTokens = (value: string, tokens: Record<string, string>) => {
  return Object.entries(tokens).reduce(
    (result, [key, replacement]) => result.replaceAll(key, replacement),
    value,
  )
}

function buildAccountReactivationEmail({
  appName,
  reactivateUrl,
  dictionary,
  expiresInHours,
  locale,
}: AccountReactivationEmailOptions) {
  const isZh = locale === "zh"

  const subject = isZh ? "账户已删除，点击激活链接重新激活" : "Account Reactivation Required"

  const title = isZh ? "账户激活" : "Reactivate Your Account"

  const intro = isZh
    ? `我们发现你的账户已被删除。如果这是你本人操作，请忽略此邮件。如果不是，请点击下方按钮重新激活你的账户。`
    : `We've detected that your account has been deleted. If you did this intentionally, please ignore this email. If not, please click the button below to reactivate your account.`

  const reason = isZh
    ? "账户可能因为以下原因被删除："
    : "Your account may have been deleted for the following reasons:"

  const reasonList = isZh
    ? ["管理员操作", "长期未登录，自动清理"]
    : ["Administrator action", "Inactive account cleanup"]

  const expiresText = isZh
    ? `此激活链接将在 ${expiresInHours} 小时后过期。`
    : `This activation link expires in ${expiresInHours} hour(s).`

  const actionButtonText = isZh ? "激活账户" : "Reactivate Account"

  const footer = isZh
    ? "如果按钮无法使用，请复制以下链接到浏览器打开："
    : "If the button does not work, copy and paste this link into your browser:"

  const supportText = isZh
    ? "如有疑问，请联系我们的支持团队。"
    : "If you have any questions, please contact our support team."

  const ignoreText = isZh
    ? "如果不是你本人操作，请忽略此邮件并保护好你的账户信息。"
    : "If you did not request this, please ignore this email and secure your account information."

  const reasonListHtml = reasonList
    .map((reason) => `<li style="margin:8px 0;color:#374151;">${reason}</li>`)
    .join("")

  const content = `
    <h1 style="${baseStyles.title}">${title}</h1>
    <p style="${baseStyles.text}">${intro}</p>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:16px;">
      <tr>
        <td>
          <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#92400e;">&#9888; ${reason}</p>
          <ul style="margin:0;padding-left:20px;font-size:14px;color:#92400e;">
            ${reasonListHtml}
          </ul>
        </td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);border-radius:8px;">
          <a href="${reactivateUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">${actionButtonText}</a>
        </td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;background:#f9fafb;border-radius:8px;padding:16px;">
      <tr>
        <td>
          <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#6b7280;">${footer}</p>
          <p style="margin:0;font-size:12px;line-height:1.6;color:#ef4444;word-break:break-all;">${reactivateUrl}</p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#6b7280;">
      <span style="display:inline-block;margin-right:6px;">&#9200;</span>${expiresText}
    </p>

    <p style="${baseStyles.text}">${supportText}</p>
    <p style="${baseStyles.footer}">${ignoreText}</p>`

  const html = wrapEmailHtml(subject, appName, "#ef4444", content)

  const text = `${title}

${intro}

${reason}
${reasonList.map((r) => `- ${r}`).join("\n")}

${actionButtonText}: ${reactivateUrl}

${expiresText}

${supportText}

${footer}
${reactivateUrl}

${ignoreText}`

  return { subject, html, text }
}

export function getAccountReactivationEmail(
  email: string,
  token: string,
  appUrl?: string,
  dict?: Dictionary,
  locale: string = "en",
): EmailPayload {
  const appBaseUrl = appUrl || process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000"
  const reactivateUrl = `${appBaseUrl}/${locale}/reactivate?token=${encodeURIComponent(token)}`

  const appName = "Application System"

  const { subject, html, text } = buildAccountReactivationEmail({
    appName,
    reactivateUrl,
    dictionary: dict || ({} as Dictionary),
    expiresInHours: 24,
    locale,
  })

  return {
    to: email,
    subject,
    html,
    text,
  }
}
