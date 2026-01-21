#!/bin/sh
# 生成部署信息文件

OUTPUT_FILE="lib/build-info.json"

echo "📝 生成部署信息..."

# 获取 Git 信息（优先使用环境变量，否则从 git 命令获取）
GIT_COMMIT_HASH="${GIT_COMMIT_HASH:-$(git rev-parse HEAD 2>/dev/null || echo "unknown")}"
GIT_COMMIT_SHORT="${GIT_COMMIT_SHORT:-$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")}"
GIT_COMMIT_MESSAGE="${GIT_COMMIT_MESSAGE:-$(git log -1 --pretty=%B 2>/dev/null || echo "unknown")}"
GIT_AUTHOR="${GIT_AUTHOR:-$(git log -1 --pretty=format:'%an <%ae>' 2>/dev/null || echo "unknown")}"
GIT_REPO="${GIT_REPO:-$(git config --get remote.origin.url 2>/dev/null || echo "unknown")}"
GIT_BRANCH="${GIT_BRANCH:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")}"

# 获取构建时间
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# 检测部署平台
if [ -n "$VERCEL" ]; then
  PLATFORM="Vercel"
  PLATFORM_URL="${VERCEL_URL:-unknown}"
elif [ -n "$NETLIFY" ]; then
  PLATFORM="Netlify"
  PLATFORM_URL="${DEPLOY_PRIME_URL:-unknown}"
elif [ -n "$RAILWAY_ENVIRONMENT" ]; then
  PLATFORM="Railway"
  PLATFORM_URL="${RAILWAY_PUBLIC_DOMAIN:-unknown}"
elif [ -n "$FLY_APP_NAME" ]; then
  PLATFORM="Fly.io"
  PLATFORM_URL="${FLY_APP_NAME}.fly.dev"
elif [ -n "$RENDER" ]; then
  PLATFORM="Render"
  PLATFORM_URL="${RENDER_EXTERNAL_URL:-unknown}"
elif [ -n "$ZEABUR_ENVIRONMENT" ]; then
  PLATFORM="Zeabur"
  PLATFORM_URL="${ZEABUR_URL:-unknown}"
else
  PLATFORM="Local/Docker"
  PLATFORM_URL="localhost"
fi

# 导出环境变量供 Next.js 使用
export NEXT_PUBLIC_BUILD_TIME="$BUILD_TIME"

# 生成 JSON 文件
cat > "$OUTPUT_FILE" << EOF
{
  "buildTime": "$BUILD_TIME",
  "platform": "$PLATFORM",
  "platformUrl": "$PLATFORM_URL",
  "git": {
    "commitHash": "$GIT_COMMIT_HASH",
    "commitShort": "$GIT_COMMIT_SHORT",
    "commitMessage": "$GIT_COMMIT_MESSAGE",
    "author": "$GIT_AUTHOR",
    "repo": "$GIT_REPO",
    "branch": "$GIT_BRANCH"
  }
}
EOF

echo "✅ 部署信息已生成: $OUTPUT_FILE"
cat "$OUTPUT_FILE"
