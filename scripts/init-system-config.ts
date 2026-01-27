import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const allowedEmailDomains = [
  "126.com",
  "139.com",
  "163.com",
  "189.cn",
  "aliyun.com",
  "apache.org",
  "deepseek.com",
  "edu.cn",
  "edu.hk",
  "edu.mo",
  "edu.tw",
  "foxmail.com",
  "gmail.com",
  "gov.cn",
  "qq.com",
  "sina.cn",
  "sina.com",
  "sohu.com",
  "xiaomi.com",
  "yahoo.com",
  "privaterelay.appleid.com",
]

async function main() {
  console.log("🔧 Initializing system settings...")

  const settings = await prisma.siteSettings.upsert({
    where: { id: "global" },
    create: {
      id: "global",
      siteName: "预申请系统",
      siteDescription: "社区预申请与邀请码管理系统",
      contactEmail: "admin@example.com",
      preApplicationEssayHint: "建议 100 字左右,避免夸赞社区与版主,只说明你的目的与需求。",
      allowedEmailDomains: allowedEmailDomains,
    },
    update: {
      preApplicationEssayHint: "建议 100 字左右,避免夸赞社区与版主,只说明你的目的与需求。",
      allowedEmailDomains: allowedEmailDomains,
    },
  })

  console.log("✅ System settings initialized:", settings.id)

  const adminUsers = await prisma.user.findMany({
    where: { role: "ADMIN" },
    take: 1,
  })

  if (adminUsers.length > 0) {
    const firstAdmin = adminUsers[0]
    console.log(`\n🔑 Found existing ADMIN user: ${firstAdmin.email}`)
    console.log("Do you want to promote this user to SUPER_ADMIN? (yes/no)")
    console.log("\nTo promote manually, run:")
    console.log(
      `npx prisma studio\n  OR\n  npx ts-node scripts/promote-to-super-admin.ts ${firstAdmin.id}`,
    )
  } else {
    console.log("\n⚠️  No ADMIN users found. Please create one first.")
  }

  console.log("\n✨ Initialization complete!")
}

main()
  .catch((e) => {
    console.error("Error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
