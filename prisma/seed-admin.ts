import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

const departments = [
  { name: '公司领导组', code: 'LD', isBusiness: false },
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
]

const users = [
  {
    username: 'admin',
    name: '系统管理员',
    role: Role.ADMIN,
    departmentCode: 'LD',
    passwordEnv: 'INITIAL_ADMIN_PASSWORD',
  },
  {
    username: 'supervisor',
    name: '督办管理员',
    role: Role.SUPERVISOR,
    departmentCode: 'LD',
    passwordEnv: 'INITIAL_SUPERVISOR_PASSWORD',
  },
] as const

function getInitialPassword(envName: string) {
  const password = process.env[envName]

  if (password) {
    return password
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(`生产环境必须设置 ${envName}`)
  }

  console.warn(`非生产环境未设置 ${envName}，将使用开发默认密码 123456。正式部署禁止使用该默认密码。`)
  return '123456'
}

async function upsertDepartment(department: (typeof departments)[number]) {
  const existing = await prisma.department.findFirst({
    where: {
      OR: [{ code: department.code }, { name: department.name }],
    },
  })

  if (existing) {
    return prisma.department.update({
      where: { id: existing.id },
      data: department,
    })
  }

  return prisma.department.create({
    data: department,
  })
}

async function main() {
  for (const department of departments) {
    await upsertDepartment(department)
  }

  for (const user of users) {
    const department = await prisma.department.findUnique({
      where: { code: user.departmentCode },
    })

    if (!department) {
      throw new Error(`部门 ${user.departmentCode} 不存在`)
    }

    const passwordHash = await bcrypt.hash(getInitialPassword(user.passwordEnv), 10)

    await prisma.user.upsert({
      where: { username: user.username },
      update: {
        passwordHash,
        name: user.name,
        role: user.role,
        departmentId: department.id,
        isActive: true,
      },
      create: {
        username: user.username,
        passwordHash,
        name: user.name,
        role: user.role,
        departmentId: department.id,
        isActive: true,
      },
    })
  }

  console.log(`Seed admin completed: ${departments.length} departments, ${users.length} users`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
