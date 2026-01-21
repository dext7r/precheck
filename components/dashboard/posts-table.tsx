"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, X } from "lucide-react"
import Link from "next/link"
import { DataTable, type Column } from "@/components/ui/data-table"
import { PostActionsWithPreview } from "@/components/dashboard/post-actions-with-preview"

interface Post {
  id: string
  title: string
  content: string | null
  status: string
  views: number
  createdAt: Date
  author?: {
    name: string | null
    email: string
  }
}

interface PostsTableProps {
  locale: string
  dict: {
    dashboard: {
      myPosts: string
      manageAllPosts: string
      newPost: string
      searchPosts: string
      search: string
      author: string
      postTitle: string
      status: string
      views: string
      date: string
      actions: string
      published: string
      draft: string
      pending: string
      rejected: string
      view: string
      edit: string
      delete: string
      preview: string
      openPost: string
      deleteConfirmTitle: string
      deleteConfirmDesc: string
      cancel: string
      confirm: string
      noData: string
      previewStatus: string
      previewViews: string
      previewCreated: string
      previewEmpty: string
      deleteFailed: string
      deleting: string
      loading: string
      perPage: string
      pageSummary: string
    }
  }
}

export function PostsTable({ locale, dict }: PostsTableProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")

  const fetchPosts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder,
        ...(search && { search }),
      })
      const res = await fetch(`/api/dashboard/posts?${params}`)
      if (!res.ok) throw new Error("Failed to fetch posts")
      const data = await res.json()
      setPosts(data.posts)
      setTotal(data.total)
    } catch (error) {
      console.error("Fetch error:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [page, pageSize, sortBy, sortOrder, search])

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const hasAuthorInfo = posts.length > 0 && posts[0].author !== undefined
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return dict.dashboard.published
      case "PENDING":
        return dict.dashboard.pending
      case "REJECTED":
        return dict.dashboard.rejected
      default:
        return dict.dashboard.draft
    }
  }
  const getStatusClass = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "bg-primary/10 text-primary"
      case "PENDING":
        return "bg-yellow-500/10 text-yellow-500"
      case "REJECTED":
        return "bg-destructive/10 text-destructive"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const columns: Column<Post>[] = [
    {
      key: "title",
      label: dict.dashboard.postTitle,
      sortable: true,
      width: hasAuthorInfo ? "30%" : "35%",
      render: (post) => <span className="font-medium">{post.title}</span>,
    },
    ...(hasAuthorInfo
      ? [
          {
            key: "author",
            label: dict.dashboard.author,
            width: "15%",
            render: (post: Post) => (
              <span className="text-muted-foreground">
                {post.author?.name || post.author?.email || "-"}
              </span>
            ),
          },
        ]
      : []),
    {
      key: "status",
      label: dict.dashboard.status,
      sortable: true,
      width: hasAuthorInfo ? "12%" : "15%",
      render: (post) => (
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(post.status)}`}
        >
          {getStatusLabel(post.status)}
        </span>
      ),
    },
    {
      key: "views",
      label: dict.dashboard.views,
      sortable: true,
      width: hasAuthorInfo ? "10%" : "15%",
      render: (post) => (
        <span className="text-muted-foreground">{post.views.toLocaleString()}</span>
      ),
    },
    {
      key: "createdAt",
      label: dict.dashboard.date,
      sortable: true,
      width: hasAuthorInfo ? "18%" : "20%",
      render: (post) => (
        <span className="text-muted-foreground">
          {new Date(post.createdAt).toLocaleDateString(locale)}
        </span>
      ),
    },
    {
      key: "actions",
      label: dict.dashboard.actions,
      width: "15%",
      render: (post) => (
        <PostActionsWithPreview
          post={post}
          locale={locale}
          dict={{
            view: dict.dashboard.view,
            edit: dict.dashboard.edit,
            delete: dict.dashboard.delete,
            preview: dict.dashboard.preview || dict.dashboard.view,
            openPost: dict.dashboard.openPost,
            deleteConfirmTitle: dict.dashboard.deleteConfirmTitle,
            deleteConfirmDesc: dict.dashboard.deleteConfirmDesc,
            cancel: dict.dashboard.cancel,
            confirm: dict.dashboard.confirm,
            previewStatus: dict.dashboard.previewStatus,
            previewViews: dict.dashboard.previewViews,
            previewCreated: dict.dashboard.previewCreated,
            previewEmpty: dict.dashboard.previewEmpty,
            deleteFailed: dict.dashboard.deleteFailed,
            deleting: dict.dashboard.deleting,
            published: dict.dashboard.published,
            draft: dict.dashboard.draft,
            pending: dict.dashboard.pending,
            rejected: dict.dashboard.rejected,
          }}
          onDelete={fetchPosts}
        />
      ),
    },
  ]

  const handleSort = (key: string, direction: "asc" | "desc") => {
    setSortBy(key)
    setSortOrder(direction)
  }

  const formatPageSummary = (summary: { total: number; page: number; totalPages: number }) =>
    dict.dashboard.pageSummary
      .replace("{total}", summary.total.toString())
      .replace("{page}", summary.page.toString())
      .replace("{totalPages}", summary.totalPages.toString())

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{dict.dashboard.myPosts}</h1>
          <p className="mt-1 text-muted-foreground">{dict.dashboard.manageAllPosts}</p>
        </div>
        <Link href={`/${locale}/dashboard/posts/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {dict.dashboard.newPost}
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={dict.dashboard.searchPosts}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={handleSearchKeyPress}
            className="pl-9 pr-9"
          />
          {searchInput && (
            <button
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
          {dict.dashboard.search}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
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
            onSort={handleSort}
            loading={loading}
            emptyMessage={dict.dashboard.noData}
            loadingText={dict.dashboard.loading}
            perPageText={dict.dashboard.perPage}
            summaryFormatter={formatPageSummary}
            enableVirtualScroll={false}
            rowHeight={60}
            mobileCardRender={(post) => (
              <Card className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium line-clamp-2 flex-1">{post.title}</h3>
                    <PostActionsWithPreview
                      post={post}
                      locale={locale}
                      dict={{
                        view: dict.dashboard.view,
                        edit: dict.dashboard.edit,
                        delete: dict.dashboard.delete,
                        preview: dict.dashboard.preview || dict.dashboard.view,
                        openPost: dict.dashboard.openPost,
                        deleteConfirmTitle: dict.dashboard.deleteConfirmTitle,
                        deleteConfirmDesc: dict.dashboard.deleteConfirmDesc,
                        cancel: dict.dashboard.cancel,
                        confirm: dict.dashboard.confirm,
                        previewStatus: dict.dashboard.previewStatus,
                        previewViews: dict.dashboard.previewViews,
                        previewCreated: dict.dashboard.previewCreated,
                        previewEmpty: dict.dashboard.previewEmpty,
                        deleteFailed: dict.dashboard.deleteFailed,
                        deleting: dict.dashboard.deleting,
                        published: dict.dashboard.published,
                        draft: dict.dashboard.draft,
                        pending: dict.dashboard.pending,
                        rejected: dict.dashboard.rejected,
                      }}
                      onDelete={fetchPosts}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        post.status === "PUBLISHED"
                          ? "bg-primary/10 text-primary"
                          : "bg-yellow-500/10 text-yellow-500"
                      }`}
                    >
                      {post.status === "PUBLISHED"
                        ? dict.dashboard.published
                        : dict.dashboard.draft}
                    </span>
                    <span className="text-muted-foreground">
                      {post.views.toLocaleString()} {dict.dashboard.views}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(post.createdAt).toLocaleDateString(locale)}
                    </span>
                  </div>
                  {hasAuthorInfo && post.author && (
                    <div className="text-sm text-muted-foreground">
                      {post.author.name || post.author.email}
                    </div>
                  )}
                </div>
              </Card>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
}
