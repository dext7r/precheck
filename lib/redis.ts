import Redis from "ioredis"

// Redis 客户端单例
let redis: Redis | null = null

/**
 * 获取 Redis 客户端
 */
export function getRedisClient(): Redis | null {
  // 如果没有配置 Redis URL，返回 null
  if (!process.env.REDIS_URL && !process.env.KV_REST_API_URL) {
    return null
  }

  // 如果已创建客户端且连接正常，直接返回
  if (redis && redis.status === "ready") {
    return redis
  }

  // 如果客户端存在但连接异常，销毁后重建
  if (redis && redis.status !== "ready" && redis.status !== "connecting" && redis.status !== "connect") {
    try { redis.disconnect() } catch { /* ignore */ }
    redis = null
  }

  // 已在连接中，直接返回
  if (redis) {
    return redis
  }

  try {
    // 优先使用 REDIS_URL
    if (process.env.REDIS_URL) {
      const redisUrl = process.env.REDIS_URL
      // Upstash Redis 需要 TLS
      const needsTLS = redisUrl.includes("upstash.io")

      redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          return Math.min(times * 200, 2000)
        },
        tls: needsTLS ? {} : undefined,
        family: 0, // 自动选择 IPv4/IPv6
      })
    }
    // 使用 Upstash Redis（兼容 KV）
    else if (process.env.KV_REST_API_URL) {
      const url = new URL(process.env.KV_REST_API_URL)
      redis = new Redis({
        host: url.hostname,
        port: Number(url.port) || 6379,
        password: process.env.KV_REST_API_TOKEN,
        tls: url.protocol === "https:" ? {} : undefined,
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          return Math.min(times * 200, 2000)
        },
      })
    }

    return redis
  } catch (error) {
    console.error("Failed to create Redis client:", error)
    return null
  }
}

/**
 * 检查 Redis 是否可用
 */
export async function isRedisAvailable(): Promise<boolean> {
  const client = getRedisClient()
  if (!client) return false

  try {
    await client.ping()
    return true
  } catch (error) {
    console.error("[Redis] ping failed:", error)
    return false
  }
}

/**
 * 关闭 Redis 连接
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit()
    redis = null
  }
}
