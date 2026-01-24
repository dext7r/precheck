"use client"

import { useEffect, useMemo, useState } from "react"
import { z } from "zod"
import { motion, AnimatePresence } from "framer-motion"
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
import {
  Mail,
  Send,
  Users,
  Eye,
  Search,
  Plus,
  Pencil,
  Ban,
  CheckCircle2,
  XCircle,
  Clock,
  MailOpen,
  Loader2,
} from "lucide-react"
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

// 阅读率进度环组件
function ReadRateRing({ rate, size = 36 }: { rate: number; size?: number }) {
  const strokeWidth = 3
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (rate / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size}>
        <circle
          className="text-muted/30"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <motion.circle
          className="text-primary"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-semibold text-muted-foreground">{rate}%</span>
      </div>
    </div>
  )
}

// 统计卡片组件
function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  color = "primary",
  active = false,
  onClick,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  trend?: string
  color?: "primary" | "success" | "warning" | "info"
  active?: boolean
  onClick?: () => void
}) {
  const colorStyles = {
    primary: "from-primary/20 to-primary/5 text-primary",
    success: "from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    warning: "from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400",
    info: "from-blue-500/20 to-blue-500/5 text-blue-600 dark:text-blue-400",
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border bg-card p-4 ${
        onClick ? "cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md" : ""
      } ${active ? "ring-2 ring-primary ring-offset-2" : ""}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br opacity-50 ${colorStyles[color]}`} />
      <div className="relative flex items-center gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${colorStyles[color]}`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value.toLocaleString()}</p>
          {trend && <p className="text-xs text-muted-foreground">{trend}</p>}
        </div>
      </div>
    </motion.div>
  )
}

export function AdminMessagesManager({ locale, dict }: AdminMessagesManagerProps) {
  const t = dict.admin
  const [messages, setMessages] = useState<AdminMessageItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "revoked">("all")

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

  // 使用 API 返回的全局统计数据
  const [stats, setStats] = useState({
    totalRecipients: 0,
    totalReads: 0,
    activeMessages: 0,
    revokedMessages: 0,
  })

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
        ...(statusFilter !== "all" && { status: statusFilter }),
      })
      const res = await fetch(`/api/admin/messages?${params}`)
      if (!res.ok) throw new Error("Failed to fetch messages")
      const data = await res.json()
      setMessages(data.messages || [])
      setTotal(data.total || 0)
      if (data.stats) {
        setStats(data.stats)
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, statusFilter])

  useEffect(() => {
    if (formOpen && formData.recipientMode === "users") {
      setUsers([])
      setUserPage(1)
      fetchUsers({ reset: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              item.revokedAt ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
            }`}
          >
            {item.revokedAt ? <XCircle className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{item.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {item.createdBy.name || item.createdBy.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "recipients",
      label: t.recipients,
      width: "10%",
      render: (item) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{item.recipientCount.toLocaleString()}</span>
        </div>
      ),
    },
    {
      key: "reads",
      label: t.readCount,
      width: "12%",
      render: (item) => {
        const rate =
          item.recipientCount > 0 ? Math.round((item.readCount / item.recipientCount) * 100) : 0
        return (
          <div className="flex items-center gap-3">
            <ReadRateRing rate={rate} />
            <div className="text-sm">
              <span className="font-medium">{item.readCount.toLocaleString()}</span>
              <span className="text-muted-foreground">/{item.recipientCount}</span>
            </div>
          </div>
        )
      },
    },
    {
      key: "status",
      label: t.status,
      width: "10%",
      render: (item) => (
        <div
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            item.revokedAt
              ? "bg-destructive/10 text-destructive"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {item.revokedAt ? (
            <>
              <XCircle className="h-3 w-3" />
              {t.revoked}
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3 w-3" />
              {t.active}
            </>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      label: t.createdAt,
      width: "14%",
      render: (item) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="text-sm">{new Date(item.createdAt).toLocaleDateString(locale)}</span>
        </div>
      ),
    },
    {
      key: "actions",
      label: t.actions,
      width: "16%",
      render: (item) => (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => openPreview(item.id)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => openEdit(item.id)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={!!item.revokedAt}
            onClick={() => {
              setRevokeTargetId(item.id)
              setConfirmRevokeOpen(true)
            }}
          >
            <Ban className="h-4 w-4" />
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
      {/* 页面头部 */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25">
              <Mail className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">{t.messages}</h1>
              <p className="text-muted-foreground">{t.messagesDesc}</p>
            </div>
          </div>
          <Button
            type="button"
            onClick={openCreate}
            className="gap-2 shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
          >
            <Plus className="h-4 w-4" />
            {t.sendMessage}
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Send}
          label={t.messages}
          value={total}
          color="primary"
          active={statusFilter === "all"}
          onClick={() => {
            setStatusFilter("all")
            setPage(1)
          }}
        />
        <StatCard icon={Users} label={t.recipients} value={stats.totalRecipients} color="info" />
        <StatCard icon={MailOpen} label={t.readCount} value={stats.totalReads} color="success" />
        <StatCard
          icon={CheckCircle2}
          label={t.active}
          value={stats.activeMessages}
          trend={stats.revokedMessages > 0 ? `${stats.revokedMessages} ${t.revoked}` : undefined}
          color="warning"
          active={statusFilter === "active"}
          onClick={() => {
            setStatusFilter("active")
            setPage(1)
          }}
        />
      </div>

      {/* 搜索栏 */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={t.searchMessages}
              className="pl-9"
            />
          </div>
          <Button type="button" variant="outline" onClick={handleSearch} className="gap-2">
            <Search className="h-4 w-4" />
            {t.searchAction}
          </Button>
        </div>
      </Card>

      {/* 消息列表 */}
      <Card className="overflow-hidden">
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
          rowHeight={72}
          mobileCardRender={(item) => {
            const rate =
              item.recipientCount > 0 ? Math.round((item.readCount / item.recipientCount) * 100) : 0
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      item.revokedAt
                        ? "bg-destructive/10 text-destructive"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {item.revokedAt ? (
                      <XCircle className="h-5 w-5" />
                    ) : (
                      <Mail className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.createdBy.name || item.createdBy.email}
                        </p>
                      </div>
                      <div
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.revokedAt
                            ? "bg-destructive/10 text-destructive"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {item.revokedAt ? t.revoked : t.active}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        <span>{item.recipientCount}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ReadRateRing rate={rate} size={28} />
                        <span>
                          {item.readCount}/{item.recipientCount}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{new Date(item.createdAt).toLocaleDateString(locale)}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5"
                        onClick={() => openPreview(item.id)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {t.preview}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5"
                        onClick={() => openEdit(item.id)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        {t.edit}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-destructive hover:bg-destructive/10"
                        disabled={!!item.revokedAt}
                        onClick={() => {
                          setRevokeTargetId(item.id)
                          setConfirmRevokeOpen(true)
                        }}
                      >
                        <Ban className="h-3.5 w-3.5" />
                        {t.revoke}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          }}
        />
      </Card>

      {/* 创建/编辑对话框 */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {editingId ? <Pencil className="h-5 w-5" /> : <Send className="h-5 w-5" />}
              </div>
              <DialogTitle className="text-xl">
                {editingId ? t.editMessage : t.sendMessage}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-6 pt-2">
            <AnimatePresence>
              {formError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  {formError}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <Label htmlFor="message-title" className="text-sm font-medium">
                {t.messageTitle}
              </Label>
              <Input
                id="message-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t.messageTitlePlaceholder}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t.messageContent}</Label>
              <RichTextEditor
                value={formData.content}
                onChange={(content) => setFormData({ ...formData, content })}
                placeholder={t.messageContentPlaceholder}
                className="min-h-[240px]"
              />
            </div>

            {!editingId && (
              <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t.recipientMode}</Label>
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
                    <SelectTrigger className="h-11">
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
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-2"
                  >
                    <Label className="text-sm font-medium">{t.selectRole}</Label>
                    <Select
                      value={formData.recipientRole}
                      onValueChange={(value: "ADMIN" | "USER") =>
                        setFormData((prev) => ({ ...prev, recipientRole: value }))
                      }
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USER">{t.roleUser}</SelectItem>
                        <SelectItem value="ADMIN">{t.roleAdmin}</SelectItem>
                      </SelectContent>
                    </Select>
                  </motion.div>
                )}

                {formData.recipientMode === "status" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-2"
                  >
                    <Label className="text-sm font-medium">{t.selectStatus}</Label>
                    <Select
                      value={formData.recipientStatus}
                      onValueChange={(value: "ACTIVE" | "INACTIVE" | "BANNED") =>
                        setFormData((prev) => ({ ...prev, recipientStatus: value }))
                      }
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">{t.statusActive}</SelectItem>
                        <SelectItem value="INACTIVE">{t.statusInactive}</SelectItem>
                        <SelectItem value="BANNED">{t.statusBanned}</SelectItem>
                      </SelectContent>
                    </Select>
                  </motion.div>
                )}

                {formData.recipientMode === "users" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          placeholder={t.searchUsers}
                          className="pl-9"
                        />
                      </div>
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
                      <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                        <Users className="h-4 w-4" />
                        {t.selectedUsers.replace(
                          "{count}",
                          formData.recipientUserIds.length.toString(),
                        )}
                      </div>
                    </div>

                    <div className="max-h-56 overflow-y-auto rounded-lg border bg-background p-2">
                      {users.length === 0 && !loadingUsers && (
                        <p className="p-4 text-center text-sm text-muted-foreground">{t.noUsers}</p>
                      )}
                      <div className="space-y-1">
                        {users.map((user) => (
                          <label
                            key={user.id}
                            className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg p-3 transition-colors ${
                              selectedUserIds.has(user.id) ? "bg-primary/10" : "hover:bg-muted/50"
                            }`}
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
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              {user.role}
                            </span>
                          </label>
                        ))}
                      </div>
                      {loadingUsers && (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {users.length < userTotal && !loadingUsers && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const nextPage = userPage + 1
                          fetchUsers({ page: nextPage })
                        }}
                        className="w-full"
                      >
                        {t.loadMore}
                      </Button>
                    )}
                  </motion.div>
                )}
              </div>
            )}

            {editingId && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
                <Pencil className="h-4 w-4 shrink-0" />
                {t.editHint}
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="gap-2 shadow-lg shadow-primary/25"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.saving}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {editingId ? t.saveChanges : t.sendMessage}
                  </>
                )}
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

      {/* 预览对话框 */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Eye className="h-5 w-5" />
              </div>
              <DialogTitle className="text-xl">{t.preview}</DialogTitle>
            </div>
          </DialogHeader>
          {previewMessage ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 pt-2"
            >
              <div className="rounded-xl border bg-muted/30 p-4">
                <h2 className="text-xl font-semibold">{previewMessage.title}</h2>
                <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {new Date(previewMessage.createdAt).toLocaleString(locale)}
                </p>
              </div>
              <div className="rounded-xl border p-4">
                <PostContent content={previewMessage.content} emptyMessage={t.previewEmpty} />
              </div>
            </motion.div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 撤回确认对话框 */}
      <AlertDialog open={confirmRevokeOpen} onOpenChange={setConfirmRevokeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <Ban className="h-5 w-5" />
              </div>
              <AlertDialogTitle>{t.revokeTitle}</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2">{t.revokeDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
