import { Prisma } from '@prisma/client'
import { isGlobalView } from '@/features/users/domain/role.rules'
import { err, ok, type Result } from '@/shared/result'
import {
  DASHBOARD_NOTICE_MAX_LENGTH,
  getNaturalAssessmentYear,
  normalizeDashboardNotice,
  normalizeDefaultAssessmentYear,
} from '@/features/system-settings/domain/system-settings.rules'
import {
  createSystemSetting,
  createSystemSettingOperationLog,
  findSystemSetting,
  updateSystemSettingByVersion,
} from '@/features/system-settings/infrastructure/system-settings.repository'

export type SystemSettingsDto = {
  defaultAssessmentYear: number
  dashboardNotice: string | null
  updatedAt: string | null
  updatedBy: { id: number; name: string } | null
}

function toDto(setting: Awaited<ReturnType<typeof findSystemSetting>>): SystemSettingsDto {
  if (!setting) {
    return {
      defaultAssessmentYear: getNaturalAssessmentYear(),
      dashboardNotice: null,
      updatedAt: null,
      updatedBy: null,
    }
  }

  return {
    defaultAssessmentYear: setting.defaultAssessmentYear,
    dashboardNotice: setting.dashboardNotice,
    updatedAt: setting.updatedAt.toISOString(),
    updatedBy: setting.updatedBy,
  }
}

export async function getSystemSettingsUseCase(): Promise<SystemSettingsDto> {
  try {
    return toDto(await findSystemSetting())
  } catch {
    return toDto(null)
  }
}

export async function getDefaultAssessmentYear(): Promise<number> {
  return (await getSystemSettingsUseCase()).defaultAssessmentYear
}

export type UpdateSystemSettingsInput = {
  defaultAssessmentYear?: unknown
  dashboardNotice?: unknown
  updatedAt?: unknown
}

export async function updateSystemSettingsUseCase(
  currentUser: { id: number; name: string; role: string },
  input: UpdateSystemSettingsInput,
): Promise<Result<SystemSettingsDto>> {
  if (!isGlobalView(currentUser.role)) return err(403, '权限不足')

  const defaultAssessmentYear = normalizeDefaultAssessmentYear(input.defaultAssessmentYear)
  if (!defaultAssessmentYear) return err(400, '请选择有效的默认管理年度')

  const dashboardNotice = normalizeDashboardNotice(input.dashboardNotice)
  if (dashboardNotice === undefined) {
    return err(400, `督办提示必须为不超过 ${DASHBOARD_NOTICE_MAX_LENGTH} 个字符的文本`)
  }

  const existing = await findSystemSetting()
  let updated
  if (!existing) {
    if (input.updatedAt !== null && input.updatedAt !== undefined) {
      return err(409, '系统设置已被其他用户初始化，请刷新后重试')
    }
    try {
      updated = await createSystemSetting({ defaultAssessmentYear, dashboardNotice, updatedById: currentUser.id })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return err(409, '系统设置已被其他用户更新，请刷新后重试')
      }
      throw error
    }
  } else {
    if (typeof input.updatedAt !== 'string') return err(409, '系统设置已更新，请刷新后重试')
    const version = new Date(input.updatedAt)
    if (Number.isNaN(version.getTime())) return err(400, '无效的系统设置版本')
    updated = await updateSystemSettingByVersion({
      defaultAssessmentYear,
      dashboardNotice,
      updatedById: currentUser.id,
      updatedAt: version,
    })
    if (!updated) return err(409, '系统设置已被其他用户更新，请刷新后重试')
  }

  await createSystemSettingOperationLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    defaultAssessmentYear,
    noticeChanged: existing?.dashboardNotice !== dashboardNotice,
  })
  return ok(toDto(updated))
}
