import 'dotenv/config'
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

const ADMIN_USERNAME = 'admin'
const SYSTEM_DEPARTMENT_CODE = 'LD'
const BASE_DEPARTMENTS = [
  { name: '公司领导组', code: SYSTEM_DEPARTMENT_CODE, isBusiness: false },
  { name: '综合处', code: 'ZH', isBusiness: true },
  { name: '计划生产处', code: 'JH', isBusiness: true },
  { name: '工艺技术处', code: 'GY', isBusiness: true },
  { name: '信息档案中心', code: 'XD', isBusiness: true },
  { name: '质量管理处', code: 'ZL', isBusiness: true },
  { name: '人力资源处', code: 'RL', isBusiness: true },
  { name: '综合财务处', code: 'CW', isBusiness: true },
  { name: '设备管理处', code: 'SB', isBusiness: true },
  { name: '行政保障处', code: 'XB', isBusiness: true },
  { name: '保密处', code: 'BM', isBusiness: true },
  { name: '51车间', code: '51', isBusiness: true },
  { name: '53车间', code: '53', isBusiness: true },
  { name: '55车间', code: '55', isBusiness: true },
  { name: '56车间', code: '56', isBusiness: true },
  { name: '57车间', code: '57', isBusiness: true },
  { name: '58车间', code: '58', isBusiness: true },
] as const

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
    for (const baseDepartment of BASE_DEPARTMENTS) {
      const existingDepartment = await tx.department.findFirst({
        where: {
          OR: [{ code: baseDepartment.code }, { name: baseDepartment.name }],
        },
      })

      if (!existingDepartment) {
        await tx.department.create({ data: baseDepartment })
        continue
      }

      if (
        existingDepartment.code !== baseDepartment.code ||
        existingDepartment.name !== baseDepartment.name
      ) {
        throw new Error(
          `基础部门存在名称或编码冲突：${baseDepartment.name}（${baseDepartment.code}）`,
        )
      }
    }

    const systemDepartment = await tx.department.findUniqueOrThrow({
      where: { code: SYSTEM_DEPARTMENT_CODE },
    })

    await tx.user.create({
      data: {
        username: ADMIN_USERNAME,
        passwordHash,
        name: '系统管理员',
        role: Role.ADMIN,
        departmentId: systemDepartment.id,
        isActive: true,
      },
    })
  })

  console.log(
    `管理员初始化完成：已准备 ${BASE_DEPARTMENTS.length} 个基础部门并创建 admin；请首次登录后立即修改初始密码。`,
  )
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
