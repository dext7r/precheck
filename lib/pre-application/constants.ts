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
