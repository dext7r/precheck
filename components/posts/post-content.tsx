"use client"

import { cn } from "@/lib/utils"

interface PostContentProps {
  content?: string | null
  className?: string
  emptyMessage?: string
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

const normalizeContent = (value?: string | null) => {
  const raw = value?.trim() ?? ""
  if (!raw) return ""
  if (/<[^>]+>/.test(raw)) return raw
  const paragraphs = escapeHtml(raw)
    .split(/\n{2,}/)
    .map((block) => block.replace(/\n/g, "<br />"))
  return paragraphs.map((block) => `<p>${block}</p>`).join("")
}

export function PostContent({ content, className, emptyMessage }: PostContentProps) {
  const html = normalizeContent(content)

  if (!html) {
    if (!emptyMessage) return null
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <div
      className={cn("prose prose-sm max-w-none dark:prose-invert", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
