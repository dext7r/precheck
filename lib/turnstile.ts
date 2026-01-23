/**
 * Cloudflare Turnstile 验证
 */

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY || "0x4AAAAAACOeLqJjjeFGHVg12m8HiVpk0Zg"
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

interface TurnstileVerifyResponse {
  success: boolean
  "error-codes"?: string[]
  challenge_ts?: string
  hostname?: string
}

export async function verifyTurnstileToken(token: string, remoteIp?: string): Promise<boolean> {
  if (!token) {
    return false
  }

  try {
    const formData = new URLSearchParams()
    formData.append("secret", TURNSTILE_SECRET)
    formData.append("response", token)
    if (remoteIp) {
      formData.append("remoteip", remoteIp)
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    })

    const data: TurnstileVerifyResponse = await response.json()

    if (!data.success) {
      console.error("Turnstile verification failed:", data["error-codes"])
      return false
    }

    return true
  } catch (error) {
    console.error("Turnstile verification error:", error)
    return false
  }
}
