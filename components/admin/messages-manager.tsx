"use client"

import { useEffect, useMemo, useState } from "react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DataTable, type Column } from "@/components/ui/data-table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { RichTextEditor } from "@/components/posts/rich-text-editor"
import { PostContent } from "@/components/posts/post-content"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

interface AdminMessageItem {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  revokedAt: string | null
  recipientCount: number
  readCount: number
  createdBy: { id: string; name: string | null; email: string }
}

interface AdminUserItem {
  id: string
  name: string | null
  email: string
  role: string
  status: string
}

interface AdminMessagesManagerProps {
  locale: Locale
  dict: Dictionary
}

const createMessageSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  recipientMode: z.enum(["all", "role", "status", "users"]),
  recipientRole: z.enum(["ADMIN", "USER"]).optional(),
  recipientStatus: z.enum(["ACTIVE", "INACTIVE", "BANNED"]).optional(),
  recipientUserIds: z.array(z.string()).optional(),
})

export function AdminMessagesManager({ locale, dict }: AdminMessagesManagerProps) {
  const t = dict.admin
  const [messages, setMessages] = useState<AdminMessageItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")

  const [formOpen, setFormOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewMessage, setPreviewMessage] = useState<{
    id: string
    title: string
    content: string
    createdAt: string
  } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formError, setFormError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [confirmRevokeOpen, setConfirmRevokeOpen] = useState(false)
  const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    recipientMode: "all" as "all" | "role" | "status" | "users",
    recipientRole: "USER" as "USER" | "ADMIN",
    recipientStatus: "ACTIVE" as "ACTIVE" | "INACTIVE" | "BANNED",
    recipientUserIds: [] as string[],
  })

  const [userSearch, setUserSearch] = useState("")
  const [userPage, setUserPage] = useState(1)
  const [userTotal, setUserTotal] = useState(0)
  const [users, setUsers] = useState<AdminUserItem[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  const selectedUserIds = useMemo(() => new Set(formData.recipientUserIds), [formData])

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      recipientMode: "all",
      recipientRole: "USER",
      recipientStatus: "ACTIVE",
      recipientUserIds: [],
    })
    setEditingId(null)
    setFormError("")
  }

  const isContentEmpty = (content: string) =>
    content
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim().length === 0

  const fetchMessages = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(search && { search }),
      })
      const res = await fetch(`/api/admin/messages?${params}`)
      if (!res.ok) throw new Error("Failed to fetch messages")
      const data = await res.json()
      setMessages(data.messages || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error("Admin messages fetch error:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async (options?: { reset?: boolean; page?: number }) => {
    if (formData.recipientMode !== "users") return
    setLoadingUsers(true)
    try {
      const nextPage = options?.page ?? (options?.reset ? 1 : userPage)
      const params = new URLSearchParams({
        page: nextPage.toString(),
        limit: "20",
        ...(userSearch && { search: userSearch }),
      })
      const res = await fetch(`/api/admin/users?${params}`)
      if (!res.ok) throw new Error("Failed to fetch users")
      const data = await res.json()
      setUsers((prev) => (options?.reset ? data.users : [...prev, ...(data.users || [])]))
      setUserTotal(data.total || 0)
      setUserPage(nextPage)
    } catch (error) {
      console.error("Admin users fetch error:", error)
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    fetchMessages()
  }, [page, pageSize, search])

  useEffect(() => {
    if (formOpen && formData.recipientMode === "users") {
      setUsers([])
      setUserPage(1)
      fetchUsers({ reset: true })
    }
  }, [formOpen, formData.recipientMode])

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  const openCreate = () => {
    resetForm()
    setFormOpen(true)
  }

  const openEdit = async (id: string) => {
    setFormError("")
    setEditingId(id)
    setFormOpen(true)
    try {
      const res = await fetch(`/api/admin/messages/${id}`)
      if (!res.ok) throw new Error("Failed to fetch message")
      const data = await res.json()
      setFormData((prev) => ({
        ...prev,
        title: data.title,
        content: data.content,
      }))
    } catch (error) {
      console.error("Admin message detail error:", error)
      toast.error(t.actionFailed)
    }
  }

  const openPreview = async (id: string) => {
    setPreviewOpen(true)
    setPreviewMessage(null)
    try {
      const res = await fetch(`/api/admin/messages/${id}`)
      if (!res.ok) throw new Error("Failed to fetch message")
      const data = await res.json()
      setPreviewMessage(data)
    } catch (error) {
      console.error("Admin message preview error:", error)
      setPreviewMessage(null)
    }
  }

  const handleSubmit = async () => {
    setFormError("")

    try {
      if (!formData.title.trim()) {
        setFormError(t.messageTitleRequired)
        return
      }
      if (isContentEmpty(formData.content)) {
        setFormError(t.messageContentRequired)
        return
      }

      const payload = createMessageSchema.parse(formData)
      setSubmitting(true)

      if (editingId) {
        const res = await fetch(`/api/admin/messages/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: payload.title,
            content: payload.content,
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data?.error || "Failed to update message")
        }
      } else {
        const res = await fetch("/api/admin/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data?.error || "Failed to create message")
        }
      }

      setFormOpen(false)
      resetForm()
      fetchMessages()
      toast.success(editingId ? t.messageUpdated : t.messageSent)
    } catch (error) {
      if (error instanceof z.ZodError) {
        setFormError(error.errors[0].message)
      } else {
        setFormError(error instanceof Error ? error.message : t.actionFailed)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevoke = async () => {
    if (!revokeTargetId) return
    try {
      const res = await fetch(`/api/admin/messages/${revokeTargetId}/revoke`, {
        method: "POST",
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data?.error || "Failed to revoke message")
      }
      toast.success(t.messageRevoked)
      fetchMessages()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.actionFailed)
    } finally {
      setConfirmRevokeOpen(false)
      setRevokeTargetId(null)
    }
  }

  const toggleUser = (userId: string) => {
    setFormData((prev) => {
      const nextIds = new Set(prev.recipientUserIds)
      if (nextIds.has(userId)) {
        nextIds.delete(userId)
      } else {
        nextIds.add(userId)
      }
      return { ...prev, recipientUserIds: Array.from(nextIds) }
    })
  }

  const columns: Array<Column<AdminMessageItem>> = [
    {
      key: "title",
      label: t.messageTitle,
      render: (item) => (
        <div className="space-y-1">
          <span className="font-medium line-clamp-1">{item.title}</span>
          <span className="text-xs text-muted-foreground">
            {item.createdBy.name || item.createdBy.email}
          </span>
        </div>
      ),
    },
    {
      key: "recipients",
      label: t.recipients,
      width: "12%",
      render: (item) => (
        <span className="text-muted-foreground">{item.recipientCount.toLocaleString()}</span>
      ),
    },
    {
      key: "reads",
      label: t.readCount,
      width: "12%",
      render: (item) => (
        <span className="text-muted-foreground">{item.readCount.toLocaleString()}</span>
      ),
    },
    {
      key: "status",
      label: t.status,
      width: "12%",
      render: (item) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
            item.revokedAt ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
          }`}
        >
          {item.revokedAt ? t.revoked : t.active}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: t.createdAt,
      width: "18%",
      render: (item) => (
        <span className="text-muted-foreground">
          {new Date(item.createdAt).toLocaleDateString(locale)}
        </span>
      ),
    },
    {
      key: "actions",
      label: t.actions,
      width: "18%",
      render: (item) => (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => openPreview(item.id)}>
            {t.preview}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => openEdit(item.id)}>
            {t.edit}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={!!item.revokedAt}
            onClick={() => {
              setRevokeTargetId(item.id)
              setConfirmRevokeOpen(true)
            }}
          >
            {t.revoke}
          </Button>
        </div>
      ),
    },
  ]

  const formatSummary = (summary: { total: number; page: number; totalPages: number }) =>
    t.pageSummary
      .replace("{total}", summary.total.toString())
      .replace("{page}", summary.page.toString())
      .replace("{totalPages}", summary.totalPages.toString())

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t.messages}</h1>
          <p className="mt-1 text-muted-foreground">{t.messagesDesc}</p>
        </div>
        <Button type="button" onClick={openCreate}>
          {t.sendMessage}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t.searchMessages}
          className="w-64"
        />
        <Button type="button" variant="outline" onClick={handleSearch}>
          {t.searchAction}
        </Button>
      </div>

      <Card className="p-4">
        <DataTable
          columns={columns}
          data={messages}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
          loading={loading}
          emptyMessage={t.noMessages}
          loadingText={t.loading}
          perPageText={t.perPage}
          summaryFormatter={formatSummary}
          enableVirtualScroll={false}
          rowHeight={60}
          mobileCardRender={(item) => (
            <Card className="p-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.createdBy.name || item.createdBy.email}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      item.revokedAt
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {item.revokedAt ? t.revoked : t.active}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>
                    {t.recipients}: {item.recipientCount}
                  </span>
                  <span>
                    {t.readCount}: {item.readCount}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openPreview(item.id)}
                  >
                    {t.preview}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(item.id)}
                  >
                    {t.edit}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={!!item.revokedAt}
                    onClick={() => {
                      setRevokeTargetId(item.id)
                      setConfirmRevokeOpen(true)
                    }}
                  >
                    {t.revoke}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        />
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? t.editMessage : t.sendMessage}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {formError && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {formError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="message-title">{t.messageTitle}</Label>
              <Input
                id="message-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t.messageTitlePlaceholder}
              />
            </div>

            <div className="space-y-2">
              <Label>{t.messageContent}</Label>
              <RichTextEditor
                value={formData.content}
                onChange={(content) => setFormData({ ...formData, content })}
                placeholder={t.messageContentPlaceholder}
                className="min-h-[240px]"
              />
            </div>

            {!editingId && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t.recipientMode}</Label>
                  <Select
                    value={formData.recipientMode}
                    onValueChange={(value: "all" | "role" | "status" | "users") =>
                      setFormData((prev) => ({
                        ...prev,
                        recipientMode: value,
                        recipientUserIds: [],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.recipientAll}</SelectItem>
                      <SelectItem value="role">{t.recipientByRole}</SelectItem>
                      <SelectItem value="status">{t.recipientByStatus}</SelectItem>
                      <SelectItem value="users">{t.recipientByUsers}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.recipientMode === "role" && (
                  <div className="space-y-2">
                    <Label>{t.selectRole}</Label>
                    <Select
                      value={formData.recipientRole}
                      onValueChange={(value: "ADMIN" | "USER") =>
                        setFormData((prev) => ({ ...prev, recipientRole: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USER">{t.roleUser}</SelectItem>
                        <SelectItem value="ADMIN">{t.roleAdmin}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.recipientMode === "status" && (
                  <div className="space-y-2">
                    <Label>{t.selectStatus}</Label>
                    <Select
                      value={formData.recipientStatus}
                      onValueChange={(value: "ACTIVE" | "INACTIVE" | "BANNED") =>
                        setFormData((prev) => ({ ...prev, recipientStatus: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">{t.statusActive}</SelectItem>
                        <SelectItem value="INACTIVE">{t.statusInactive}</SelectItem>
                        <SelectItem value="BANNED">{t.statusBanned}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.recipientMode === "users" && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder={t.searchUsers}
                        className="w-64"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setUsers([])
                          setUserPage(1)
                          fetchUsers({ reset: true })
                        }}
                        disabled={loadingUsers}
                      >
                        {t.searchAction}
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {t.selectedUsers.replace(
                          "{count}",
                          formData.recipientUserIds.length.toString(),
                        )}
                      </span>
                    </div>

                    <div className="max-h-56 overflow-y-auto rounded-md border border-border p-3">
                      {users.length === 0 && !loadingUsers && (
                        <p className="text-sm text-muted-foreground">{t.noUsers}</p>
                      )}
                      <div className="space-y-2">
                        {users.map((user) => (
                          <label
                            key={user.id}
                            className="flex items-center justify-between gap-3 rounded-md p-2 hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={selectedUserIds.has(user.id)}
                                onCheckedChange={() => toggleUser(user.id)}
                              />
                              <div>
                                <p className="text-sm font-medium">{user.name || user.email}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground">{user.role}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {users.length < userTotal && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const nextPage = userPage + 1
                          fetchUsers({ page: nextPage })
                        }}
                        disabled={loadingUsers}
                      >
                        {t.loadMore}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {editingId && (
              <div className="rounded-md border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                {t.editHint}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={handleSubmit} disabled={submitting}>
                {submitting ? t.saving : editingId ? t.saveChanges : t.sendMessage}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormOpen(false)
                  resetForm()
                }}
              >
                {t.cancel}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.preview}</DialogTitle>
          </DialogHeader>
          {previewMessage ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{previewMessage.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {new Date(previewMessage.createdAt).toLocaleString(locale)}
                </p>
              </div>
              <PostContent content={previewMessage.content} emptyMessage={t.previewEmpty} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t.loading}</p>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmRevokeOpen} onOpenChange={setConfirmRevokeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.revokeTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.revokeDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke}>{t.confirm}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
