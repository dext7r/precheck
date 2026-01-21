"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config"
import { RichTextEditor } from "@/components/posts/rich-text-editor"
import { PostContent } from "@/components/posts/post-content"

export default function NewPostPage() {
  const router = useRouter()
  const params = useParams<{ locale?: string | string[] }>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dict, setDict] = useState<any>(null)
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    status: "DRAFT" as "DRAFT" | "PUBLISHED",
  })
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "split">("split")

  const rawLocale = Array.isArray(params.locale) ? params.locale[0] : params.locale
  const normalizedLocale = rawLocale?.split("/")[0] || defaultLocale
  const currentLocale = locales.includes(normalizedLocale as Locale)
    ? (normalizedLocale as Locale)
    : defaultLocale
  const errorMap: Record<string, string> = {
    "Title is required": "titleRequired",
    "Content is required": "contentRequired",
    "Not authenticated": "notAuthenticated",
    "Database not configured": "serviceUnavailable",
    "Failed to create post": "createFailed",
  }

  useEffect(() => {
    getDictionary(currentLocale).then(setDict)
  }, [currentLocale])

  const resolveError = (message?: string) => {
    if (!dict) return message || ""
    if (!message) return dict.dashboard.createFailed
    const key = errorMap[message]
    if (key && dict.dashboard[key]) return dict.dashboard[key]
    return dict.dashboard.createFailed
  }

  const isContentEmpty = (content: string) =>
    content
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim().length === 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (isContentEmpty(formData.content)) {
        setError(dict.dashboard.contentRequired)
        return
      }

      const res = await fetch("/api/dashboard/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(resolveError(data?.error))
        return
      }

      router.push(`/${currentLocale}/dashboard/posts`)
      router.refresh()
    } catch (err) {
      setError(resolveError(err instanceof Error ? err.message : undefined))
    } finally {
      setLoading(false)
    }
  }

  if (!dict) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${currentLocale}/dashboard/posts`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{dict.dashboard.createPost}</h1>
          <p className="mt-1 text-muted-foreground">{dict.dashboard.fillPostInfo}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{dict.dashboard.postDetails}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">{dict.dashboard.titleLabel}</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={dict.dashboard.titlePlaceholder}
                required
              />
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>{dict.dashboard.contentLabel}</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={viewMode === "edit" ? "default" : "outline"}
                    onClick={() => setViewMode("edit")}
                  >
                    {dict.dashboard.writeMode}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={viewMode === "preview" ? "default" : "outline"}
                    onClick={() => setViewMode("preview")}
                  >
                    {dict.dashboard.previewMode}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={viewMode === "split" ? "default" : "outline"}
                    onClick={() => setViewMode("split")}
                  >
                    {dict.dashboard.splitMode}
                  </Button>
                </div>
              </div>

              {viewMode === "split" && (
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-2">
                    <RichTextEditor
                      value={formData.content}
                      onChange={(content) => setFormData({ ...formData, content })}
                      placeholder={dict.dashboard.contentPlaceholder}
                      className="min-h-[320px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{dict.dashboard.previewTitle}</Label>
                    <div className="min-h-[320px] rounded-md border border-border bg-muted/20 p-4">
                      <PostContent
                        content={formData.content}
                        emptyMessage={dict.dashboard.previewEmpty}
                      />
                    </div>
                  </div>
                </div>
              )}

              {viewMode === "edit" && (
                <RichTextEditor
                  value={formData.content}
                  onChange={(content) => setFormData({ ...formData, content })}
                  placeholder={dict.dashboard.contentPlaceholder}
                  className="min-h-[320px]"
                />
              )}

              {viewMode === "preview" && (
                <div className="space-y-2">
                  <Label>{dict.dashboard.previewTitle}</Label>
                  <div className="min-h-[320px] rounded-md border border-border bg-muted/20 p-4">
                    <PostContent
                      content={formData.content}
                      emptyMessage={dict.dashboard.previewEmpty}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">{dict.dashboard.statusLabel}</Label>
              <Select
                value={formData.status}
                onValueChange={(value: "DRAFT" | "PUBLISHED") =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">{dict.dashboard.draft}</SelectItem>
                  <SelectItem value="PUBLISHED">{dict.dashboard.published}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? dict.dashboard.creating : dict.dashboard.createPost}
              </Button>
              <Link href={`/${currentLocale}/dashboard/posts`}>
                <Button type="button" variant="outline">
                  {dict.dashboard.cancel}
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
