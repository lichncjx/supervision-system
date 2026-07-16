import { isDeptManager } from '@/features/users/domain/role.rules'
import { findUserById } from '@/features/users/infrastructure/user.repository'
import { err, ok, type Result } from '@/shared/result'

type ResponsiblePersonRecord = {
  isActive: boolean
  departmentId: number
  role: string
}

type FindResponsiblePerson = (
  userId: number,
) => Promise<ResponsiblePersonRecord | null>

export async function validateEffectiveResponsiblePerson(
  params: {
    responsiblePersonUserId: unknown
    departmentId: unknown
  },
  findResponsiblePerson: FindResponsiblePerson = findUserById,
): Promise<Result> {
  const responsiblePersonUserId = Number(params.responsiblePersonUserId)
  const departmentId = Number(params.departmentId)

  if (!Number.isInteger(responsiblePersonUserId) || responsiblePersonUserId <= 0) {
    return err(400, '事项缺少责任人，无法审批通过。请先补充责任人信息。')
  }
  if (!Number.isInteger(departmentId) || departmentId <= 0) {
    return err(400, '事项缺少责任部门，无法审批通过。请先补充责任部门信息。')
  }

  const responsiblePerson = await findResponsiblePerson(responsiblePersonUserId)
  if (!responsiblePerson || !responsiblePerson.isActive) {
    return err(400, '责任人用户不存在或已禁用，无法审批通过')
  }
  if (responsiblePerson.departmentId !== departmentId) {
    return err(400, '责任人不属于责任部门，无法审批通过')
  }
  if (!isDeptManager(responsiblePerson.role)) {
    return err(400, '责任人必须是部门事项管理岗，无法审批通过')
  }

  return ok()
}
