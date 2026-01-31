import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  replyToId: z.string().optional(),
})

const deleteMessageSchema = z.object({
  messageId: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }
    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const { searchParams } = request.nextUrl
    const cursorParam = searchParams.get("cursor")
    const limitParam = Number.parseInt(searchParams.get("limit") || "50", 10)
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 50

    const where: Record<string, unknown> = { deletedAt: null }
    if (cursorParam) {
      const cursorDate = new Date(cursorParam)
      if (!Number.isNaN(cursorDate.getTime())) {
        where.createdAt = { lt: cursorDate }
      }
    }

    const messages = await db.chatMessage.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        replyTo: {
          select: {
            id: true,
            content: true,
            deletedAt: true,
            sender: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })

    return NextResponse.json({
      messages: messages.reverse(),
      hasMore: messages.length === limit,
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.general.failed, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: { message: "请先登录" } }, { status: 401 })
    }
    if (!db) {
      return NextResponse.json({ error: { message: "服务暂时不可用" } }, { status: 503 })
    }

    const body = await request.json()
    const data = sendMessageSchema.parse(body)

    // 验证 replyToId 是否有效
    if (data.replyToId) {
      const replyTarget = await db.chatMessage.findUnique({
        where: { id: data.replyToId, deletedAt: null },
      })
      if (!replyTarget) {
        return NextResponse.json({ error: { message: "引用的消息不存在或已被撤回" } }, { status: 400 })
      }
    }

    const message = await db.chatMessage.create({
      data: {
        content: data.content,
        senderId: user.id,
        replyToId: data.replyToId || null,
      },
      include: {
        sender: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        replyTo: {
          select: {
            id: true,
            content: true,
            deletedAt: true,
            sender: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issue = error.issues[0]
      let message = "消息格式不正确"
      if (issue?.path[0] === "content") {
        if (issue.code === "too_small") message = "消息不能为空"
        else if (issue.code === "too_big") message = "消息内容过长（最多 2000 字符）"
      }
      return NextResponse.json({ error: { message } }, { status: 400 })
    }
    console.error("Send chat message error:", error)
    return NextResponse.json({ error: { message: "发送失败，请稍后重试" } }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: { message: "请先登录" } }, { status: 401 })
    }
    if (!db) {
      return NextResponse.json({ error: { message: "服务暂时不可用" } }, { status: 503 })
    }

    const body = await request.json()
    const data = deleteMessageSchema.parse(body)

    const message = await db.chatMessage.findUnique({
      where: { id: data.messageId },
    })

    if (!message) {
      return NextResponse.json({ error: { message: "消息不存在" } }, { status: 404 })
    }

    if (message.deletedAt) {
      return NextResponse.json({ error: { message: "消息已被撤回" } }, { status: 400 })
    }

    if (message.senderId !== user.id) {
      return NextResponse.json({ error: { message: "只能撤回自己的消息" } }, { status: 403 })
    }

    // 2 分钟内可撤回
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)
    if (message.createdAt < twoMinutesAgo) {
      return NextResponse.json({ error: { message: "超过 2 分钟的消息无法撤回" } }, { status: 400 })
    }

    await db.chatMessage.update({
      where: { id: data.messageId },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { message: "请求参数不正确" } }, { status: 400 })
    }
    console.error("Delete chat message error:", error)
    return NextResponse.json({ error: { message: "撤回失败，请稍后重试" } }, { status: 500 })
  }
}
