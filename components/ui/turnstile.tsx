"use client"

import { Turnstile as ReactTurnstile, type TurnstileInstance } from "@marsidev/react-turnstile"
import { useTheme } from "next-themes"
import { useEffect, useRef, useState } from "react"

interface TurnstileProps {
  siteKey: string
  onVerify: (token: string) => void
  onError?: () => void
  onExpire?: () => void
  className?: string
}

export function Turnstile({ siteKey, onVerify, onError, onExpire, className }: TurnstileProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const turnstileRef = useRef<TurnstileInstance>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 主题变化时重置 Turnstile
  useEffect(() => {
    if (mounted && turnstileRef.current) {
      turnstileRef.current.reset()
    }
  }, [resolvedTheme, mounted])

  if (!mounted) {
    return (
      <div className={`flex h-[65px] items-center justify-center rounded-md border bg-muted ${className || ""}`}>
        <span className="text-sm text-muted-foreground">Loading verification...</span>
      </div>
    )
  }

  return (
    <div className={className}>
      <ReactTurnstile
        ref={turnstileRef}
        siteKey={siteKey}
        onSuccess={onVerify}
        onError={onError}
        onExpire={onExpire}
        options={{
          theme: resolvedTheme === "dark" ? "dark" : "light",
          size: "normal",
        }}
      />
    </div>
  )
}
