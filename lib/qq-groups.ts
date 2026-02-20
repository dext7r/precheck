import { db } from "@/lib/db"
import { defaultQQGroups, type QQGroupConfig } from "@/lib/pre-application/constants"
import { cache } from "react"

// 提取重复的过滤逻辑为常量
const enabledDefaultGroups = defaultQQGroups.filter((g) => g.enabled)

// 缓存 QQ 群配置获取
export const getQQGroups = cache(async (): Promise<QQGroupConfig[]> => {
  try {
    if (!db) {
      return enabledDefaultGroups
    }

    const settings = await db.siteSettings.findUnique({
      where: { id: "global" },
      select: { qqGroups: true },
    })

    if (
      !settings?.qqGroups ||
      !Array.isArray(settings.qqGroups) ||
      settings.qqGroups.length === 0
    ) {
      return enabledDefaultGroups
    }

    const qqGroups = settings.qqGroups as QQGroupConfig[]
    const enabledGroups = qqGroups.filter((g) => g.enabled && !g.adminOnly)

    // 如果启用的群为空，也使用默认值
    if (enabledGroups.length === 0) {
      return enabledDefaultGroups
    }

    return enabledGroups
  } catch {
    return enabledDefaultGroups
  }
})

// 别名导出供其他模块使用
export const fetchQQGroups = getQQGroups
