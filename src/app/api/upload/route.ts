import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserOrAuthError } from '@/shared/auth/get-current-user-or-auth-error'
import { getFileExtension } from '@/features/attachments/infrastructure/local-file-storage'
import {
  isAllowedExtension,
  isForbiddenExtension,
  isFileSizeExceeded,
} from '@/features/attachments/domain/attachment.rules'
import { uploadAttachmentUseCase } from '@/features/attachments/application/upload-attachment.usecase'

export async function POST(request: NextRequest) {
  try {
    const auth = await getCurrentUserOrAuthError(request)
    if (!auth.ok) return auth.response

    const currentUser = auth.user

    const formData = await request.formData()
    const workItemIdStr = formData.get('workItemId')
    const file = formData.get('file') as File | null
    const categoryRaw = (formData.get('category') as string) || 'general'

    if (!['general', 'evidence'].includes(categoryRaw)) {
      return NextResponse.json({ error: '无效的附件分类' }, { status: 400 })
    }

    if (!workItemIdStr) {
      return NextResponse.json({ error: '请提供事项ID' }, { status: 400 })
    }

    const workItemId = parseInt(workItemIdStr as string)
    if (isNaN(workItemId)) {
      return NextResponse.json({ error: '无效的事项ID' }, { status: 400 })
    }

    if (!file) {
      return NextResponse.json({ error: '请选择要上传的文件' }, { status: 400 })
    }

    const ext = getFileExtension(file.name)

    if (isForbiddenExtension(ext)) {
      return NextResponse.json({ error: '不允许上传可执行文件' }, { status: 400 })
    }

    if (!isAllowedExtension(ext)) {
      return NextResponse.json(
        { error: '不支持的文件类型，仅允许：.pdf、.doc、.docx、.xls、.xlsx、.jpg、.jpeg、.png、.gif、.zip、.rar、.7z' },
        { status: 400 },
      )
    }

    if (isFileSizeExceeded(file.size)) {
      return NextResponse.json({ error: '文件大小不能超过 50MB' }, { status: 400 })
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
      return NextResponse.json({ error: result.message }, { status: result.status })
    }

    return NextResponse.json({
      success: true,
      attachment: result.attachment,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: '上传失败' }, { status: 500 })
  }
}
