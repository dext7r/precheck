import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { isAdmin } from "@/lib/auth/permissions"
import { db } from "@/lib/db"
import { z } from "zod"

const configSchema = z.object({
  name: z.string().min(1, "名称不能为空"),
  host: z.string().min(1, "服务器地址不能为空"),
  port: z.number().int().min(1).max(65535).default(587),
  user: z.string().min(1, "用户名不能为空"),
  pass: z.string().min(1, "密码不能为空"),
})

export async function GET() {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!db) {
    return NextResponse.json({ error: "Database not available" }, { status: 503 })
  }

  const configs = await db.emailApiConfig.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      host: true,
      port: true,
      user: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json(configs)
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!db) {
    return NextResponse.json({ error: "Database not available" }, { status: 503 })
  }

  try {
    const body = await request.json()
    const data = configSchema.parse(body)

    const config = await db.emailApiConfig.create({
      data,
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        user: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(config, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "创建失败" }, { status: 500 })
  }
}
