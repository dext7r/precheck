# Precheck QQ Bot 插件

配套 [AstrBot](https://github.com/Soulter/AstrBot) 使用的 QQ 群验证码生成插件。

## 安装

1. 将 `precheck_verify` 文件夹复制到 AstrBot 的 `plugins` 目录
2. 设置环境变量：
   ```bash
   export PRECHECK_API_URL="https://your-site.com/api/qq-bot/generate-code"
   export PRECHECK_BOT_SECRET="your-secret-key"
   ```
3. 重启 AstrBot

## 配置

| 环境变量 | 说明 | 示例 |
|---------|------|------|
| `PRECHECK_API_URL` | Precheck 网站的验证码 API 地址 | `https://example.com/api/qq-bot/generate-code` |
| `PRECHECK_BOT_SECRET` | 与网站 `QQ_BOT_SECRET` 环境变量保持一致 | `your-secret-key` |

## 使用

在 QQ 群中发送：

```
/验证码
```

机器人会返回一个验证码，用户可以在网站上使用该验证码完成 QQ 号验证。

## 网站端配置

确保网站的 `.env` 中设置了相同的密钥：

```env
QQ_BOT_SECRET=your-secret-key
```
