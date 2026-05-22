import type {
  DeleteAttachmentResponse,
  UploadAttachmentResponse,
} from '@/features/attachments/contract/attachment-api.types'
import type { ApiErrorResponse } from '@/shared/http/api-response.types'

export async function uploadFiles(workId: number, files: FileList | File[], category?: string) {
  for (const file of Array.from(files)) {
    const formData = new FormData()
    formData.append('workItemId', String(workId))
    formData.append('file', file)
    if (category) formData.append('category', category)

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })
    const data = (await res.json()) as UploadAttachmentResponse & ApiErrorResponse
    if (!res.ok || !data.success) {
      throw new Error(data.error || '上传失败')
    }
  }
}

export async function deleteAttachment(attachmentId: number) {
  const res = await fetch(`/api/attachments/${attachmentId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  const data = (await res.json()) as DeleteAttachmentResponse & ApiErrorResponse
  if (!res.ok || !data.success) {
    throw new Error(data.error || '删除失败')
  }
}
