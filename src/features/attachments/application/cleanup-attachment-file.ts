import type { BaseCurrentUser } from '@/shared/auth/current-user'
import {
  createAttachmentCleanupLog,
  type AttachmentCleanupSource,
} from '@/features/attachments/infrastructure/attachment.repository'
import { deleteAttachmentFileIfExists } from '@/features/attachments/infrastructure/local-file-storage'

export interface CleanupAttachmentFileInput {
  currentUser: BaseCurrentUser
  sourceTargetId: number
  filePath: string
  source: AttachmentCleanupSource
  intentAlreadyPersisted?: boolean
}

export async function cleanupAttachmentFileWithTracking(
  input: CleanupAttachmentFileInput,
): Promise<boolean> {
  const log = (action: 'cleanup_pending' | 'cleanup_completed') =>
    createAttachmentCleanupLog({
      userId: input.currentUser.id,
      userName: input.currentUser.name,
      userRole: input.currentUser.role,
      sourceTargetId: input.sourceTargetId,
      filePath: input.filePath,
      source: input.source,
      action,
    })

  let intentError: unknown = null
  if (!input.intentAlreadyPersisted) {
    try {
      await log('cleanup_pending')
    } catch (error) {
      intentError = error
    }
  }

  const cleaned = await deleteAttachmentFileIfExists(input.filePath)

  if (intentError) {
    throw intentError
  }

  if (cleaned) {
    await log('cleanup_completed')
  }

  return cleaned
}
