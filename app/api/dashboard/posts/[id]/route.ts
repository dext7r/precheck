import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { getSiteSettings } from "@/lib/site-settings"
import { writeAuditLog } from "@/lib/audit"
import { z } from "zod"

const updatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
})

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const { id } = await context.params
    const isAdmin = user.role === "ADMIN"
    const where = isAdmin ? { id } : { id, authorId: user.id }

    const post = await db.post.findFirst({
      where,
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        views: true,
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

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const { id } = await context.params
    const body = await request.json()
    const data = updatePostSchema.parse(body)
    const updateData: {
      title?: string
      content?: string
      status?: "DRAFT" | "PUBLISHED" | "PENDING"
    } = { ...data }
    const settings = await getSiteSettings()
    if (updateData.status === "PUBLISHED" && settings.postModeration && user.role !== "ADMIN") {
      updateData.status = "PENDING"
    }

    const isAdmin = user.role === "ADMIN"
    const where = isAdmin ? { id } : { id, authorId: user.id }

    const post = await db.post.findFirst({
      where,
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    const updatedPost = await db.post.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    await writeAuditLog(db, {
      action: "POST_UPDATE",
      entityType: "POST",
      entityId: id,
      actor: user,
      before: post,
      after: updatedPost,
      metadata: { payload: updateData },
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

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const { id } = await context.params

    const isAdmin = user.role === "ADMIN"
    const where = isAdmin ? { id } : { id, authorId: user.id }

    const post = await db.post.findFirst({
      where,
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    await db.post.delete({ where: { id } })

    await writeAuditLog(db, {
      action: "POST_DELETE",
      entityType: "POST",
      entityId: id,
      actor: user,
      before: post,
      after: null,
      request: _request,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete post API error:", error)
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 })
  }
}
