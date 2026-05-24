import { NextRequest } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { ok, fail, fromError } from '@/shared/http/api-response'
import { deleteAttachmentUseCase } from '@/features/attachments/application/delete-attachment.usecase'

export const DELETE = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const currentUser = await requireCurrentUser(request)

    const { id } = await params
    const attachmentId = parseInt(id)

    if (isNaN(attachmentId)) {
      return fail('无效的附件ID', 400)
    }

    const result = await deleteAttachmentUseCase({ currentUser, attachmentId })
    if (result.kind === 'error') return fromError(result)

    return ok()
  },
)
