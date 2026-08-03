import { deleteAttachmentFileIfExists } from '@/features/attachments/infrastructure/local-file-storage'

export async function cleanupAttachmentFileBestEffort(
  filePath: string,
): Promise<boolean> {
  try {
    return await deleteAttachmentFileIfExists(filePath)
  } catch (error) {
    console.warn('Unexpected error while cleaning attachment file:', filePath, error)
    return false
  }
}
