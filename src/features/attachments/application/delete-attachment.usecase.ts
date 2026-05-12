import type { Role } from '@prisma/client'
import {
  canDeleteAttachment,
  type AttPermWorkItem,
  type AttPermAttachment,
} from '@/lib/attachment-permissions'
import {
  findAttachmentWithWorkItem,
  deleteAttachmentRecord,
  createAttachmentLog,
} from '@/features/attachments/infrastructure/attachment.repository'
import { deleteAttachmentFileIfExists } from '@/features/attachments/infrastructure/local-file-storage'
import type {
  DeleteAttachmentInput,
  DeleteAttachmentResult,
} from '@/features/attachments/presentation/attachment.dto'

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
    const permWorkItem: AttPermWorkItem = {
      departmentId: attachment.workItem.departmentId,
      cooperators: attachment.workItem.cooperators,
      status: attachment.workItem.status,
      creatorId: attachment.workItem.creatorId,
      proposedLeaderId: attachment.workItem.proposedLeaderId,
      approvalLeaderId: attachment.workItem.approvalLeaderId,
      currentApproverId: attachment.workItem.currentApproverId,
      currentApproverRole: attachment.workItem.currentApproverRole,
      needMainLeaderCancel: attachment.workItem.needMainLeaderCancel,
      type: attachment.workItem.type,
    }
    const permAttachment: AttPermAttachment = {
      userId: attachment.userId,
    }

    const permUser = { ...currentUser, role: currentUser.role as Role }
    canDelete = canDeleteAttachment(
      permUser,
      permWorkItem,
      permAttachment,
    )
  } else {
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
