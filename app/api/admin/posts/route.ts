import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { PostStatus } from "@prisma/client"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createApiErrorResponse(request, ApiErrorKeys.notAuthenticated, { status: 401 })
    }

    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return createApiErrorResponse(request, ApiErrorKeys.general.forbidden, { status: 403 })
    }

    if (!db) {
      return createApiErrorResponse(request, ApiErrorKeys.databaseNotConfigured, { status: 503 })
    }

    const { searchParams } = request.nextUrl
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const sortByParam = searchParams.get("sortBy") || "createdAt"
    const sortOrderParam = searchParams.get("sortOrder")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const skip = (page - 1) * limit
    const allowedSortBy = new Set(["createdAt", "title", "status", "views"])
    const sortBy = allowedSortBy.has(sortByParam) ? sortByParam : "createdAt"
    const sortOrder = sortOrderParam === "asc" ? "asc" : "desc"

    const where: {
      title?: { contains: string; mode: "insensitive" }
      status?: PostStatus
    } = {}

    if (search) {
      where.title = { contains: search, mode: "insensitive" }
    }

    if (status && Object.values(PostStatus).includes(status as PostStatus)) {
      where.status = status as PostStatus
    }

    const [posts, total] = await Promise.all([
      db.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          title: true,
          content: true,
          status: true,
          views: true,
          author: {
            select: {
              name: true,
              email: true,
            },
          },
          createdAt: true,
        },
      }),
      db.post.count({ where }),
    ])

    return NextResponse.json({ posts, total, page, limit })
  } catch (error) {
    console.error("Posts API error:", error)
    return createApiErrorResponse(request, ApiErrorKeys.admin.posts.failedToFetch, {
      status: 500,
    })
  }
}
