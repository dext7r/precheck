"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Edit, Trash2 } from "lucide-react"
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

interface PostActionsProps {
  postId: string
  locale: string
  dict: {
    view: string
    edit: string
    delete: string
    deleteConfirmTitle?: string
    deleteConfirmDesc?: string
    cancel?: string
    confirm?: string
    deleteFailed?: string
    deleting?: string
  }
}

export function PostActions({ postId, locale, dict }: PostActionsProps) {
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/dashboard/posts/${postId}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete post")

      router.refresh()
      setShowDeleteDialog(false)
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
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push(`/${locale}/dashboard/posts/${postId}`)}>
            <Edit className="mr-2 h-4 w-4" />
            {dict.edit}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            {dict.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
