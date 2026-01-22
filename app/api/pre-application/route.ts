import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { writeAuditLog } from "@/lib/audit"
import { isAllowedEmailDomain, normalizeEmail } from "@/lib/pre-application/validation"
import { PreApplicationGroup, PreApplicationSource } from "@prisma/client"

const preApplicationSchema = z.object({
  essay: z.string().min(50).max(1000),
  source: z.nativeEnum(PreApplicationSource).optional().nullable(),
  sourceDetail: z.string().max(100).optional().nullable(),
  registerEmail: z.string().email(),
  queryToken: z.string().max(200).optional().nullable(),
  group: z.nativeEnum(PreApplicationGroup),
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
      },
    })

    return NextResponse.json({ records, latest: records[0] ?? null })
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

    if (!isAllowedEmailDomain(registerEmail)) {
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

    const record = await db.preApplication.create({
      data: {
        userId: user.id,
        essay,
        source: data.source ?? null,
        sourceDetail:
          data.source === "OTHER" ? (data.sourceDetail?.trim() || null) : null,
        registerEmail,
        queryToken: data.queryToken?.trim() || null,
        group: data.group,
      },
      include: {
        reviewedBy: { select: { id: true, name: true, email: true } },
        inviteCode: {
          select: { id: true, code: true, expiresAt: true, usedAt: true, assignedAt: true },
        },
      },
    })

    await writeAuditLog(db, {
      action: "PRE_APPLICATION_SUBMIT",
      entityType: "PRE_APPLICATION",
      entityId: record.id,
      actor: user,
      after: record,
      metadata: { payload: data },
      request,
    })

    return NextResponse.json({ record })
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

    if (!isAllowedEmailDomain(registerEmail)) {
      return NextResponse.json({ error: "Invalid email domain" }, { status: 400 })
    }

    if (data.source === "OTHER" && !data.sourceDetail?.trim()) {
      return NextResponse.json({ error: "Source detail required" }, { status: 400 })
    }

    const latest = await db.preApplication.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true },
    })

    if (!latest) {
      return NextResponse.json({ error: "No pre-application found" }, { status: 404 })
    }

    if (latest.status === "APPROVED") {
      return NextResponse.json({ error: "Already approved" }, { status: 400 })
    }

    const payload = {
      essay,
      source: data.source ?? null,
      sourceDetail: data.source === "OTHER" ? (data.sourceDetail?.trim() || null) : null,
      registerEmail,
      queryToken: data.queryToken?.trim() || null,
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

    const record = await db.preApplication.update({
      where: { id: latest.id },
      data: {
        ...payload,
        status: "PENDING",
        guidance: null,
        reviewedAt: null,
        reviewedById: null,
        inviteCodeId: null,
      },
      include: {
        reviewedBy: { select: { id: true, name: true, email: true } },
        inviteCode: {
          select: { id: true, code: true, expiresAt: true, usedAt: true, assignedAt: true },
        },
      },
    })

    await writeAuditLog(db, {
      action: "PRE_APPLICATION_UPDATE",
      entityType: "PRE_APPLICATION",
      entityId: record.id,
      actor: user,
      before,
      after: record,
      metadata: { payload },
      request,
    })

    return NextResponse.json({ record })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Pre-application update error:", error)
    return NextResponse.json({ error: "Failed to update pre-application" }, { status: 500 })
  }
}
