export interface AttachmentApiDto {
  id: number
  fileName: string
  fileSize: number
  fileType: string
  category: string
  uploadedAt: string
  userId: number
  userName?: string
}

