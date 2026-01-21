"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { CodeBlock } from "@/components/ui/code-block"

interface PostContentEnhancedProps {
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

export function PostContentEnhanced({
  content,
  className,
  emptyMessage,
}: PostContentEnhancedProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const html = normalizeContent(content)

  useEffect(() => {
    if (!containerRef.current) return

    const codeBlocks = containerRef.current.querySelectorAll("pre code")

    codeBlocks.forEach((codeElement) => {
      const pre = codeElement.parentElement
      if (!pre) return

      const code = codeElement.textContent || ""
      const language = codeElement.className.match(/language-(\w+)/)?.[1] || "text"

      const wrapper = document.createElement("div")
      wrapper.setAttribute("data-code-block", "true")
      pre.parentNode?.replaceChild(wrapper, pre)

      import("react-dom/client").then(({ createRoot }) => {
        const root = createRoot(wrapper)
        root.render(<CodeBlock code={code} language={language} />)
      })
    })
  }, [html])

  if (!html) {
    if (!emptyMessage) return null
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <div
      ref={containerRef}
      className={cn("prose prose-sm max-w-none dark:prose-invert", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
