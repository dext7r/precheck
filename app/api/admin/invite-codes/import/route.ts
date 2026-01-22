import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { writeAuditLog } from "@/lib/audit"

const importInviteCodesSchema = z.object({
  codes: z.array(z.string().min(1)).min(1).max(2000),
  expiresAt: z.string().optional().nullable(),
})

const inviteCodePattern = /(?:https?:\/\/linux\.do)?\/?invites\/([A-Za-z0-9_-]{4,64})/i
const rawCodePattern = /^[A-Za-z0-9_-]{4,64}$/

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const body = await request.json()
    const data = importInviteCodesSchema.parse(body)

    const matched: string[] = []
    let invalidCount = 0
    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null

    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      return NextResponse.json({ error: "Invalid expiry" }, { status: 400 })
    }
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Expiry must be in the future" }, { status: 400 })
    }

    for (const raw of data.codes) {
      const value = raw.trim()
      if (!value) continue
      const match = value.match(inviteCodePattern)
      if (match?.[1]) {
        matched.push(match[1])
        continue
      }
      if (rawCodePattern.test(value)) {
        matched.push(value)
        continue
      }
      invalidCount += 1
    }

    const uniqueCodes = Array.from(new Set(matched))
    const duplicatesCount = Math.max(0, matched.length - uniqueCodes.length)

    if (uniqueCodes.length === 0) {
      return NextResponse.json({ error: "No valid invite codes" }, { status: 400 })
    }

    const [existingRecords, createdRecords] = await db.$transaction(async (tx) => {
      const existing = await tx.inviteCode.findMany({
        where: { code: { in: uniqueCodes } },
        select: { code: true },
      })
      const existingSet = new Set(existing.map((record) => record.code))
      const newCodes = uniqueCodes.filter((code) => !existingSet.has(code))

      if (newCodes.length > 0) {
        await tx.inviteCode.createMany({
          data: newCodes.map((code) => ({
            code,
            expiresAt,
            createdById: user.id,
          })),
          skipDuplicates: true,
        })
      }

      const created = newCodes.length
        ? await tx.inviteCode.findMany({
            where: { code: { in: newCodes }, createdById: user.id },
          })
        : []

      return [existing, created] as const
    })

    const skippedCount = existingRecords.length
    const createdCount = createdRecords.length

    await writeAuditLog(db, {
      action: "INVITE_CODE_BULK_IMPORT",
      entityType: "INVITE_CODE",
      entityId: null,
      actor: user,
      metadata: {
        totalInput: data.codes.length,
        matched: matched.length,
        invalid: invalidCount,
        duplicates: duplicatesCount,
        created: createdCount,
        skippedExisting: skippedCount,
        expiresAt: expiresAt?.toISOString() ?? null,
      },
      request,
    })

    for (const record of createdRecords) {
      await writeAuditLog(db, {
        action: "INVITE_CODE_CREATE",
        entityType: "INVITE_CODE",
        entityId: record.id,
        actor: user,
        after: record,
        metadata: { source: "bulk-import" },
        request,
      })
    }

    return NextResponse.json({
      createdCount,
      skippedCount,
      invalidCount,
      duplicatesCount,
      total: data.codes.length,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Invite codes import error:", error)
    return NextResponse.json({ error: "Failed to import invite codes" }, { status: 500 })
  }
}
