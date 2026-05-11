export interface UploadAttachmentInput {
  currentUser: {
    id: number
    name: string
    role: string
    departmentId: number
  }
  workItemId: number
  fileName: string
  fileBuffer: Buffer
  fileSize: number
  ext: string
  category: string
}

export type UploadAttachmentResult =
  | {
      kind: 'ok'
      attachment: {
        id: number
        fileName: string
        fileSize: number
        fileType: string
        category: string
        uploadedAt: Date
      }
    }
  | { kind: 'error'; status: number; message: string }

export interface DownloadAttachmentInput {
  currentUser: {
    id: number
    name: string
    role: string
    departmentId: number
  }
  attachmentId: number
}

export type DownloadAttachmentResult =
  | {
      kind: 'ok'
      fileBuffer: Buffer
      fileName: string
      contentType: string
    }
  | { kind: 'error'; status: number; message: string }

export interface DeleteAttachmentInput {
  currentUser: {
    id: number
    name: string
    role: string
    departmentId: number
  }
  attachmentId: number
}

export type DeleteAttachmentResult =
  | { kind: 'ok' }
  | { kind: 'error'; status: number; message: string }
