import { NextRequest } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/require-current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { success, fail, fromError } from '@/shared/http/api-response'
import { deleteAttachmentUseCase } from '@/features/attachments/application/delete-attachment.usecase'

type AttachmentParams = { params: Promise<{ id: string }> }

export const DELETE = withApiHandler(
  async (request: NextRequest, ...args: unknown[]) => {
    const currentUser = await requireCurrentUser(request)

    const { id } = await (args[0] as AttachmentParams).params
    const attachmentId = parseInt(id)

    if (isNaN(attachmentId)) {
      return fail('无效的附件ID', 400)
    }

    const result = await deleteAttachmentUseCase({ currentUser, attachmentId })
    if (result.kind === 'error') return fromError(result)

    return success()
  },
)
