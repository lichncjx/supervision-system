import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { Role, WorkItemStatus } from '@prisma/client'
import {
  findWorkForDeleteById,
  deleteDraftWorkWithOperationLog,
} from '@/features/works/infrastructure/work.repository'
import { canDeleteWorkItem } from '@/features/works/domain/work.permissions'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'
import { cleanupAttachmentFileBestEffort } from '@/features/attachments/application/cleanup-attachment-file'
import { type Result, err, ok } from '@/shared/result'

export interface DeleteWorkInput {
  currentUser: BaseCurrentUser
  workId: number
}

export async function deleteWorkUseCase(input: DeleteWorkInput): Promise<Result> {
  const { currentUser, workId } = input

  const work = await findWorkForDeleteById(workId)

  if (!work) {
    return err(404, '事项不存在')
  }

  const isOwnerOrAdmin = work.creatorId === currentUser.id || currentUser.role === Role.ADMIN
  if (!isOwnerOrAdmin) {
    return err(403, '只有事项创建人或系统管理员可以删除该草稿')
  }

  if (work.status !== WorkItemStatus.DRAFT) {
    return err(409, '只有草稿事项可以删除')
  }

  if (!canDeleteWorkItem(toPermissionUser(currentUser), work)) {
    return err(403, '只有事项创建人或系统管理员可以删除该草稿')
  }

  const result = await deleteDraftWorkWithOperationLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role as Role,
    workId: work.id,
  })

  if (!result.deleted) {
    return err(409, '事项状态或权限已变化，请刷新后重试')
  }

  await Promise.allSettled(
    result.attachments.map((attachment) => cleanupAttachmentFileBestEffort(attachment.filePath)),
  )

  return ok()
}
