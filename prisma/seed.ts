import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

const departments = [
  { name: '公司领导组', code: 'LD', isBusiness: false },
  { name: '综合处', code: 'ZH', isBusiness: true },
  { name: '计划生产处', code: 'JH', isBusiness: true },
  { name: '工艺技术处', code: 'GY', isBusiness: true },
  { name: '信息档案中心', code: 'XX', isBusiness: true },
  { name: '质量管理处', code: 'ZL', isBusiness: true },
  { name: '人力资源处', code: 'RL', isBusiness: true },
  { name: '综合财务处', code: 'CW', isBusiness: true },
  { name: '设备管理处', code: 'SB', isBusiness: true },
  { name: '行政保障处', code: 'XZ', isBusiness: true },
  { name: '保密处', code: 'BM', isBusiness: true },
  { name: '51车间', code: '51', isBusiness: true },
  { name: '53车间', code: '53', isBusiness: true },
  { name: '55车间', code: '55', isBusiness: true },
  { name: '56车间', code: '56', isBusiness: true },
  { name: '57车间', code: '57', isBusiness: true },
  { name: '58车间', code: '58', isBusiness: true },
]

const defaultPassword = '123456'

const users = [
  { username: 'admin', name: '系统管理员', role: Role.ADMIN, departmentCode: 'LD' },
  { username: 'supervisor', name: '督办管理员', role: Role.SUPERVISOR, departmentCode: 'LD' },
  { username: 'president', name: '公司主要领导', role: Role.PRESIDENT, departmentCode: 'LD' },
  { username: 'vice_president', name: '公司主管领导', role: Role.VICE_PRESIDENT, departmentCode: 'LD' },
  { username: 'dept_leader', name: '部门领导', role: Role.DEPARTMENT_LEADER, departmentCode: 'ZH' },
  { username: 'dept_manager', name: '部门主管', role: Role.DEPARTMENT_MANAGER, departmentCode: 'ZH' },
]

async function main() {
  const passwordHash = await bcrypt.hash(defaultPassword, 10)

  for (const department of departments) {
    await prisma.department.upsert({
      where: { code: department.code },
      update: {
        name: department.name,
        isBusiness: department.isBusiness,
      },
      create: department,
    })
  }

  for (const user of users) {
    const department = await prisma.department.findUnique({
      where: { code: user.departmentCode },
    })

    if (!department) {
      throw new Error(`部门 ${user.departmentCode} 不存在`)
    }

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

  console.log(`Seed completed: ${departments.length} departments, ${users.length} users`)
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
