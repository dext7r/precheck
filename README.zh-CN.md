# Next 启动模板

[English](README.md) | 简体中文

一个生产就绪的 Next.js 启动模板，包含 React、TypeScript、Tailwind CSS、shadcn/ui、Prisma 和 Docker 支持。

## 功能特性

- **Next.js 16** - 最新 App Router 与 React Server Components
- **TypeScript** - 严格模式下的完整类型安全
- **Tailwind CSS v4** - 实用优先的样式方案
- **shadcn/ui** - 美观且可访问的组件库
- **Framer Motion** - 流畅的动画效果
- **Lucide Icons** - 高质量图标库
- **Prisma** - 类型安全的数据库 ORM
- **Docker** - 容器化部署支持
- **富文本编辑器** - 基于 Tiptap 的编辑与预览模式
- **站内信** - 管理员发送、用户收件箱与已读状态
- **主题与语言** - 浅色/深色主题切换 + 语言切换
- **多平台部署** - 可部署到 Vercel、Cloudflare、Netlify、Railway、Fly.io 等

## 快速开始

```bash
# 克隆仓库
npx create-next-app -e https://github.com/h7ml/next-starter next-starter

# 进入项目目录
cd next-starter

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env

# 启动开发服务器
npm run dev
```

## 数据库设置

```bash
# 生成 Prisma Client
npx prisma generate

# 生成 Prisma 字段类型定义（d.ts）
npm run prisma:types

# 推送 schema 到数据库
npx prisma db push

# 打开 Prisma Studio
npx prisma studio
```

生成的类型定义会输出到 `types/prisma.d.ts`。

## 站内信功能

- 管理员可创建并管理站内信，支持全选、按角色、按状态、指定用户发送。
- 用户可在 `/{locale}/dashboard/messages` 查看与阅读，支持已读/未读状态。
- 控制台铃铛展示最新一条站内信并跳转到收件箱。

## 后台功能概览

- **用户端控制台**：概览、文章管理、数据分析、设置、站内信收件箱。
- **管理端**：用户管理、文章审核、数据分析、系统设置、站内信管理（创建/编辑/撤回）。
- **权限**：基于 Session 的登录态与角色校验，管理端仅管理员可访问。
- **主题**：顶部栏与控制台支持主题切换。
- **语言**：顶部栏与控制台支持语言切换。

## 代码质量

```bash
# 格式化代码
npm run format

# 检查格式
npm run format:check

# 代码检查（ESLint + TSLint）
npm run lint

# 修复 lint
npm run lint:fix

# TypeScript 类型检查
npm run typecheck

# 一键修复后完整检查
npm run fix:check
```

## Docker 部署

```bash
# 使用 Docker Compose 构建并运行
docker compose up -d

# 或手动构建
docker build -t next-starter .
docker run -p 3000:3000 next-starter
```

## 项目结构

```
├── app/                  # Next.js App Router 页面
│   ├── api/             # API 路由
│   ├── docs/            # 文档页面
│   └── page.tsx         # 首页
├── components/          # React 组件
│   ├── layout/          # 布局组件
│   ├── sections/        # 页面区块
│   ├── providers/       # 上下文提供者
│   └── ui/              # shadcn/ui 组件
├── lib/                 # 工具库
│   ├── db.ts           # Prisma 客户端
│   ├── env.ts          # 环境变量校验
│   └── utils.ts        # 通用工具函数
├── prisma/              # 数据库
│   └── schema.prisma   # Prisma 模型
├── Dockerfile          # Docker 配置
├── docker-compose.yml  # Docker Compose 配置
├── fly.toml            # Fly.io 配置
├── netlify.toml        # Netlify 配置
├── railway.yaml        # Railway 配置
└── vercel.json         # Vercel 配置
```

## 部署

| 平台             | 指南                                    |
| ---------------- | --------------------------------------- |
| Vercel           | [Deploy](https://vercel.com/new)        |
| Cloudflare Pages | [Deploy](https://pages.cloudflare.com)  |
| Netlify          | [Deploy](https://app.netlify.com/start) |
| Railway          | [Deploy](https://railway.app/new)       |
| Fly.io           | `fly launch && fly deploy`              |
| Deno Deploy      | [Deploy](https://deno.com/deploy)       |

## 许可证

MIT License - 你可以自由地将该模板用于任何项目。
