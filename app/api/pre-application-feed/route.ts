import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUserFromRequest } from "@/lib/auth/session"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { maskName, maskEmail } from "@/lib/utils"

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request)
  if (!user) {
    return createApiErrorResponse(request, "apiErrors.notAuthenticated", { status: 401 })
  }

  if (!db) {
    return createApiErrorResponse(request, "apiErrors.databaseNotConfigured", { status: 500 })
  }

  const records = await db.preApplication.findMany({
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: {
      status: true,
      source: true,
      registerEmail: true,
      codeSent: true,
      createdAt: true,
      updatedAt: true,
      reviewedAt: true,
      user: { select: { name: true } },
    },
  })

  const feed = records.map((r) => ({
    status: r.status,
    userName: maskName(r.user?.name ?? null),
    registerEmail: maskEmail(r.registerEmail),
    source: r.source,
    codeSent: r.codeSent,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
  }))

  return NextResponse.json(feed)
}
