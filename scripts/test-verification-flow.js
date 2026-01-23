#!/usr/bin/env node
/**
 * 测试完整的验证码流程
 */
const Redis = require("ioredis")

const REDIS_URL = process.env.REDIS_URL

if (!REDIS_URL) {
  console.error("❌ REDIS_URL 环境变量未设置")
  process.exit(1)
}

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  lazyConnect: true,
  tls: REDIS_URL.includes("upstash.io") ? {} : undefined,
  family: 6,
})

async function test() {
  try {
    await redis.connect()

    const testEmail = "test@example.com"
    const key = `verify:${testEmail.toLowerCase()}`

    console.log("🔍 查询 Redis 中的验证码...")
    console.log(`Key: ${key}\n`)

    const data = await redis.get(key)

    if (!data) {
      console.log("❌ 未找到验证码")
      console.log("提示：请先调用 /api/auth/send-verification-code 发送验证码\n")
      redis.disconnect()
      process.exit(0)
    }

    const parsed = JSON.parse(data)
    console.log("✅ 找到验证码！")
    console.log("\n验证码信息：")
    console.log(`  验证码: ${parsed.code}`)
    console.log(`  尝试次数: ${parsed.attempts}/5`)
    console.log(`  创建时间: ${new Date(parsed.createdAt).toLocaleString("zh-CN")}`)

    // 获取 TTL
    const ttl = await redis.ttl(key)
    if (ttl > 0) {
      const minutes = Math.floor(ttl / 60)
      const seconds = ttl % 60
      console.log(`  剩余时间: ${minutes}分${seconds}秒`)
    }

    console.log("\n📋 使用此验证码测试注册：")
    console.log(`curl -X POST http://localhost:3000/api/auth/register \\`)
    console.log(`  -H "Content-Type: application/json" \\`)
    console.log(`  -d '{"email":"${testEmail}","password":"Test123456","name":"测试用户","verificationCode":"${parsed.code}"}'`)

    redis.disconnect()
  } catch (error) {
    console.error("❌ 错误:", error.message)
    redis.disconnect()
    process.exit(1)
  }
}

test()
