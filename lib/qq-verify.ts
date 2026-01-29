import { getRedisClient } from "./redis"

/**
 * QQ 群验证码配置
 */
export const QQ_VERIFY_CONFIG = {
  codeLength: 6,
  codeExpiryMinutes: 3,
  accessExpiryHours: 24,
  codePrefix: "qq:verify:",
  accessPrefix: "qq:access:",
  rateLimitPrefix: "qq:rate:",
  rateLimitSeconds: 60,
  maxAttempts: 5,
  cookieName: "qq_verified",
}

/**
 * 生成随机数字验证码
 */
export function generateQQVerifyCode(length: number = QQ_VERIFY_CONFIG.codeLength): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("")
}

/**
 * 生成访问凭证 Token
 */
export function generateAccessToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

/**
 * 检查 QQ 号请求频率限制
 */
export async function checkQQRateLimit(qqNumber: string): Promise<{ allowed: boolean; waitSeconds?: number }> {
  const redis = getRedisClient()
  if (!redis) return { allowed: true }

  try {
    const key = `${QQ_VERIFY_CONFIG.rateLimitPrefix}${qqNumber}`
    const exists = await redis.exists(key)

    if (exists) {
      const ttl = await redis.ttl(key)
      return { allowed: false, waitSeconds: ttl }
    }

    await redis.setex(key, QQ_VERIFY_CONFIG.rateLimitSeconds, "1")
    return { allowed: true }
  } catch (error) {
    console.error("Failed to check QQ rate limit:", error)
    return { allowed: true }
  }
}

/**
 * 为 QQ 号生成并存储验证码（供 QQ 机器人调用）
 */
export async function createQQVerifyCode(
  qqNumber: string
): Promise<{ success: boolean; code?: string; error?: string; waitSeconds?: number }> {
  const rateLimit = await checkQQRateLimit(qqNumber)
  if (!rateLimit.allowed) {
    return { success: false, error: "请求过于频繁", waitSeconds: rateLimit.waitSeconds }
  }

  const redis = getRedisClient()
  if (!redis) return { success: false, error: "Redis 未配置" }

  try {
    const code = generateQQVerifyCode()
    const key = `${QQ_VERIFY_CONFIG.codePrefix}${qqNumber}`
    const expirySeconds = QQ_VERIFY_CONFIG.codeExpiryMinutes * 60

    await redis.setex(
      key,
      expirySeconds,
      JSON.stringify({ code, attempts: 0, createdAt: Date.now() })
    )

    return { success: true, code }
  } catch (error) {
    console.error("Failed to create QQ verify code:", error)
    return { success: false, error: "生成验证码失败" }
  }
}

/**
 * 验证 QQ 验证码
 */
export async function verifyQQCode(
  qqNumber: string,
  inputCode: string
): Promise<{ valid: boolean; accessToken?: string; error?: string }> {
  const redis = getRedisClient()
  if (!redis) return { valid: false, error: "Redis 未配置" }

  try {
    const key = `${QQ_VERIFY_CONFIG.codePrefix}${qqNumber}`
    const data = await redis.get(key)

    if (!data) return { valid: false, error: "验证码已过期或不存在" }

    const { code, attempts } = JSON.parse(data)

    if (attempts >= QQ_VERIFY_CONFIG.maxAttempts) {
      await redis.del(key)
      return { valid: false, error: "尝试次数过多，请重新获取验证码" }
    }

    if (code !== inputCode) {
      const ttl = await redis.ttl(key)
      await redis.setex(
        key,
        ttl > 0 ? ttl : QQ_VERIFY_CONFIG.codeExpiryMinutes * 60,
        JSON.stringify({ code, attempts: attempts + 1, createdAt: JSON.parse(data).createdAt })
      )
      return { valid: false, error: "验证码错误" }
    }

    await redis.del(key)

    const accessToken = generateAccessToken()
    const accessKey = `${QQ_VERIFY_CONFIG.accessPrefix}${accessToken}`
    const accessExpirySeconds = QQ_VERIFY_CONFIG.accessExpiryHours * 60 * 60

    await redis.setex(accessKey, accessExpirySeconds, JSON.stringify({ qqNumber, createdAt: Date.now() }))

    return { valid: true, accessToken }
  } catch (error) {
    console.error("Failed to verify QQ code:", error)
    return { valid: false, error: "验证失败" }
  }
}

/**
 * 验证访问凭证是否有效
 */
export async function validateAccessToken(token: string): Promise<{ valid: boolean; qqNumber?: string }> {
  const redis = getRedisClient()
  if (!redis) return { valid: false }

  try {
    const key = `${QQ_VERIFY_CONFIG.accessPrefix}${token}`
    const data = await redis.get(key)

    if (!data) return { valid: false }

    const { qqNumber } = JSON.parse(data)
    return { valid: true, qqNumber }
  } catch (error) {
    console.error("Failed to validate access token:", error)
    return { valid: false }
  }
}

/**
 * 从 Cookie 中获取并验证 QQ 访问凭证
 */
export async function getQQVerifyStatus(
  cookieValue: string | undefined
): Promise<{ verified: boolean; qqNumber?: string }> {
  if (!cookieValue) return { verified: false }

  const result = await validateAccessToken(cookieValue)
  return { verified: result.valid, qqNumber: result.qqNumber }
}
