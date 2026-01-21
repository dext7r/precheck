#!/bin/sh
# Docker 构建脚本，自动传递 Git 信息

echo "🔍 获取 Git 信息..."

GIT_COMMIT_HASH=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
GIT_COMMIT_SHORT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_COMMIT_MESSAGE=$(git log -1 --pretty=%B 2>/dev/null | tr '\n' ' ' || echo "unknown")
GIT_AUTHOR=$(git log -1 --pretty=format:'%an <%ae>' 2>/dev/null || echo "unknown")
GIT_REPO=$(git config --get remote.origin.url 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

echo "📦 构建 Docker 镜像..."
docker build \
  --build-arg GIT_COMMIT_HASH="$GIT_COMMIT_HASH" \
  --build-arg GIT_COMMIT_SHORT="$GIT_COMMIT_SHORT" \
  --build-arg GIT_COMMIT_MESSAGE="$GIT_COMMIT_MESSAGE" \
  --build-arg GIT_AUTHOR="$GIT_AUTHOR" \
  --build-arg GIT_REPO="$GIT_REPO" \
  --build-arg GIT_BRANCH="$GIT_BRANCH" \
  -t next-starter \
  "$@" \
  .

echo "✅ 构建完成！"
echo ""
echo "运行容器："
echo "  docker run -p 3000:3000 -e DATABASE_URL=your-db-url next-starter"
