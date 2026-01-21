"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CodeBlockProps {
  code: string
  language?: string
  showLineNumbers?: boolean
  filename?: string
  className?: string
  highlightedHtml?: string
}

export function CodeBlock({
  code,
  language = "text",
  showLineNumbers = false,
  filename,
  className,
  highlightedHtml,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn("group relative rounded-lg border border-border bg-muted/50", className)}>
      <div className="flex items-center justify-between border-b border-border bg-muted/80 px-4 py-2">
        <div className="flex items-center gap-2">
          {filename && (
            <span className="text-xs font-medium text-muted-foreground">{filename}</span>
          )}
          {!filename && language && (
            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {language}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <pre className="p-4 font-mono text-sm">
          {highlightedHtml ? (
            <code
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
              className={showLineNumbers ? "block" : ""}
            />
          ) : (
            <code className={showLineNumbers ? "block" : ""}>{code}</code>
          )}
        </pre>
      </div>
    </div>
  )
}
