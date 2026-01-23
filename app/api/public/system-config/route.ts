import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { allowedEmailDomains as defaultEmailDomains } from "@/lib/pre-application/constants"

export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({
        preApplicationEssayHint: "建议 100 字左右,避免夸赞社区与版主,只说明你的目的与需求。",
        allowedEmailDomains: defaultEmailDomains,
      })
    }

    const settings = await db.siteSettings.findUnique({
      where: { id: "global" },
      select: {
        preApplicationEssayHint: true,
        allowedEmailDomains: true,
      },
    })

    if (!settings) {
      return NextResponse.json({
        preApplicationEssayHint: "建议 100 字左右,避免夸赞社区与版主,只说明你的目的与需求。",
        allowedEmailDomains: defaultEmailDomains,
      })
    }

    return NextResponse.json({
      preApplicationEssayHint: settings.preApplicationEssayHint,
      allowedEmailDomains: Array.isArray(settings.allowedEmailDomains)
        ? settings.allowedEmailDomains
        : defaultEmailDomains,
    })
  } catch (error) {
    console.error("Public system config fetch error:", error)
    return NextResponse.json(
      {
        preApplicationEssayHint: "建议 100 字左右,避免夸赞社区与版主,只说明你的目的与需求。",
        allowedEmailDomains: defaultEmailDomains,
      },
      { status: 500 },
    )
  }
}
