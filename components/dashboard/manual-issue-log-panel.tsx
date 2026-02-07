"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { resolveApiErrorMessage } from "@/lib/api/error-message"
import type { Dictionary } from "@/lib/i18n/get-dictionary"

interface ManualIssueLogPanelProps {
  dict: Dictionary
}

export function ManualIssueLogPanel({ dict }: ManualIssueLogPanelProps) {
  const t = dict.dashboard
  const [note, setNote] = useState("")
  const [target, setTarget] = useState("")
  const [recording, setRecording] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleRecord = async () => {
    if (!note.trim()) {
      toast.error(
        t.manualIssueNoteRequired || "Please describe the manual issuance before recording it",
      )
      return
    }
    setRecording(true)
    setMessage(null)
    try {
      const res = await fetch("/api/dashboard/manual-issue-record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: note.trim(),
          targetDescription: target.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        const err = resolveApiErrorMessage(payload, dict)
        throw new Error(err || t.manualIssueFailure || "Failed to record manual issuance")
      }
      setNote("")
      setTarget("")
      setMessage(t.manualIssueSuccess)
      toast.success(t.manualIssueSuccess)
    } catch (error) {
      console.error("Manual issuance log error:", error)
      const errMsg = error instanceof Error ? error.message : t.manualIssueFailure
      setMessage(errMsg)
      toast.error(errMsg)
    } finally {
      setRecording(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.manualIssueTitle || "Manual issuance log"}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t.manualIssueDesc ||
            "Record how you issued invite codes outside the system so the team can reconcile donations."}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t.manualIssueNotePlaceholder || "Describe how/where you sent the code"}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Input
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            placeholder={t.manualIssueTargetPlaceholder || "Recipient or context"}
          />
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleRecord} disabled={recording || !note.trim()}>
            {recording ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.manualIssueActionProgress || "Recording..."}
              </>
            ) : (
              t.manualIssueAction || "Record manual issuance"
            )}
          </Button>
          {message && <span className="text-xs text-muted-foreground">{message}</span>}
        </div>
      </CardContent>
    </Card>
  )
}
