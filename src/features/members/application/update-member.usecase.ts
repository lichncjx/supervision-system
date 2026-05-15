import { prisma } from '@/shared/db/prisma'

export interface UpdateMemberInput {
  memberId: number
  name?: string
  departmentId?: number
  phone?: string | null
  isLeader?: boolean
  sortOrder?: number
  isActive?: boolean
  userId?: number | null
}

export type UpdateMemberResult =
  | { kind: 'ok'; data: ReturnType<typeof toMemberResponse>; warnings?: string[] }
  | { kind: 'error'; status: number; message: string }

function toMemberResponse(m: any) {
  return {
    id: m.id,
    name: m.name,
    departmentId: m.departmentId,
    departmentName: m.department?.name ?? '',
    phone: m.phone,
    isLeader: m.isLeader,
    sortOrder: m.sortOrder,
    isActive: m.isActive,
    userId: m.userId,
    user: m.user
      ? { id: m.user.id, username: m.user.username, name: m.user.name, isActive: m.user.isActive }
      : null,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }
}

export async function updateMemberUseCase(
  input: UpdateMemberInput,
): Promise<UpdateMemberResult> {
  const member = await prisma.member.findUnique({
    where: { id: input.memberId },
    include: { department: true, user: true },
  })
  if (!member) {
    return { kind: 'error', status: 404, message: '人员不存在' }
  }

  const warnings: string[] = []
  const updateData: Record<string, unknown> = {}

  if (input.name !== undefined) updateData.name = input.name
  if (input.departmentId !== undefined) {
    const dept = await prisma.department.findUnique({ where: { id: input.departmentId } })
    if (!dept) {
      return { kind: 'error', status: 400, message: '部门不存在' }
    }
    updateData.departmentId = input.departmentId
  }
  if (input.phone !== undefined) updateData.phone = input.phone
  if (input.isLeader !== undefined) updateData.isLeader = input.isLeader
  if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder
  if (input.isActive !== undefined) updateData.isActive = input.isActive

  if (input.userId !== undefined) {
    if (input.userId !== null) {
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        include: { department: true },
      })
      if (!user) {
        return { kind: 'error', status: 400, message: '绑定的系统用户不存在' }
      }

      const existing = await prisma.member.findUnique({
        where: { userId: input.userId },
      })
      if (existing && existing.id !== input.memberId) {
        return { kind: 'error', status: 409, message: `该系统用户已绑定到人员 "${existing.name}"（ID: ${existing.id}）` }
      }

      const effectiveName = (input.name ?? member.name) as string
      const effectiveDeptId = (input.departmentId ?? member.departmentId) as number

      if (user.name !== effectiveName) {
        warnings.push(`人员姓名 "${effectiveName}" 与系统用户姓名 "${user.name}" 不一致`)
      }
      if (user.departmentId !== effectiveDeptId) {
        const memberDeptName = input.departmentId
          ? (await prisma.department.findUnique({ where: { id: effectiveDeptId } }))?.name
          : member.department?.name
        warnings.push(`人员部门与系统用户部门不一致（人员: ${memberDeptName ?? '未知'}，用户: ${user.department?.name ?? '未知'}）`)
      }
      if (!user.isActive) {
        warnings.push('该系统用户已被停用')
      }
    }
    updateData.userId = input.userId
  }

  const updated = await prisma.member.update({
    where: { id: input.memberId },
    data: updateData,
    include: {
      user: { select: { id: true, username: true, name: true, isActive: true } },
      department: { select: { id: true, name: true } },
    },
  })

  return { kind: 'ok', data: toMemberResponse(updated), warnings: warnings.length > 0 ? warnings : undefined }
}
