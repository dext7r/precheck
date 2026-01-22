import type { Dictionary } from "@/lib/i18n/get-dictionary"

interface InviteCodeIssueNotificationInput {
  dict: Dictionary
  code: string
  expiresAt?: Date | null
  issuedBy: string
  note?: string
  locale: string
}

export function buildInviteCodeIssueMessage({
  dict,
  code,
  expiresAt,
  issuedBy,
  note,
  locale,
}: InviteCodeIssueNotificationInput) {
  const t = dict.inviteCode.notifications
  const lines = [t.issueIntro, `${t.issuedByLabel}${issuedBy}`, `${t.inviteCodeLabel}${code}`]

  if (expiresAt) {
    lines.push(`${t.inviteExpiresLabel}${expiresAt.toLocaleString(locale)}`)
  }

  if (note) {
    lines.push(`${t.noteLabel}${note}`)
  }

  lines.push(t.footer)

  return {
    title: t.issueTitle,
    content: lines.join("\n\n"),
  }
}
