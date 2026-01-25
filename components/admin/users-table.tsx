"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Search,
  MoreHorizontal,
  Shield,
  ShieldOff,
  Ban,
  CheckCircle2,
  Trash2,
  X,
  Users,
  UserPlus,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { DataTable, type Column } from "@/components/ui/data-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { resolveApiErrorMessage } from "@/lib/api/error-message"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

// 统计卡片组件
function StatCard({
  icon: Icon,
  label,
  value,
  color = "primary",
  active = false,
  onClick,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  color?: "primary" | "success" | "warning" | "danger"
  active?: boolean
  onClick?: () => void
}) {
  const colorStyles = {
    primary: "from-primary/20 to-primary/5 text-primary",
    success: "from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    warning: "from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400",
    danger: "from-rose-500/20 to-rose-500/5 text-rose-600 dark:text-rose-400",
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
          <p className="text-2xl font-bold">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

interface AdminUser {
  id: string
  name: string | null
  email: string
  role: string
  status: string
  createdAt: string
}

interface AdminUsersTableProps {
  locale: Locale
  dict: Dictionary
}

export function AdminUsersTable({ locale, dict }: AdminUsersTableProps) {
  const t = dict.admin
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({ total: 0, admins: 0, active: 0, banned: 0 })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [error, setError] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmState, setConfirmState] = useState<{
    title: string
    description: string
    confirmLabel: string
    destructive?: boolean
    onConfirm: () => Promise<void>
  } | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [emailsInput, setEmailsInput] = useState("")
  const [creating, setCreating] = useState(false)

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/me")
      if (res.ok) {
        const data = await res.json()
        setCurrentUserRole(data.user?.role || null)
      }
    } catch {
      // ignore
    }
  }

  const fetchUsers = async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...(roleFilter !== "all" && { role: roleFilter }),
        ...(statusFilter !== "all" && { status: statusFilter }),
      })
      const res = await fetch(`/api/admin/users?${params}`)
      if (!res.ok) {
        throw new Error("Fetch failed")
      }
      const data = await res.json()
      setUsers(data.users || [])
      setTotal(data.total || 0)
      if (data.stats) {
        setStats(data.stats)
      }
    } catch (fetchError) {
      console.error("Admin users fetch error:", fetchError)
      setError(t.fetchFailed)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [page, pageSize, search, sortBy, sortOrder, roleFilter, statusFilter])

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

  const updateUser = async (id: string, payload: { role?: string; status?: string }) => {
    setBusyId(id)
    setError("")
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        throw new Error("Update failed")
      }
      await fetchUsers()
    } catch (updateError) {
      console.error("Admin user update error:", updateError)
      setError(t.actionFailed)
    } finally {
      setBusyId(null)
    }
  }

  const deleteUser = async (id: string) => {
    setBusyId(id)
    setError("")
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        throw new Error("Delete failed")
      }
      await fetchUsers()
    } catch (deleteError) {
      console.error("Admin user delete error:", deleteError)
      setError(t.actionFailed)
    } finally {
      setBusyId(null)
    }
  }

  const handleCreateUsers = async () => {
    const emails = emailsInput
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))

    if (emails.length === 0) {
      toast.error(t.createUserInvalidEmails || "请输入有效的邮箱地址")
      return
    }

    setCreating(true)
    try {
      const res = await fetch("/api/admin/users/batch-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message = resolveApiErrorMessage(data, dict) ?? t.actionFailed
        throw new Error(message)
      }

      const result = await res.json()
      toast.success(
        (t.createUserSuccess || "已创建 {created} 个用户，跳过 {skipped} 个已存在")
          .replace("{created}", String(result.created))
          .replace("{skipped}", String(result.skipped)),
      )
      setCreateDialogOpen(false)
      setEmailsInput("")
      await fetchUsers()
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : t.actionFailed)
    } finally {
      setCreating(false)
    }
  }

  const renderRoleBadge = (role: string) => {
    const roleStyles: Record<string, string> = {
      SUPER_ADMIN: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
      ADMIN: "bg-destructive/10 text-destructive",
      USER: "bg-muted text-muted-foreground",
    }
    return (
      <span
        className={`rounded-full px-2 py-1 text-xs font-medium ${roleStyles[role] || roleStyles.USER}`}
      >
        {role}
      </span>
    )
  }

  const renderStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      ACTIVE: t.active,
      INACTIVE: t.inactive,
      BANNED: t.banned,
    }
    return (
      <span
        className={`rounded-full px-2 py-1 text-xs font-medium ${
          status === "ACTIVE" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
        }`}
      >
        {statusMap[status] || status}
      </span>
    )
  }

  const renderActions = (user: AdminUser) => {
    const isBusy = busyId === user.id
    const isSuperAdmin = currentUserRole === "SUPER_ADMIN"
    const canPromote = user.role === "USER" && isSuperAdmin
    const canDemote = user.role === "ADMIN" && isSuperAdmin
    const shouldActivate = user.status !== "ACTIVE"
    const statusLabel = shouldActivate ? t.activate : t.ban

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isBusy}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isSuperAdmin && user.role !== "SUPER_ADMIN" && (
            <>
              {canPromote && (
                <DropdownMenuItem
                  disabled={isBusy}
                  onClick={() => {
                    setConfirmState({
                      title: t.confirmTitle,
                      description: t.confirmMakeAdmin,
                      confirmLabel: t.makeAdmin,
                      onConfirm: async () => {
                        await updateUser(user.id, { role: "ADMIN" })
                      },
                    })
                  }}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  {t.makeAdmin}
                </DropdownMenuItem>
              )}
              {canDemote && (
                <DropdownMenuItem
                  disabled={isBusy}
                  onClick={() => {
                    setConfirmState({
                      title: t.confirmTitle,
                      description: t.confirmRemoveAdmin,
                      confirmLabel: t.removeAdmin,
                      onConfirm: async () => {
                        await updateUser(user.id, { role: "USER" })
                      },
                    })
                  }}
                >
                  <ShieldOff className="mr-2 h-4 w-4" />
                  {t.removeAdmin}
                </DropdownMenuItem>
              )}
            </>
          )}
          <DropdownMenuItem
            disabled={isBusy}
            onClick={() => {
              setConfirmState({
                title: t.confirmTitle,
                description: shouldActivate ? t.confirmActivateUser : t.confirmBanUser,
                confirmLabel: statusLabel,
                onConfirm: async () => {
                  await updateUser(user.id, { status: shouldActivate ? "ACTIVE" : "BANNED" })
                },
              })
            }}
          >
            {shouldActivate ? (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            ) : (
              <Ban className="mr-2 h-4 w-4" />
            )}
            {statusLabel}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            disabled={isBusy}
            onClick={() => {
              setConfirmState({
                title: t.confirmTitle,
                description: t.confirmDeleteUser,
                confirmLabel: t.delete,
                destructive: true,
                onConfirm: async () => {
                  await deleteUser(user.id)
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

  const columns: Column<AdminUser>[] = [
    {
      key: "email",
      label: t.user,
      width: "35%",
      sortable: true,
      render: (user) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
            {(user.name ?? user.email)[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-medium">{user.name || user.email.split("@")[0]}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: t.role,
      width: "15%",
      sortable: true,
      render: (user) => renderRoleBadge(user.role),
    },
    {
      key: "status",
      label: t.status,
      width: "15%",
      sortable: true,
      render: (user) => renderStatusBadge(user.status),
    },
    {
      key: "createdAt",
      label: t.createdAt,
      width: "20%",
      sortable: true,
      render: (user) => (
        <span className="text-muted-foreground">
          {new Date(user.createdAt).toLocaleString(locale)}
        </span>
      ),
    },
    {
      key: "actions",
      label: t.actions,
      width: "15%",
      render: renderActions,
    },
  ]

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label={t.totalUsers || "总用户"}
          value={stats.total}
          color="primary"
          active={roleFilter === "all" && statusFilter === "all"}
          onClick={() => {
            setRoleFilter("all")
            setStatusFilter("all")
            setPage(1)
          }}
        />
        <StatCard
          icon={Shield}
          label={t.adminUsers || "管理员"}
          value={stats.admins}
          color="warning"
          active={roleFilter === "ADMIN"}
          onClick={() => {
            setRoleFilter("ADMIN")
            setStatusFilter("all")
            setPage(1)
          }}
        />
        <StatCard
          icon={CheckCircle2}
          label={t.activeUsers || "活跃用户"}
          value={stats.active}
          color="success"
          active={statusFilter === "ACTIVE"}
          onClick={() => {
            setRoleFilter("all")
            setStatusFilter("ACTIVE")
            setPage(1)
          }}
        />
        <StatCard
          icon={Ban}
          label={t.bannedUsers || "已禁用"}
          value={stats.banned}
          color="danger"
          active={statusFilter === "BANNED"}
          onClick={() => {
            setRoleFilter("all")
            setStatusFilter("BANNED")
            setPage(1)
          }}
        />
      </div>

      {/* 搜索栏 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t.search}
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
        {currentUserRole === "SUPER_ADMIN" && (
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            {t.createUser || "创建用户"}
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <DataTable
          columns={columns}
          data={users}
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
          emptyMessage={t.noUsers}
          loadingText={t.loading}
          perPageText={t.perPage}
          summaryFormatter={formatPageSummary}
          mobileCardRender={(user) => (
            <Card className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                      {(user.name ?? user.email)[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{user.name || user.email.split("@")[0]}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  {renderActions(user)}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {renderRoleBadge(user.role)}
                  {renderStatusBadge(user.status)}
                  <span className="text-muted-foreground">
                    {new Date(user.createdAt).toLocaleString(locale)}
                  </span>
                </div>
              </div>
            </Card>
          )}
        />
      </Card>

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

      {/* 创建用户对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              {t.createUser || "创建用户"}
            </DialogTitle>
            <DialogDescription>
              {t.createUserDesc ||
                "输入邮箱地址，每行一个或用逗号/分号分隔。新用户将使用默认密码。"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t.createUserEmails || "邮箱地址"}</Label>
              <Textarea
                value={emailsInput}
                onChange={(e) => setEmailsInput(e.target.value)}
                placeholder={t.createUserPlaceholder || "user1@example.com\nuser2@example.com"}
                rows={6}
                className="resize-none font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={creating}
            >
              {t.cancel}
            </Button>
            <Button onClick={handleCreateUsers} disabled={creating} className="gap-2">
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.creating || "创建中..."}
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  {t.createUserSubmit || "创建"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
