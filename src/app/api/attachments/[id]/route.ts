import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserOrAuthError } from '@/shared/auth/get-current-user-or-auth-error'
import { deleteAttachmentUseCase } from '@/features/attachments/application/delete-attachment.usecase'

export async function DELETE(
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

    const result = await deleteAttachmentUseCase({ currentUser, attachmentId })

    if (result.kind === 'error') {
      return NextResponse.json({ error: result.message }, { status: result.status })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete attachment error:', error)
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}
