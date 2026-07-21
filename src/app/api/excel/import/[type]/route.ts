import { createHash } from 'crypto'
import { NextRequest } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/current-user'
import { verifyExcelImportPreviewToken } from '@/shared/auth/jwt'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { ok, fail } from '@/shared/http/api-response'
import { importWorksFromExcelUseCase } from '@/features/excel/application/import-works-from-excel.usecase'
import { getDefaultAssessmentYear } from '@/features/system-settings/application/system-settings.usecase'
import { normalizeAssessmentYear } from '@/features/works/domain/work-structure.rules'

export const POST = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ type: string }> }) => {
    const currentUser = await requireCurrentUser(request)

    const { type } = await params
    const normalizedType = type.toLowerCase()
    if (!['priority', 'main', 'todo'].includes(normalizedType)) {
      return fail('无效的导入类型', 400)
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const assessmentYear = formData.get('assessmentYear')
    const effectiveAssessmentYear = normalizeAssessmentYear(assessmentYear) || await getDefaultAssessmentYear()
    const previewToken = formData.get('previewToken')
    if (!(file instanceof File)) {
      return fail('请选择要导入的文件', 400)
    }

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return fail('只支持 .xlsx 或 .xls 格式', 400)
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    if (typeof previewToken !== 'string') {
      return fail('请先完成导入预览', 400)
    }

    const preview = verifyExcelImportPreviewToken(previewToken)
    if (
      !preview ||
      preview.userId !== currentUser.id ||
      preview.type !== normalizedType ||
      preview.assessmentYear !== effectiveAssessmentYear ||
      preview.fileHash !== createHash('sha256').update(fileBuffer).digest('hex')
    ) {
      return fail('导入预览已失效或文件、年度已变更，请重新预览', 400)
    }

    const result = await importWorksFromExcelUseCase({
      currentUser,
      type: normalizedType,
      fileBuffer,
      fileName: file.name,
      assessmentYear: preview.assessmentYear,
    })

    if (!result.ok) {
      const details = result.details as { reason: string }[] | undefined
      const status = details?.some(
        (d) =>
          d.reason.includes('部门用户只能导入') ||
          d.reason.includes('公司领导普通导入') ||
          d.reason.includes('公司领导不能默认') ||
          d.reason.includes('当前角色无'),
      )
        ? 403
        : 400

      return fail(result.message, status, undefined, details)
    }

    return ok({ imported: result.data })
  },
)
