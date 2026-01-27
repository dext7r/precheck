"use client"

import { useSyncExternalStore } from "react"

const emptySubscribe = () => () => {}

/**
 * 检测组件是否已在客户端挂载
 * 用于避免 SSR hydration mismatch
 */
export function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
}
