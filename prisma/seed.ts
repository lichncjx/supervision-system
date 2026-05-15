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

const defaultPassword = '123456'

const users = [
  { username: 'admin', name: '系统管理员', role: Role.ADMIN, departmentCode: 'LD' },
  { username: 'supervisor', name: '督办管理员', role: Role.SUPERVISOR, departmentCode: 'LD' },
  { username: 'president', name: '公司主要领导', role: Role.PRESIDENT, departmentCode: 'LD' },
  { username: 'vice_president', name: '公司主管领导', role: Role.VICE_PRESIDENT, departmentCode: 'LD' },
  { username: 'dept_leader', name: '部门领导', role: Role.DEPARTMENT_LEADER, departmentCode: 'ZH' },
  { username: 'dept_manager', name: '部门主管', role: Role.DEPARTMENT_MANAGER, departmentCode: 'ZH' },
  { username: 'dept_leader_2', name: '计划生产处领导', role: Role.DEPARTMENT_LEADER, departmentCode: 'JH' },
  { username: 'dept_manager_2', name: '计划生产处主管', role: Role.DEPARTMENT_MANAGER, departmentCode: 'JH' },
]

// Each business department gets 2–4 members, at least 1 with isLeader=true.
// Some members are optionally bound to existing system users via userId.
// userId bindings are resolved at seed time by looking up users by username.
const membersByDept: Record<string, { name: string; phone: string | null; isLeader: boolean; sortOrder: number; bindUsername?: string }[]> = {
  ZH: [
    { name: '张处长', phone: null, isLeader: true, sortOrder: 1, bindUsername: 'dept_leader' },
    { name: '李主管', phone: null, isLeader: false, sortOrder: 2, bindUsername: 'dept_manager' },
    { name: '王干事', phone: null, isLeader: false, sortOrder: 3 },
  ],
  JH: [
    { name: '赵处长', phone: null, isLeader: true, sortOrder: 1, bindUsername: 'dept_leader_2' },
    { name: '钱主管', phone: null, isLeader: false, sortOrder: 2, bindUsername: 'dept_manager_2' },
    { name: '孙干事', phone: null, isLeader: false, sortOrder: 3 },
  ],
  GY: [
    { name: '周处长', phone: null, isLeader: true, sortOrder: 1 },
    { name: '吴主管', phone: null, isLeader: false, sortOrder: 2 },
  ],
  XD: [
    { name: '郑主任', phone: null, isLeader: true, sortOrder: 1 },
    { name: '冯主管', phone: null, isLeader: false, sortOrder: 2 },
  ],
  ZL: [
    { name: '陈处长', phone: null, isLeader: true, sortOrder: 1 },
    { name: '褚主管', phone: null, isLeader: false, sortOrder: 2 },
  ],
  RL: [
    { name: '卫处长', phone: null, isLeader: true, sortOrder: 1 },
    { name: '蒋主管', phone: null, isLeader: false, sortOrder: 2 },
  ],
  CW: [
    { name: '沈处长', phone: null, isLeader: true, sortOrder: 1 },
    { name: '韩主管', phone: null, isLeader: false, sortOrder: 2 },
  ],
  SB: [
    { name: '杨处长', phone: null, isLeader: true, sortOrder: 1 },
    { name: '朱主管', phone: null, isLeader: false, sortOrder: 2 },
  ],
  XB: [
    { name: '秦处长', phone: null, isLeader: true, sortOrder: 1 },
    { name: '尤主管', phone: null, isLeader: false, sortOrder: 2 },
  ],
  BM: [
    { name: '许处长', phone: null, isLeader: true, sortOrder: 1 },
    { name: '何主管', phone: null, isLeader: false, sortOrder: 2 },
  ],
  '51': [
    { name: '吕主任', phone: null, isLeader: true, sortOrder: 1 },
    { name: '施主管', phone: null, isLeader: false, sortOrder: 2 },
    { name: '张技术员', phone: null, isLeader: false, sortOrder: 3 },
  ],
  '53': [
    { name: '孔主任', phone: null, isLeader: true, sortOrder: 1 },
    { name: '曹主管', phone: null, isLeader: false, sortOrder: 2 },
  ],
  '55': [
    { name: '严主任', phone: null, isLeader: true, sortOrder: 1 },
    { name: '华主管', phone: null, isLeader: false, sortOrder: 2 },
  ],
  '56': [
    { name: '金主任', phone: null, isLeader: true, sortOrder: 1 },
    { name: '魏主管', phone: null, isLeader: false, sortOrder: 2 },
  ],
  '57': [
    { name: '陶主任', phone: null, isLeader: true, sortOrder: 1 },
    { name: '姜主管', phone: null, isLeader: false, sortOrder: 2 },
  ],
  '58': [
    { name: '戚主任', phone: null, isLeader: true, sortOrder: 1 },
    { name: '谢主管', phone: null, isLeader: false, sortOrder: 2 },
  ],
}

async function main() {
  const passwordHash = await bcrypt.hash(defaultPassword, 10)

  for (const department of departments) {
    await prisma.department.upsert({
      where: { name: department.name },
      update: {
        code: department.code,
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

  // Seed members for each business department.
  // Members lack a natural unique key besides id/userId, so we delete all and recreate
  // to keep the seed idempotent.
  await prisma.member.deleteMany()
  let memberCount = 0

  for (const [deptCode, memberDefs] of Object.entries(membersByDept)) {
    const department = await prisma.department.findUnique({ where: { code: deptCode } })
    if (!department) {
      console.warn(`跳过 members: 部门 ${deptCode} 不存在`)
      continue
    }

    for (const def of memberDefs) {
      let userId: number | undefined
      if (def.bindUsername) {
        const user = await prisma.user.findUnique({ where: { username: def.bindUsername } })
        userId = user?.id ?? undefined
        if (!user) {
          console.warn(`Member "${def.name}" bindUsername="${def.bindUsername}" 未找到对应 User，跳过绑定`)
        }
      }

      await prisma.member.create({
        data: {
          name: def.name,
          departmentId: department.id,
          phone: def.phone,
          isLeader: def.isLeader,
          sortOrder: def.sortOrder,
          isActive: true,
          userId,
        },
      })
      memberCount++
    }
  }

  console.log(
    `Seed completed: ${departments.length} departments, ${users.length} users, ${memberCount} members`,
  )
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
