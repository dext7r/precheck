import { NextResponse } from "next/server"
import { features, getEnabledOAuthProviders, hasAnyOAuthProvider } from "@/lib/features"

// 公开 API：返回启用的功能列表（不暴露敏感信息）
export async function GET() {
  return NextResponse.json({
    oauth: {
      enabled: hasAnyOAuthProvider(),
      providers: getEnabledOAuthProviders().map((p) => p.id),
    },
    database: features.database,
    email: features.email,
  })
}
