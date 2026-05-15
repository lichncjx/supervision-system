import type { CurrentUser } from '@/shared/auth/current-user'
import type { Role } from '@prisma/client'
import { canViewAttachment } from '@/features/attachments/domain/attachment.permissions'
import type { AttPermWorkItem } from '@/features/attachments/domain/attachment.types'
import { findAttachmentWithWorkItem } from '@/features/attachments/infrastructure/attachment.repository'
import {
  readAttachmentFile,
  attachmentFilePathExists,
} from '@/features/attachments/infrastructure/local-file-storage'
import { getContentType } from '@/features/attachments/domain/attachment.rules'

export interface DownloadAttachmentInput {
  currentUser: CurrentUser
  attachmentId: number
}

export type DownloadAttachmentResult =
  | {
      kind: 'ok'
      fileBuffer: Buffer
      fileName: string
      contentType: string
    }
  | { kind: 'error'; status: number; message: string }

export async function downloadAttachmentUseCase(
  input: DownloadAttachmentInput,
): Promise<DownloadAttachmentResult> {
  const { currentUser, attachmentId } = input

  const attachment = await findAttachmentWithWorkItem(attachmentId)

  if (!attachment) {
    return { kind: 'error', status: 404, message: '附件不存在' }
  }

  if (attachment.workItem) {
    const permWorkItem: AttPermWorkItem = {
      departmentId: attachment.workItem.departmentId,
      cooperators: attachment.workItem.cooperators,
      status: '',
      creatorId: attachment.workItem.creatorId,
      proposedLeaderId: attachment.workItem.proposedLeaderId,
      approvalLeaderId: attachment.workItem.approvalLeaderId,
      currentApproverId: attachment.workItem.currentApproverId,
      currentApproverRole: attachment.workItem.currentApproverRole,
      needMainLeaderCancel: attachment.workItem.needMainLeaderCancel,
      type: attachment.workItem.type,
    }

    const permUser = { ...currentUser, role: currentUser.role as Role }

    if (!canViewAttachment(permUser, permWorkItem)) {
      return { kind: 'error', status: 403, message: '无权查看该附件' }
    }
  }

  if (!attachmentFilePathExists(attachment.filePath)) {
    return { kind: 'error', status: 404, message: '文件不存在' }
  }

  const fileBuffer = await readAttachmentFile(attachment.filePath)
  if (!fileBuffer) {
    return { kind: 'error', status: 404, message: '文件不存在' }
  }

  const contentType = getContentType(attachment.fileType)

  return {
    kind: 'ok',
    fileBuffer,
    fileName: attachment.fileName,
    contentType,
  }
}
