# 邮件服务集成说明

本项目已集成 `push.h7ml.cn` 邮件发送 API，支持两种邮件发送方式。

## 配置方式

### 方式一：使用 push.h7ml.cn API（推荐）

在 `.env` 文件中添加以下配置：

```bash
# 邮件发送方式
EMAIL_PROVIDER="api"

# push.h7ml.cn API 配置
EMAIL_API_URL="https://push.h7ml.cn/forward"
EMAIL_API_HOST="smtp.qq.com"
EMAIL_API_PORT="587"
EMAIL_API_USER="your-email@qq.com"          # 您的 QQ 邮箱
EMAIL_API_PASS="your-smtp-auth-code"        # QQ 邮箱 SMTP 授权码
EMAIL_API_FROM="your-email@qq.com"          # 发件人地址
```

#### 获取 QQ 邮箱 SMTP 授权码

1. 登录 QQ 邮箱网页版
2. 进入【设置】→【账户】
3. 找到【POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务】
4. 开启【IMAP/SMTP服务】或【POP3/SMTP服务】
5. 点击【生成授权码】按钮
6. 验证身份后获取16位授权码（如：`tvjbpszgteyxdgda`）
7. 将授权码填入 `EMAIL_API_PASS`

### 方式二：传统 SMTP（备用）

```bash
# 邮件发送方式
EMAIL_PROVIDER="smtp"

# SMTP 配置
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="your-email@example.com"
SMTP_PASS="your-password"
SMTP_FROM="your-email@example.com"
SMTP_SECURE="false"  # 使用 TLS 时设为 false，使用 SSL 时设为 true
```

## 使用示例

### 1. 基础用法

```typescript
import { sendEmail } from "@/lib/email/mailer"

await sendEmail({
  to: "recipient@example.com",
  subject: "测试邮件",
  html: "<p>这是 HTML 格式邮件</p>",
  text: "这是纯文本格式邮件",
})
```

### 2. 使用现有邮件模板

```typescript
import { buildPreApplicationReviewEmail } from "@/lib/email/templates"
import { sendEmail } from "@/lib/email/mailer"
import { getDictionary } from "@/lib/i18n/get-dictionary"

const dict = await getDictionary("zh")
const emailContent = buildPreApplicationReviewEmail({
  appName: "linux.do 预申请系统",
  dictionary: dict,
  status: "APPROVED",
  reviewerName: "管理员",
  guidance: "欢迎加入社区！",
  inviteCode: "ABC123XYZ",
  inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  locale: "zh",
})

await sendEmail({
  to: "user@example.com",
  ...emailContent,
})
```

### 3. 在 API 路由中使用

```typescript
// app/api/some-route/route.ts
import { NextResponse } from "next/server"
import { sendEmail, isEmailConfigured } from "@/lib/email/mailer"

export async function POST(request: Request) {
  // 检查邮件服务是否配置
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Email service not configured" },
      { status: 503 },
    )
  }

  try {
    await sendEmail({
      to: "user@example.com",
      subject: "通知",
      text: "这是一条通知消息",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 },
    )
  }
}
```

## 测试邮件功能

### 通过管理后台测试

1. 以 SUPER_ADMIN 身份登录
2. 进入【系统配置】页面
3. 找到【测试邮件发送】部分
4. 输入接收邮件的地址
5. 点击【发送测试】按钮
6. 检查邮箱是否收到测试邮件

### 通过 API 测试

```bash
curl -X POST http://localhost:3000/api/admin/test-email \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your-session-token" \
  -d '{"to":"test@example.com"}'
```

## 常见问题

### 1. 发送失败：SMTP not configured

**原因：** 环境变量未正确配置

**解决：** 检查 `.env` 文件中的配置项，确保：
- `EMAIL_PROVIDER` 设置为 `api` 或 `smtp`
- 相应的配置项（`EMAIL_API_*` 或 `SMTP_*`）已填写

### 2. 发送失败：Email API request failed: 401

**原因：** QQ 邮箱授权码错误或已过期

**解决：**
1. 重新生成 QQ 邮箱 SMTP 授权码
2. 确认 `EMAIL_API_USER` 和 `EMAIL_API_PASS` 正确

### 3. 发送失败：Invalid email domain

**原因：** 收件人邮箱域名不在白名单中

**解决：** 在系统配置中添加相应的邮箱域名

### 4. 邮件发送到垃圾箱

**原因：** 邮件内容可能被识别为垃圾邮件

**解决：**
- 配置 SPF、DKIM、DMARC 记录（如果使用自己的域名）
- 避免使用敏感词汇
- 增加邮件个性化内容

## API 响应格式

### push.h7ml.cn API 成功响应

```json
{
  "message": "OK",
  "data": {
    "data": {
      "accepted": ["recipient@example.com"],
      "rejected": [],
      "response": "250 OK: queued as.",
      "messageId": "<message-id@qq.com>"
    },
    "status": 200,
    "statusText": "OK"
  }
}
```

### 失败响应

```json
{
  "error": "Email sending failed: 错误信息"
}
```

## 功能检测

```typescript
import { features } from "@/lib/features"

if (features.email) {
  console.log("邮件服务已配置")
} else {
  console.log("邮件服务未配置")
}
```

## 安全注意事项

1. **不要在客户端暴露 SMTP 密码**
   - `EMAIL_API_PASS` 和 `SMTP_PASS` 仅在服务端使用
   - 不要添加 `NEXT_PUBLIC_` 前缀

2. **限制邮件发送频率**
   - 建议使用 Redis 实现发送频率限制
   - 防止邮件轰炸攻击

3. **验证收件人地址**
   - 始终验证用户输入的邮箱格式
   - 检查域名是否在白名单中

4. **日志记录**
   - 记录邮件发送日志（成功/失败）
   - 便于问题排查和审计

## 性能优化

### 1. 异步发送（推荐）

对于非关键邮件（如通知），建议使用队列异步发送：

```typescript
// 使用 BullMQ 或其他队列系统
import { emailQueue } from "@/lib/queue"

await emailQueue.add("send-email", {
  to: "user@example.com",
  subject: "通知",
  text: "消息内容",
})
```

### 2. 批量发送

```typescript
const recipients = ["user1@example.com", "user2@example.com"]

await Promise.all(
  recipients.map((to) =>
    sendEmail({
      to,
      subject: "批量通知",
      text: "消息内容",
    })
  )
)
```

## 扩展功能

项目已提供以下邮件模板：

- ✅ 预申请审核通过邮件 (`buildPreApplicationReviewEmail`)
- ✅ 预申请被驳回邮件 (`buildPreApplicationReviewEmail`)
- ✅ 邀请码发送邮件 (`buildInviteCodeIssueEmail`)
- ✅ 密码重置邮件 (`buildResetPasswordEmail`)

模板文件位置：`lib/email/templates.ts`

可根据业务需求添加更多模板。
