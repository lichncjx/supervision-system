import { Role } from '@prisma/client'
import {
  findWorkForUpdateById,
  deleteWorkItem,
  createWorkDeleteOperationLog,
} from '@/features/works/infrastructure/work.repository'
import type { DeleteWorkInput } from '@/features/works/presentation/work.dto'

export type DeleteWorkResult =
  | { kind: 'ok'; data: { success: true; message: string } }
  | { kind: 'error'; status: number; message: string }

export async function deleteWorkUseCase(
  input: DeleteWorkInput,
): Promise<DeleteWorkResult> {
  const { currentUser, workId } = input

  if (currentUser.role !== Role.ADMIN) {
    return { kind: 'error', status: 403, message: '权限不足' }
  }

  const work = await findWorkForUpdateById(workId)

  if (!work) {
    return { kind: 'error', status: 404, message: '事项不存在' }
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

  return { kind: 'ok', data: { success: true, message: '删除成功' } }
}
