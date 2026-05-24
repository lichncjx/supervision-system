import { Role } from '@prisma/client'
import { isGlobalView, isCompanyLevel } from '@/features/users/domain/role.rules'
import { findUsersByDepartment } from '@/features/users/infrastructure/user.repository'
import { toUserApiDto } from '@/features/users/application/user-api.mapper'
import type { UserDto } from "./user.dto"

export type ListDepartmentUsersResult =
  | { kind: 'ok'; data: UserDto[] }
  | { kind: 'error'; status: number; message: string }

export async function listDepartmentLeadersUseCase(
  currentUser: { id: number; role: string; departmentId: number },
  departmentId: number,
): Promise<ListDepartmentUsersResult> {
  if (isNaN(departmentId)) {
    return { kind: 'error', status: 400, message: '请提供部门ID' }
  }

  if (
    !isGlobalView(currentUser.role) &&
    !isCompanyLevel(currentUser.role) &&
    currentUser.departmentId !== departmentId
  ) {
    return { kind: 'error', status: 403, message: '无权限查询其他部门领导' }
  }

  const leaders = await findUsersByDepartment(departmentId, Role.DEPARTMENT_LEADER)
  return { kind: 'ok', data: leaders.map(toUserApiDto) }
}

export async function listDepartmentManagersUseCase(
  currentUser: { id: number; role: string; departmentId: number },
  departmentId: number,
): Promise<ListDepartmentUsersResult> {
  if (isNaN(departmentId)) {
    return { kind: 'error', status: 400, message: '请提供部门ID' }
  }

  if (
    !isGlobalView(currentUser.role) &&
    !isCompanyLevel(currentUser.role) &&
    currentUser.departmentId !== departmentId
  ) {
    return { kind: 'error', status: 403, message: '无权限查询其他部门主管' }
  }

  const managers = await findUsersByDepartment(departmentId, Role.DEPARTMENT_MANAGER)
  return { kind: 'ok', data: managers.map(toUserApiDto) }
}
