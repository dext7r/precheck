import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

const createTicketSchema = z.object({
  preApplicationId: z.string().min(1),
  subject: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
})

const parsePositive = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

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
    const page = parsePositive(searchParams.get("page"), 1)
    const pageSize = Math.min(parsePositive(searchParams.get("pageSize"), 20), 100)
    const skip = (page - 1) * pageSize

    const [tickets, total] = await Promise.all([
      db.ticket.findMany({
        where: { userId: user.id },
        skip,
        take: pageSize,
        orderBy: { updatedAt: "desc" },
        include: {
          preApplication: {
            select: { id: true, status: true, registerEmail: true },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              author: { select: { id: true, name: true, role: true } },
            },
          },
        },
      }),
      db.ticket.count({ where: { userId: user.id } }),
    ])

    return NextResponse.json({ tickets, total, page, pageSize })
  } catch (error) {
    console.error("Tickets API error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.general.failed, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }
    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const body = await request.json()
    const data = createTicketSchema.parse(body)

    // 使用事务确保并发安全
    const ticket = await db
      .$transaction(async (tx) => {
        const preApp = await tx.preApplication.findUnique({
          where: { id: data.preApplicationId, userId: user.id },
        })
        if (!preApp) throw new Error("preApp-not-found")
        if (preApp.status !== "REJECTED") throw new Error("invalid-status")

        const existingTicket = await tx.ticket.findFirst({
          where: {
            preApplicationId: data.preApplicationId,
            status: { in: ["OPEN", "IN_PROGRESS"] },
          },
        })
        if (existingTicket) throw new Error("active-ticket")

        return tx.ticket.create({
          data: {
            preApplicationId: data.preApplicationId,
            userId: user.id,
            subject: data.subject,
            messages: {
              create: {
                authorId: user.id,
                content: data.content,
              },
            },
          },
          include: {
            messages: true,
            preApplication: { select: { id: true, status: true } },
          },
        })
      })
      .catch((err: Error) => {
        if (err.message === "preApp-not-found") {
          throw Object.assign(new Error("not-found"), { code: 404 })
        }
        if (err.message === "invalid-status" || err.message === "active-ticket") {
          throw Object.assign(new Error("invalid"), { code: 400 })
        }
        throw err
      })

    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(request, ApiErrorKeys.general.invalid, { status: 400 })
    }
    const err = error as { code?: number }
    if (err.code === 404) {
      return createApiErrorResponse(request, ApiErrorKeys.general.notFound, { status: 404 })
    }
    if (err.code === 400) {
      return createApiErrorResponse(request, ApiErrorKeys.general.invalid, { status: 400 })
    }
    console.error("Create ticket error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.general.failed, { status: 500 })
  }
}
