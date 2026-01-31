import type { Dictionary } from "@/lib/i18n/get-dictionary"

import { formatInviteCodeUrl } from "@/lib/invite-code/utils"

interface InviteCodeIssueNotificationInput {
  dict: Dictionary
  code: string
  expiresAt?: Date | null
  issuedBy: string
  note?: string
  locale: string
  inviteCodeUrlPrefix?: string
}

export function buildInviteCodeIssueMessage({
  dict,
  code,
  expiresAt,
  issuedBy,
  note,
  locale,
  inviteCodeUrlPrefix,
}: InviteCodeIssueNotificationInput) {
  const t = dict.inviteCode.notifications
  const formattedCode = formatInviteCodeUrl(code, inviteCodeUrlPrefix ?? "")
  const lines = [
    t.issueIntro,
    `${t.issuedByLabel}${issuedBy}`,
    `${t.inviteCodeLabel}${formattedCode}`,
  ]

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
