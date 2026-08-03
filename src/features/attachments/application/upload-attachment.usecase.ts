import type { BaseCurrentUser } from '@/shared/auth/current-user'
import type { AttachmentDto } from '@/features/attachments/application/attachment.dto'
import { type Result, ok, err } from '@/shared/result'
import {
  canViewAttachment,
  canUploadAttachment,
} from '@/features/attachments/domain/attachment.permissions'
import {
  withLockedWorkItemForUpload,
  findWorkItemForUpload,
  createAttachmentRecord,
  createAttachmentLog,
  createAttachmentCleanupPendingLog,
} from '@/features/attachments/infrastructure/attachment.repository'
import {
  deleteAttachmentFileIfExists,
  saveUploadedFile,
} from '@/features/attachments/infrastructure/local-file-storage'
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

  const permUser = toPermissionUser(currentUser)
  const initialWorkItem = await findWorkItemForUpload(workItemId)

  if (!initialWorkItem) {
    return err(404, '事项不存在')
  }

  if (!canViewAttachment(permUser, initialWorkItem)) {
    return err(403, '无权查看该事项')
  }

  if (!canUploadAttachment(permUser, initialWorkItem)) {
    return err(403, '无权上传该事项的附件')
  }

  const { relativePath } = await saveUploadedFile(fileBuffer, fileName)

  const cleanupStagedFile = async () => {
    const cleaned = await deleteAttachmentFileIfExists(relativePath)
    if (!cleaned) {
      await createAttachmentCleanupPendingLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        sourceTargetId: workItemId,
        filePath: relativePath,
        source: 'upload_rollback',
      })
    }
  }

  try {
    const result = await withLockedWorkItemForUpload(workItemId, async (tx, workItem) => {
      if (!workItem) {
        return err(404, '事项不存在')
      }

      if (!canViewAttachment(permUser, workItem)) {
        return err(403, '无权查看该事项')
      }

      if (!canUploadAttachment(permUser, workItem)) {
        return err(403, '无权上传该事项的附件')
      }

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
      }, tx)

      await createAttachmentLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'upload',
        attachmentId: attachment.id,
        fileName,
      }, tx)

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
    })

    if (!result.ok) {
      await cleanupStagedFile()
    }

    return result
  } catch (error) {
    await cleanupStagedFile()
    throw error
  }
}
