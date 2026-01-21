import { NextResponse } from "next/server"
import { readFileSync } from "fs"
import { join } from "path"

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

export async function GET() {
  const buildInfo = getBuildInfo()

  return NextResponse.json({
    status: "ok",
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
  })
}
