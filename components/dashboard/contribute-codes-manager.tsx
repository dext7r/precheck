"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Loader2, ShieldCheck, ShieldX } from "lucide-react"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import { resolveApiErrorMessage } from "@/lib/api/error-message"
import { cn } from "@/lib/utils"

type InviteCodeRecord = {
  id: string
  code: string
  expiresAt: string | null
  usedAt: string | null
  assignedAt: string | null
}

type CheckResult = {
  invite_code: string
  valid: boolean | null
  message: string
}

interface ContributeCodesManagerProps {
  dict: Dictionary
}

export function ContributeCodesManager({ dict }: ContributeCodesManagerProps) {
  const t = dict.dashboard
  const [records, setRecords] = useState<InviteCodeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [codeInput, setCodeInput] = useState("")
  const [checking, setChecking] = useState(false)
  const [checkResults, setCheckResults] = useState<CheckResult[]>([])
  const [manualTarget, setManualTarget] = useState("")
  const [manualNote, setManualNote] = useState("")
  const [recording, setRecording] = useState(false)
  const [recordMessage, setRecordMessage] = useState<string | null>(null)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/dashboard/invite-codes?page=1&pageSize=10")
      if (res.ok) {
        const data = await res.json()
        setRecords(data.records || [])
      }
    } catch (error) {
      console.error("Failed to fetch contributed codes:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const handleCheckCodes = async () => {
    const codes = codeInput
      .split(/\\s+/)
      .map((value) => value.trim())
      .filter(Boolean)
    if (codes.length === 0) {
      toast.error(t.contributeCheckPlaceholder || "Enter up to 5 invite codes")
      return
    }
    const limited = codes.slice(0, 5)
    setChecking(true)
    try {
      const res = await fetch("/api/public/check-invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes: limited }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok || !payload) {
        const message = resolveApiErrorMessage(payload, dict) ?? t.contributeCheckFailure
        throw new Error(message)
      }
      setCheckResults(payload.results || [])
    } catch (error) {
      console.error("Invite code check failed:", error)
      const message = error instanceof Error ? error.message : t.contributeCheckFailure
      toast.error(message)
    } finally {
      setChecking(false)
    }
  }

  const handleRecordManualIssue = async () => {
    if (!manualNote.trim()) {
      toast.error(t.manualIssueNoteRequired || "Please enter a note")
      return
    }
    setRecording(true)
    setRecordMessage(null)
    try {
      const res = await fetch("/api/dashboard/manual-issue-record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: manualNote.trim(),
          targetDescription: manualTarget.trim() || undefined,
        }),
      })
      if (res.ok) {
        setManualNote("")
        setManualTarget("")
        setRecordMessage(t.manualIssueSuccess)
        toast.success(t.manualIssueSuccess)
      } else {
        const payload = await res.json().catch(() => null)
        const message = resolveApiErrorMessage(payload, dict) ?? t.manualIssueFailure
        throw new Error(message)
      }
    } catch (error) {
      console.error("Manual issue log failed:", error)
      const message = error instanceof Error ? error.message : t.manualIssueFailure
      setRecordMessage(message)
      toast.error(message)
    } finally {
      setRecording(false)
    }
  }

  const getStatusLabel = (record: InviteCodeRecord): string => {
    if (record.usedAt) {
      return (t.contributeStatus?.used as string) ?? "Used"
    }
    if (record.assignedAt) {
      return (t.contributeStatus?.assigned as string) ?? "Assigned"
    }
    if (record.expiresAt && new Date(record.expiresAt).getTime() <= Date.now()) {
      return (t.contributeStatus?.expired as string) ?? "Expired"
    }
    return (t.contributeStatus?.available as string) ?? "Available"
  }

  const formatDate = (value: string | null) => {
    if (!value) return t.contributeNoExpiry || "No expiry"
    return new Date(value).toLocaleString()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t.contributeCheckTitle || "Check shared asks"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t.contributeCheckDesc ||
              "Verify whether a donated invite code is currently valid before distributing it manually."}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">
              {t.contributeCheckPlaceholder ||
                "Enter up to 5 invite codes (line or space separated)"}
            </Label>
            <Textarea
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value)}
              placeholder={t.contributeCheckPlaceholder}
              rows={3}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-muted-foreground">
              {t.contributeCheckLimit || "Up to 5 invite codes per check"}
            </span>
            <Button onClick={handleCheckCodes} disabled={checking}>
              {checking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.contributeChecking || "Checking..."}
                </>
              ) : (
                t.contributeCheckAction || "Check validity"
              )}
            </Button>
          </div>
          {checkResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t.contributeCheckResults || "Check results"}</p>
              <div className="space-y-2">
                {checkResults.map((result) => (
                  <div
                    key={result.invite_code}
                    className={cn(
                      "rounded-xl border px-4 py-3 transition",
                      result.valid
                        ? "border-emerald-200 bg-emerald-50/60"
                        : "border-rose-200 bg-rose-50/60",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-sm">{result.invite_code}</p>
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase">
                        {result.valid ? (
                          <>
                            <ShieldCheck className="h-4 w-4 text-emerald-600" />
                            {t.contributeCheckValid || "Valid"}
                          </>
                        ) : (
                          <>
                            <ShieldX className="h-4 w-4 text-rose-600" />
                            {t.contributeCheckInvalid || "Invalid"}
                          </>
                        )}
                      </div>
                    </div>
                    {result.message && (
                      <p className="mt-1 text-xs text-muted-foreground">{result.message}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.manualIssueTitle || "Manual issuance record"}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t.manualIssueDesc ||
              "Record when you issue an invite manually so the team can reconcile donations."}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label className="text-sm">{t.manualIssueNoteLabel || "Note"}</Label>
            <Textarea
              value={manualNote}
              onChange={(event) => setManualNote(event.target.value)}
              placeholder={t.manualIssueNotePlaceholder || "Describe how/where you sent the code"}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">
              {t.manualIssueTargetLabel || "Recipient (email or description)"}
            </Label>
            <Input
              value={manualTarget}
              onChange={(event) => setManualTarget(event.target.value)}
              placeholder={t.manualIssueTargetPlaceholder || "Optional recipient info"}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleRecordManualIssue} disabled={recording || !manualNote.trim()}>
              {recording ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.manualIssueActionProgress || "Recording..."}
                </>
              ) : (
                t.manualIssueAction || "Record manual issuance"
              )}
            </Button>
            {recordMessage && (
              <span className="text-xs text-muted-foreground">{recordMessage}</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.contributeList || "Contributed codes"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-xl bg-muted/30" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              {t.contributeEmpty || "No contributed codes yet."}
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
                <div key={record.id} className="rounded-xl border px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-sm">{record.code}</p>
                    <span className="text-xs font-semibold uppercase text-muted-foreground">
                      {getStatusLabel(record)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t.contributeExpiresLabel || "Expires"}: {formatDate(record.expiresAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
