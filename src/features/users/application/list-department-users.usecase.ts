import { Role } from '@prisma/client'
import { isGlobalView, isCompanyLevel } from '@/features/users/domain/role.rules'
import { findUsersByDepartment } from '@/features/users/infrastructure/user.repository'
import { toUserDto } from "./user.dto"
import type { UserDto } from "./user.dto"
import { type Result, err, ok } from '@/shared/result'

export async function listDepartmentLeadersUseCase(
  currentUser: { id: number; role: string; departmentId: number },
  departmentId: number,
): Promise<Result<UserDto[]>> {
  if (isNaN(departmentId)) {
    return err(400, '请提供部门ID')
  }

  if (
    !isGlobalView(currentUser.role) &&
    !isCompanyLevel(currentUser.role) &&
    currentUser.departmentId !== departmentId
  ) {
    return err(403, '无权限查询其他部门领导')
  }

  const leaders = await findUsersByDepartment(departmentId, Role.DEPARTMENT_LEADER)
  return ok(leaders.map(toUserDto))
}

export async function listDepartmentManagersUseCase(
  currentUser: { id: number; role: string; departmentId: number },
  departmentId: number,
): Promise<Result<UserDto[]>> {
  if (isNaN(departmentId)) {
    return err(400, '请提供部门ID')
  }

  if (
    !isGlobalView(currentUser.role) &&
    !isCompanyLevel(currentUser.role) &&
    currentUser.departmentId !== departmentId
  ) {
    return err(403, '无权限查询其他部门主管')
  }

  const managers = await findUsersByDepartment(departmentId, Role.DEPARTMENT_MANAGER)
  return ok(managers.map(toUserDto))
}

export async function listDepartmentUsersUseCase(
  currentUser: { id: number; role: string; departmentId: number },
  departmentId: number,
): Promise<Result<UserDto[]>> {
  if (isNaN(departmentId)) {
    return err(400, '请提供部门ID')
  }

  if (
    !isGlobalView(currentUser.role) &&
    !isCompanyLevel(currentUser.role) &&
    currentUser.departmentId !== departmentId
  ) {
    return err(403, '无权限查询其他部门用户')
  }

  const users = await findUsersByDepartment(departmentId)
  return ok(users.map(toUserDto))
}
