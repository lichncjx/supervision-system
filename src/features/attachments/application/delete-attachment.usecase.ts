import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { type Result, ok, err } from '@/shared/result'
import { canDeleteAttachment } from '@/features/attachments/domain/attachment.permissions'
import {
  findAttachmentWithWorkItem,
  deleteAttachmentRecordWithLogs,
} from '@/features/attachments/infrastructure/attachment.repository'
import { cleanupAttachmentFileWithTracking } from './cleanup-attachment-file'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'

export interface DeleteAttachmentInput {
  currentUser: BaseCurrentUser
  attachmentId: number
}

export async function deleteAttachmentUseCase(
  input: DeleteAttachmentInput,
): Promise<Result> {
  const { currentUser, attachmentId } = input

  const attachment = await findAttachmentWithWorkItem(attachmentId)

  if (!attachment) {
    return err(404, '附件不存在')
  }

  let canDelete = false

  if (attachment.workItem) {
    // Work-linked attachment deletion is limited to global roles or the uploader.
    const permUser = toPermissionUser(currentUser)
    canDelete = canDeleteAttachment(permUser, attachment.userId)
  } else {
    // Orphan attachment records are legacy/unexpected data; keep deletion admin-only.
    canDelete = currentUser.role === 'ADMIN'
  }

  if (!canDelete) {
    return err(403, '无权删除该附件')
  }

  await deleteAttachmentRecordWithLogs({
    attachmentId,
    fileName: attachment.fileName,
    filePath: attachment.filePath,
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
  })

  await cleanupAttachmentFileWithTracking({
    currentUser,
    sourceTargetId: attachmentId,
    filePath: attachment.filePath,
    source: 'attachment_delete',
    intentAlreadyPersisted: true,
  })

  return ok()
}
