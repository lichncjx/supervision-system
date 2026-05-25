import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { Role } from '@prisma/client'
import {
  findWorkForUpdateById,
  deleteWorkItem,
  createWorkDeleteOperationLog,
} from '@/features/works/infrastructure/work.repository'
import { type Result, err, ok } from '@/shared/result'

export interface DeleteWorkInput {
  currentUser: BaseCurrentUser
  workId: number
}

export async function deleteWorkUseCase(input: DeleteWorkInput): Promise<Result> {
  const { currentUser, workId } = input

  if (currentUser.role !== Role.ADMIN) {
    return err(403, '权限不足')
  }

  const work = await findWorkForUpdateById(workId)

  if (!work) {
    return err(404, '事项不存在')
  }

  await createWorkDeleteOperationLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role as Role,
    workId: work.id,
    workType: work.type,
    workTitle: work.title,
  })

  await deleteWorkItem(workId)

  return ok()
}
