import { findCompanyLeadersWithDepartment } from '@/features/users/infrastructure/user.repository'
import { toUserApiDto } from '@/features/users/application/user-api.mapper'
import type { UserApiDto } from '@/features/users/contract/user-api.types'

export type ListCompanyLeadersResult =
  | { kind: 'ok'; data: UserApiDto[] }
  | { kind: 'error'; status: number; message: string }

export async function listCompanyLeadersUseCase(): Promise<ListCompanyLeadersResult> {
  const leaders = await findCompanyLeadersWithDepartment()
  return { kind: 'ok', data: leaders.map(toUserApiDto) }
}
