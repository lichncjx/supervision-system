import 'dotenv/config'
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

const ADMIN_USERNAME = 'admin'
const SYSTEM_DEPARTMENT = {
  name: '公司领导组',
  code: 'LD',
  isBusiness: false,
} as const

function getInitialPassword() {
  const password = process.env.INITIAL_ADMIN_PASSWORD?.trim()

  if (!password || password.length < 6) {
    throw new Error('INITIAL_ADMIN_PASSWORD 必须是至少 6 位的一次性初始密码')
  }

  return password
}

async function main() {
  const [existingAdmin, existingUsername] = await Promise.all([
    prisma.user.findFirst({ where: { role: Role.ADMIN }, select: { username: true } }),
    prisma.user.findUnique({ where: { username: ADMIN_USERNAME }, select: { role: true } }),
  ])

  if (existingAdmin || existingUsername) {
    throw new Error(
      `管理员初始化已完成，拒绝覆盖现有账号${existingAdmin ? `：${existingAdmin.username}` : ''}`,
    )
  }

  const passwordHash = await bcrypt.hash(getInitialPassword(), 10)

  await prisma.$transaction(async (tx) => {
    let department = await tx.department.findUnique({
      where: { code: SYSTEM_DEPARTMENT.code },
    })

    if (!department) {
      department = await tx.department.create({ data: SYSTEM_DEPARTMENT })
    }

    await tx.user.create({
      data: {
        username: ADMIN_USERNAME,
        passwordHash,
        name: '系统管理员',
        role: Role.ADMIN,
        departmentId: department.id,
        isActive: true,
      },
    })
  })

  console.log('管理员初始化完成：已创建 admin；请首次登录后立即修改初始密码。')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error: unknown) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
