"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Loader2,
  Trash2,
  Gift,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Copy,
  Check,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertCircle,
  Link2,
} from "lucide-react"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"
import { resolveApiErrorMessage } from "@/lib/api/error-message"
import { cn } from "@/lib/utils"

// 获取默认有效期（当前时间 + 23小时），格式为 datetime-local 输入格式
function getDefaultExpiresAt(): string {
  const date = new Date(Date.now() + 23 * 60 * 60 * 1000)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

type InviteCodeRecord = {
  id: string
  code: string
  expiresAt: string | null
  usedAt: string | null
  assignedAt: string | null
  createdAt: string
  assignedBy: { id: string; name: string | null; email: string } | null
  usedBy: { id: string; name: string | null; email: string } | null
  preApplication: {
    id: string
    registerEmail: string
    user: { id: string; name: string | null; email: string }
  } | null
}

interface ContributeCodesManagerProps {
  locale: Locale
  dict: Dictionary
}

export function ContributeCodesManager({ locale, dict }: ContributeCodesManagerProps) {
  const t = dict.dashboard
  const [records, setRecords] = useState<InviteCodeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [singleCode, setSingleCode] = useState("")
  const [singleExpiresAt, setSingleExpiresAt] = useState(() => getDefaultExpiresAt())
  const [batchCodes, setBatchCodes] = useState("")
  const [batchExpiresAt, setBatchExpiresAt] = useState(() => getDefaultExpiresAt())
  const [deleteTarget, setDeleteTarget] = useState<InviteCodeRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [sendTarget, setSendTarget] = useState<InviteCodeRecord | null>(null)
  const [sendUserId, setSendUserId] = useState("")
  const [sendNote, setSendNote] = useState("")
  const [sending, setSending] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasLinuxdo, setHasLinuxdo] = useState<boolean | null>(null)
  const pageSize = 20

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // 检查用户是否绑定了 Linux.do 账号
  useEffect(() => {
    async function checkLinuxdo() {
      try {
        const res = await fetch("/api/auth/me")
        if (res.ok) {
          const data = await res.json()
          const linked = data.user?.linkedProviders || []
          setHasLinuxdo(linked.includes("linuxdo"))
        }
      } catch {
        setHasLinuxdo(false)
      }
    }
    checkLinuxdo()
  }, [])

  const fetchRecords = useCallback(async (p: number = 1) => {
    try {
      const res = await fetch(`/api/dashboard/invite-codes?page=${p}&pageSize=${pageSize}`)
      if (res.ok) {
        const data = await res.json()
        setRecords(data.records || [])
        setTotal(data.total ?? 0)
      }
    } catch (error) {
      console.error("Failed to fetch contributed codes:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecords(page)
  }, [fetchRecords, page])

  const handleSubmit = async (codes: string[], expiresAt: string) => {
    if (codes.length === 0) return

    setSubmitting(true)
    try {
      const res = await fetch("/api/dashboard/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes, expiresAt: new Date(expiresAt).toISOString() }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.createdCount > 0) {
          if (data.invalidCount > 0) {
            toast.success(
              t.contributePartialInvalid
                .replace("{created}", String(data.createdCount))
                .replace("{invalid}", String(data.invalidCount)),
            )
          } else {
            toast.success(t.contributeSuccess.replace("{count}", String(data.createdCount)))
          }
          setSingleCode("")
          setBatchCodes("")
          setSingleExpiresAt(getDefaultExpiresAt())
          setBatchExpiresAt(getDefaultExpiresAt())
          setPage(1)
          fetchRecords(1)
        } else {
          toast.info(t.contributeAllInvalid.replace("{invalid}", String(data.invalidCount)))
        }
      } else {
        const error = await res.json()
        toast.error(resolveApiErrorMessage(error, dict))
      }
    } catch (error) {
      console.error("Contribute codes error:", error)
      toast.error(dict.errors?.["500"]?.title || "Failed")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSingleSubmit = () => {
    const code = singleCode.trim()
    if (code) {
      handleSubmit([code], singleExpiresAt)
    }
  }

  const handleBatchSubmit = () => {
    const codes = batchCodes
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
    if (codes.length > 0) {
      handleSubmit(codes, batchExpiresAt)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/dashboard/invite-codes/${deleteTarget.id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        toast.success(t.contributeDeleteSuccess)
        // 如果当前页只有一条记录且不是第一页，回到上一页
        if (records.length === 1 && page > 1) {
          setPage(page - 1)
        } else {
          fetchRecords(page)
        }
      } else {
        const error = await res.json()
        toast.error(resolveApiErrorMessage(error, dict))
      }
    } catch (error) {
      console.error("Delete code error:", error)
      toast.error(dict.errors?.["500"]?.title || "Failed")
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const copyToClipboard = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      toast.error("Failed to copy")
    }
  }

  const getStatus = (record: InviteCodeRecord) => {
    if (record.usedAt) return "used"
    if (record.preApplication) return "claimed"
    if (record.assignedAt) return "assigned"
    if (record.expiresAt && new Date(record.expiresAt) < new Date()) return "expired"
    return "available"
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }
    > = {
      available: { variant: "default", icon: CheckCircle2 },
      used: { variant: "secondary", icon: CheckCircle2 },
      claimed: { variant: "secondary", icon: User },
      assigned: { variant: "outline", icon: Clock },
      expired: { variant: "destructive", icon: XCircle },
    }
    const config = statusMap[status] || statusMap.available
    const Icon = config.icon
    const label = t.contributeStatus?.[status as keyof typeof t.contributeStatus] || status

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    )
  }

  const canDelete = (record: InviteCodeRecord) => {
    return !record.usedAt && !record.assignedAt && !record.preApplication
  }

  const getDeleteReason = (record: InviteCodeRecord) => {
    if (record.usedAt) {
      return `${t.contributeUsedBy}: ${record.usedBy?.email || record.usedBy?.name || "-"}`
    }
    if (record.preApplication) {
      return `${t.contributeClaimedBy}: ${record.preApplication.user?.email || record.preApplication.registerEmail}`
    }
    if (record.assignedAt) {
      return `${t.contributeAssignedAt}: ${new Date(record.assignedAt).toLocaleString(locale)}`
    }
    return null
  }

  const extractCodeFromUrl = (code: string) => {
    const match = code.match(/linux\.do\/invites\/([A-Za-z0-9_-]+)/)
    return match ? match[1] : code
  }

  // 只有可用状态的邀请码才能发送
  const canSend = (record: InviteCodeRecord) => {
    if (record.usedAt) return false
    if (record.preApplication) return false
    if (record.assignedAt) return false
    if (record.expiresAt && new Date(record.expiresAt) < new Date()) return false
    return true
  }

  const handleSend = async () => {
    if (!sendTarget || !sendUserId.trim()) return

    setSending(true)
    try {
      const res = await fetch(`/api/dashboard/invite-codes/${sendTarget.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: sendUserId.trim(),
          note: sendNote.trim() || undefined,
          locale,
        }),
      })

      if (res.ok) {
        toast.success(t.contributeSendSuccess)
        setSendTarget(null)
        setSendUserId("")
        setSendNote("")
        fetchRecords(page)
      } else {
        const error = await res.json()
        toast.error(resolveApiErrorMessage(error, dict))
      }
    } catch (error) {
      console.error("Send code error:", error)
      toast.error(dict.errors?.["500"]?.title || "Failed")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Linux.do 绑定提示 */}
      {hasLinuxdo === false && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t.contributeLinuxdoRequired}</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{t.contributeLinuxdoRequiredDesc}</span>
            <Button asChild variant="outline" size="sm" className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/api/auth/linuxdo">
                <Link2 className="mr-2 h-4 w-4" />
                {t.contributeLinuxdoLink}
              </a>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* 贡献表单 */}
      <Card className={hasLinuxdo === false ? "opacity-50 pointer-events-none" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            {t.contribute}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="single" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="single">{t.contributeSingle}</TabsTrigger>
              <TabsTrigger value="batch">{t.contributeBatch}</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={singleCode}
                  onChange={(e) => setSingleCode(e.target.value)}
                  placeholder={t.contributePlaceholder}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !submitting) {
                      handleSingleSubmit()
                    }
                  }}
                />
                <Button onClick={handleSingleSubmit} disabled={submitting || !singleCode.trim()}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t.contributeSubmitting}
                    </>
                  ) : (
                    t.contributeSubmit
                  )}
                </Button>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{t.contributeExpiresAt}</Label>
                <Input
                  type="datetime-local"
                  value={singleExpiresAt}
                  onChange={(e) => setSingleExpiresAt(e.target.value)}
                  required
                />
              </div>
            </TabsContent>

            <TabsContent value="batch" className="space-y-4">
              <Textarea
                value={batchCodes}
                onChange={(e) => setBatchCodes(e.target.value)}
                placeholder={t.contributeBatchPlaceholder}
                rows={6}
                className="font-mono text-sm"
              />
              <div className="space-y-2">
                <Label className="text-sm">{t.contributeExpiresAt}</Label>
                <Input
                  type="datetime-local"
                  value={batchExpiresAt}
                  onChange={(e) => setBatchExpiresAt(e.target.value)}
                  required
                />
              </div>
              <Button
                onClick={handleBatchSubmit}
                disabled={submitting || !batchCodes.trim()}
                className="w-full sm:w-auto"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.contributeSubmitting}
                  </>
                ) : (
                  t.contributeSubmit
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 贡献列表 */}
      <Card>
        <CardHeader>
          <CardTitle>{t.contributeList}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Gift className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">{t.contributeEmpty}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {records.map((record) => {
                  const status = getStatus(record)
                  const deletable = canDelete(record)
                  const deleteReason = getDeleteReason(record)
                  const displayCode = extractCodeFromUrl(record.code)

                  return (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={cn(
                        "flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between",
                        status === "available" && "border-green-500/20 bg-green-500/5",
                        status === "used" && "border-muted bg-muted/30",
                        status === "expired" && "border-destructive/20 bg-destructive/5",
                      )}
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                            {displayCode}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => copyToClipboard(record.code, record.id)}
                          >
                            {copiedId === record.id ? (
                              <Check className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          {record.code.startsWith("http") && (
                            <a
                              href={record.code}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{new Date(record.createdAt).toLocaleDateString(locale)}</span>
                          {record.expiresAt && (
                            <>
                              <span>·</span>
                              <span>
                                {locale === "zh" ? "过期" : "Expires"}:{" "}
                                {new Date(record.expiresAt).toLocaleDateString(locale)}
                              </span>
                            </>
                          )}
                          {deleteReason && (
                            <>
                              <span>·</span>
                              <span>{deleteReason}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {getStatusBadge(status)}
                        {canSend(record) && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
                                  onClick={() => setSendTarget(record)}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t.contributeSend}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  disabled={!deletable}
                                  onClick={() => setDeleteTarget(record)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {!deletable && (
                              <TooltipContent>
                                <p>{deleteReason}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
              {/* 分页 */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <span className="text-sm text-muted-foreground">
                    {locale === "zh"
                      ? `共 ${total} 条，第 ${page}/${totalPages} 页`
                      : `${total} total, page ${page} of ${totalPages}`}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages || loading}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 删除确认对话框 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.contributeDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.contributeDeleteDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.deleting}
                </>
              ) : (
                t.contributeDelete
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 发送邀请码对话框 */}
      <Dialog
        open={!!sendTarget}
        onOpenChange={(open) => {
          if (!open) {
            setSendTarget(null)
            setSendUserId("")
            setSendNote("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.contributeSendTitle}</DialogTitle>
            <DialogDescription>{t.contributeSendDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sendUserId">{t.contributeSendUserId}</Label>
              <Input
                id="sendUserId"
                value={sendUserId}
                onChange={(e) => setSendUserId(e.target.value)}
                placeholder={t.contributeSendUserIdPlaceholder}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sendNote">{t.contributeSendNote}</Label>
              <Textarea
                id="sendNote"
                value={sendNote}
                onChange={(e) => setSendNote(e.target.value)}
                placeholder={t.contributeSendNotePlaceholder}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSendTarget(null)
                setSendUserId("")
                setSendNote("")
              }}
              disabled={sending}
            >
              {t.cancel}
            </Button>
            <Button onClick={handleSend} disabled={sending || !sendUserId.trim()}>
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.contributeSending}
                </>
              ) : (
                t.contributeSendSubmit
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
