# 邮件服务快速配置指南

## 📧 5分钟快速配置

### 第一步：获取 QQ 邮箱 SMTP 授权码

1. 登录 [QQ 邮箱](https://mail.qq.com)
2. 点击【设置】→【账户】
3. 找到【POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务】
4. 开启 **IMAP/SMTP服务**
5. 点击【生成授权码】
6. 通过手机验证后，复制16位授权码（类似：`tvjbpszgteyxdgda`）

### 第二步：配置环境变量

在项目根目录的 `.env` 文件中添加：

```bash
# 邮件发送配置
EMAIL_PROVIDER="api"
EMAIL_API_URL="https://push.h7ml.cn/forward"
EMAIL_API_HOST="smtp.qq.com"
EMAIL_API_PORT="587"
EMAIL_API_USER="你的QQ邮箱@qq.com"
EMAIL_API_PASS="刚才复制的16位授权码"
EMAIL_API_FROM="你的QQ邮箱@qq.com"
```

### 第三步：重启开发服务器

```bash
npm run dev
```

### 第四步：测试邮件功能

1. 以 SUPER_ADMIN 身份登录系统
2. 访问 `http://localhost:3000/zh/admin/system-config`
3. 找到【测试邮件发送】部分
4. 输入任意邮箱地址
5. 点击【发送测试】
6. 检查邮箱收件箱（或垃圾箱）

## ✅ 配置完成！

现在您的系统可以自动发送以下邮件：

- ✉️ 预申请审核通过/驳回通知
- ✉️ 邀请码发送
- ✉️ 密码重置链接
- ✉️ 其他系统通知

## 🔧 故障排查

### 测试邮件发送失败？

```bash
# 1. 检查环境变量是否加载
node -e "console.log(process.env.EMAIL_API_USER)"

# 2. 检查邮件服务配置状态
# 访问 /api/features 端点查看 email 字段
curl http://localhost:3000/api/features
```

### 常见错误

| 错误信息 | 解决方案 |
|---------|---------|
| `Email service not configured` | 检查 `.env` 文件配置 |
| `Email API request failed: 401` | QQ 邮箱授权码错误，重新生成 |
| `Invalid email domain` | 收件人域名不在白名单，在系统配置添加 |
| `SMTP not configured` | 确认 `EMAIL_PROVIDER` 设置正确 |

## 📚 更多文档

详细使用说明请查看：[docs/EMAIL_INTEGRATION.md](./EMAIL_INTEGRATION.md)

## 🎯 进阶配置

### 使用其他邮箱服务商

**163 邮箱：**
```bash
EMAIL_API_HOST="smtp.163.com"
EMAIL_API_PORT="25"
```

**Gmail：**
```bash
EMAIL_API_HOST="smtp.gmail.com"
EMAIL_API_PORT="587"
```

**企业邮箱：**
```bash
EMAIL_API_HOST="smtp.exmail.qq.com"  # 腾讯企业邮箱
EMAIL_API_PORT="587"
```

### 生产环境建议

1. **使用专用邮箱**
   - 不要使用个人邮箱作为发件人
   - 申请企业邮箱或使用第三方邮件服务（SendGrid、阿里云邮件推送等）

2. **设置发送限制**
   - QQ 邮箱免费版：500 封/天
   - 163 邮箱免费版：50 封/天
   - 建议配置 Redis 限流

3. **备用发送方式**
   - 配置多个邮件服务商
   - 主服务失败时自动切换备用服务

4. **监控告警**
   - 记录邮件发送日志
   - 设置失败率告警
