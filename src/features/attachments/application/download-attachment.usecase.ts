import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { canViewAttachment } from '@/features/attachments/domain/attachment.permissions'
import { findAttachmentWithWorkItem } from '@/features/attachments/infrastructure/attachment.repository'
import {
  readAttachmentFile,
  attachmentFilePathExists,
} from '@/features/attachments/infrastructure/local-file-storage'
import { getContentType } from '@/features/attachments/domain/attachment.rules'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'

export interface DownloadAttachmentInput {
  currentUser: BaseCurrentUser
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
    // Work-linked attachments inherit the parent work item's visibility rules.
    if (!canViewAttachment(toPermissionUser(currentUser), attachment.workItem)) {
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
