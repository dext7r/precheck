import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { writeAuditLog } from "@/lib/audit"
import { isAllowedEmailDomainAsync, normalizeEmail } from "@/lib/pre-application/validation"
import { PreApplicationGroup, PreApplicationSource } from "@prisma/client"
import { randomBytes } from "crypto"

// 最大重新提交次数
const MAX_RESUBMIT_COUNT = 3

async function generateUniqueQueryToken(): Promise<string> {
  if (!db) throw new Error("Database not configured")
  for (let i = 0; i < 5; i++) {
    const token = randomBytes(4).toString("hex").toUpperCase()
    const existing = await db.preApplication.findUnique({ where: { queryToken: token } })
    if (!existing) return token
  }
  return randomBytes(6).toString("hex").toUpperCase()
}

const preApplicationSchema = z.object({
  essay: z.string().min(50).max(1000),
  source: z.nativeEnum(PreApplicationSource).optional().nullable(),
  sourceDetail: z.string().max(100).optional().nullable(),
  registerEmail: z.string().email(),
  group: z.nativeEnum(PreApplicationGroup),
  version: z.number().optional(), // 乐观锁版本号
})

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

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

    return NextResponse.json({
      records,
      latest: records[0] ?? null,
      maxResubmitCount: MAX_RESUBMIT_COUNT,
    })
  } catch (error) {
    console.error("Pre-application fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch pre-application" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const body = await request.json()
    const data = preApplicationSchema.parse(body)
    const registerEmail = normalizeEmail(data.registerEmail)
    const essay = data.essay.trim()

    if (essay.length < 50) {
      return NextResponse.json({ error: "ESSAY_TOO_SHORT" }, { status: 400 })
    }

    if (!(await isAllowedEmailDomainAsync(registerEmail))) {
      return NextResponse.json({ error: "Invalid email domain" }, { status: 400 })
    }

    if (data.source === "OTHER" && !data.sourceDetail?.trim()) {
      return NextResponse.json({ error: "Source detail required" }, { status: 400 })
    }

    const existingCount = await db.preApplication.count({
      where: { userId: user.id },
    })

    if (existingCount > 0) {
      return NextResponse.json({ error: "Already submitted" }, { status: 409 })
    }

    // 使用事务创建预申请和版本记录
    const record = await db.$transaction(async (tx) => {
      const preApp = await tx.preApplication.create({
        data: {
          userId: user.id,
          essay,
          source: data.source ?? null,
          sourceDetail: data.source === "OTHER" ? data.sourceDetail?.trim() || null : null,
          registerEmail,
          queryToken: await generateUniqueQueryToken(),
          group: data.group,
          version: 1,
          resubmitCount: 0,
        },
        include: {
          reviewedBy: { select: { id: true, name: true, email: true } },
          inviteCode: {
            select: { id: true, code: true, expiresAt: true, usedAt: true, assignedAt: true },
          },
        },
      })

      // 创建版本历史
      await tx.preApplicationVersion.create({
        data: {
          preApplicationId: preApp.id,
          version: 1,
          essay,
          source: data.source ?? null,
          sourceDetail: data.source === "OTHER" ? data.sourceDetail?.trim() || null : null,
          registerEmail,
          group: data.group,
          status: "PENDING",
        },
      })

      return preApp
    })

    await writeAuditLog(db, {
      action: "PRE_APPLICATION_SUBMIT",
      entityType: "PRE_APPLICATION",
      entityId: record.id,
      actor: user,
      after: record,
      metadata: { payload: data, version: 1 },
      request,
    })

    return NextResponse.json({ record, maxResubmitCount: MAX_RESUBMIT_COUNT })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Pre-application submit error:", error)
    return NextResponse.json({ error: "Failed to submit pre-application" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const body = await request.json()
    const data = preApplicationSchema.parse(body)
    const registerEmail = normalizeEmail(data.registerEmail)
    const essay = data.essay.trim()

    if (essay.length < 50) {
      return NextResponse.json({ error: "ESSAY_TOO_SHORT" }, { status: 400 })
    }

    if (!(await isAllowedEmailDomainAsync(registerEmail))) {
      return NextResponse.json({ error: "Invalid email domain" }, { status: 400 })
    }

    if (data.source === "OTHER" && !data.sourceDetail?.trim()) {
      return NextResponse.json({ error: "Source detail required" }, { status: 400 })
    }

    const latest = await db.preApplication.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, version: true, resubmitCount: true },
    })

    if (!latest) {
      return NextResponse.json({ error: "No pre-application found" }, { status: 404 })
    }

    if (latest.status === "APPROVED") {
      return NextResponse.json({ error: "Already approved" }, { status: 400 })
    }

    // 乐观锁检查
    if (data.version !== undefined && data.version !== latest.version) {
      return NextResponse.json(
        { error: "VERSION_CONFLICT", message: "数据已被修改，请刷新后重试" },
        { status: 409 },
      )
    }

    // 驳回后重新提交次数检查
    const isResubmit = latest.status === "REJECTED"
    if (isResubmit && latest.resubmitCount >= MAX_RESUBMIT_COUNT) {
      return NextResponse.json(
        {
          error: "MAX_RESUBMIT_EXCEEDED",
          message: `已达到最大重新提交次数限制 (${MAX_RESUBMIT_COUNT} 次)`,
        },
        { status: 400 },
      )
    }

    const newVersion = latest.version + 1
    const newResubmitCount = isResubmit ? latest.resubmitCount + 1 : latest.resubmitCount

    const payload = {
      essay,
      source: data.source ?? null,
      sourceDetail: data.source === "OTHER" ? data.sourceDetail?.trim() || null : null,
      registerEmail,
      group: data.group,
    }

    const before = await db.preApplication.findUnique({
      where: { id: latest.id },
      include: {
        reviewedBy: { select: { id: true, name: true, email: true } },
        inviteCode: {
          select: { id: true, code: true, expiresAt: true, usedAt: true, assignedAt: true },
        },
      },
    })

    // 使用事务更新预申请和创建版本记录
    const record = await db.$transaction(async (tx) => {
      const updated = await tx.preApplication.update({
        where: { id: latest.id },
        data: {
          ...payload,
          status: "PENDING",
          guidance: null,
          reviewedAt: null,
          reviewedById: null,
          inviteCodeId: null,
          version: newVersion,
          resubmitCount: newResubmitCount,
        },
        include: {
          reviewedBy: { select: { id: true, name: true, email: true } },
          inviteCode: {
            select: { id: true, code: true, expiresAt: true, usedAt: true, assignedAt: true },
          },
        },
      })

      // 创建版本历史
      await tx.preApplicationVersion.create({
        data: {
          preApplicationId: updated.id,
          version: newVersion,
          essay,
          source: data.source ?? null,
          sourceDetail: data.source === "OTHER" ? data.sourceDetail?.trim() || null : null,
          registerEmail,
          group: data.group,
          status: "PENDING",
        },
      })

      return updated
    })

    await writeAuditLog(db, {
      action: isResubmit ? "PRE_APPLICATION_RESUBMIT" : "PRE_APPLICATION_UPDATE",
      entityType: "PRE_APPLICATION",
      entityId: record.id,
      actor: user,
      before,
      after: record,
      metadata: {
        payload,
        version: newVersion,
        resubmitCount: newResubmitCount,
        isResubmit,
      },
      request,
    })

    return NextResponse.json({
      record,
      maxResubmitCount: MAX_RESUBMIT_COUNT,
      remainingResubmits: MAX_RESUBMIT_COUNT - newResubmitCount,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Pre-application update error:", error)
    return NextResponse.json({ error: "Failed to update pre-application" }, { status: 500 })
  }
}
