import { writeFile, mkdir, unlink, readFile, readdir, stat } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { sanitizeFileName } from '@/features/attachments/domain/attachment.rules'

function uploadRootDir() {
  return path.join(process.cwd(), 'uploads', 'attachments')
}

export interface AttachmentStorageFile {
  relativePath: string
  modifiedAt: Date
}

export type AttachmentFileDeleteResult = 'deleted' | 'missing' | 'failed' | 'invalid'

export function normalizeAttachmentStoragePath(relativePath: string): string | null {
  const root = path.resolve(uploadRootDir())
  const portablePath = relativePath.replace(/[\\/]+/g, path.sep)
  const fullPath = path.resolve(process.cwd(), portablePath)

  if (fullPath !== root && !fullPath.startsWith(`${root}${path.sep}`)) {
    return null
  }

  return path.relative(process.cwd(), fullPath).split(path.sep).join('/')
}

export async function listAttachmentStorageFiles(): Promise<AttachmentStorageFile[]> {
  const root = uploadRootDir()
  const files: AttachmentStorageFile[] = []

  async function walk(directory: string): Promise<void> {
    let entries
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
      throw error
    }

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name)

      if (entry.isDirectory()) {
        await walk(fullPath)
        continue
      }

      if (!entry.isFile()) continue

      try {
        const fileStat = await stat(fullPath)
        files.push({
          relativePath: path.relative(process.cwd(), fullPath).split(path.sep).join('/'),
          modifiedAt: fileStat.mtime,
        })
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      }
    }
  }

  await walk(root)
  return files
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
  const normalizedPath = normalizeAttachmentStoragePath(relativePath)
  if (!normalizedPath) return null

  const fullPath = path.join(process.cwd(), normalizedPath)

  if (!existsSync(fullPath)) {
    return null
  }

  return readFile(fullPath)
}

export async function deleteAttachmentFileIfExists(
  relativePath: string,
): Promise<AttachmentFileDeleteResult> {
  const normalizedPath = normalizeAttachmentStoragePath(relativePath)
  if (!normalizedPath) return 'invalid'

  const fullPath = path.join(process.cwd(), normalizedPath)

  try {
    await unlink(fullPath)
    return 'deleted'
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return 'missing'
    }
    console.warn('Failed to delete physical file:', fullPath)
    return 'failed'
  }
}

export function attachmentFilePathExists(relativePath: string): boolean {
  const normalizedPath = normalizeAttachmentStoragePath(relativePath)
  return normalizedPath ? existsSync(path.join(process.cwd(), normalizedPath)) : false
}
