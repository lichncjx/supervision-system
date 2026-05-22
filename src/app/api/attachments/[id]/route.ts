import { NextRequest } from 'next/server'
import { getCurrentUserOrAuthError } from '@/shared/auth/get-current-user-or-auth-error'
import { success, fail, fromError } from '@/shared/http/api-response'
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
      return fail('无效的附件ID', 400)
    }

    const result = await deleteAttachmentUseCase({ currentUser, attachmentId })

    if (result.kind === 'error') {
      return fromError(result)
    }

    return success()
  } catch (error) {
    console.error('Delete attachment error:', error)
    return fail('删除失败', 500)
  }
}
