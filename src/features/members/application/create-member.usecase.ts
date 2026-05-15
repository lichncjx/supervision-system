import { prisma } from '@/shared/db/prisma'
import { toMemberResponse, type MemberResponse } from '@/features/members/application/member.dto'

export interface CreateMemberInput {
  name: string
  departmentId: number
  phone?: string | null
  isLeader: boolean
  sortOrder: number
  userId?: number | null
  importFromUserId?: number
}

export type CreateMemberResult =
  | { kind: 'ok'; data: MemberResponse; warnings?: string[] }
  | { kind: 'error'; status: number; message: string }

export async function createMemberUseCase(
  input: CreateMemberInput,
): Promise<CreateMemberResult> {
  let resolvedName = input.name
  let resolvedDepartmentId = input.departmentId
  let resolvedPhone = input.phone ?? null
  let resolvedUserId = input.userId ?? null

  if (input.importFromUserId) {
    const importUser = await prisma.user.findUnique({
      where: { id: input.importFromUserId },
      include: { department: true },
    })
    if (!importUser) {
      return { kind: 'error', status: 400, message: '导入用户不存在' }
    }
    resolvedName = input.name || importUser.name
    resolvedDepartmentId = input.departmentId || importUser.departmentId
    resolvedPhone = input.phone ?? importUser.phone ?? null
    resolvedUserId = input.importFromUserId
  }

  if (!resolvedName || !resolvedDepartmentId) {
    return { kind: 'error', status: 400, message: '姓名和部门为必填字段' }
  }

  const department = await prisma.department.findUnique({
    where: { id: resolvedDepartmentId },
  })
  if (!department) {
    return { kind: 'error', status: 400, message: '部门不存在' }
  }

  const warnings: string[] = []
  if (resolvedUserId) {
    const user = await prisma.user.findUnique({
      where: { id: resolvedUserId },
      include: { department: true },
    })
    if (!user) {
      return { kind: 'error', status: 400, message: '绑定的系统用户不存在' }
    }

    const existing = await prisma.member.findUnique({
      where: { userId: resolvedUserId },
    })
    if (existing) {
      return { kind: 'error', status: 409, message: `该系统用户已绑定到人员 "${existing.name}"（ID: ${existing.id}）` }
    }

    if (user.name !== resolvedName) {
      warnings.push(`人员姓名 "${resolvedName}" 与系统用户姓名 "${user.name}" 不一致`)
    }
    if (user.departmentId !== resolvedDepartmentId) {
      warnings.push(`人员部门与系统用户部门不一致（人员: ${department.name}，用户: ${user.department?.name ?? '未知'}）`)
    }
    if (!user.isActive) {
      warnings.push('该系统用户已被停用')
    }
  }

  const member = await prisma.member.create({
    data: {
      name: resolvedName,
      departmentId: resolvedDepartmentId,
      phone: resolvedPhone,
      isLeader: input.isLeader,
      sortOrder: input.sortOrder,
      isActive: true,
      userId: resolvedUserId,
    },
    include: {
      user: { select: { id: true, username: true, name: true, isActive: true } },
      department: { select: { id: true, name: true } },
    },
  })

  return { kind: 'ok', data: toMemberResponse(member), warnings: warnings.length > 0 ? warnings : undefined }
}
