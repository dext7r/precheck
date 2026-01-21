"use client"

import { useEffect, useState } from "react"
import { Search, MoreHorizontal, Shield, Ban, CheckCircle2, Trash2, X } from "lucide-react"
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
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

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
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
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
      })
      const res = await fetch(`/api/admin/users?${params}`)
      if (!res.ok) {
        throw new Error("Fetch failed")
      }
      const data = await res.json()
      setUsers(data.users || [])
      setTotal(data.total || 0)
    } catch (fetchError) {
      console.error("Admin users fetch error:", fetchError)
      setError(t.fetchFailed)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
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

  const renderRoleBadge = (role: string) => (
    <span
      className={`rounded-full px-2 py-1 text-xs font-medium ${
        role === "ADMIN" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
      }`}
    >
      {role}
    </span>
  )

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
    const canPromote = user.role !== "ADMIN"
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
          <DropdownMenuItem
            disabled={!canPromote || isBusy}
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
          {new Date(user.createdAt).toLocaleDateString(locale)}
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
    <div className="space-y-4">
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
                    {new Date(user.createdAt).toLocaleDateString(locale)}
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
    </div>
  )
}
