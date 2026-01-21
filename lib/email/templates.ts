import type { Dictionary } from "@/lib/i18n/get-dictionary"

type ResetPasswordEmailOptions = {
  appName: string
  resetUrl: string
  dictionary: Dictionary
  expiresInHours: number
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
