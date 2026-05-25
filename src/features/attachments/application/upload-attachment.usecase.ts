import type { BaseCurrentUser } from '@/shared/auth/current-user'
import type { AttachmentDto } from '@/features/attachments/application/attachment.dto'
import { type Result, ok, err } from '@/shared/result'
import {
  canViewAttachment,
  canUploadAttachment,
} from '@/features/attachments/domain/attachment.permissions'
import {
  findWorkItemForUpload,
  createAttachmentRecord,
  createAttachmentLog,
} from '@/features/attachments/infrastructure/attachment.repository'
import { saveUploadedFile } from '@/features/attachments/infrastructure/local-file-storage'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'

export interface UploadAttachmentInput {
  currentUser: BaseCurrentUser
  workItemId: number
  fileName: string
  fileBuffer: Buffer
  fileSize: number
  ext: string
  category: string
}

export async function uploadAttachmentUseCase(
  input: UploadAttachmentInput,
): Promise<Result<AttachmentDto>> {
  const { currentUser, workItemId, fileName, fileBuffer, fileSize, ext, category } = input

  const workItem = await findWorkItemForUpload(workItemId)

  if (!workItem) {
    return err(404, '事项不存在')
  }

  // The repository selects exactly the work fields required by permission rules.
  const permUser = toPermissionUser(currentUser)

  if (!canViewAttachment(permUser, workItem)) {
    return err(403, '无权查看该事项')
  }

  if (!canUploadAttachment(permUser, workItem)) {
    return err(403, '无权上传该事项的附件')
  }

  // Permission checks must complete before writing the file to disk.
  const { relativePath } = await saveUploadedFile(fileBuffer, fileName)

  const now = new Date()

  const attachment = await createAttachmentRecord({
    workItemId,
    userId: currentUser.id,
    fileName,
    filePath: relativePath,
    fileSize,
    fileType: ext,
    category,
    uploadedAt: now,
  })

  await createAttachmentLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'upload',
    attachmentId: attachment.id,
    fileName,
  })

  return ok({
    id: attachment.id,
    fileName: attachment.fileName,
    fileSize: attachment.fileSize,
    fileType: attachment.fileType,
    category: attachment.category,
    uploadedAt: attachment.uploadedAt.toISOString(),
    userId: currentUser.id,
    userName: currentUser.name,
  })
}
