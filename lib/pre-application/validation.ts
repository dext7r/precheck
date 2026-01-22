import { allowedEmailDomains } from "@/lib/pre-application/constants"

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

export function isAllowedEmailDomain(email: string) {
  const domain = email.split("@")[1]?.toLowerCase() || ""
  return allowedEmailDomains.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`))
}
