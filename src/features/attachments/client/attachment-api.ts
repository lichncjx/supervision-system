import type {
  AttachmentApiErrorDto,
  DeleteAttachmentResponseDto,
  UploadAttachmentResponseDto,
} from '@/features/attachments/shared/attachment-api.types'

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
    const data = (await res.json()) as UploadAttachmentResponseDto & AttachmentApiErrorDto
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
  const data = (await res.json()) as DeleteAttachmentResponseDto & AttachmentApiErrorDto
  if (!res.ok || !data.success) {
    throw new Error(data.error || '删除失败')
  }
}
