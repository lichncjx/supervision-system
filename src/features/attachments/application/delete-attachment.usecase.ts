import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { type Result, ok, err } from '@/shared/result'
import { canDeleteAttachment } from '@/features/attachments/domain/attachment.permissions'
import {
  deleteAttachmentRecordWithLog,
  withLockedAttachmentForDelete,
} from '@/features/attachments/infrastructure/attachment.repository'
import { cleanupAttachmentFileBestEffort } from './cleanup-attachment-file'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'

export interface DeleteAttachmentInput {
  currentUser: BaseCurrentUser
  attachmentId: number
}

export async function deleteAttachmentUseCase(
  input: DeleteAttachmentInput,
): Promise<Result> {
  const { currentUser, attachmentId } = input

  const result = await withLockedAttachmentForDelete(attachmentId, async (tx, attachment) => {
    if (!attachment) {
      return err(404, '附件不存在')
    }

    const canDelete = attachment.workItem
      ? canDeleteAttachment(toPermissionUser(currentUser), attachment.userId)
      : currentUser.role === 'ADMIN'

    if (!canDelete) {
      return err(403, '无权删除该附件')
    }

    await deleteAttachmentRecordWithLog(
      {
        attachmentId,
        fileName: attachment.fileName,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
      },
      tx,
    )

    return ok({ filePath: attachment.filePath })
  })

  if (!result.ok) return result

  await cleanupAttachmentFileBestEffort(result.data.filePath)

  return ok()
}
