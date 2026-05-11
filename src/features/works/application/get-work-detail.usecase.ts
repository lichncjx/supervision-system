import { canViewWorkItem } from '@/features/works/domain/work.permissions'
import type { PermissionUser } from '@/features/works/domain/work.permissions'
import { findWorkDetailById } from '@/features/works/infrastructure/work.repository'
import { toWorkDetailDto } from '@/features/works/presentation/work.presenter'
import type { GetWorkDetailInput } from '@/features/works/presentation/work.dto'

export async function getWorkDetailUseCase(input: GetWorkDetailInput) {
  const { currentUser, workId } = input

  const work = await findWorkDetailById(workId)

  if (!work) {
    return { kind: 'not-found' as const }
  }

  if (!canViewWorkItem(currentUser as PermissionUser, work)) {
    return { kind: 'forbidden' as const }
  }

  return { kind: 'ok' as const, data: toWorkDetailDto(work) }
}
