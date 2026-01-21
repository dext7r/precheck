import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { getSiteSettings } from "@/lib/site-settings"
import { z } from "zod"

const createPostSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().min(1, "Content is required"),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
})

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const { searchParams } = request.nextUrl
    const page = Number.parseInt(searchParams.get("page") || "1")
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "20")
    const sortByParam = searchParams.get("sortBy") || "createdAt"
    const sortOrderParam = searchParams.get("sortOrder")
    const allowedSortBy = new Set(["createdAt", "updatedAt", "title", "views", "status"])
    const sortBy = allowedSortBy.has(sortByParam) ? sortByParam : "createdAt"
    const sortOrder = sortOrderParam === "asc" ? "asc" : "desc"
    const search = searchParams.get("search") || ""

    const skip = (page - 1) * pageSize
    const isAdmin = user.role === "ADMIN"
    const where = isAdmin
      ? search
        ? { title: { contains: search, mode: "insensitive" as const } }
        : {}
      : search
        ? { authorId: user.id, title: { contains: search, mode: "insensitive" as const } }
        : { authorId: user.id }

    const [posts, total] = await Promise.all([
      db.post.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: pageSize,
        select: {
          id: true,
          title: true,
          content: true,
          status: true,
          views: true,
          createdAt: true,
          updatedAt: true,
          ...(isAdmin && {
            author: {
              select: {
                name: true,
                email: true,
              },
            },
          }),
        },
      }),
      db.post.count({ where }),
    ])

    return NextResponse.json({ posts, total, page, pageSize })
  } catch (error) {
    console.error("Get posts API error:", error)
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const body = await request.json()
    const { title, content, status } = createPostSchema.parse(body)
    const settings = await getSiteSettings()
    const effectiveStatus =
      settings.postModeration && status === "PUBLISHED" && user.role !== "ADMIN"
        ? "PENDING"
        : status

    const post = await db.post.create({
      data: {
        title,
        content,
        status: effectiveStatus,
        authorId: user.id,
      },
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        createdAt: true,
      },
    })

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Create post API error:", error)
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 })
  }
}
