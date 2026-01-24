import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { isAdmin } from "@/lib/auth/permissions"
import { db } from "@/lib/db"
import { z } from "zod"

const updateSchema = z.object({
  name: z.string().min(1, "名称不能为空").optional(),
  host: z.string().min(1, "服务器地址不能为空").optional(),
  port: z.number().int().min(1).max(65535).optional(),
  user: z.string().min(1, "用户名不能为空").optional(),
  pass: z.string().min(1, "密码不能为空").optional(),
})

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!db) {
    return NextResponse.json({ error: "Database not available" }, { status: 503 })
  }

  const { id } = await params

  const config = await db.emailApiConfig.findUnique({
    where: { id },
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

  if (!config) {
    return NextResponse.json({ error: "配置不存在" }, { status: 404 })
  }

  return NextResponse.json(config)
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!db) {
    return NextResponse.json({ error: "Database not available" }, { status: 503 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const data = updateSchema.parse(body)

    const config = await db.emailApiConfig.update({
      where: { id },
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

    return NextResponse.json(config)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "更新失败" }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!db) {
    return NextResponse.json({ error: "Database not available" }, { status: 503 })
  }

  const { id } = await params

  // 检查是否正在被使用
  const settings = await db.siteSettings.findFirst({
    where: { selectedEmailApiConfigId: id },
  })

  if (settings) {
    return NextResponse.json({ error: "该配置正在使用中，无法删除" }, { status: 400 })
  }

  await db.emailApiConfig.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
