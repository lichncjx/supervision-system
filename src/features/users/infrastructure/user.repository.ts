import { Role, WorkItemStatus } from '@prisma/client'
import { prisma } from '@/shared/db/prisma'

// ── Company leaders (used by workflow + users routes) ──

export async function findCompanyLeaders() {
  return prisma.user.findMany({
    where: {
      role: { in: [Role.PRESIDENT, Role.VICE_PRESIDENT] },
      isActive: true,
    },
    select: { id: true, name: true },
  })
}

export async function findCompanyLeadersWithDepartment() {
  return prisma.user.findMany({
    where: {
      role: { in: [Role.PRESIDENT, Role.VICE_PRESIDENT] },
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      role: true,
      departmentId: true,
      department: { select: { name: true } },
    },
    orderBy: [{ role: 'asc' }, { id: 'asc' }],
  })
}

export async function findPresident() {
  return prisma.user.findFirst({
    where: { role: Role.PRESIDENT, isActive: true },
    orderBy: { id: 'asc' },
    select: { id: true },
  })
}

export async function findActiveCompanyLeaderById(userId: number) {
  return prisma.user.findFirst({
    where: {
      id: userId,
      role: { in: [Role.PRESIDENT, Role.VICE_PRESIDENT] },
      isActive: true,
    },
    select: { id: true, role: true },
  })
}

// ── User CRUD (used by users management routes) ──

export async function findAllUsers() {
  return prisma.user.findMany({
    include: { department: true },
    orderBy: { id: 'asc' },
  })
}

export async function findUserById(id: number) {
  return prisma.user.findUnique({
    where: { id },
    include: { department: true },
  })
}

export async function findUserWithPasswordById(id: number) {
  return prisma.user.findUnique({
    where: { id },
  })
}

export async function findUserByUsername(username: string) {
  return prisma.user.findUnique({
    where: { username },
  })
}

export async function findUserByUsernameWithDepartment(username: string) {
  return prisma.user.findUnique({
    where: { username },
    include: { department: true },
  })
}

export async function createUser(data: {
  username: string
  passwordHash: string
  name: string
  role: Role
  departmentId: number
  email?: string | null
  phone?: string | null
}) {
  return prisma.user.create({
    data: { ...data, isActive: true },
    include: { department: true },
  })
}

export async function updateUser(
  id: number,
  data: Record<string, unknown>,
) {
  return prisma.user.update({
    where: { id },
    data,
    include: { department: true },
  })
}

export async function deleteUser(id: number) {
  await prisma.user.delete({ where: { id } })
}

export async function countOpenResponsibleWorks(userId: number) {
  return prisma.workItem.count({
    where: {
      responsiblePersonUserId: userId,
      status: {
        notIn: [WorkItemStatus.COMPLETED, WorkItemStatus.CANCELLED],
      },
    },
  })
}

// ── Department user queries (used by department-leaders/managers/by-department) ──

export async function findUsersByDepartment(
  departmentId: number,
  role?: Role,
) {
  return prisma.user.findMany({
    where: {
      departmentId,
      ...(role ? { role } : {}),
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      role: true,
      departmentId: true,
      department: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  })
}
