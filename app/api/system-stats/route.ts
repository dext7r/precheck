import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export const revalidate = 300 // 缓存 5 分钟

export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({
        users_count: 0,
        applications_count: 0,
        approved_count: 0,
        invite_codes_count: 0,
      })
    }

    const now = new Date()
    const [usersCount, applicationsCount, approvedCount, inviteCodesCount] = await Promise.all([
      db.user.count(),
      db.preApplication.count(),
      db.preApplication.count({ where: { status: "APPROVED" } }),
      // 可用邀请码：未删除、未使用、未过期、未分配给任何人
      db.inviteCode.count({
        where: {
          deletedAt: null,
          usedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          // 排除已分配/已发送的邀请码
          preApplication: { is: null },
          issuedToUserId: null,
          issuedToEmail: null,
        },
      }),
    ])

    return NextResponse.json({
      users_count: usersCount,
      applications_count: applicationsCount,
      approved_count: approvedCount,
      invite_codes_count: inviteCodesCount,
    })
  } catch {
    return NextResponse.json({
      users_count: 0,
      applications_count: 0,
      approved_count: 0,
      invite_codes_count: 0,
    })
  }
}
