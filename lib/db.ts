import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient | null {
  // 构建时跳过数据库连接
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return null
  }

  if (!process.env.DATABASE_URL) {
    return null
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    transactionOptions: {
      maxWait: 10000, // 最大等待时间 10s
      timeout: 30000, // 事务超时 30s
    },
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production" && db) {
  globalForPrisma.prisma = db
}

// 辅助函数：检查数据库是否可用
export function isDatabaseAvailable(): boolean {
  return db !== null
}

// 辅助函数：获取数据库实例（如果不可用则抛出错误）
export function requireDb(): PrismaClient {
  if (!db) {
    throw new Error("Database not configured. Please set DATABASE_URL environment variable.")
  }
  return db
}
