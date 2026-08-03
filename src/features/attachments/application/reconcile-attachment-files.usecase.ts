import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { type Result, ok, err } from '@/shared/result'
import {
  createAttachmentReconciliationLog,
  findAllAttachmentFilePaths,
} from '@/features/attachments/infrastructure/attachment.repository'
import {
  deleteAttachmentFileIfExists,
  listAttachmentStorageFiles,
  normalizeAttachmentStoragePath,
  type AttachmentStorageFile,
} from '@/features/attachments/infrastructure/local-file-storage'
import type {
  AttachmentFileReconciliationPlan,
  AttachmentFileReconciliationResult,
} from '@/features/attachments/contract/attachment-reconciliation.types'

const DEFAULT_GRACE_PERIOD_HOURS = 24
export const MIN_GRACE_PERIOD_HOURS = 1

export interface ReconcileAttachmentFilesInput {
  apply?: boolean
  gracePeriodHours?: number
  now?: Date
}

export interface ReconcileAttachmentFilesAsAdminInput extends ReconcileAttachmentFilesInput {
  currentUser: BaseCurrentUser
}

export function planAttachmentFileReconciliation(params: {
  referencedPaths: string[]
  storageFiles: AttachmentStorageFile[]
  cutoff: Date
}): AttachmentFileReconciliationPlan {
  const referencedPaths = new Set<string>()
  const invalidReferencedPaths: string[] = []

  for (const storedPath of params.referencedPaths) {
    const normalizedPath = normalizeAttachmentStoragePath(storedPath)
    if (normalizedPath) {
      referencedPaths.add(normalizedPath)
    } else {
      invalidReferencedPaths.push(storedPath)
    }
  }

  const storagePaths = new Set(params.storageFiles.map((file) => file.relativePath))
  const orphanCandidatePaths: string[] = []
  const recentOrphanPaths: string[] = []

  for (const file of params.storageFiles) {
    if (referencedPaths.has(file.relativePath)) continue

    if (file.modifiedAt <= params.cutoff) {
      orphanCandidatePaths.push(file.relativePath)
    } else {
      recentOrphanPaths.push(file.relativePath)
    }
  }

  const missingReferencedPaths = [...referencedPaths]
    .filter((filePath) => !storagePaths.has(filePath))
    .sort()

  return {
    scannedFileCount: params.storageFiles.length,
    referencedFileCount: referencedPaths.size,
    orphanCandidatePaths: orphanCandidatePaths.sort(),
    recentOrphanPaths: recentOrphanPaths.sort(),
    missingReferencedPaths,
    invalidReferencedPaths: invalidReferencedPaths.sort(),
  }
}

export async function reconcileAttachmentFilesUseCase(
  input: ReconcileAttachmentFilesInput = {},
): Promise<AttachmentFileReconciliationResult> {
  const gracePeriodHours = input.gracePeriodHours ?? DEFAULT_GRACE_PERIOD_HOURS
  if (!Number.isFinite(gracePeriodHours) || gracePeriodHours < MIN_GRACE_PERIOD_HOURS) {
    throw new Error(`gracePeriodHours must be at least ${MIN_GRACE_PERIOD_HOURS}`)
  }

  const now = input.now ?? new Date()
  const cutoff = new Date(now.getTime() - gracePeriodHours * 60 * 60 * 1000)
  const [referencedPaths, storageFiles] = await Promise.all([
    findAllAttachmentFilePaths(),
    listAttachmentStorageFiles(),
  ])
  const plan = planAttachmentFileReconciliation({
    referencedPaths,
    storageFiles,
    cutoff,
  })

  const deletedPaths: string[] = []
  const failedDeletePaths: string[] = []

  if (input.apply) {
    for (const filePath of plan.orphanCandidatePaths) {
      const deleted = await deleteAttachmentFileIfExists(filePath)
      if (deleted) {
        deletedPaths.push(filePath)
      } else {
        failedDeletePaths.push(filePath)
      }
    }
  }

  return {
    ...plan,
    mode: input.apply ? 'apply' : 'dry-run',
    deletedPaths,
    failedDeletePaths,
  }
}

export async function reconcileAttachmentFilesAsAdminUseCase(
  input: ReconcileAttachmentFilesAsAdminInput,
): Promise<Result<AttachmentFileReconciliationResult>> {
  if (input.currentUser.role !== 'ADMIN') {
    return err(403, '仅系统管理员可以执行附件存储对账')
  }

  const result = await reconcileAttachmentFilesUseCase(input)

  if (input.apply) {
    try {
      await createAttachmentReconciliationLog({
        userId: input.currentUser.id,
        userName: input.currentUser.name,
        userRole: input.currentUser.role,
        scannedFileCount: result.scannedFileCount,
        orphanCandidateCount: result.orphanCandidatePaths.length,
        deletedCount: result.deletedPaths.length,
        failedDeleteCount: result.failedDeletePaths.length,
        missingReferencedCount: result.missingReferencedPaths.length,
      })
    } catch (error) {
      console.warn('Failed to write attachment reconciliation audit log:', error)
    }
  }

  return ok(result)
}
