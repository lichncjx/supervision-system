import type { CurrentUser } from '@/shared/auth/current-user'
import { canDeleteAttachment } from '@/features/attachments/domain/attachment.permissions'
import {
  findAttachmentWithWorkItem,
  deleteAttachmentRecord,
  createAttachmentLog,
} from '@/features/attachments/infrastructure/attachment.repository'
import { deleteAttachmentFileIfExists } from '@/features/attachments/infrastructure/local-file-storage'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'

export interface DeleteAttachmentInput {
  currentUser: CurrentUser
  attachmentId: number
}

export type DeleteAttachmentResult =
  | { kind: 'ok' }
  | { kind: 'error'; status: number; message: string }

export async function deleteAttachmentUseCase(
  input: DeleteAttachmentInput,
): Promise<DeleteAttachmentResult> {
  const { currentUser, attachmentId } = input

  const attachment = await findAttachmentWithWorkItem(attachmentId)

  if (!attachment) {
    return { kind: 'error', status: 404, message: '附件不存在' }
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
    return { kind: 'error', status: 403, message: '无权删除该附件' }
  }

  await deleteAttachmentRecord(attachmentId)

  await deleteAttachmentFileIfExists(attachment.filePath)

  await createAttachmentLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'delete',
    attachmentId,
    fileName: attachment.fileName,
  })

  return { kind: 'ok' }
}
