import { execSync } from "child_process"

let withBundleAnalyzer = (config) => config

if (process.env.ANALYZE === "true") {
  try {
    const { default: bundleAnalyzer } = await import("@next/bundle-analyzer")
    withBundleAnalyzer = bundleAnalyzer({ enabled: true })
  } catch (error) {
    console.warn("Missing @next/bundle-analyzer. Install it to enable bundle analysis.", error)
  }
}

// 获取 Git 信息
function getGitInfo() {
  try {
    const commitHash = execSync("git rev-parse HEAD").toString().trim()
    const commitHashShort = execSync("git rev-parse --short HEAD").toString().trim()
    const commitTime = execSync("git log -1 --format=%cI").toString().trim()
    const commitAuthor = execSync("git log -1 --format=%an").toString().trim()
    const commitAuthorEmail = execSync("git log -1 --format=%ae").toString().trim()
    return {
      commitHash,
      commitHashShort,
      commitTime,
      commitAuthor,
      commitAuthorEmail,
    }
  } catch {
    return {
      commitHash: "unknown",
      commitHashShort: "unknown",
      commitTime: new Date().toISOString(),
      commitAuthor: "unknown",
      commitAuthorEmail: "",
    }
  }
}

const gitInfo = getGitInfo()

// 构建时间 (UTC+8)
const buildTime = new Date().toLocaleString("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "prisma"],
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error"],
          }
        : false,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  env: {
    NEXT_PUBLIC_BUILD_TIME: buildTime,
    NEXT_PUBLIC_COMMIT_HASH: gitInfo.commitHash,
    NEXT_PUBLIC_COMMIT_HASH_SHORT: gitInfo.commitHashShort,
    NEXT_PUBLIC_COMMIT_TIME: gitInfo.commitTime,
    NEXT_PUBLIC_COMMIT_AUTHOR: gitInfo.commitAuthor,
    NEXT_PUBLIC_COMMIT_AUTHOR_EMAIL: gitInfo.commitAuthorEmail,
  },
}

export default withBundleAnalyzer(nextConfig)
