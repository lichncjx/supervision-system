import type { CurrentUser } from '@/shared/auth/current-user'
import type { AttachmentApiDto } from '@/features/attachments/contract/attachment-api.types'

export interface UploadAttachmentInput {
  currentUser: CurrentUser
  workItemId: number
  fileName: string
  fileBuffer: Buffer
  fileSize: number
  ext: string
  category: string
}

export type UploadAttachmentResult =
  | {
    kind: 'ok'
    attachment: AttachmentApiDto
  }
  | { kind: 'error'; status: number; message: string }
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

export async function uploadAttachmentUseCase(
  input: UploadAttachmentInput,
): Promise<UploadAttachmentResult> {
  const { currentUser, workItemId, fileName, fileBuffer, fileSize, ext, category } = input

  const workItem = await findWorkItemForUpload(workItemId)

  if (!workItem) {
    return { kind: 'error', status: 404, message: '事项不存在' }
  }

  // The repository selects exactly the work fields required by permission rules.
  const permUser = toPermissionUser(currentUser)

  if (!canViewAttachment(permUser, workItem)) {
    return { kind: 'error', status: 403, message: '无权查看该事项' }
  }

  if (!canUploadAttachment(permUser, workItem)) {
    return { kind: 'error', status: 403, message: '无权上传该事项的附件' }
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

  return {
    kind: 'ok',
    attachment: {
      id: attachment.id,
      fileName: attachment.fileName,
      fileSize: attachment.fileSize,
      fileType: attachment.fileType,
      category: attachment.category,
      uploadedAt: attachment.uploadedAt.toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
    },
  }
}
