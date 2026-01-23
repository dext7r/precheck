import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { z } from "zod"
import { writeAuditLog } from "@/lib/audit"

const updatePostSchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "PENDING", "REJECTED"]),
})

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const { id } = await context.params

    const post = await db.post.findUnique({
      where: { id },
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
        updatedAt: true,
      },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    return NextResponse.json(post)
  } catch (error) {
    console.error("Get post API error:", error)
    return NextResponse.json({ error: "Failed to fetch post" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const { id } = await context.params
    const body = await request.json()
    const { status } = updatePostSchema.parse(body)

    const before = await db.post.findUnique({ where: { id } })

    const updatedPost = await db.post.update({
      where: { id },
      data: { status },
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
        updatedAt: true,
      },
    })

    await writeAuditLog(db, {
      action: "POST_STATUS_UPDATE",
      entityType: "POST",
      entityId: id,
      actor: user,
      before,
      after: updatedPost,
      metadata: { status },
      request,
    })

    return NextResponse.json(updatedPost)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Update post API error:", error)
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const { id } = await context.params

    const before = await db.post.findUnique({ where: { id } })

    await db.post.delete({ where: { id } })

    await writeAuditLog(db, {
      action: "POST_DELETE",
      entityType: "POST",
      entityId: id,
      actor: user,
      before,
      after: null,
      request: _request,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete post API error:", error)
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 })
  }
}
