# 邮箱验证码功能使用文档

本项目已集成邮箱验证码功能，用于注册、密码重置等场景。验证码存储在 Redis 中，有效期 5 分钟。

## 🚀 快速配置

### 1. 配置 Redis

#### 方式一：使用 Upstash Redis（推荐）

**优势**：免费额度、自动扩展、全球CDN加速

1. 访问 [Upstash](https://upstash.com/) 注册账号
2. 创建 Redis 数据库（选择最近的区域）
3. 复制连接 URL（格式：`redis://default:xxx@xxx.upstash.io:6379`）
4. 添加到 `.env` 文件：

```bash
REDIS_URL="redis://default:your-password@your-redis.upstash.io:6379"
```

#### 方式二：使用本地 Redis

**适用于开发环境**

```bash
# 安装 Redis (macOS)
brew install redis

# 启动 Redis
redis-server

# .env 配置
REDIS_URL="redis://localhost:6379"
```

### 2. 配置邮件服务

确保已配置邮件发送服务（参考 [EMAIL_QUICK_START.md](./EMAIL_QUICK_START.md)）：

```bash
EMAIL_PROVIDER="api"
EMAIL_API_USER="your-email@qq.com"
EMAIL_API_PASS="your-smtp-auth-code"
```

### 3. 重启服务

```bash
npm run dev
```

## 📝 功能说明

### 验证码规则

- **长度**：6 位数字
- **有效期**：5 分钟
- **发送间隔**：60 秒（防止滥用）
- **最大尝试次数**：5 次（超过后验证码失效）

### 应用场景

1. **用户注册**：防止恶意注册、验证邮箱真实性
2. **密码重置**：安全验证身份
3. **更换邮箱**：验证新邮箱所有权

## 🔌 API 端点

### 发送验证码

```http
POST /api/auth/send-verification-code
Content-Type: application/json

{
  "email": "user@example.com",
  "purpose": "register"  // register | reset-password | change-email
}
```

**成功响应：**
```json
{
  "success": true,
  "message": "Verification code sent successfully"
}
```

**频率限制响应（429）：**
```json
{
  "error": "Please wait 45 seconds before requesting another code",
  "waitSeconds": 45
}
```

### 注册时验证

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "User Name",
  "verificationCode": "123456"
}
```

## 💻 前端使用示例

### React 组件示例

```typescript
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function VerificationCodeInput() {
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [countdown, setCountdown] = useState(0)
  const [sending, setSending] = useState(false)

  // 倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // 发送验证码
  const handleSendCode = async () => {
    if (!email) return

    setSending(true)
    try {
      const res = await fetch("/api/auth/send-verification-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "register" }),
      })

      const data = await res.json()

      if (res.ok) {
        setCountdown(60)
        alert("验证码已发送到您的邮箱")
      } else if (res.status === 429) {
        setCountdown(data.waitSeconds)
        alert(`请等待 ${data.waitSeconds} 秒后再试`)
      } else {
        alert(data.error || "发送失败")
      }
    } catch (error) {
      alert("发送失败，请稍后重试")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="邮箱地址"
      />

      <div className="flex gap-2">
        <Input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="6位验证码"
          maxLength={6}
        />
        <Button
          onClick={handleSendCode}
          disabled={sending || countdown > 0}
        >
          {countdown > 0 ? `${countdown}秒后重试` : "发送验证码"}
        </Button>
      </div>
    </div>
  )
}
```

## 🛠️ 后端工具函数

### 发送验证码

```typescript
import { sendVerificationEmail } from "@/lib/verification-code"

const result = await sendVerificationEmail("user@example.com", "register")

if (result.success) {
  console.log("验证码已发送")
} else if (result.waitSeconds) {
  console.log(`请等待 ${result.waitSeconds} 秒`)
} else {
  console.error(result.error)
}
```

### 验证验证码

```typescript
import { verifyCode } from "@/lib/verification-code"

const result = await verifyCode("user@example.com", "123456")

if (result.valid) {
  console.log("验证通过")
} else {
  console.error(result.error) // "Invalid verification code" | "Verification code expired or not found" | "Too many failed attempts"
}
```

### 检查频率限制

```typescript
import { checkRateLimit } from "@/lib/verification-code"

const limit = await checkRateLimit("user@example.com")

if (limit.allowed) {
  // 可以发送
} else {
  console.log(`请等待 ${limit.waitSeconds} 秒`)
}
```

## 🔒 安全特性

### 1. 频率限制

- 同一邮箱 60 秒内只能发送一次验证码
- 使用 Redis 实现分布式频率限制

### 2. 尝试次数限制

- 每个验证码最多尝试 5 次
- 超过限制后验证码自动失效

### 3. 自动过期

- 验证码 5 分钟后自动失效
- 使用 Redis TTL 机制

### 4. 防暴力破解

- 验证失败自动递增尝试计数
- 使用加密存储（可选）

## 📊 Redis 数据结构

```bash
# 验证码存储
verify:user@example.com = {
  "code": "123456",
  "attempts": 0,
  "createdAt": 1234567890
}
TTL: 300 秒

# 频率限制
verify:rate:user@example.com = "1"
TTL: 60 秒
```

## 🐛 故障排查

### 验证码收不到

1. **检查邮件服务配置**
   ```bash
   # 测试邮件发送
   curl -X POST http://localhost:3000/api/admin/test-email \
     -H "Content-Type: application/json" \
     -d '{"to":"your-email@example.com"}'
   ```

2. **查看服务器日志**
   ```bash
   # 开发环境
   npm run dev

   # 查找错误信息
   grep "Failed to send" logs/app.log
   ```

3. **检查垃圾邮件箱**

### Redis 连接失败

```bash
# 测试 Redis 连接
redis-cli -u $REDIS_URL ping
# 应返回：PONG

# 检查环境变量
node -e "console.log(process.env.REDIS_URL)"
```

### 验证码验证失败

**常见原因：**

1. 验证码已过期（5分钟）
2. 尝试次数超过 5 次
3. 输入错误（区分大小写，仅数字）
4. Redis 未启动或连接失败

**调试方法：**

```typescript
import { getCodeTTL } from "@/lib/verification-code"

// 查看验证码剩余时间
const ttl = await getCodeTTL("user@example.com")
console.log(`验证码剩余 ${ttl} 秒`)
```

## 🚀 生产环境优化

### 1. 使用生产级 Redis

**推荐服务商：**
- **Upstash**：无服务器、按请求计费、免费额度
- **AWS ElastiCache**：高性能、集群支持
- **阿里云 Redis**：国内低延迟

### 2. 配置监控告警

```typescript
// lib/verification-code.ts
const ALERT_THRESHOLD = 100 // 每分钟发送超过 100 次告警

if (sendCount > ALERT_THRESHOLD) {
  // 发送告警通知
  await sendAlert("验证码发送频率异常")
}
```

### 3. 添加图形验证码

防止机器人滥用：

```typescript
import { verifyCaptcha } from "@/lib/captcha"

// 发送验证码前验证图形验证码
const captchaValid = await verifyCaptcha(token)
if (!captchaValid) {
  return res.status(400).json({ error: "Invalid captcha" })
}
```

### 4. IP 限制

```typescript
// 限制单个 IP 每小时发送次数
const ipKey = `verify:ip:${clientIp}`
const ipCount = await redis.incr(ipKey)
await redis.expire(ipKey, 3600)

if (ipCount > 20) {
  return res.status(429).json({ error: "Too many requests from this IP" })
}
```

## 📈 性能优化

### 1. 连接池配置

```typescript
// lib/redis.ts
const redis = new Redis({
  host: "your-redis.upstash.io",
  port: 6379,
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  lazyConnect: true,
  // 连接池配置
  connectionName: "verification-service",
  db: 0,
})
```

### 2. 批量操作

```typescript
// 批量删除过期验证码
const pipeline = redis.pipeline()
expiredKeys.forEach((key) => pipeline.del(key))
await pipeline.exec()
```

## 📚 相关文档

- [邮件服务配置](./EMAIL_QUICK_START.md)
- [Redis 安装指南](https://redis.io/docs/getting-started/)
- [Upstash 文档](https://docs.upstash.com/redis)
