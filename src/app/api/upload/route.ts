import { NextRequest, NextResponse } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/require-current-user'
import { AppError } from '@/shared/errors/app-error'
import { fail } from '@/shared/http/api-response'
import { getFileExtension } from '@/features/attachments/infrastructure/local-file-storage'
import {
  isAllowedExtension,
  isForbiddenExtension,
  isFileSizeExceeded,
} from '@/features/attachments/domain/attachment.rules'
import { uploadAttachmentUseCase } from '@/features/attachments/application/upload-attachment.usecase'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireCurrentUser(request)

    const formData = await request.formData()
    const workItemIdStr = formData.get('workItemId')
    const file = formData.get('file') as File | null
    const categoryRaw = (formData.get('category') as string) || 'general'

    if (!['general', 'evidence'].includes(categoryRaw)) {
      return fail('无效的附件分类', 400)
    }

    if (!workItemIdStr) {
      return fail('请提供事项ID', 400)
    }

    const workItemId = parseInt(workItemIdStr as string)
    if (isNaN(workItemId)) {
      return fail('无效的事项ID', 400)
    }

    if (!file) {
      return fail('请选择要上传的文件', 400)
    }

    const ext = getFileExtension(file.name)

    if (isForbiddenExtension(ext)) {
      return fail('不允许上传可执行文件', 400)
    }

    if (!isAllowedExtension(ext)) {
      return fail(
        '不支持的文件类型，仅允许：.pdf、.doc、.docx、.xls、.xlsx、.jpg、.jpeg、.png、.gif、.zip、.rar、.7z',
        400,
      )
    }

    if (isFileSizeExceeded(file.size)) {
      return fail('文件大小不能超过 50MB', 400)
    }

    const bytes = await file.arrayBuffer()
    const fileBuffer = Buffer.from(bytes)

    const result = await uploadAttachmentUseCase({
      currentUser,
      workItemId,
      fileName: file.name,
      fileBuffer,
      fileSize: file.size,
      ext,
      category: categoryRaw,
    })

    if (result.kind === 'error') {
      return fail(result.message, result.status)
    }

    return NextResponse.json({
      success: true,
      attachment: result.attachment,
    })
  } catch (error) {
    if (error instanceof AppError) return fail(error.message, error.status, error.code)
    console.error('Upload error:', error)
    return fail('上传失败', 500)
  }
}
