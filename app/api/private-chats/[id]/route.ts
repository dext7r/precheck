import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"

// 获取会话详情
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
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
        admin: { select: { id: true, name: true, email: true, avatar: true, role: true } },
      },
    })

    if (!chat) {
      return NextResponse.json({ error: { message: "会话不存在" } }, { status: 404 })
    }

    // 验证用户有权限访问此会话
    if (chat.userId !== user.id && chat.adminId !== user.id) {
      return NextResponse.json({ error: { message: "无权访问此会话" } }, { status: 403 })
    }

    return NextResponse.json(chat)
  } catch (error) {
    console.error("Get private chat error:", error)
    return NextResponse.json({ error: { message: "获取会话失败" } }, { status: 500 })
  }
}
