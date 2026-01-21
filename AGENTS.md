# AGENTS 协作指南（中文）

本文件用于指导自动化开发代理在本项目中的协作方式与注意事项。

## 项目定位

这是一个生产就绪的 Next.js 启动模板，强调：

- App Router 架构
- TypeScript + Tailwind CSS + shadcn/ui
- Prisma + PostgreSQL
- 站内信系统（管理员发送、用户收件箱与已读状态）

## 基础命令

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

## 关键环境变量

在 `.env` 中确保以下变量存在：

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`

## 数据库与认证

- Prisma 版本锁定为 6.x
- Schema 路径：`prisma/schema.prisma`
- 管理员初始化脚本：`scripts/001-create-auth-tables.sql`
- 密码哈希规则：`SHA-256(password + AUTH_SECRET)`
- Prisma 字段类型定义输出：`types/prisma.d.ts`（执行 `npm run prisma:types`）

## 站内信功能

- 数据模型：`Message`、`MessageRecipient`
- 管理端入口：`/{locale}/admin/messages`
- 用户端入口：`/{locale}/dashboard/messages`
- 读状态字段：`MessageRecipient.readAt`

## 后台功能清单

- 用户端控制台：概览、文章管理、数据分析、设置、站内信收件箱
- 管理端：用户管理、文章审核、数据分析、系统设置、站内信管理（创建/编辑/撤回）
- 主题与语言：顶部栏支持主题切换与语言切换

## 代码与组件约定

- Server Component 不应向 Client Component 传递 React 组件/函数对象。
- UI 优先复用 `components/ui` 与现有布局组件。
- 变更保持最小化，避免无关重构。

## 文档与多语言

- 英文文档：`README.md`
- 中文文档：`README.zh-CN.md`
