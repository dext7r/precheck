"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Shield, CheckCircle2, Loader2 } from "lucide-react"
import type { Locale } from "@/lib/i18n/config"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import { resolveApiErrorMessage } from "@/lib/api/error-message"

type SettingsUser = {
  name?: string | null
  email: string
  avatar?: string | null
  role: string
}

interface SettingsFormProps {
  locale: Locale
  dict: Dictionary
  user: SettingsUser
  hasPassword: boolean
}

export function SettingsForm({ locale, dict, user, hasPassword }: SettingsFormProps) {
  const router = useRouter()
  const [profile, setProfile] = useState({
    name: user.name || "",
    avatar: user.avatar || "",
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState("")

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState("")

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [applyAdminOpen, setApplyAdminOpen] = useState(false)
  const [applyAdminLoading, setApplyAdminLoading] = useState(false)
  const [applyAdminReason, setApplyAdminReason] = useState("")
  const [hasApplied, setHasApplied] = useState<boolean | null>(null)

  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN"

  // 检查是否已经申请过管理员
  useEffect(() => {
    if (isAdmin) return
    async function checkApplied() {
      try {
        const res = await fetch("/api/dashboard/apply-admin/status")
        if (res.ok) {
          const data = await res.json()
          setHasApplied(data.hasApplied)
        }
      } catch {
        setHasApplied(false)
      }
    }
    checkApplied()
  }, [isAdmin])

  const initials = useMemo(() => {
    if (profile.name) {
      return profile.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    }
    return user.email[0]?.toUpperCase() || "U"
  }, [profile.name, user.email])

  const t = dict.dashboard

  const handleProfileSave = async () => {
    setProfileError("")
    setProfileLoading(true)
    try {
      const res = await fetch("/api/dashboard/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          avatar: profile.avatar,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message = resolveApiErrorMessage(data, dict) ?? t.profileUpdateFailed
        setProfileError(message)
        return
      }

      const updated = await res.json()
      setProfile({
        name: updated.name || "",
        avatar: updated.avatar || "",
      })
      toast.success(t.profileUpdated)
    } catch {
      setProfileError(t.profileUpdateFailed)
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordSave = async () => {
    setPasswordError("")
    setPasswordLoading(true)
    try {
      const res = await fetch("/api/dashboard/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message = resolveApiErrorMessage(data, dict) ?? t.passwordUpdateFailed
        setPasswordError(message)
        return
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
      toast.success(t.passwordUpdated)
    } catch {
      setPasswordError(t.passwordUpdateFailed)
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteLoading(true)
    try {
      const res = await fetch("/api/dashboard/account", {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message = resolveApiErrorMessage(data, dict) ?? t.accountDeleteFailed
        toast.error(message)
        return
      }

      toast.success(t.accountDeleted)
      router.push(`/${locale}`)
      router.refresh()
    } catch {
      toast.error(t.accountDeleteFailed)
    } finally {
      setDeleteLoading(false)
      setDeleteOpen(false)
    }
  }

  const handleApplyAdmin = async () => {
    if (!applyAdminReason.trim()) {
      toast.error(t.applyAdminReasonRequired)
      return
    }
    setApplyAdminLoading(true)
    try {
      const res = await fetch("/api/dashboard/apply-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: applyAdminReason.trim() }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message = resolveApiErrorMessage(data, dict) ?? t.applyAdminFailed
        toast.error(message)
        return
      }

      toast.success(t.applyAdminSuccess)
      setHasApplied(true)
    } catch {
      toast.error(t.applyAdminFailed)
    } finally {
      setApplyAdminLoading(false)
      setApplyAdminOpen(false)
      setApplyAdminReason("")
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{t.settings}</h1>
        <p className="mt-1 text-muted-foreground">{t.manageSettings}</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t.profile}</CardTitle>
            <CardDescription>{t.updateProfile}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar || undefined} />
                <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid gap-2 w-full">
                <Label htmlFor="avatar">{t.avatarUrl}</Label>
                <Input
                  id="avatar"
                  type="url"
                  value={profile.avatar}
                  onChange={(event) => setProfile({ ...profile, avatar: event.target.value })}
                  placeholder={t.avatarPlaceholder}
                />
                <p className="text-xs text-muted-foreground">{t.avatarHint}</p>
              </div>
            </div>

            {profileError && (
              <Alert variant="destructive">
                <AlertDescription>{profileError}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{t.name}</Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                  placeholder={t.namePlaceholder}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t.email}</Label>
                <Input id="email" type="email" value={user.email} disabled />
              </div>
            </div>

            <Button onClick={handleProfileSave} disabled={profileLoading}>
              {profileLoading ? t.saving : t.saveChanges}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.security}</CardTitle>
            <CardDescription>{t.managePassword}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasPassword && (
              <Alert>
                <AlertDescription>{t.noPasswordHint}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">{t.currentPassword}</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    setPasswordForm({ ...passwordForm, currentPassword: event.target.value })
                  }
                  disabled={!hasPassword || passwordLoading}
                  placeholder={hasPassword ? undefined : t.currentPasswordDisabled}
                />
              </div>
              <div />
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t.newPassword}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    setPasswordForm({ ...passwordForm, newPassword: event.target.value })
                  }
                  disabled={passwordLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t.confirmPassword}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })
                  }
                  disabled={passwordLoading}
                />
              </div>
            </div>

            {passwordError && (
              <Alert variant="destructive">
                <AlertDescription>{passwordError}</AlertDescription>
              </Alert>
            )}

            <Button onClick={handlePasswordSave} disabled={passwordLoading}>
              {passwordLoading ? t.updating : t.updatePassword}
            </Button>
          </CardContent>
        </Card>

        {!isAdmin && (
          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                {t.applyAdmin}
              </CardTitle>
              <CardDescription>{t.applyAdminDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              {hasApplied ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>{t.applyAdminAlreadyApplied}</span>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setApplyAdminOpen(true)}
                  disabled={hasApplied === null}
                >
                  {hasApplied === null ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t.applyAdminBtn}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">{t.dangerZone}</CardTitle>
            <CardDescription>{t.irreversibleActions}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              {t.deleteAccount}
            </Button>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t.deleteAccountConfirmTitle}
        description={t.deleteAccountConfirmDesc}
        confirmLabel={t.confirmDelete}
        cancelLabel={t.cancel}
        onConfirm={handleDeleteAccount}
        confirming={deleteLoading}
        destructive
      />

      <Dialog
        open={applyAdminOpen}
        onOpenChange={(open) => {
          if (!open) {
            setApplyAdminReason("")
          }
          setApplyAdminOpen(open)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.applyAdminConfirmTitle}</DialogTitle>
            <DialogDescription>{t.applyAdminConfirmDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="applyReason">
                {t.applyAdminReasonLabel} <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="applyReason"
                value={applyAdminReason}
                onChange={(e) => setApplyAdminReason(e.target.value.slice(0, 500))}
                placeholder={t.applyAdminReasonPlaceholder}
                rows={5}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {applyAdminReason.length}/500
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApplyAdminOpen(false)
                setApplyAdminReason("")
              }}
              disabled={applyAdminLoading}
            >
              {t.cancel}
            </Button>
            <Button
              onClick={handleApplyAdmin}
              disabled={applyAdminLoading || !applyAdminReason.trim()}
            >
              {applyAdminLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.submitting}
                </>
              ) : (
                t.applyAdminConfirm
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
