import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { preApplicationGroups, preApplicationSources } from "@/lib/pre-application/constants"

interface PreApplicationHistoryPageProps {
  params: Promise<{ locale: Locale }>
}

export default async function PreApplicationHistoryPage({
  params,
}: PreApplicationHistoryPageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  if (!db) {
    return <p className="text-muted-foreground">{dict.dashboard.serviceUnavailable}</p>
  }

  const records = await db.preApplication.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      reviewedBy: { select: { id: true, name: true, email: true } },
      inviteCode: {
        select: { id: true, code: true, expiresAt: true, usedAt: true },
      },
    },
  })

  if (records.length === 0) {
    redirect(`/${locale}/dashboard/pre-application`)
  }

  const getGroupLabel = (value: string) => {
    const item = preApplicationGroups.find((group) => group.value === value)
    if (!item) return value
    const key = item.labelKey.split(".").pop() || ""
    return (dict.preApplication.groups as Record<string, string>)[key] || value
  }

  const getSourceLabel = (value: string | null) => {
    if (!value) return dict.preApplication.fields.sourceOptional
    const item = preApplicationSources.find((source) => source.value === value)
    if (!item) return value
    const key = item.labelKey.split(".").pop() || ""
    return (dict.preApplication.sources as Record<string, string>)[key] || value
  }

  const statusMap: Record<string, { label: string; className: string }> = {
    PENDING: {
      label: dict.preApplication.status.pending,
      className: "bg-amber-100 text-amber-800",
    },
    APPROVED: {
      label: dict.preApplication.status.approved,
      className: "bg-emerald-100 text-emerald-700",
    },
    REJECTED: {
      label: dict.preApplication.status.rejected,
      className: "bg-rose-100 text-rose-700",
    },
  }

  const formatDate = (value?: Date | string | null) =>
    value ? new Date(value).toLocaleString(locale) : "-"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{dict.preApplication.historyTitle}</h1>
        <p className="mt-1 text-muted-foreground">{dict.preApplication.description}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {records.map((record) => {
          const status = statusMap[record.status] || statusMap.PENDING
          return (
            <Card key={record.id} className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {dict.preApplication.submittedAt}：{formatDate(record.createdAt)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {dict.preApplication.updatedAt}：{formatDate(record.updatedAt)}
                  </p>
                </div>
                <Badge className={status.className}>{status.label}</Badge>
              </div>

              <div>
                <p className="text-sm font-medium">{dict.preApplication.reviewInfoTitle}</p>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {dict.preApplication.review.reviewer}
                    </p>
                    <p className="text-sm">
                      {record.reviewedBy?.name || record.reviewedBy?.email || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {dict.preApplication.review.reviewedAt}
                    </p>
                    <p className="text-sm">{formatDate(record.reviewedAt)}</p>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-xs text-muted-foreground">
                    {dict.preApplication.review.guidance}
                  </p>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{record.guidance || "-"}</p>
                </div>

                {record.inviteCode && (
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <p>
                      {dict.preApplication.invite.code}：{record.inviteCode.code}
                    </p>
                    <p>
                      {dict.preApplication.invite.expiresAt}：
                      {formatDate(record.inviteCode.expiresAt)}
                    </p>
                    <p>
                      {record.inviteCode.usedAt
                        ? dict.preApplication.invite.used
                        : dict.preApplication.invite.unused}
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium">{dict.preApplication.formInfoTitle}</p>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {dict.preApplication.fields.registerEmail}
                    </p>
                    <p className="text-sm">{record.registerEmail}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {dict.preApplication.fields.queryToken}
                    </p>
                    <p className="text-sm">{record.queryToken || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {dict.preApplication.fields.group}
                    </p>
                    <p className="text-sm">{getGroupLabel(record.group)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {dict.preApplication.fields.source}
                    </p>
                    <p className="text-sm">{getSourceLabel(record.source)}</p>
                  </div>
                  {record.sourceDetail && (
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {dict.preApplication.fields.sourceDetail}
                      </p>
                      <p className="text-sm">{record.sourceDetail}</p>
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground">
                    {dict.preApplication.fields.essay}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {record.essay || dict.preApplication.fields.essayHint}
                  </p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
