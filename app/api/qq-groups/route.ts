import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { defaultQQGroups, type QQGroupConfig } from "@/lib/pre-application/constants"

export const dynamic = "force-dynamic"

// 公开 API: 获取 QQ 群配置（仅返回启用的群）
export async function GET() {
  try {
    if (!db) {
      return NextResponse.json(defaultQQGroups.filter((g) => g.enabled))
    }

    const settings = await db.siteSettings.findUnique({
      where: { id: "global" },
      select: { qqGroups: true },
    })

    if (!settings?.qqGroups || !Array.isArray(settings.qqGroups)) {
      return NextResponse.json(defaultQQGroups.filter((g) => g.enabled))
    }

    const qqGroups = settings.qqGroups as QQGroupConfig[]
    const enabledGroups = qqGroups.filter((g) => g.enabled)

    return NextResponse.json(enabledGroups)
  } catch {
    return NextResponse.json(defaultQQGroups.filter((g) => g.enabled))
  }
}
