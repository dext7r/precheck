import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { z } from "zod"
import { db } from "@/lib/db"
import { writeAuditLog } from "@/lib/audit"
import { isAllowedEmailDomainAsync, normalizeEmail } from "@/lib/pre-application/validation"
import { PreApplicationSource } from "@prisma/client"
import { randomBytes } from "crypto"
import { getQQVerifyStatus, QQ_VERIFY_CONFIG } from "@/lib/qq-verify"
import { fetchQQGroups } from "@/lib/qq-groups"

async function generateUniqueQueryToken(): Promise<string> {
  if (!db) throw new Error("Database not configured")
  for (let i = 0; i < 5; i++) {
    const token = randomBytes(4).toString("hex").toUpperCase()
    const existing = await db.preApplication.findUnique({ where: { queryToken: token } })
    if (!existing) return token
  }
  return randomBytes(6).toString("hex").toUpperCase()
}

const guestApplicationSchema = z.object({
  essay: z.string().min(50).max(1000),
  source: z.nativeEnum(PreApplicationSource).optional().nullable(),
  sourceDetail: z.string().max(100).optional().nullable(),
  registerEmail: z.string().email(),
  group: z.string().min(1),
})

async function isValidGroupId(groupId: string): Promise<boolean> {
  const groups = await fetchQQGroups()
  return groups.some((g) => g.id === groupId)
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(QQ_VERIFY_CONFIG.cookieName)?.value
    const { verified, qqNumber } = await getQQVerifyStatus(token)

    if (!verified || !qqNumber) {
      return NextResponse.json({ error: "QQ 验证未通过" }, { status: 401 })
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const body = await request.json()
    const data = guestApplicationSchema.parse(body)
    const registerEmail = normalizeEmail(data.registerEmail)
    const essay = data.essay.trim()

    if (essay.length < 50) {
      return NextResponse.json({ error: "申请内容不少于 50 个字符" }, { status: 400 })
    }

    if (!(await isAllowedEmailDomainAsync(registerEmail))) {
      return NextResponse.json({ error: "不支持该邮箱域名" }, { status: 400 })
    }

    if (data.source === "OTHER" && !data.sourceDetail?.trim()) {
      return NextResponse.json({ error: "请填写来源说明" }, { status: 400 })
    }

    if (!(await isValidGroupId(data.group))) {
      return NextResponse.json({ error: "无效的群组" }, { status: 400 })
    }

    const existing = await db.preApplication.count({ where: { qqNumber } })
    if (existing > 0) {
      return NextResponse.json({ error: "该 QQ 号已经提交过申请" }, { status: 409 })
    }

    const queryToken = await generateUniqueQueryToken()

    const record = await db.$transaction(async (tx) => {
      const preApp = await tx.preApplication.create({
        data: {
          qqNumber,
          essay,
          source: data.source ?? null,
          sourceDetail: data.source === "OTHER" ? data.sourceDetail?.trim() || null : null,
          registerEmail,
          queryToken,
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
      action: "GUEST_PRE_APPLICATION_SUBMIT",
      entityType: "PRE_APPLICATION",
      entityId: record.id,
      actor: { id: null, name: `QQ:${qqNumber}`, email: registerEmail },
      after: record,
      metadata: { qqNumber, payload: data, version: 1 },
      request,
    })

    return NextResponse.json({ success: true, queryToken: record.queryToken })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据格式错误", detail: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Guest application submit error:", error)
    return NextResponse.json({ error: "提交失败" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(QQ_VERIFY_CONFIG.cookieName)?.value
    const { verified, qqNumber } = await getQQVerifyStatus(token)

    if (!verified || !qqNumber) {
      return NextResponse.json({ error: "QQ 验证未通过" }, { status: 401 })
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const record = await db.preApplication.findFirst({
      where: { qqNumber },
      orderBy: { createdAt: "desc" },
      include: {
        reviewedBy: { select: { id: true, name: true, email: true } },
        inviteCode: {
          select: { id: true, code: true, expiresAt: true, usedAt: true, assignedAt: true },
        },
      },
    })

    return NextResponse.json({ record })
  } catch (error) {
    console.error("Guest application fetch error:", error)
    return NextResponse.json({ error: "查询失败" }, { status: 500 })
  }
}
