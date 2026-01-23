import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const userId = process.argv[2]

  if (!userId) {
    console.error("Usage: npx ts-node scripts/promote-to-super-admin.ts <user-id>")
    process.exit(1)
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    console.error(`User not found: ${userId}`)
    process.exit(1)
  }

  console.log(`Promoting user ${user.email} to SUPER_ADMIN...`)

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role: "SUPER_ADMIN" },
  })

  console.log(`✅ User ${updated.email} is now SUPER_ADMIN`)
}

main()
  .catch((e) => {
    console.error("Error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
