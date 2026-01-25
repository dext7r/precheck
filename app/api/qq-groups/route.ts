import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { defaultQQGroups, type QQGroupConfig } from "@/lib/pre-application/constants"

export const revalidate = 3600

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

    return NextResponse.json(enabledGroups, {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    })
  } catch {
    return NextResponse.json(defaultQQGroups.filter((g) => g.enabled))
  }
}
