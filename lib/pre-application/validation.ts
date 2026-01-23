import { allowedEmailDomains } from "@/lib/pre-application/constants"
import { db } from "@/lib/db"

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

export async function getAllowedEmailDomains(): Promise<readonly string[]> {
  if (!db) return allowedEmailDomains

  try {
    const settings = await db.siteSettings.findUnique({
      where: { id: "global" },
      select: { allowedEmailDomains: true },
    })

    if (settings?.allowedEmailDomains && Array.isArray(settings.allowedEmailDomains)) {
      const domains = settings.allowedEmailDomains as string[]
      return domains.length > 0 ? domains : allowedEmailDomains
    }
  } catch (error) {
    console.error("Failed to fetch email domains from database:", error)
  }

  return allowedEmailDomains
}

export function isAllowedEmailDomain(email: string) {
  const domain = email.split("@")[1]?.toLowerCase() || ""
  return allowedEmailDomains.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`))
}

export async function isAllowedEmailDomainAsync(email: string): Promise<boolean> {
  const domain = email.split("@")[1]?.toLowerCase() || ""
  const domains = await getAllowedEmailDomains()
  return domains.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`))
}
