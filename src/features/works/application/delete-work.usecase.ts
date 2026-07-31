import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { Role, WorkItemStatus } from '@prisma/client'
import {
  findWorkForDeleteById,
  deleteDraftWorkWithOperationLog,
} from '@/features/works/infrastructure/work.repository'
import { canDeleteWorkItem } from '@/features/works/domain/work.permissions'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'
import { deleteAttachmentFileIfExists } from '@/features/attachments/infrastructure/local-file-storage'
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

  if (work.status !== WorkItemStatus.DRAFT) {
    return err(409, '只有草稿事项可以删除')
  }

  if (!canDeleteWorkItem(toPermissionUser(currentUser), work)) {
    return err(403, '只有事项创建人或系统管理员可以删除该草稿')
  }

  const deleted = await deleteDraftWorkWithOperationLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role as Role,
    workId: work.id,
    workType: work.type,
    workTitle: work.title,
    creatorId: work.creatorId,
    creatorName: work.creator.name,
    workflowRecordCount: work._count.workflowRecords,
    attachmentCount: work._count.attachments,
    isReturnedDraft: Boolean(work.rejectReason || work.rejectedFromStatus),
  })

  if (!deleted) {
    return err(409, '事项状态或权限已变化，请刷新后重试')
  }

  await Promise.all(
    work.attachments.map(({ filePath }) =>
      deleteAttachmentFileIfExists(filePath),
    ),
  )

  return ok()
}
