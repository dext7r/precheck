import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { isAdmin } from "@/lib/auth/permissions"

const createChatSchema = z.object({
  adminId: z.string().min(1),
})

// 获取用户的私信列表
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: { message: "请先登录" } }, { status: 401 })
    }
    if (!db) {
      return NextResponse.json({ error: { message: "服务暂时不可用" } }, { status: 503 })
    }

    const isUserAdmin = isAdmin(user.role)

    // 查询与当前用户相关的所有会话（无论是发起方还是接收方）
    const chats = await db.privateChat.findMany({
      where: {
        OR: [{ userId: user.id }, { adminId: user.id }],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
        admin: { select: { id: true, name: true, email: true, avatar: true, role: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, senderId: true, createdAt: true, readAt: true },
        },
      },
    })

    // 计算未读消息数
    const chatsWithUnread = await Promise.all(
      chats.map(async (chat) => {
        const unreadCount = await db!.privateChatMessage.count({
          where: {
            chatId: chat.id,
            senderId: { not: user.id },
            readAt: null,
          },
        })
        return { ...chat, unreadCount }
      }),
    )

    return NextResponse.json({ chats: chatsWithUnread })
  } catch (error) {
    console.error("Private chats API error:", error)
    return NextResponse.json({ error: { message: "获取私信列表失败" } }, { status: 500 })
  }
}

// 创建或获取与管理员的会话
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
    const data = createChatSchema.parse(body)

    // 验证目标是管理员
    const admin = await db.user.findUnique({
      where: { id: data.adminId },
      select: { id: true, role: true, name: true },
    })

    if (!admin || !isAdmin(admin.role)) {
      return NextResponse.json({ error: { message: "只能私信管理员" } }, { status: 400 })
    }

    if (admin.id === user.id) {
      return NextResponse.json({ error: { message: "不能私信自己" } }, { status: 400 })
    }

    // 查找或创建会话
    let chat = await db.privateChat.findUnique({
      where: {
        userId_adminId: { userId: user.id, adminId: data.adminId },
      },
    })

    if (!chat) {
      chat = await db.privateChat.create({
        data: {
          userId: user.id,
          adminId: data.adminId,
        },
      })
    }

    return NextResponse.json({ chatId: chat.id })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { message: "请求参数不正确" } }, { status: 400 })
    }
    console.error("Create private chat error:", error)
    return NextResponse.json({ error: { message: "创建会话失败" } }, { status: 500 })
  }
}
