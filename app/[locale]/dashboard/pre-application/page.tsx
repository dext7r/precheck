import { redirect } from "next/navigation"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { PreApplicationForm } from "@/components/dashboard/pre-application-form"

interface PreApplicationPageProps {
  params: Promise<{ locale: Locale }>
}

const MAX_RESUBMIT_COUNT = 3

export default async function PreApplicationPage({ params }: PreApplicationPageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  // Server Component 数据预取
  let initialRecords = undefined
  if (db) {
    const records = await db.preApplication.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        reviewedBy: { select: { id: true, name: true, email: true } },
        inviteCode: {
          select: { id: true, code: true, expiresAt: true, usedAt: true, assignedAt: true },
        },
        versions: {
          orderBy: { version: "desc" },
          take: 10,
        },
      },
    })

    // 序列化日期字段
    initialRecords = records.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      inviteCode: r.inviteCode
        ? {
            ...r.inviteCode,
            expiresAt: r.inviteCode.expiresAt?.toISOString() ?? null,
            usedAt: r.inviteCode.usedAt?.toISOString() ?? null,
            assignedAt: r.inviteCode.assignedAt?.toISOString() ?? null,
          }
        : null,
      versions: r.versions.map((v) => ({
        ...v,
        createdAt: v.createdAt.toISOString(),
      })),
    }))
  }

  return (
    <PreApplicationForm
      locale={locale}
      dict={dict}
      initialRecords={initialRecords}
      maxResubmitCount={MAX_RESUBMIT_COUNT}
      userEmail={user.email}
    />
  )
}
