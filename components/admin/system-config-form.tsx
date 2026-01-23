"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { X, Plus } from "lucide-react"
import type { Locale } from "@/lib/i18n/config"

interface SystemConfigFormProps {
  locale: Locale
  dict: Record<string, any>
}

export function SystemConfigForm({ locale, dict }: SystemConfigFormProps) {
  const [essayHint, setEssayHint] = useState("")
  const [emailDomains, setEmailDomains] = useState<string[]>([])
  const [auditLogEnabled, setAuditLogEnabled] = useState(false)
  const [newDomain, setNewDomain] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    fetchConfig()
  }, [])

  async function fetchConfig() {
    try {
      const res = await fetch("/api/admin/system-config")
      if (!res.ok) throw new Error("Failed to fetch")

      const data = await res.json()
      setEssayHint(data.preApplicationEssayHint)
      setEmailDomains(data.allowedEmailDomains)
      setAuditLogEnabled(data.auditLogEnabled ?? false)
    } catch (error) {
      setMessage({ type: "error", text: "加载配置失败" })
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch("/api/admin/system-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preApplicationEssayHint: essayHint,
          allowedEmailDomains: emailDomains,
          auditLogEnabled,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "保存失败")
      }

      setMessage({ type: "success", text: "配置保存成功" })
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "保存失败" })
    } finally {
      setSaving(false)
    }
  }

  function handleAddDomain() {
    const domain = newDomain.trim().toLowerCase()
    if (!domain) return

    if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
      setMessage({ type: "error", text: "邮箱域名格式无效" })
      return
    }

    if (emailDomains.includes(domain)) {
      setMessage({ type: "error", text: "域名已存在" })
      return
    }

    setEmailDomains([...emailDomains, domain])
    setNewDomain("")
    setMessage(null)
  }

  function handleRemoveDomain(domain: string) {
    setEmailDomains(emailDomains.filter((d) => d !== domain))
  }

  if (loading) {
    return <div>加载中...</div>
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="essayHint">预申请小作文提示文本</Label>
            <p className="text-sm text-muted-foreground mb-2">
              显示在预申请表单中,指导用户如何填写申请理由
            </p>
            <Textarea
              id="essayHint"
              value={essayHint}
              onChange={(e) => setEssayHint(e.target.value)}
              rows={3}
              placeholder="建议 100 字左右..."
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auditLog">启用审计日志</Label>
              <p className="text-sm text-muted-foreground">
                记录所有管理操作到审计日志（默认关闭以提升性能）
              </p>
            </div>
            <Switch id="auditLog" checked={auditLogEnabled} onCheckedChange={setAuditLogEnabled} />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label>允许的邮箱域名</Label>
            <p className="text-sm text-muted-foreground mb-2">
              只有使用这些域名的邮箱才能提交预申请
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="例如: gmail.com"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAddDomain()
                }
              }}
            />
            <Button onClick={handleAddDomain} type="button">
              <Plus className="h-4 w-4 mr-1" />
              添加
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
            {emailDomains.map((domain) => (
              <div
                key={domain}
                className="flex items-center justify-between px-3 py-2 bg-muted rounded-md"
              >
                <span className="text-sm">{domain}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveDomain(domain)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {emailDomains.length === 0 && (
            <p className="text-sm text-muted-foreground">暂无域名,请添加至少一个</p>
          )}
        </div>
      </Card>

      {message && (
        <div
          className={`p-4 rounded-md ${
            message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || emailDomains.length === 0}>
          {saving ? "保存中..." : "保存配置"}
        </Button>
      </div>
    </div>
  )
}
