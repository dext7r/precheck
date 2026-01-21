#!/bin/bash
set -e

echo "🔍 检查现有机器..."
MACHINES=$(fly machines list --json 2>/dev/null || echo "[]")

if [ "$MACHINES" != "[]" ]; then
  echo "🛑 停止并删除所有现有机器..."
  echo "$MACHINES" | jq -r '.[].id' | while read -r machine_id; do
    echo "  删除机器: $machine_id"
    fly machines remove "$machine_id" --force || true
  done
  echo "✅ 所有机器已删除"
else
  echo "ℹ️  没有找到现有机器"
fi

echo ""
echo "🚀 开始部署..."
fly deploy

echo ""
echo "✅ 部署完成！"
