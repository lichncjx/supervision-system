import { NextRequest, NextResponse } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { fail, fromError } from '@/shared/http/api-response'
import { downloadAttachmentUseCase } from '@/features/attachments/application/download-attachment.usecase'

export const GET = withApiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const currentUser = await requireCurrentUser(request)

  const { id } = await params
  const attachmentId = parseInt(id)

  if (isNaN(attachmentId)) {
    return fail('无效的附件ID', 400)
  }

  const result = await downloadAttachmentUseCase({ currentUser, attachmentId })
  if (!result.ok) return fromError(result)

  return new NextResponse(result.data.fileBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': result.data.contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(result.data.fileName)}"`,
      'Content-Length': String(result.data.fileBuffer.length),
    },
  })
})
