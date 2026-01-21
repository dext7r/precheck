"use client"

import { useEffect, useState } from "react"
import { MoreHorizontal, Eye, Trash2, CheckCircle, XCircle, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DataTable, type Column } from "@/components/ui/data-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { PostContent } from "@/components/posts/post-content"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

interface AdminPost {
  id: string
  title: string
  status: string
  views: number
  createdAt: string
  author?: {
    name: string | null
    email: string
  } | null
}

interface AdminPostDetail extends AdminPost {
  content: string | null
  updatedAt: string
}

interface AdminPostsTableProps {
  locale: Locale
  dict: Dictionary
}

export function AdminPostsTable({ locale, dict }: AdminPostsTableProps) {
  const t = dict.admin
  const [posts, setPosts] = useState<AdminPost[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [error, setError] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState("")
  const [previewPost, setPreviewPost] = useState<AdminPostDetail | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmState, setConfirmState] = useState<{
    title: string
    description: string
    confirmLabel: string
    destructive?: boolean
    onConfirm: () => Promise<void>
  } | null>(null)

  const fetchPosts = async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        sortBy,
        sortOrder,
        ...(search && { search }),
      })
      const res = await fetch(`/api/admin/posts?${params}`)
      if (!res.ok) {
        throw new Error("Fetch failed")
      }
      const data = await res.json()
      setPosts(data.posts || [])
      setTotal(data.total || 0)
    } catch (fetchError) {
      console.error("Admin posts fetch error:", fetchError)
      setError(t.fetchFailed)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [page, pageSize, search, sortBy, sortOrder])

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleSearch()
    }
  }

  const formatPageSummary = (summary: { total: number; page: number; totalPages: number }) =>
    t.pageSummary
      .replace("{total}", summary.total.toString())
      .replace("{page}", summary.page.toString())
      .replace("{totalPages}", summary.totalPages.toString())

  const updatePostStatus = async (id: string, status: string) => {
    setBusyId(id)
    setError("")
    try {
      const res = await fetch(`/api/admin/posts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        throw new Error("Update failed")
      }
      await fetchPosts()
    } catch (updateError) {
      console.error("Admin post update error:", updateError)
      setError(t.actionFailed)
    } finally {
      setBusyId(null)
    }
  }

  const deletePost = async (id: string) => {
    setBusyId(id)
    setError("")
    try {
      const res = await fetch(`/api/admin/posts/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        throw new Error("Delete failed")
      }
      await fetchPosts()
    } catch (deleteError) {
      console.error("Admin post delete error:", deleteError)
      setError(t.actionFailed)
    } finally {
      setBusyId(null)
    }
  }

  const openPreview = async (postId: string) => {
    setPreviewOpen(true)
    setPreviewLoading(true)
    setPreviewError("")
    setPreviewPost(null)
    try {
      const res = await fetch(`/api/admin/posts/${postId}`)
      if (!res.ok) {
        throw new Error("Fetch failed")
      }
      const data = await res.json()
      setPreviewPost(data)
    } catch (previewErr) {
      console.error("Admin post preview error:", previewErr)
      setPreviewError(t.fetchFailed)
    } finally {
      setPreviewLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "bg-primary/10 text-primary"
      case "PENDING":
        return "bg-yellow-500/10 text-yellow-500"
      case "REJECTED":
        return "bg-destructive/10 text-destructive"
      case "DRAFT":
        return "bg-muted text-muted-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return t.published
      case "PENDING":
        return t.pending
      case "REJECTED":
        return t.rejected
      case "DRAFT":
        return t.draft
      default:
        return status
    }
  }

  const renderActions = (post: AdminPost) => {
    const isBusy = busyId === post.id
    const canReview = post.status === "PENDING"
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isBusy}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openPreview(post.id)}>
            <Eye className="mr-2 h-4 w-4" />
            {t.view}
          </DropdownMenuItem>
          {canReview && (
            <>
              <DropdownMenuItem
                className="text-primary"
                disabled={isBusy}
                onClick={() => {
                  setConfirmState({
                    title: t.confirmTitle,
                    description: t.confirmApprovePost,
                    confirmLabel: t.approve,
                    onConfirm: async () => {
                      await updatePostStatus(post.id, "PUBLISHED")
                    },
                  })
                }}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {t.approve}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                disabled={isBusy}
                onClick={() => {
                  setConfirmState({
                    title: t.confirmTitle,
                    description: t.confirmRejectPost,
                    confirmLabel: t.reject,
                    destructive: true,
                    onConfirm: async () => {
                      await updatePostStatus(post.id, "REJECTED")
                    },
                  })
                }}
              >
                <XCircle className="mr-2 h-4 w-4" />
                {t.reject}
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem
            className="text-destructive"
            disabled={isBusy}
            onClick={() => {
              setConfirmState({
                title: t.confirmTitle,
                description: t.confirmDeletePost,
                confirmLabel: t.delete,
                destructive: true,
                onConfirm: async () => {
                  await deletePost(post.id)
                },
              })
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const columns: Column<AdminPost>[] = [
    {
      key: "title",
      label: t.postTitle,
      width: "30%",
      sortable: true,
      render: (post) => <span className="font-medium">{post.title}</span>,
    },
    {
      key: "author",
      label: t.author,
      width: "20%",
      render: (post) => (
        <span className="text-muted-foreground">
          {post.author?.name || post.author?.email || t.unknownAuthor}
        </span>
      ),
    },
    {
      key: "status",
      label: t.status,
      width: "15%",
      sortable: true,
      render: (post) => (
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(post.status)}`}
        >
          {getStatusText(post.status)}
        </span>
      ),
    },
    {
      key: "views",
      label: t.views,
      width: "10%",
      sortable: true,
      render: (post) => (
        <span className="text-muted-foreground">{post.views.toLocaleString()}</span>
      ),
    },
    {
      key: "createdAt",
      label: t.date,
      width: "15%",
      sortable: true,
      render: (post) => (
        <span className="text-muted-foreground">
          {new Date(post.createdAt).toLocaleDateString(locale)}
        </span>
      ),
    },
    {
      key: "actions",
      label: t.actions,
      width: "10%",
      render: renderActions,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t.searchPosts}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-9 pr-9"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("")
                setSearch("")
                setPage(1)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button onClick={handleSearch} variant="secondary">
          {t.searchAction}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <DataTable
          columns={columns}
          data={posts}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
          onSort={(key, direction) => {
            setSortBy(key)
            setSortOrder(direction)
          }}
          loading={loading}
          emptyMessage={t.noPosts}
          loadingText={t.loading}
          perPageText={t.perPage}
          summaryFormatter={formatPageSummary}
          mobileCardRender={(post) => (
            <Card className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium line-clamp-2">{post.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {post.author?.name || post.author?.email || t.unknownAuthor}
                    </p>
                  </div>
                  {renderActions(post)}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(post.status)}`}
                  >
                    {getStatusText(post.status)}
                  </span>
                  <span className="text-muted-foreground">
                    {post.views.toLocaleString()} {t.views}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(post.createdAt).toLocaleDateString(locale)}
                  </span>
                </div>
              </div>
            </Card>
          )}
        />
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.previewTitle}</DialogTitle>
          </DialogHeader>
          {previewLoading && <p className="text-sm text-muted-foreground">{t.loading}</p>}
          {previewError && (
            <Alert variant="destructive">
              <AlertDescription>{previewError}</AlertDescription>
            </Alert>
          )}
          {previewPost && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{previewPost.title}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    {t.previewStatus}: {getStatusText(previewPost.status)}
                  </span>
                  <span>
                    {t.previewViews}: {previewPost.views}
                  </span>
                  <span>
                    {t.previewCreated}: {new Date(previewPost.createdAt).toLocaleDateString(locale)}
                  </span>
                </div>
              </div>
              <PostContent content={previewPost.content} emptyMessage={t.previewTitle} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {confirmState && (
        <ConfirmDialog
          open={!!confirmState}
          title={confirmState.title}
          description={confirmState.description}
          confirmLabel={confirmState.confirmLabel}
          cancelLabel={t.cancel}
          destructive={confirmState.destructive}
          confirming={confirming}
          onOpenChange={(open) => {
            if (!open && !confirming) {
              setConfirmState(null)
            }
          }}
          onConfirm={async () => {
            if (!confirmState) return
            setConfirming(true)
            await confirmState.onConfirm()
            setConfirming(false)
            setConfirmState(null)
          }}
        />
      )}
    </div>
  )
}
