import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function maskName(name: string | null): string {
  if (!name || name.trim().length === 0) return "匿名"
  return name.charAt(0) + "***"
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!local || !domain) return "***"
  return local.charAt(0) + "***@" + domain
}
