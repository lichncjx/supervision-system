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
  type: true,
} as const

export async function findWorkItemForUpload(id: number) {
  return prisma.workItem.findUnique({
    where: { id },
    select: WORK_ITEM_FOR_UPLOAD_SELECT,
  })
}

export async function withLockedWorkItemForUpload<T>(
  id: number,
  operation: (
    tx: Prisma.TransactionClient,
    workItem: Awaited<ReturnType<typeof findWorkItemForUpload>>,
  ) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw<Array<{ id: number }>>`
      SELECT id FROM "work_items" WHERE id = ${id} FOR UPDATE
    `
    const workItem = await tx.workItem.findUnique({
      where: { id },
      select: WORK_ITEM_FOR_UPLOAD_SELECT,
    })
    return operation(tx, workItem)
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
      type: true,
    },
  },
} as const

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
}, tx?: Prisma.TransactionClient) {
  return (tx ?? prisma).attachment.create({ data })
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
}, tx?: Prisma.TransactionClient) {
  await (tx ?? prisma).operationLog.create({
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

export async function createAttachmentCleanupPendingLog(params: {
  userId: number
  userName: string
  userRole: string
  sourceTargetId: number
  filePath: string
  source: 'upload_rollback' | 'attachment_delete' | 'work_delete'
}) {
  await prisma.operationLog.create({
    data: {
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole as import('@prisma/client').Role,
      action: 'cleanup_pending',
      module: 'attachment',
      targetType: params.source,
      targetId: params.sourceTargetId,
      description: `附件物理文件待清理：${params.filePath}`,
    },
  })
}
