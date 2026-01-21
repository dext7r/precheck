"use client"

import type { ReactNode } from "react"
import { useEffect, useMemo } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { Bold, Italic, Strikethrough, List, ListOrdered, Quote, Code, Heading2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

interface ToolbarButtonProps {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  label: string
  children: ReactNode
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

const normalizeEditorContent = (value: string) => {
  const raw = value?.trim() ?? ""
  if (!raw) return ""
  if (/<[^>]+>/.test(raw)) return raw
  const paragraphs = escapeHtml(raw)
    .split(/\n{2,}/)
    .map((block) => block.replace(/\n/g, "<br />"))
  return paragraphs.map((block) => `<p>${block}</p>`).join("")
}

function ToolbarButton({ onClick, active, disabled, label, children }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", active && "bg-muted text-foreground")}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      title={label}
    >
      {children}
    </Button>
  )
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const normalized = useMemo(() => normalizeEditorContent(value), [value])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder || "",
      }),
    ],
    content: normalized,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none dark:prose-invert focus:outline-none",
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) return
    if (normalized === editor.getHTML()) return
    editor.commands.setContent(normalized, { emitUpdate: false })
  }, [editor, normalized])

  return (
    <div className={cn("rounded-md border border-border bg-background", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          active={!!editor?.isActive("heading", { level: 2 })}
          disabled={!editor || !editor.can().chain().focus().toggleHeading({ level: 2 }).run()}
          label="H2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBold().run()}
          active={!!editor?.isActive("bold")}
          disabled={!editor || !editor.can().chain().focus().toggleBold().run()}
          label="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          active={!!editor?.isActive("italic")}
          disabled={!editor || !editor.can().chain().focus().toggleItalic().run()}
          label="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          active={!!editor?.isActive("strike")}
          disabled={!editor || !editor.can().chain().focus().toggleStrike().run()}
          label="Strike"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleCode().run()}
          active={!!editor?.isActive("code")}
          disabled={!editor || !editor.can().chain().focus().toggleCode().run()}
          label="Code"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          active={!!editor?.isActive("bulletList")}
          disabled={!editor || !editor.can().chain().focus().toggleBulletList().run()}
          label="Bullet list"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          active={!!editor?.isActive("orderedList")}
          disabled={!editor || !editor.can().chain().focus().toggleOrderedList().run()}
          label="Ordered list"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          active={!!editor?.isActive("blockquote")}
          disabled={!editor || !editor.can().chain().focus().toggleBlockquote().run()}
          label="Quote"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} className="min-h-[240px] p-3" />
    </div>
  )
}
