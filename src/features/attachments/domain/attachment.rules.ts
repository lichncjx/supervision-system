export const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.zip',
  '.rar',
  '.7z',
] as const

export const FORBIDDEN_EXTENSIONS = [
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.js',
  '.ps1',
  '.dll',
] as const

export const MAX_FILE_SIZE = 50 * 1024 * 1024

export const MIME_TYPE_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx':
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.zip': 'application/zip',
  '.rar': 'application/vnd.rar',
  '.7z': 'application/x-7z-compressed',
}

export function getContentType(ext: string): string {
  return MIME_TYPE_MAP[ext] || 'application/octet-stream'
}

export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9一-龥._-]/g, '_')
}

export function isAllowedExtension(ext: string): boolean {
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext)
}

export function isForbiddenExtension(ext: string): boolean {
  return (FORBIDDEN_EXTENSIONS as readonly string[]).includes(ext)
}

export function isFileSizeExceeded(size: number): boolean {
  return size > MAX_FILE_SIZE
}
