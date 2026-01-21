import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"

const createMessageSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  recipientMode: z.enum(["all", "role", "status", "users"]),
  recipientRole: z.enum(["ADMIN", "USER"]).optional(),
  recipientStatus: z.enum(["ACTIVE", "INACTIVE", "BANNED"]).optional(),
  recipientUserIds: z.array(z.string()).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const { searchParams } = request.nextUrl
    const search = (searchParams.get("search") || "").trim()
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    const where = search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { content: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}

    const [messages, total] = await Promise.all([
      db.message.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          revokedAt: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      db.message.count({ where }),
    ])

    const messageIds = messages.map((message) => message.id)
    const [recipientCounts, readCounts] =
      messageIds.length > 0
        ? await Promise.all([
            db.messageRecipient.groupBy({
              by: ["messageId"],
              where: { messageId: { in: messageIds } },
              _count: { _all: true },
            }),
            db.messageRecipient.groupBy({
              by: ["messageId"],
              where: { messageId: { in: messageIds }, readAt: { not: null } },
              _count: { _all: true },
            }),
          ])
        : [[], []]

    const recipientCountMap = new Map(
      recipientCounts.map((item) => [item.messageId, item._count._all]),
    )
    const readCountMap = new Map(readCounts.map((item) => [item.messageId, item._count._all]))

    const data = messages.map((message) => ({
      ...message,
      recipientCount: recipientCountMap.get(message.id) || 0,
      readCount: readCountMap.get(message.id) || 0,
    }))

    return NextResponse.json({ messages: data, total, page, limit })
  } catch (error) {
    console.error("Admin messages API error:", error)
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const body = await request.json()
    const data = createMessageSchema.parse(body)

    let where: Record<string, unknown> = {}
    if (data.recipientMode === "role") {
      if (!data.recipientRole) {
        return NextResponse.json({ error: "Role is required" }, { status: 400 })
      }
      where = { role: data.recipientRole }
    }
    if (data.recipientMode === "status") {
      if (!data.recipientStatus) {
        return NextResponse.json({ error: "Status is required" }, { status: 400 })
      }
      where = { status: data.recipientStatus }
    }
    if (data.recipientMode === "users") {
      if (!data.recipientUserIds || data.recipientUserIds.length === 0) {
        return NextResponse.json({ error: "Recipients are required" }, { status: 400 })
      }
      where = { id: { in: data.recipientUserIds } }
    }

    const recipients = await db.user.findMany({
      where,
      select: { id: true },
    })

    if (recipients.length === 0) {
      return NextResponse.json({ error: "No recipients found" }, { status: 400 })
    }

    const message = await db.message.create({
      data: {
        title: data.title,
        content: data.content,
        createdById: user.id,
        recipients: {
          createMany: {
            data: recipients.map((recipient) => ({ userId: recipient.id })),
          },
        },
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    })

    return NextResponse.json(message)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Create message API error:", error)
    return NextResponse.json({ error: "Failed to create message" }, { status: 500 })
  }
}
