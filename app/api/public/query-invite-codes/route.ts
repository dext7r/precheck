import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const { searchParams } = request.nextUrl
    const token = (searchParams.get("token") || "").trim().toUpperCase()

    if (!token || token.length < 4) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 })
    }

    const now = new Date()

    // 首先尝试查询 InviteCodeQueryToken（管理员批量邀请码）
    const inviteQueryToken = await db.inviteCodeQueryToken.findUnique({
      where: { token },
      include: {
        inviteCodes: {
          where: {
            usedAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          select: {
            id: true,
            code: true,
            expiresAt: true,
          },
          orderBy: { expiresAt: "asc" },
        },
      },
    })

    if (inviteQueryToken) {
      if (inviteQueryToken.expiresAt && inviteQueryToken.expiresAt < now) {
        return NextResponse.json({ error: "Token expired" }, { status: 410 })
      }

      if (!inviteQueryToken.queriedAt) {
        await db.inviteCodeQueryToken.update({
          where: { id: inviteQueryToken.id },
          data: { queriedAt: now },
        })
      }

      return NextResponse.json({
        type: "invite_codes",
        inviteCodes: inviteQueryToken.inviteCodes.map((ic) => ({
          code: ic.code,
          expiresAt: ic.expiresAt,
        })),
        queriedAt: inviteQueryToken.queriedAt || now,
      })
    }

    // 然后尝试查询 PreApplication（用户预申请）
    const preApplication = await db.preApplication.findFirst({
      where: { queryToken: token },
      select: {
        id: true,
        status: true,
        guidance: true,
        reviewedAt: true,
        createdAt: true,
        inviteCode: {
          select: {
            code: true,
            expiresAt: true,
            usedAt: true,
          },
        },
      },
    })

    if (preApplication) {
      return NextResponse.json({
        type: "pre_application",
        status: preApplication.status,
        guidance: preApplication.guidance,
        reviewedAt: preApplication.reviewedAt,
        createdAt: preApplication.createdAt,
        inviteCode: preApplication.inviteCode
          ? {
              code: preApplication.inviteCode.code,
              expiresAt: preApplication.inviteCode.expiresAt,
              used: !!preApplication.inviteCode.usedAt,
            }
          : null,
      })
    }

    return NextResponse.json({ error: "Token not found" }, { status: 404 })
  } catch (error) {
    console.error("Query invite codes error:", error)
    return NextResponse.json({ error: "Failed to query" }, { status: 500 })
  }
}
