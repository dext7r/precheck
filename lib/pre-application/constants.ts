export const allowedEmailDomains = [
  "126.com",
  "139.com",
  "163.com",
  "189.cn",
  "aliyun.com",
  "apache.org",
  "deepseek.com",
  "edu.cn",
  "edu.hk",
  "edu.mo",
  "edu.tw",
  "foxmail.com",
  "gmail.com",
  "gov.cn",
  "qq.com",
  "sina.cn",
  "sina.com",
  "sohu.com",
  "xiaomi.com",
  "yahoo.com",
  "privaterelay.appleid.com",
] as const

export const preApplicationSources = [
  { value: "TIEBA", labelKey: "preApplication.sources.tieba" },
  { value: "BILIBILI", labelKey: "preApplication.sources.bilibili" },
  { value: "DOUYIN", labelKey: "preApplication.sources.douyin" },
  { value: "XIAOHONGSHU", labelKey: "preApplication.sources.xiaohongshu" },
  { value: "OTHER", labelKey: "preApplication.sources.other" },
] as const

export const preApplicationGroups = [
  { value: "GROUP_ONE", labelKey: "preApplication.groups.groupOne" },
  { value: "GROUP_TWO", labelKey: "preApplication.groups.groupTwo" },
  { value: "GROUP_THREE", labelKey: "preApplication.groups.groupThree" },
] as const

// QQ 群默认配置（支持多语言）
export type QQGroupConfig = {
  id: string
  name: string // 中文名称
  nameEn?: string // 英文名称（可选）
  number: string
  url: string
  enabled: boolean
  adminOnly?: boolean // 仅管理员可见，不在用户申请表单中展示
}

export const defaultQQGroups: QQGroupConfig[] = [
  {
    id: "GROUP_ONE",
    name: "一群",
    nameEn: "Group 1",
    number: "311795307",
    url: "https://qm.qq.com/q/yBh3PibMFG",
    enabled: true,
  },
  {
    id: "GROUP_TWO",
    name: "二群",
    nameEn: "Group 2",
    number: "1080464482",
    url: "https://qm.qq.com/q/kAcXh7ovC0",
    enabled: true,
  },
  {
    id: "GROUP_THREE",
    name: "三群",
    nameEn: "Group 3",
    number: "915386705",
    url: "https://qm.qq.com/q/It6OPlkI8g",
    enabled: true,
  },
]
