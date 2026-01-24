import type { Role } from "@prisma/client"

/**
 * 权限等级定义
 * SUPER_ADMIN: 超级管理员，拥有所有权限
 * ADMIN: 普通管理员，仅审核和基础管理功能
 * USER: 普通用户
 */

// 需要超级管理员权限的操作
const SUPER_ADMIN_ONLY_ACTIONS = [
  "users:manage", // 用户管理（修改角色、状态、删除）
  "settings:manage", // 系统设置修改
  "database:reset", // 重置数据库
  "audit-logs:view", // 审计日志查看
  "email-logs:view", // 邮件日志查看
  "posts:delete", // 删除文章
  "invite-codes:delete", // 删除邀请码
  "messages:delete", // 删除站内消息
] as const

type SuperAdminAction = (typeof SUPER_ADMIN_ONLY_ACTIONS)[number]

/**
 * 检查是否为管理员（ADMIN 或 SUPER_ADMIN）
 */
export function isAdmin(role: Role | undefined | null): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN"
}

/**
 * 检查是否为超级管理员
 */
export function isSuperAdmin(role: Role | undefined | null): boolean {
  return role === "SUPER_ADMIN"
}

/**
 * 检查用户是否有权限执行特定操作
 * @param role 用户角色
 * @param action 操作类型
 * @returns 是否有权限
 */
export function hasPermission(role: Role | undefined | null, action: SuperAdminAction): boolean {
  if (!role) return false

  // 超级管理员拥有所有权限
  if (role === "SUPER_ADMIN") return true

  // ADMIN 不能执行超管专属操作
  if (SUPER_ADMIN_ONLY_ACTIONS.includes(action)) {
    return false
  }

  // ADMIN 可以执行其他管理操作
  return role === "ADMIN"
}

/**
 * 检查是否需要超级管理员权限
 */
export function requiresSuperAdmin(action: SuperAdminAction): boolean {
  return SUPER_ADMIN_ONLY_ACTIONS.includes(action)
}

/**
 * 权限检查辅助函数 - 用于 API 路由
 */
export function checkAdminPermission(
  role: Role | undefined | null,
  action?: SuperAdminAction,
): { allowed: boolean; requiresSuperAdmin: boolean } {
  if (!role) {
    return { allowed: false, requiresSuperAdmin: false }
  }

  if (!isAdmin(role)) {
    return { allowed: false, requiresSuperAdmin: false }
  }

  if (action && !hasPermission(role, action)) {
    return { allowed: false, requiresSuperAdmin: true }
  }

  return { allowed: true, requiresSuperAdmin: false }
}
