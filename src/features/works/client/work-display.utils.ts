import { getWorkStatusDescription } from '@/features/works/domain/work-status.rules'

export function getActionName(action: string) {
  const map: Record<string, string> = {
    create: '新建审批',
    submit: '提交审批',
    approve: '审批通过',
    reject: '审批退回',
    evidence: '提交见证材料',
    complete: '完成审批',
    adjust: '申请调整',
    cancel: '申请取消',
    todo_decompose: '待办分解审批',
    decompose: '待办分解审批',
  }
  return map[action] || action
}

export function getCurrentProcessDescription(
  status: string,
  currentApproverRole?: string | null,
  currentApproverId?: number | null,
): string {
  const normalizedStatus = status.toLowerCase()
  const normalizedRole = currentApproverRole?.toUpperCase()

  if (normalizedRole === 'DEPARTMENT_LEADER') {
    switch (normalizedStatus) {
      case 'adjusting':
        return '调整申请待部门领导审批'
      case 'cancelling':
        return '取消申请待部门领导审批'
    }
  }

  if (normalizedRole === 'VICE_PRESIDENT') {
    switch (normalizedStatus) {
      case 'adjusting':
        return '调整申请待公司主管领导审批'
      case 'cancelling':
        return '取消申请待公司主管领导审批'
    }
  }

  if (currentApproverId) {
    switch (normalizedStatus) {
      case 'proposing':
        return '待指定公司领导审批'
      case 'adjusting':
        return '调整申请待指定公司领导审批'
      case 'cancelling':
        return '取消申请待指定公司领导审批'
      case 'completing':
        return '完成申请待指定公司领导审批'
    }
  }

  return getWorkStatusDescription(normalizedStatus)
}
