"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Eye, Edit, Trash2, ArrowUpRight } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PostContent } from "@/components/posts/post-content"

interface Post {
  id: string
  title: string
  content: string | null
  status: string
  views: number
  createdAt: Date
}

interface PostActionsWithPreviewProps {
  post: Post
  locale: string
  dict: {
    view: string
    edit: string
    delete: string
    preview: string
    openPost: string
    deleteConfirmTitle?: string
    deleteConfirmDesc?: string
    cancel?: string
    confirm?: string
    previewStatus?: string
    previewViews?: string
    previewCreated?: string
    previewEmpty?: string
    deleteFailed?: string
    deleting?: string
    published?: string
    draft?: string
    pending?: string
    rejected?: string
  }
  onDelete?: () => void
}

export function PostActionsWithPreview({
  post,
  locale,
  dict,
  onDelete,
}: PostActionsWithPreviewProps) {
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/dashboard/posts/${post.id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete post")

      setShowDeleteDialog(false)
      if (onDelete) onDelete()
    } catch (error) {
      console.error("Delete error:", error)
      toast.error(dict.deleteFailed || "删除失败，请重试")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 transition-opacity group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShowPreviewDialog(true)}>
            <Eye className="mr-2 h-4 w-4" />
            {dict.preview || dict.view}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(`/${locale}/posts/${post.id}`)}>
            <ArrowUpRight className="mr-2 h-4 w-4" />
            {dict.openPost}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(`/${locale}/dashboard/posts/${post.id}`)}>
            <Edit className="mr-2 h-4 w-4" />
            {dict.edit}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            {dict.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{post.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                {dict.previewStatus || "状态"}:{" "}
                {post.status === "PUBLISHED"
                  ? dict.published || "已发布"
                  : post.status === "PENDING"
                    ? dict.pending || "待审核"
                    : post.status === "REJECTED"
                      ? dict.rejected || "已驳回"
                      : dict.draft || "草稿"}
              </span>
              <span>
                {dict.previewViews || "浏览"}: {post.views}
              </span>
              <span>
                {dict.previewCreated || "创建"}:{" "}
                {new Date(post.createdAt).toLocaleDateString(locale)}
              </span>
            </div>
            <PostContent content={post.content} emptyMessage={dict.previewEmpty} />
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dict.deleteConfirmTitle || "确认删除"}</AlertDialogTitle>
            <AlertDialogDescription>
              {dict.deleteConfirmDesc || "此操作无法撤销。确定要删除这篇文章吗？"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{dict.cancel || "取消"}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? dict.deleting || "删除中..." : dict.confirm || "确认"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
