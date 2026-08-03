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

export async function findAllAttachmentFilePaths(): Promise<string[]> {
  const attachments = await prisma.attachment.findMany({
    select: { filePath: true },
  })
  return attachments.map((attachment) => attachment.filePath)
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

export async function createAttachmentReconciliationLog(params: {
  userId: number
  userName: string
  userRole: string
  scannedFileCount: number
  orphanCandidateCount: number
  deletedCount: number
  failedDeleteCount: number
  missingReferencedCount: number
}) {
  await prisma.operationLog.create({
    data: {
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole as import('@prisma/client').Role,
      action: 'reconcile',
      module: 'attachment',
      targetType: 'attachment_storage',
      description:
        `执行附件存储对账：扫描 ${params.scannedFileCount} 个文件，` +
        `发现 ${params.orphanCandidateCount} 个过期孤儿文件，` +
        `删除 ${params.deletedCount} 个，失败 ${params.failedDeleteCount} 个，` +
        `数据库引用缺失文件 ${params.missingReferencedCount} 个`,
    },
  })
}

export async function withLockedAttachmentForDelete<T>(
  id: number,
  operation: (
    tx: Prisma.TransactionClient,
    attachment: Awaited<ReturnType<typeof findAttachmentWithWorkItem>>,
  ) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const locator = await tx.attachment.findUnique({
      where: { id },
      select: { workItemId: true },
    })

    if (!locator) {
      return operation(tx, null)
    }

    if (locator.workItemId !== null) {
      await tx.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM "work_items" WHERE id = ${locator.workItemId} FOR UPDATE
      `
    } else {
      await tx.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM "attachments" WHERE id = ${id} FOR UPDATE
      `
    }

    const attachment = await tx.attachment.findUnique({
      where: { id },
      include: ATTACHMENT_WITH_WORK_ITEM_INCLUDE,
    })

    return operation(tx, attachment)
  })
}

export async function deleteAttachmentRecordWithLog(
  params: {
    attachmentId: number
    fileName: string
    userId: number
    userName: string
    userRole: string
  },
  tx: Prisma.TransactionClient,
) {
  await tx.attachment.delete({ where: { id: params.attachmentId } })
  await createAttachmentLog(
    {
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole,
      action: 'delete',
      attachmentId: params.attachmentId,
      fileName: params.fileName,
    },
    tx,
  )
}
