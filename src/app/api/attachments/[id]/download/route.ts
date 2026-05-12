import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserOrAuthError } from '@/shared/auth/get-current-user-or-auth-error'
import { downloadAttachmentUseCase } from '@/features/attachments/application/download-attachment.usecase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getCurrentUserOrAuthError(request)
    if (!auth.ok) return auth.response

    const currentUser = auth.user

    const { id } = await params
    const attachmentId = parseInt(id)

    if (isNaN(attachmentId)) {
      return NextResponse.json({ error: '无效的附件ID' }, { status: 400 })
    }

    const result = await downloadAttachmentUseCase({ currentUser, attachmentId })

    if (result.kind === 'error') {
      return NextResponse.json({ error: result.message }, { status: result.status })
    }

    return new NextResponse(result.fileBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(result.fileName)}"`,
        'Content-Length': String(result.fileBuffer.length),
      },
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ error: '下载失败' }, { status: 500 })
  }
}
