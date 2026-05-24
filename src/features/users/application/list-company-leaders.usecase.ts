import { findCompanyLeadersWithDepartment } from '@/features/users/infrastructure/user.repository'
import { toUserDto } from "./user.dto"
import type { UserDto } from "./user.dto"
import { type Result, ok } from '@/shared/result'

export async function listCompanyLeadersUseCase(): Promise<Result<UserDto[]>> {
  const leaders = await findCompanyLeadersWithDepartment()
  return ok(leaders.map(toUserDto))
}
