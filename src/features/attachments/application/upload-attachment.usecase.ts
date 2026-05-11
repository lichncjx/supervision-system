import type { Role } from '@prisma/client'
import {
  canViewAttachment,
  canUploadAttachment,
  type AttPermWorkItem,
} from '@/lib/attachment-permissions'
import {
  findWorkItemForUpload,
  createAttachmentRecord,
  createAttachmentLog,
} from '@/features/attachments/infrastructure/attachment.repository'
import { saveUploadedFile } from '@/features/attachments/infrastructure/local-file-storage'
import type {
  UploadAttachmentInput,
  UploadAttachmentResult,
} from '@/features/attachments/presentation/attachment.dto'

export async function uploadAttachmentUseCase(
  input: UploadAttachmentInput,
): Promise<UploadAttachmentResult> {
  const { currentUser, workItemId, fileName, fileBuffer, fileSize, ext, category } = input

  const workItem = await findWorkItemForUpload(workItemId)

  if (!workItem) {
    return { kind: 'error', status: 404, message: '事项不存在' }
  }

  const permWorkItem: AttPermWorkItem = {
    departmentId: workItem.departmentId,
    cooperators: workItem.cooperators,
    status: workItem.status,
    creatorId: workItem.creatorId,
    proposedLeaderId: workItem.proposedLeaderId,
    approvalLeaderId: workItem.approvalLeaderId,
    currentApproverId: workItem.currentApproverId,
    currentApproverRole: workItem.currentApproverRole,
    needMainLeaderCancel: workItem.needMainLeaderCancel,
    type: workItem.type,
  }

  const permUser = { ...currentUser, role: currentUser.role as Role }

  if (!canViewAttachment(permUser, permWorkItem)) {
    return { kind: 'error', status: 403, message: '无权查看该事项' }
  }

  if (!canUploadAttachment(permUser, permWorkItem)) {
    return {
      kind: 'error',
      status: 403,
      message: '无权上传该事项的附件',
    }
  }

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
      uploadedAt: attachment.uploadedAt,
    },
  }
}
