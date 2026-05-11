import { writeFile, mkdir, unlink, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { sanitizeFileName } from '@/features/attachments/domain/attachment.rules'

function uploadRootDir() {
  return path.join(process.cwd(), 'uploads', 'attachments')
}

function generateUploadDir() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const uuid = randomUUID()
  return path.join(uploadRootDir(), String(year), month, uuid)
}

export function getFileExtension(fileName: string): string {
  return path.extname(fileName).toLowerCase()
}

export async function saveUploadedFile(
  fileBuffer: Buffer,
  originalFileName: string,
): Promise<{ relativePath: string; fileName: string }> {
  const dir = generateUploadDir()

  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }

  const safeName = sanitizeFileName(originalFileName)
  const filePath = path.join(dir, safeName)

  await writeFile(filePath, fileBuffer)

  const relativePath = path.relative(process.cwd(), filePath)
  return { relativePath, fileName: originalFileName }
}

export async function readAttachmentFile(
  relativePath: string,
): Promise<Buffer | null> {
  const fullPath = path.join(process.cwd(), relativePath)

  if (!existsSync(fullPath)) {
    return null
  }

  return readFile(fullPath)
}

export async function deleteAttachmentFileIfExists(
  relativePath: string,
): Promise<void> {
  const fullPath = path.join(process.cwd(), relativePath)

  if (existsSync(fullPath)) {
    try {
      await unlink(fullPath)
    } catch {
      console.warn('Failed to delete physical file:', fullPath)
    }
  }
}

export function attachmentFilePathExists(relativePath: string): boolean {
  return existsSync(path.join(process.cwd(), relativePath))
}
