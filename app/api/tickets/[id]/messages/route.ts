import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

const messageSchema = z.object({
  content: z.string().min(1).max(2000),
})

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }
    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const { id } = await context.params
    const body = await request.json()
    const data = messageSchema.parse(body)

    // 验证工单存在且属于当前用户
    const ticket = await db.ticket.findUnique({
      where: { id, userId: user.id },
    })
    if (!ticket) {
      return createApiErrorResponse(request, ApiErrorKeys.general.notFound, { status: 404 })
    }
    if (ticket.status === "CLOSED" || ticket.status === "RESOLVED") {
      return createApiErrorResponse(request, ApiErrorKeys.general.invalid, { status: 400 })
    }

    // 创建消息并更新工单时间
    const [message] = await db.$transaction([
      db.ticketMessage.create({
        data: {
          ticketId: id,
          authorId: user.id,
          content: data.content,
        },
        include: {
          author: { select: { id: true, name: true, role: true, avatar: true } },
        },
      }),
      db.ticket.update({
        where: { id },
        data: { updatedAt: new Date() },
      }),
    ])

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(request, ApiErrorKeys.general.invalid, { status: 400 })
    }
    console.error("Create ticket message error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.general.failed, { status: 500 })
  }
}
