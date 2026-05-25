import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { err, ok, type Result } from '@/shared/result'
import { canViewAttachment } from '@/features/attachments/domain/attachment.permissions'
import { findAttachmentWithWorkItem } from '@/features/attachments/infrastructure/attachment.repository'
import {
  readAttachmentFile,
  attachmentFilePathExists,
} from '@/features/attachments/infrastructure/local-file-storage'
import { getContentType } from '@/features/attachments/domain/attachment.rules'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'

export interface AttachmentFile {
  fileBuffer: Buffer
  fileName: string
  contentType: string
}

export interface DownloadAttachmentInput {
  currentUser: BaseCurrentUser
  attachmentId: number
}

export async function downloadAttachmentUseCase(
  input: DownloadAttachmentInput,
): Promise<Result<AttachmentFile>> {
  const { currentUser, attachmentId } = input

  const attachment = await findAttachmentWithWorkItem(attachmentId)

  if (!attachment) {
    return err(404, '附件不存在')
  }

  if (attachment.workItem) {
    if (!canViewAttachment(toPermissionUser(currentUser), attachment.workItem)) {
      return err(403, '无权查看该附件')
    }
  }

  if (!attachmentFilePathExists(attachment.filePath)) {
    return err(404, '文件不存在')
  }

  const fileBuffer = await readAttachmentFile(attachment.filePath)
  if (!fileBuffer) {
    return err(404, '文件不存在')
  }

  const contentType = getContentType(attachment.fileType)

  return ok({ fileBuffer, fileName: attachment.fileName, contentType })
}
