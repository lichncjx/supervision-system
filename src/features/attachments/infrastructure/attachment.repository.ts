import { Prisma } from '@prisma/client'
import { prisma } from '@/shared/db/prisma'

const WORK_ITEM_FOR_UPLOAD_SELECT = {
  id: true,
  departmentId: true,
  cooperators: true,
  status: true,
  creatorId: true,
  proposedLeaderId: true,
  approvalLeaderId: true,
  currentApproverId: true,
  currentApproverRole: true,
  needMainLeaderCancel: true,
  type: true,
} as const

export type WorkItemForUpload = Prisma.WorkItemGetPayload<{
  select: typeof WORK_ITEM_FOR_UPLOAD_SELECT
}>

export async function findWorkItemForUpload(id: number) {
  return prisma.workItem.findUnique({
    where: { id },
    select: WORK_ITEM_FOR_UPLOAD_SELECT,
  })
}

const ATTACHMENT_WITH_WORK_ITEM_INCLUDE = {
  workItem: {
    select: {
      departmentId: true,
      cooperators: true,
      status: true,
      creatorId: true,
      proposedLeaderId: true,
      approvalLeaderId: true,
      currentApproverId: true,
      currentApproverRole: true,
      needMainLeaderCancel: true,
      type: true,
    },
  },
} as const

export type AttachmentWithWorkItem = Prisma.AttachmentGetPayload<{
  include: typeof ATTACHMENT_WITH_WORK_ITEM_INCLUDE
}>

export async function findAttachmentWithWorkItem(id: number) {
  return prisma.attachment.findUnique({
    where: { id },
    include: ATTACHMENT_WITH_WORK_ITEM_INCLUDE,
  })
}

export async function createAttachmentRecord(data: {
  workItemId: number
  userId: number
  fileName: string
  filePath: string
  fileSize: number
  fileType: string
  category: string
  uploadedAt: Date
}) {
  return prisma.attachment.create({ data })
}

export async function deleteAttachmentRecord(id: number) {
  return prisma.attachment.delete({ where: { id } })
}

export async function createAttachmentLog(params: {
  userId: number
  userName: string
  userRole: string
  action: 'upload' | 'delete'
  attachmentId: number
  fileName: string
}) {
  await prisma.operationLog.create({
    data: {
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole as import('@prisma/client').Role,
      action: params.action,
      module: 'attachment',
      targetType: 'attachment',
      targetId: params.attachmentId,
      description:
        params.action === 'upload'
          ? `上传附件：${params.fileName}`
          : `删除附件：${params.fileName}`,
    },
  })
}
