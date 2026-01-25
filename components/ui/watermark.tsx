"use client"

import { useEffect, useRef, useCallback, memo } from "react"

interface WatermarkProps {
  userId?: string
  email?: string
  name?: string
}

// 使用 Canvas 生成水印图片
function generateWatermarkImage(
  userId: string,
  email: string,
  name: string,
  timestamp: string,
): string {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) return ""

  canvas.width = 320
  canvas.height = 180

  ctx.font = "12px system-ui, -apple-system, sans-serif"
  ctx.fillStyle = "rgba(0, 0, 0, 0.08)"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"

  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((-20 * Math.PI) / 180)

  const lines = [timestamp, `ID: ${userId}`, name, email]
  lines.forEach((line, index) => {
    const y = (index - (lines.length - 1) / 2) * 18
    ctx.fillText(line, 0, y)
  })

  return canvas.toDataURL("image/png")
}

// 混淆用户信息
function obfuscateText(text: string): string {
  if (!text || text.length <= 4) return text
  const visibleChars = Math.min(4, Math.floor(text.length / 3))
  return text.slice(0, visibleChars) + "***" + text.slice(-visibleChars)
}

function WatermarkComponent({ userId, email, name }: WatermarkProps) {
  const watermarkRef = useRef<HTMLDivElement | null>(null)

  const updateWatermark = useCallback(() => {
    if (!watermarkRef.current || !userId) return

    const now = new Date()
    const timestamp = now.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })

    const displayUserId = userId.slice(0, 8)
    const displayEmail = obfuscateText(email || "")
    const displayName = obfuscateText(name || "")

    const watermarkImage = generateWatermarkImage(
      displayUserId,
      displayEmail,
      displayName,
      timestamp,
    )

    watermarkRef.current.style.backgroundImage = `url('${watermarkImage}')`
  }, [userId, email, name])

  useEffect(() => {
    if (!userId) return

    updateWatermark()
    const interval = setInterval(updateWatermark, 1000)

    return () => clearInterval(interval)
  }, [userId, updateWatermark])

  if (!userId) return null

  return (
    <div
      ref={watermarkRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
        backgroundRepeat: "repeat",
      }}
    />
  )
}

export const Watermark = memo(WatermarkComponent)
