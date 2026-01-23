import { getRedisClient } from "./redis"
import { sendEmail } from "./email/mailer"

/**
 * 验证码配置
 */
const VERIFICATION_CODE_CONFIG = {
  length: 6, // 验证码长度
  expiryMinutes: 5, // 过期时间（分钟）
  prefix: "verify:", // Redis key 前缀
  rateLimitPrefix: "verify:rate:", // 发送频率限制前缀
  rateLimitSeconds: 60, // 发送间隔（秒）
  maxAttempts: 5, // 最大尝试次数
}

/**
 * 生成随机数字验证码
 */
export function generateVerificationCode(length: number = VERIFICATION_CODE_CONFIG.length): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("")
}

/**
 * 存储验证码到 Redis
 */
export async function storeVerificationCode(
  email: string,
  code: string,
): Promise<{ success: boolean; error?: string }> {
  const redis = getRedisClient()
  if (!redis) {
    return { success: false, error: "Redis not configured" }
  }

  try {
    const key = `${VERIFICATION_CODE_CONFIG.prefix}${email.toLowerCase()}`
    const expirySeconds = VERIFICATION_CODE_CONFIG.expiryMinutes * 60

    // 存储验证码，包含尝试次数
    await redis.setex(
      key,
      expirySeconds,
      JSON.stringify({
        code,
        attempts: 0,
        createdAt: Date.now(),
      }),
    )

    return { success: true }
  } catch (error) {
    console.error("Failed to store verification code:", error)
    return { success: false, error: "Failed to store verification code" }
  }
}

/**
 * 验证验证码
 */
export async function verifyCode(
  email: string,
  inputCode: string,
): Promise<{ valid: boolean; error?: string }> {
  const redis = getRedisClient()
  if (!redis) {
    return { valid: false, error: "Redis not configured" }
  }

  try {
    const key = `${VERIFICATION_CODE_CONFIG.prefix}${email.toLowerCase()}`
    const data = await redis.get(key)

    if (!data) {
      return { valid: false, error: "Verification code expired or not found" }
    }

    const { code, attempts } = JSON.parse(data)

    // 检查尝试次数
    if (attempts >= VERIFICATION_CODE_CONFIG.maxAttempts) {
      await redis.del(key)
      return { valid: false, error: "Too many failed attempts" }
    }

    // 验证码不匹配
    if (code !== inputCode) {
      // 增加尝试次数
      await redis.setex(
        key,
        await redis.ttl(key),
        JSON.stringify({
          code,
          attempts: attempts + 1,
          createdAt: JSON.parse(data).createdAt,
        }),
      )
      return { valid: false, error: "Invalid verification code" }
    }

    // 验证成功，删除验证码
    await redis.del(key)
    return { valid: true }
  } catch (error) {
    console.error("Failed to verify code:", error)
    return { valid: false, error: "Verification failed" }
  }
}

/**
 * 检查发送频率限制
 */
export async function checkRateLimit(email: string): Promise<{ allowed: boolean; waitSeconds?: number }> {
  const redis = getRedisClient()
  if (!redis) {
    return { allowed: true } // Redis 未配置时不限制
  }

  try {
    const key = `${VERIFICATION_CODE_CONFIG.rateLimitPrefix}${email.toLowerCase()}`
    const exists = await redis.exists(key)

    if (exists) {
      const ttl = await redis.ttl(key)
      return { allowed: false, waitSeconds: ttl }
    }

    // 设置频率限制
    await redis.setex(key, VERIFICATION_CODE_CONFIG.rateLimitSeconds, "1")
    return { allowed: true }
  } catch (error) {
    console.error("Failed to check rate limit:", error)
    return { allowed: true } // 出错时允许发送
  }
}

/**
 * 发送验证码邮件
 */
export async function sendVerificationEmail(
  email: string,
  purpose: "register" | "reset-password" | "change-email" = "register",
): Promise<{ success: boolean; error?: string; waitSeconds?: number }> {
  // 检查发送频率
  const rateLimit = await checkRateLimit(email)
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `Please wait ${rateLimit.waitSeconds} seconds before requesting another code`,
      waitSeconds: rateLimit.waitSeconds,
    }
  }

  // 生成验证码
  const code = generateVerificationCode()

  // 存储到 Redis
  const storeResult = await storeVerificationCode(email, code)
  if (!storeResult.success) {
    return storeResult
  }

  // 发送邮件
  try {
    const purposeText = {
      register: "注册账户",
      "reset-password": "重置密码",
      "change-email": "更换邮箱",
    }[purpose]

    await sendEmail({
      to: email,
      subject: `【linux.do】邮箱验证码 - ${purposeText}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">邮箱验证</h2>
          <p>您正在${purposeText}，您的验证码是：</p>

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px; margin: 0;">
              ${code}
            </p>
          </div>

          <p style="color: #6b7280; font-size: 14px;">
            ⏰ 此验证码将在 <strong>${VERIFICATION_CODE_CONFIG.expiryMinutes} 分钟</strong>后失效
          </p>

          <p style="color: #dc2626; font-size: 14px;">
            ⚠️ 如果这不是您的操作，请忽略此邮件
          </p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="color: #6b7280; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
        </div>
      `,
      text: `
您正在${purposeText}，您的验证码是：

${code}

⏰ 此验证码将在 ${VERIFICATION_CODE_CONFIG.expiryMinutes} 分钟后失效

⚠️ 如果这不是您的操作，请忽略此邮件

---
此邮件由系统自动发送，请勿回复。
      `,
    })

    return { success: true }
  } catch (error) {
    console.error("Failed to send verification email:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    }
  }
}

/**
 * 获取验证码剩余时间（秒）
 */
export async function getCodeTTL(email: string): Promise<number> {
  const redis = getRedisClient()
  if (!redis) return 0

  try {
    const key = `${VERIFICATION_CODE_CONFIG.prefix}${email.toLowerCase()}`
    const ttl = await redis.ttl(key)
    return ttl > 0 ? ttl : 0
  } catch {
    return 0
  }
}
