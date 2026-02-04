"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, ShieldCheck, ShieldX } from "lucide-react"
import type { Dictionary } from "@/lib/i18n/get-dictionary"
import { resolveApiErrorMessage } from "@/lib/api/error-message"
import { cn } from "@/lib/utils"
import { inviteCodeStorageEnabled } from "@/lib/invite-code/client"

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
  const [codeInput, setCodeInput] = useState("")
  const [checking, setChecking] = useState(false)
  const [checkResults, setCheckResults] = useState<CheckResult[]>([])

  const handleCheckCodes = async () => {
    const codes = codeInput
      .split(/\s+/)
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col gap-1 text-lg">
            <span>{t.contributeCheckTitle || "Verify invite codes"}</span>
            <p className="text-xs text-muted-foreground">
              {t.contributeCheckDesc ||
                "Check whether donated invite codes are still valid before you distribute them manually."}
            </p>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value)}
              placeholder={t.contributeCheckPlaceholder}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {t.contributeCheckLimit || "Up to 5 invite codes per check"}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Button
              onClick={handleCheckCodes}
              disabled={checking}
              className="flex-1 justify-center"
            >
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
      {!inviteCodeStorageEnabled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t.manualIssueReminder ||
            "Invite storage is disabled. Record any manual issuance on the dashboard manual log."}
        </div>
      )}
    </div>
  )
}
