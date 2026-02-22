/**
 * 构建重定向 URL，优先使用 NEXT_PUBLIC_APP_URL 避免 Docker 容器内 0.0.0.0 问题
 */
export function buildRedirectUrl(path: string, fallbackUrl: string): URL {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || fallbackUrl
  return new URL(path, baseUrl)
}
