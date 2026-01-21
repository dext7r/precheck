import { authConfig } from "./config"

// 密码验证
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const { minLength, requireUppercase, requireLowercase, requireNumber } = authConfig.password

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters`)
  }
  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter")
  }
  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter")
  }
  if (requireNumber && !/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number")
  }

  return { valid: errors.length === 0, errors }
}

// 简单的密码哈希（生产环境应使用 bcrypt）
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + process.env.AUTH_SECRET)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return Buffer.from(hash).toString("hex")
}

// 验证密码
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const hash = await hashPassword(password)
  return hash === hashedPassword
}

// 生成重置 Token
export function generateResetToken(): string {
  return crypto.randomUUID() + crypto.randomUUID()
}
