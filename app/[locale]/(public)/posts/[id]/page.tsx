import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PostContent } from "@/components/posts/post-content"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config"

export const dynamic = "force-dynamic"

interface PostPageProps {
  params: Promise<{
    locale: string
    id: string
  }>
}

export default async function PostPage({ params }: PostPageProps) {
  const { locale, id } = await params
  const currentLocale = locales.includes(locale as Locale) ? (locale as Locale) : defaultLocale
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/${currentLocale}/login`)
  }

  if (!db) {
    notFound()
  }

  const basePost = await db.post.findUnique({
    where: { id },
    select: { id: true, authorId: true },
  })

  if (!basePost) {
    notFound()
  }

  if (user.role !== "ADMIN" && basePost.authorId !== user.id) {
    redirect(`/${currentLocale}/error/403`)
  }

  const post = await db.post.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      status: true,
      views: true,
      createdAt: true,
      updatedAt: true,
      author: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  })

  if (!post) {
    notFound()
  }

  const dict = await getDictionary(currentLocale)
  const statusText =
    post.status === "PUBLISHED"
      ? dict.dashboard.published
      : post.status === "PENDING"
        ? dict.dashboard.pending
        : post.status === "REJECTED"
          ? dict.dashboard.rejected
          : dict.dashboard.draft

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${currentLocale}/dashboard/posts`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{post.title}</h1>
          <p className="mt-1 text-muted-foreground">
            {dict.dashboard.previewStatus}: {statusText}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>
          {dict.dashboard.author}: {post.author?.name || post.author?.email || "-"}
        </span>
        <span>
          {dict.dashboard.previewViews}: {post.views}
        </span>
        <span>
          {dict.dashboard.previewCreated}:{" "}
          {new Date(post.createdAt).toLocaleDateString(currentLocale)}
        </span>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <PostContent content={post.content} emptyMessage={dict.dashboard.previewEmpty} />
      </div>
    </div>
  )
}
