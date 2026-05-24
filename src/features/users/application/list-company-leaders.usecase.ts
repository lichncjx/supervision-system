import { findCompanyLeadersWithDepartment } from '@/features/users/infrastructure/user.repository'
import { toUserApiDto } from '@/features/users/application/user-api.mapper'
import type { UserDto } from "./user.dto";

export type ListCompanyLeadersResult =
  | { kind: 'ok'; data: UserDto[] }
  | { kind: 'error'; status: number; message: string }

export async function listCompanyLeadersUseCase(): Promise<ListCompanyLeadersResult> {
  const leaders = await findCompanyLeadersWithDepartment()
  return { kind: 'ok', data: leaders.map(toUserApiDto) }
}
