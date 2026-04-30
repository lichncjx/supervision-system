import { PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== Prisma Client 验证 ===\n')

  const deptCount = await prisma.department.count()
  console.log(`1. 部门总数: ${deptCount}`)
  console.assert(deptCount === 17, `期望17个部门，实际${deptCount}个`)

  const businessDeptCount = await prisma.department.count({
    where: { isBusiness: true }
  })
  console.log(`2. 业务部门数: ${businessDeptCount}`)
  console.assert(businessDeptCount === 16, `期望16个业务部门，实际${businessDeptCount}个`)

  const userCount = await prisma.user.count()
  console.log(`3. 用户总数: ${userCount}`)
  console.assert(userCount === 6, `期望6个用户，实际${userCount}个`)

  const adminUser = await prisma.user.findUnique({
    where: { username: 'admin' }
  })
  console.log(`4. admin 用户角色: ${adminUser?.role}`)
  console.assert(adminUser?.role === Role.ADMIN, `期望 Role.ADMIN，实际${adminUser?.role}`)

  console.log('\n=== 所有验证通过! ===')
}

main()
  .then(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
