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

export interface UploadAttachmentResponse {
  success: true
  attachment: AttachmentApiDto
}

export interface DeleteAttachmentResponse {
  success: true
}

export interface AttachmentApiErrorDto {
  error?: string
}
