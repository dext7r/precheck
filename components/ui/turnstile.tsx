"use client"

import { Turnstile as ReactTurnstile, type TurnstileInstance } from "@marsidev/react-turnstile"
import { useTheme } from "next-themes"
import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react"

interface TurnstileProps {
  siteKey: string
  onVerify: (token: string) => void
  onError?: () => void
  onExpire?: () => void
  className?: string
}

export interface TurnstileRef {
  reset: () => void
}

export const Turnstile = forwardRef<TurnstileRef, TurnstileProps>(
  ({ siteKey, onVerify, onError, onExpire, className }, ref) => {
    const { resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const turnstileRef = useRef<TurnstileInstance>(null)

    useImperativeHandle(ref, () => ({
      reset: () => {
        turnstileRef.current?.reset()
      },
    }))

    useEffect(() => {
      const frame = requestAnimationFrame(() => {
        setMounted(true)
      })

      return () => {
        cancelAnimationFrame(frame)
      }
    }, [])

    // 主题变化时重置 Turnstile
    useEffect(() => {
      if (mounted && turnstileRef.current) {
        turnstileRef.current.reset()
      }
    }, [resolvedTheme, mounted])

    if (!mounted) {
      return (
        <div
          className={`flex h-[65px] items-center justify-center rounded-md border bg-muted ${className || ""}`}
        >
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
  },
)

Turnstile.displayName = "Turnstile"
