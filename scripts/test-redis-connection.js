#!/usr/bin/env node
const Redis = require("ioredis")

const redisUrl = process.env.REDIS_URL

if (!redisUrl) {
  console.error("❌ REDIS_URL 环境变量未设置")
  process.exit(1)
}

console.log("🔍 测试 Redis 连接...")
console.log("REDIS_URL:", redisUrl.replace(/:([^:@]+)@/, ":****@"))

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  lazyConnect: true,
  connectTimeout: 10000,
})

redis.on("connect", () => {
  console.log("✅ Redis 连接成功")
})

redis.on("ready", () => {
  console.log("✅ Redis 已就绪")
})

redis.on("error", (err) => {
  console.error("❌ Redis 错误:", err.message)
})

redis.on("close", () => {
  console.log("🔌 Redis 连接已关闭")
})

async function test() {
  try {
    console.log("\n⏳ 尝试连接...")
    await redis.connect()

    console.log("\n⏳ 测试 PING 命令...")
    const pong = await redis.ping()
    console.log("✅ PING 响应:", pong)

    console.log("\n⏳ 测试 SET 命令...")
    await redis.set("test:key", "test-value", "EX", 10)
    console.log("✅ SET 成功")

    console.log("\n⏳ 测试 GET 命令...")
    const value = await redis.get("test:key")
    console.log("✅ GET 成功:", value)

    console.log("\n⏳ 清理测试数据...")
    await redis.del("test:key")
    console.log("✅ 清理完成")

    console.log("\n🎉 所有测试通过！Redis 连接正常。")

    redis.disconnect()
    process.exit(0)
  } catch (error) {
    console.error("\n❌ 测试失败:", error.message)
    console.error("详细错误:", error)
    redis.disconnect()
    process.exit(1)
  }
}

test()
