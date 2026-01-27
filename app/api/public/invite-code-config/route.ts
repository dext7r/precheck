import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export const revalidate = 300 // 缓存 5 分钟

export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({ inviteCodeUrlPrefix: "" })
    }

    const settings = await db.siteSettings.findUnique({
      where: { id: "global" },
      select: { inviteCodeUrlPrefix: true },
    })

    return NextResponse.json({
      inviteCodeUrlPrefix: settings?.inviteCodeUrlPrefix || "",
    })
  } catch {
    return NextResponse.json({ inviteCodeUrlPrefix: "" })
  }
}
