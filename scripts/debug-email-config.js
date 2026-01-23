/**
 * 邮件服务配置调试脚本
 *
 * 使用方法：
 * node scripts/debug-email-config.js
 */

console.log("=".repeat(60))
console.log("邮件服务配置检查")
console.log("=".repeat(60))

// 检查环境变量
const emailProvider = process.env.EMAIL_PROVIDER || "smtp"
console.log("\n📌 邮件发送方式:")
console.log(`   EMAIL_PROVIDER = "${emailProvider}"`)

if (emailProvider === "api") {
  console.log("\n📧 API 模式配置:")
  console.log(`   EMAIL_API_URL = ${process.env.EMAIL_API_URL || "(未设置)"}`)
  console.log(`   EMAIL_API_HOST = ${process.env.EMAIL_API_HOST || "(未设置)"}`)
  console.log(`   EMAIL_API_PORT = ${process.env.EMAIL_API_PORT || "(未设置)"}`)
  console.log(`   EMAIL_API_USER = ${process.env.EMAIL_API_USER ? "✅ 已设置" : "❌ 未设置"}`)
  console.log(
    `   EMAIL_API_PASS = ${process.env.EMAIL_API_PASS ? "✅ 已设置 (${process.env.EMAIL_API_PASS.substring(0, 4)}...)" : "❌ 未设置"}`,
  )
  console.log(
    `   EMAIL_API_FROM = ${process.env.EMAIL_API_FROM || "(可选，默认使用 EMAIL_API_USER)"}`,
  )

  // 检查配置完整性
  const isConfigured = !!(process.env.EMAIL_API_USER && process.env.EMAIL_API_PASS)
  console.log("\n✨ 配置状态:")
  if (isConfigured) {
    console.log("   ✅ API 模式配置完整，邮件服务可用")
  } else {
    console.log("   ❌ API 模式配置不完整，缺少必填项:")
    if (!process.env.EMAIL_API_USER) console.log("      - EMAIL_API_USER (必填)")
    if (!process.env.EMAIL_API_PASS) console.log("      - EMAIL_API_PASS (必填)")
  }
} else {
  console.log("\n📧 SMTP 模式配置:")
  console.log(`   SMTP_HOST = ${process.env.SMTP_HOST ? "✅ 已设置" : "❌ 未设置"}`)
  console.log(`   SMTP_PORT = ${process.env.SMTP_PORT || "(未设置)"}`)
  console.log(`   SMTP_USER = ${process.env.SMTP_USER ? "✅ 已设置" : "❌ 未设置"}`)
  console.log(`   SMTP_PASS = ${process.env.SMTP_PASS ? "✅ 已设置" : "❌ 未设置"}`)
  console.log(`   SMTP_FROM = ${process.env.SMTP_FROM || "(可选，默认使用 SMTP_USER)"}`)
  console.log(`   SMTP_SECURE = ${process.env.SMTP_SECURE || "false"}`)

  // 检查配置完整性
  const isConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  console.log("\n✨ 配置状态:")
  if (isConfigured) {
    console.log("   ✅ SMTP 模式配置完整，邮件服务可用")
  } else {
    console.log("   ❌ SMTP 模式配置不完整，缺少必填项:")
    if (!process.env.SMTP_HOST) console.log("      - SMTP_HOST (必填)")
    if (!process.env.SMTP_USER) console.log("      - SMTP_USER (必填)")
    if (!process.env.SMTP_PASS) console.log("      - SMTP_PASS (必填)")
  }
}

// Redis 配置检查（验证码功能需要）
console.log("\n" + "=".repeat(60))
console.log("Redis 配置检查 (验证码功能)")
console.log("=".repeat(60))
const redisUrl = process.env.REDIS_URL || process.env.KV_REST_API_URL
console.log(`   REDIS_URL = ${process.env.REDIS_URL ? "✅ 已设置" : "❌ 未设置"}`)
console.log(`   KV_REST_API_URL = ${process.env.KV_REST_API_URL ? "✅ 已设置" : "❌ 未设置"}`)
console.log(`   KV_REST_API_TOKEN = ${process.env.KV_REST_API_TOKEN ? "✅ 已设置" : "❌ 未设置"}`)

if (redisUrl) {
  console.log("\n   ✅ Redis 已配置，验证码功能可用")
} else {
  console.log("\n   ⚠️  Redis 未配置，验证码功能不可用")
  console.log("   提示：请配置 REDIS_URL 或 KV_REST_API_URL")
}

console.log("\n" + "=".repeat(60))
console.log("💡 提示")
console.log("=".repeat(60))
console.log("1. 修改 .env 文件后，需要重启开发服务器")
console.log("2. 确保 .env 文件在项目根目录")
console.log("3. 检查 .env 文件中是否有多余的引号或空格")
console.log("4. API 模式推荐用于生产环境，SMTP 模式适合开发")
console.log("\n")
