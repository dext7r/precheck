"use client"

import { allowedEmailDomains } from "@/lib/pre-application/constants"
import { useEffect, useState } from "react"

const DEFAULT_DOMAINS = [...allowedEmailDomains]

let cachedDomains: string[] | null = null
let fetchingPromise: Promise<string[]> | null = null

async function loadDomains(): Promise<string[]> {
  if (cachedDomains) {
    return cachedDomains
  }

  if (!fetchingPromise) {
    fetchingPromise = (async () => {
      try {
        const response = await fetch("/api/public/system-config", { cache: "no-store" })
        if (!response.ok) {
          throw new Error("Failed to fetch system config")
        }

        const data = (await response.json()) as { allowedEmailDomains?: string[] }
        const domains =
          Array.isArray(data.allowedEmailDomains) && data.allowedEmailDomains.length > 0
            ? [...data.allowedEmailDomains]
            : [...DEFAULT_DOMAINS]
        cachedDomains = domains
        return domains
      } catch (error) {
        console.error("Unable to load allowed email domains:", error)
        cachedDomains = DEFAULT_DOMAINS
        return DEFAULT_DOMAINS
      } finally {
        fetchingPromise = null
      }
    })()
  }

  return fetchingPromise
}

export function useAllowedEmailDomains() {
  const [domains, setDomains] = useState<string[]>(cachedDomains ?? DEFAULT_DOMAINS)

  useEffect(() => {
    let mounted = true

    loadDomains().then((result) => {
      if (mounted) {
        setDomains(result)
      }
    })

    return () => {
      mounted = false
    }
  }, [])

  return domains
}
