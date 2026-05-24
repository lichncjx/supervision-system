import { prisma } from '@/shared/db/prisma'
import { toMemberResponse } from '@/features/members/application/member.dto'
import { createMemberWithRelations } from '@/features/members/infrastructure/member.repository'
import { findDepartmentById } from '@/features/departments/infrastructure/department.repository'
import { type Result, ok, err } from '@/shared/result'
import type { MemberMutation } from '@/features/members/application/member.dto'

export interface CreateMemberInput {
  name: string
  departmentId: number
  phone?: string | null
  isLeader: boolean
  sortOrder: number
  userId?: number | null
  importFromUserId?: number
}

export async function createMemberUseCase(
  input: CreateMemberInput,
): Promise<Result<MemberMutation>> {
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
      return err(400, '导入用户不存在')
    }
    resolvedName = input.name || importUser.name
    resolvedDepartmentId = input.departmentId || importUser.departmentId
    resolvedPhone = input.phone ?? importUser.phone ?? null
    resolvedUserId = input.importFromUserId
  }

  if (!resolvedName || !resolvedDepartmentId) {
    return err(400, '姓名和部门为必填字段')
  }

  const department = await findDepartmentById(resolvedDepartmentId)
  if (!department) {
    return err(400, '部门不存在')
  }

  const warnings: string[] = []
  if (resolvedUserId) {
    const user = await prisma.user.findUnique({
      where: { id: resolvedUserId },
      include: { department: true },
    })
    if (!user) {
      return err(400, '绑定的系统用户不存在')
    }

    const existing = await prisma.member.findUnique({
      where: { userId: resolvedUserId },
    })
    if (existing) {
      return err(409, `该系统用户已绑定到人员 "${existing.name}"（ID: ${existing.id}）`)
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

  const member = await createMemberWithRelations({
    name: resolvedName,
    phone: resolvedPhone,
    isLeader: input.isLeader,
    sortOrder: input.sortOrder,
    isActive: true,
    department: { connect: { id: resolvedDepartmentId } },
    ...(resolvedUserId ? { user: { connect: { id: resolvedUserId } } } : {}),
  })

  const memberData = toMemberResponse(member)
  return ok(warnings.length > 0 ? { ...memberData, warnings } : memberData)
}
