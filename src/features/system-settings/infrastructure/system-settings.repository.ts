import { Role } from '@prisma/client'
import { prisma } from '@/shared/db/prisma'
import { SYSTEM_SETTING_ID } from '@/features/system-settings/domain/system-settings.rules'

const settingSelect = {
  defaultAssessmentYear: true,
  dashboardNotice: true,
  updatedAt: true,
  updatedBy: { select: { id: true, name: true } },
} as const

export async function findSystemSetting() {
  return prisma.systemSetting.findUnique({
    where: { id: SYSTEM_SETTING_ID },
    select: settingSelect,
  })
}

export async function createSystemSetting(input: {
  defaultAssessmentYear: number
  dashboardNotice: string | null
  updatedById: number
}) {
  return prisma.systemSetting.create({
    data: { id: SYSTEM_SETTING_ID, ...input },
    select: settingSelect,
  })
}

export async function updateSystemSettingByVersion(input: {
  defaultAssessmentYear: number
  dashboardNotice: string | null
  updatedById: number
  updatedAt: Date
}) {
  const result = await prisma.systemSetting.updateMany({
    where: { id: SYSTEM_SETTING_ID, updatedAt: input.updatedAt },
    data: {
      defaultAssessmentYear: input.defaultAssessmentYear,
      dashboardNotice: input.dashboardNotice,
      updatedById: input.updatedById,
    },
  })
  return result.count === 1 ? findSystemSetting() : null
}

export async function createSystemSettingOperationLog(input: {
  userId: number
  userName: string
  userRole: string
  defaultAssessmentYear: number
  noticeChanged: boolean
}) {
  return prisma.operationLog.create({
    data: {
      userId: input.userId,
      userName: input.userName,
      userRole: input.userRole as Role,
      action: 'update',
      module: 'systemSetting',
      targetId: SYSTEM_SETTING_ID,
      targetType: 'systemSetting',
      description: `更新系统设置：默认管理年度 ${input.defaultAssessmentYear}${input.noticeChanged ? '，督办提示已更新' : ''}`,
    },
  })
}
