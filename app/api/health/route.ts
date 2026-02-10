import { NextResponse } from "next/server"
import { readFileSync } from "fs"
import { join } from "path"
import { db } from "@/lib/db"
import { isRedisAvailable } from "@/lib/redis"
import { isEmailConfigured } from "@/lib/email/mailer"
import { features } from "@/lib/features"
import { getSession } from "@/lib/auth/session"

export const runtime = "nodejs"

// 默认构建信息
const defaultBuildInfo = {
  buildTime: "unknown",
  platform: "unknown",
  platformUrl: "unknown",
  git: {
    commitHash: "unknown",
    commitShort: "unknown",
    commitMessage: "unknown",
    author: "unknown",
    repo: "unknown",
    branch: "unknown",
  },
}

// 读取构建信息
function getBuildInfo() {
  try {
    const buildInfoPath = join(process.cwd(), "lib", "build-info.json")
    const content = readFileSync(buildInfoPath, "utf-8")
    return JSON.parse(content)
  } catch {
    return defaultBuildInfo
  }
}

type ServiceStatus = "up" | "down" | "degraded" | "unconfigured"

interface ServiceInfo {
  status: ServiceStatus
  latency?: number
}

// 检测数据库状态
async function checkDatabase(): Promise<ServiceInfo> {
  if (!db) {
    return { status: "unconfigured" }
  }
  const start = Date.now()
  try {
    await db.$queryRaw`SELECT 1`
    return { status: "up", latency: Date.now() - start }
  } catch {
    return { status: "down" }
  }
}

// 检测 Redis 状态
async function checkRedis(): Promise<ServiceInfo> {
  if (!features.redis) {
    return { status: "unconfigured" }
  }
  const start = Date.now()
  try {
    const available = await isRedisAvailable()
    return { status: available ? "up" : "down", latency: Date.now() - start }
  } catch {
    return { status: "down" }
  }
}

// 检测邮件服务状态
async function checkEmail(): Promise<ServiceInfo> {
  try {
    const configured = await isEmailConfigured()
    return { status: configured ? "up" : "unconfigured" }
  } catch {
    return { status: "down" }
  }
}

// 检测 Turnstile 配置
function checkTurnstile(): ServiceInfo {
  const configured = !!process.env.TURNSTILE_SECRET_KEY
  return { status: configured ? "up" : "unconfigured" }
}

// 检测 OAuth GitHub
function checkOAuthGitHub(): ServiceInfo {
  return { status: features.oauth.github ? "up" : "unconfigured" }
}

// 检测 OAuth Google
function checkOAuthGoogle(): ServiceInfo {
  return { status: features.oauth.google ? "up" : "unconfigured" }
}

// 检测 OAuth LinuxDo
function checkOAuthLinuxDo(): ServiceInfo {
  return { status: features.oauth.linuxdo ? "up" : "unconfigured" }
}

// 检测 Cloudflare AI
function checkCloudflareAI(): ServiceInfo {
  return { status: features.cloudflareAI ? "up" : "unconfigured" }
}

// 检测文件上传
function checkFileUpload(): ServiceInfo {
  return { status: features.fileUpload ? "up" : "unconfigured" }
}

// 计算整体状态
function computeOverallStatus(services: Record<string, ServiceInfo>): "ok" | "degraded" | "down" {
  const statuses = Object.values(services)
  // 核心服务
  const coreServices = ["database"]
  const coreDown = coreServices.some((key) => services[key]?.status === "down")
  if (coreDown) return "down"

  // 任意服务 down 则 degraded
  const anyDown = statuses.some((s) => s.status === "down")
  if (anyDown) return "degraded"

  return "ok"
}

export async function GET() {
  const buildInfo = getBuildInfo()

  // 检测所有服务
  const [database, redis, email] = await Promise.all([checkDatabase(), checkRedis(), checkEmail()])

  const services: Record<string, ServiceInfo> = {
    database,
    redis,
    email,
    turnstile: checkTurnstile(),
    oauthGithub: checkOAuthGitHub(),
    oauthGoogle: checkOAuthGoogle(),
    oauthLinuxdo: checkOAuthLinuxDo(),
    cloudflareAI: checkCloudflareAI(),
    fileUpload: checkFileUpload(),
  }

  const overallStatus = computeOverallStatus(services)

  // 检查是否是管理员（仅管理员可见服务详情）
  let isAdminUser = false
  try {
    const session = await getSession()
    isAdminUser = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN"
  } catch {
    // 非管理员
  }

  const baseResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    deployment: {
      buildTime: buildInfo.buildTime,
      platform: buildInfo.platform,
      platformUrl: buildInfo.platformUrl,
      git: {
        commitHash: buildInfo.git.commitHash,
        commitShort: buildInfo.git.commitShort,
        commitMessage: buildInfo.git.commitMessage,
        author: buildInfo.git.author,
        repo: buildInfo.git.repo,
        branch: buildInfo.git.branch,
      },
    },
  }

  // 管理员可见完整服务详情
  if (isAdminUser) {
    const mem = process.memoryUsage()
    return NextResponse.json({
      ...baseResponse,
      services,
      runtime: {
        nodeVersion: process.version,
        memoryUsage: {
          rss: mem.rss,
          heapUsed: mem.heapUsed,
          heapTotal: mem.heapTotal,
          external: mem.external,
        },
      },
    })
  }

  return NextResponse.json(baseResponse)
}
