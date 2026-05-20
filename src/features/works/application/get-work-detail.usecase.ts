import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { canViewWorkItem } from '@/features/works/domain/work.permissions'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'
import { findWorkDetailById } from '@/features/works/infrastructure/work.repository'
import { toWorkApiDto } from '@/features/works/application/work-api.mapper'

export interface GetWorkDetailInput {
  currentUser: BaseCurrentUser
  workId: number
}

export async function getWorkDetailUseCase(input: GetWorkDetailInput) {
  const { currentUser, workId } = input

  const work = await findWorkDetailById(workId)

  if (!work) {
    return { kind: 'not-found' as const }
  }

  if (!canViewWorkItem(toPermissionUser(currentUser), work)) {
    return { kind: 'forbidden' as const }
  }

  return { kind: 'ok' as const, data: toWorkApiDto(work) }
}
