import { db } from "@/lib/db"
import { defaultQQGroups, type QQGroupConfig } from "@/lib/pre-application/constants"
import { cache } from "react"

// 缓存 QQ 群配置获取
export const getQQGroups = cache(async (): Promise<QQGroupConfig[]> => {
  try {
    if (!db) {
      return defaultQQGroups.filter((g) => g.enabled)
    }

    const settings = await db.siteSettings.findUnique({
      where: { id: "global" },
      select: { qqGroups: true },
    })

    if (!settings?.qqGroups || !Array.isArray(settings.qqGroups) || settings.qqGroups.length === 0) {
      return defaultQQGroups.filter((g) => g.enabled)
    }

    const qqGroups = settings.qqGroups as QQGroupConfig[]
    return qqGroups.filter((g) => g.enabled)
  } catch {
    return defaultQQGroups.filter((g) => g.enabled)
  }
})

// 别名导出供其他模块使用
export const fetchQQGroups = getQQGroups
