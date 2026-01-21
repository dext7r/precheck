# Claude 使用指南

本文件用于说明本项目的基本信息与常用操作，方便在使用 Claude 辅助开发时快速对齐上下文。

## 项目概览

- Next.js 16 App Router + React
- TypeScript + Tailwind CSS + shadcn/ui
- Prisma ORM + PostgreSQL
- 站内信（管理员发送、用户收件箱与已读状态）

## 常用命令

```bash
npm run dev
npm run build
npm run lint
```

## 代码质量

```bash
npm run format
npm run format:check
npm run lint
npm run lint:fix
npm run typecheck
npm run fix:check
```

## 数据库与 Prisma

- Prisma 版本：6.x（已与当前 schema 兼容）
- Schema：`prisma/schema.prisma`
- 常用命令：

```bash
npx prisma generate
npm run prisma:types
npx prisma db push
npx prisma studio
```

- Prisma 字段类型定义输出：`types/prisma.d.ts`

## 站内信功能

- 数据表：`Message`、`MessageRecipient`（见 `prisma/schema.prisma`）
- 管理端入口：`/{locale}/admin/messages`
- 用户端入口：`/{locale}/dashboard/messages`
- 读状态通过 `MessageRecipient.readAt` 记录

## 后台功能清单

- 用户端控制台：概览、文章管理、数据分析、设置、站内信收件箱
- 管理端：用户管理、文章审核、数据分析、系统设置、站内信管理（创建/编辑/撤回）
- 主题与语言：顶部栏支持主题切换与语言切换

## 环境变量

请确保 `.env` 中包含以下关键变量：

- `DATABASE_URL`：数据库连接串
- `AUTH_SECRET`：密码哈希所需密钥
- `NEXT_PUBLIC_APP_URL`：用于 OAuth 回调等场景

## 认证与管理员

登录密码校验使用 `SHA-256(password + AUTH_SECRET)`，初始化脚本位于：

- `scripts/001-create-auth-tables.sql`

## 开发注意事项

- Server Component 只能向 Client Component 传递可序列化数据，避免传入 React 组件/函数对象。
- 组件尽量复用 `components/ui` 与 `components/sections` 现有样式与结构。
