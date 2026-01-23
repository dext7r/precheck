#!/bin/bash

echo "🔄 完全重启开发服务器..."

# 1. 清理 Next.js 缓存
echo "📦 清理 .next 缓存..."
rm -rf .next

# 2. 验证环境变量
echo ""
echo "✅ 验证环境变量配置："
if [ -f .env ]; then
    echo "   .env 文件存在"

    # 检查关键配置
    if grep -q "^EMAIL_PROVIDER=" .env; then
        EMAIL_PROVIDER=$(grep "^EMAIL_PROVIDER=" .env | cut -d'=' -f2 | tr -d '"')
        echo "   EMAIL_PROVIDER = $EMAIL_PROVIDER"
    fi

    if grep -q "^EMAIL_API_USER=" .env; then
        echo "   EMAIL_API_USER = ✅ 已配置"
    fi

    if grep -q "^REDIS_URL=" .env; then
        echo "   REDIS_URL = ✅ 已配置"
    fi
else
    echo "   ❌ .env 文件不存在"
    exit 1
fi

echo ""
echo "🚀 启动开发服务器..."
echo "   提示：按 Ctrl+C 停止服务器"
echo ""

# 3. 启动开发服务器
bun run dev
