import { NextResponse } from "next/server"

const REPO_OWNER = "dext7r"
const REPO_NAME = "precheck"

// 构建时注入的信息
const buildTimeInfo = {
  buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || "unknown",
  commitHash: process.env.NEXT_PUBLIC_COMMIT_HASH || "unknown",
  commitHashShort: process.env.NEXT_PUBLIC_COMMIT_HASH_SHORT || "unknown",
  commitTime: process.env.NEXT_PUBLIC_COMMIT_TIME || "",
  commitAuthor: process.env.NEXT_PUBLIC_COMMIT_AUTHOR || "unknown",
  commitAuthorEmail: process.env.NEXT_PUBLIC_COMMIT_AUTHOR_EMAIL || "",
  repoUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}`,
}

// 从 GitHub API 获取最新 commit 信息
async function fetchLatestCommitFromGitHub() {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits?per_page=1`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "precheck-app",
        },
        next: { revalidate: 300 }, // 5 分钟缓存
      },
    )

    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status}`)
    }

    const commits = await res.json()
    if (!commits.length) {
      throw new Error("No commits found")
    }

    const commit = commits[0]
    return {
      commitHash: commit.sha,
      commitHashShort: commit.sha.substring(0, 7),
      commitTime: commit.commit.committer.date,
      commitAuthor: commit.commit.author.name,
      commitAuthorEmail: commit.commit.author.email,
      commitMessage: commit.commit.message.split("\n")[0], // 首行
      authorGitHub: commit.author?.login || null,
      authorAvatarUrl: commit.author?.avatar_url || null,
      commitUrl: commit.html_url,
      repoUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}`,
    }
  } catch (error) {
    console.error("Failed to fetch from GitHub:", error)
    return null
  }
}

// GET /api/build-info?source=build|github
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const source = searchParams.get("source") || "build"

  if (source === "github") {
    // 实时从 GitHub 获取
    const githubInfo = await fetchLatestCommitFromGitHub()
    if (githubInfo) {
      return NextResponse.json({
        source: "github",
        ...githubInfo,
        buildTime: buildTimeInfo.buildTime,
      })
    }
    // 降级到构建时信息
    return NextResponse.json({
      source: "build",
      fallback: true,
      ...buildTimeInfo,
      commitUrl: `${buildTimeInfo.repoUrl}/commit/${buildTimeInfo.commitHash}`,
    })
  }

  // 返回构建时信息
  return NextResponse.json({
    source: "build",
    ...buildTimeInfo,
    commitUrl: `${buildTimeInfo.repoUrl}/commit/${buildTimeInfo.commitHash}`,
  })
}
