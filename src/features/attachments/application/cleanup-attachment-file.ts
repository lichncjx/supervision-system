import { deleteAttachmentFileIfExists } from '@/features/attachments/infrastructure/local-file-storage'

export async function cleanupAttachmentFileBestEffort(
  filePath: string,
): Promise<boolean> {
  try {
    const result = await deleteAttachmentFileIfExists(filePath)
    if (result === 'invalid') {
      console.warn('Skipped attachment cleanup outside the storage root:', filePath)
    }
    return result === 'deleted' || result === 'missing'
  } catch (error) {
    console.warn('Unexpected error while cleaning attachment file:', filePath, error)
    return false
  }
}
