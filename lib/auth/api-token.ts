import crypto from "crypto"

const TOKEN_PREFIX = "pk_"

export const MAX_TOKENS_PER_USER = 5

export function generateApiToken(): string {
  return TOKEN_PREFIX + crypto.randomBytes(32).toString("hex")
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export function extractTokenPrefix(token: string): string {
  return token.substring(0, TOKEN_PREFIX.length + 8)
}

export function isApiToken(value: string): boolean {
  return value.startsWith(TOKEN_PREFIX)
}
