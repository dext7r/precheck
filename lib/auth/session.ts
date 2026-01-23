import type { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { db } from "@/lib/db"
import { authConfig } from "./config"

const SESSION_COOKIE_NAME = "session_token"

// 生成 Session Token
export function generateSessionToken(): string {
  return crypto.randomUUID() + crypto.randomUUID()
}

// 创建 Session
export async function createSession(userId: string): Promise<{ token: string; expires: Date }> {
  if (!db) {
    throw new Error("Database not configured. Please set DATABASE_URL environment variable.")
  }

  const prisma = db
  const token = generateSessionToken()
  const expires = new Date(Date.now() + authConfig.session.maxAge * 1000)

  await prisma.session.create({
    data: {
      sessionToken: token,
      userId,
      expires,
    },
  })

  return { token, expires }
}

// 设置 Session Cookie（用于 Route Handler 响应）
export function setSessionCookie(response: NextResponse, token: string, expires: Date) {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires,
    path: "/",
  })
}

// 清理 Session Cookie（用于 Route Handler 响应）
export function clearSessionCookie(response: NextResponse) {
  response.cookies.delete(SESSION_COOKIE_NAME)
}

// 获取当前 Session
export async function getSession() {
  if (!db) {
    return null
  }

  const prisma = db
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!token) return null

  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    include: { user: true },
  })

  if (!session || session.expires < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } })
    }
    return null
  }

  return session
}

// 获取当前用户
export async function getCurrentUser() {
  const session = await getSession()
  return session?.user || null
}

// 删除 Session（登出）
export async function deleteSession() {
  if (!db) {
    return
  }

  const prisma = db
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (token) {
    await prisma.session.deleteMany({ where: { sessionToken: token } })
    cookieStore.delete(SESSION_COOKIE_NAME)
  }
}

// 检查是否已认证
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession()
  return !!session
}

// 检查是否是管理员
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === "ADMIN"
}

// 检查是否是超级管理员
export async function isSuperAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === "SUPER_ADMIN"
}

// 检查是否是管理员或更高级别
export async function isAdminOrAbove(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === "ADMIN" || user?.role === "SUPER_ADMIN"
}
