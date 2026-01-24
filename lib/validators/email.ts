const LOCAL_PART_SANITIZE_REGEX = /[^a-zA-Z0-9]/g
const DOMAIN_INVALID_REGEX = /[\s@]/

export const LOCAL_PART_MIN_LENGTH = 3

export const sanitizeLocalPart = (value: string) => value.replace(LOCAL_PART_SANITIZE_REGEX, "")

export const normalizeLocalPart = (value: string) => sanitizeLocalPart(value.trim())

export const isLocalPartValid = (value: string) => {
  const normalized = normalizeLocalPart(value)
  return normalized.length >= LOCAL_PART_MIN_LENGTH
}

export const isDomainPartValid = (value: string) => {
  const trimmed = value.trim()
  return Boolean(trimmed) && !DOMAIN_INVALID_REGEX.test(trimmed)
}
