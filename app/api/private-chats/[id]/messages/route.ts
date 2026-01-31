import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"

const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
})

// 获取会话消息
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: { message: "请先登录" } }, { status: 401 })
    }
    if (!db) {
      return NextResponse.json({ error: { message: "服务暂时不可用" } }, { status: 503 })
    }

    const { id } = await context.params

    const chat = await db.privateChat.findUnique({
      where: { id },
      select: { userId: true, adminId: true },
    })

    if (!chat) {
      return NextResponse.json({ error: { message: "会话不存在" } }, { status: 404 })
    }

    if (chat.userId !== user.id && chat.adminId !== user.id) {
      return NextResponse.json({ error: { message: "无权访问此会话" } }, { status: 403 })
    }

    // 获取消息
    const messages = await db.privateChatMessage.findMany({
      where: { chatId: id },
      orderBy: { createdAt: "asc" },
      include: {
        sender: { select: { id: true, name: true, email: true, avatar: true, role: true } },
      },
    })

    // 标记对方消息为已读
    await db.privateChatMessage.updateMany({
      where: {
        chatId: id,
        senderId: { not: user.id },
        readAt: null,
      },
      data: { readAt: new Date() },
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("Get private messages error:", error)
    return NextResponse.json({ error: { message: "获取消息失败" } }, { status: 500 })
  }
}

// 发送消息
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: { message: "请先登录" } }, { status: 401 })
    }
    if (!db) {
      return NextResponse.json({ error: { message: "服务暂时不可用" } }, { status: 503 })
    }

    const { id } = await context.params
    const body = await request.json()
    const data = sendMessageSchema.parse(body)

    const chat = await db.privateChat.findUnique({
      where: { id },
      select: { userId: true, adminId: true },
    })

    if (!chat) {
      return NextResponse.json({ error: { message: "会话不存在" } }, { status: 404 })
    }

    if (chat.userId !== user.id && chat.adminId !== user.id) {
      return NextResponse.json({ error: { message: "无权访问此会话" } }, { status: 403 })
    }

    // 创建消息并更新会话时间
    const [message] = await db.$transaction([
      db.privateChatMessage.create({
        data: {
          chatId: id,
          senderId: user.id,
          content: data.content,
        },
        include: {
          sender: { select: { id: true, name: true, email: true, avatar: true, role: true } },
        },
      }),
      db.privateChat.update({
        where: { id },
        data: { updatedAt: new Date() },
      }),
    ])

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
    console.error("Send private message error:", error)
    return NextResponse.json({ error: { message: "发送失败" } }, { status: 500 })
  }
}
