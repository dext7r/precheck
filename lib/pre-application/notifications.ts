import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { PreApplicationStatus } from "@prisma/client"

interface PreApplicationNotificationInput {
  dict: Dictionary
  status: PreApplicationStatus
  reviewerName: string
  guidance: string
  essay?: string
  inviteCode?: string | null
  inviteExpiresAt?: Date | null
  locale: string
}

export function buildPreApplicationMessage({
  dict,
  status,
  reviewerName,
  guidance,
  essay,
  inviteCode,
  inviteExpiresAt,
  locale,
}: PreApplicationNotificationInput) {
  const t = dict.preApplication.notifications
  const isApproved = status === "APPROVED"
  const isDisputed = status === "DISPUTED"

  let title: string
  let intro: string

  if (isApproved) {
    title = t.approvedTitle
    // 无码时使用不同的提示语
    intro = inviteCode ? t.approvedIntro : (t.approvedNoCodeIntro ?? t.approvedIntro)
  } else if (isDisputed) {
    title = t.disputedTitle ?? "预申请待补充"
    intro = t.disputedIntro ?? "你的预申请需要补充信息。"
  } else {
    title = t.rejectedTitle
    intro = t.rejectedIntro
  }

  const lines = [intro]

  if (essay) {
    lines.push(`${t.essayLabel}\n${essay}`)
  }

  lines.push(`${t.reviewerLabel}${reviewerName}`, `${t.guidanceLabel}${guidance}`)

  if ((isApproved || isDisputed) && inviteCode) {
    lines.push(`${t.inviteCodeLabel}${inviteCode}`)
    if (inviteExpiresAt) {
      lines.push(`${t.inviteExpiresLabel}${inviteExpiresAt.toLocaleString(locale)}`)
    }
  } else if (isApproved && !inviteCode) {
    // 通过但无码时，提示用户稍后领取
    lines.push(t.claimCodeHint ?? "暂无可用邀请码，请稍后在申请页面领取。")
  }

  lines.push(t.footer)

  return {
    title,
    content: lines.join("\n\n"),
  }
}
