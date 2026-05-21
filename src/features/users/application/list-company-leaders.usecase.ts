import { findCompanyLeadersWithDepartment } from '@/features/users/infrastructure/user.repository'
import { toLeaderItem } from '@/features/users/application/user-api.mapper'
import type { LeaderItem } from '@/features/users/application/user-api.types'

export type ListCompanyLeadersResult =
  | { kind: 'ok'; data: LeaderItem[] }
  | { kind: 'error'; status: number; message: string }

export async function listCompanyLeadersUseCase(): Promise<ListCompanyLeadersResult> {
  const leaders = await findCompanyLeadersWithDepartment()
  return { kind: 'ok', data: leaders.map(toLeaderItem) }
}
