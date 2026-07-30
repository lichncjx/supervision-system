import assert from 'node:assert/strict'
import {
  Role,
  WorkItemStatus,
  WorkItemType,
} from '@prisma/client'
import {
  canApproveWorkItem,
  canEditWorkItem,
  canOperateWorkItem,
  canViewWorkItem,
  type PermissionUser,
  type PermissionWorkItem,
} from '@/features/works/domain/work.permissions'
import { buildWorkVisibilityWhere } from '@/shared/db/work-visibility-builder'

const vicePresident: PermissionUser = {
  id: 101,
  role: Role.VICE_PRESIDENT,
  departmentId: 1,
}
const president: PermissionUser = {
  id: 102,
  role: Role.PRESIDENT,
  departmentId: 1,
}
const otherLeaderId = 999

function work(
  overrides: Partial<PermissionWorkItem> = {},
): PermissionWorkItem {
  return {
    id: 1,
    type: WorkItemType.PRIORITY,
    status: WorkItemStatus.DRAFT,
    departmentId: 2,
    cooperators: [],
    creatorId: 201,
    firstSubmitterId: null,
    proposedLeaderId: otherLeaderId,
    approvalLeaderId: otherLeaderId,
    currentApproverId: null,
    currentApproverRole: null,
    responsiblePersonUserId: 202,
    ...overrides,
  }
}

async function main() {
  for (const leader of [vicePresident, president]) {
    for (const type of Object.values(WorkItemType)) {
      for (const status of Object.values(WorkItemStatus)) {
        const item = work({ type, status })
        assert.equal(
          canViewWorkItem(leader, item),
          status !== WorkItemStatus.DRAFT,
          `${leader.role} visibility mismatch for ${type}/${status}`,
        )
      }
    }

    assert.equal(
      canViewWorkItem(leader, work({ proposedLeaderId: leader.id })),
      true,
      `${leader.role} should retain proposed-leader draft visibility`,
    )
    assert.equal(
      canViewWorkItem(leader, work({ approvalLeaderId: leader.id })),
      true,
      `${leader.role} should retain approval-leader draft visibility`,
    )
    assert.equal(
      canViewWorkItem(leader, work({ currentApproverId: leader.id })),
      true,
      `${leader.role} should retain current-approver draft visibility`,
    )

    const unrelatedInProgress = work({
      status: WorkItemStatus.IN_PROGRESS,
    })
    assert.equal(canEditWorkItem(leader, unrelatedInProgress), false)
    assert.equal(canOperateWorkItem(leader, unrelatedInProgress), false)

    const unrelatedApproval = work({
      status: WorkItemStatus.PROPOSING,
      currentApproverId: otherLeaderId,
      currentApproverRole: leader.role,
    })
    assert.equal(canApproveWorkItem(leader, unrelatedApproval), false)

    assert.deepEqual(
      await buildWorkVisibilityWhere(leader),
      {
        OR: [
          { status: { not: WorkItemStatus.DRAFT } },
          { proposedLeaderId: leader.id },
          { approvalLeaderId: leader.id },
          { currentApproverId: leader.id },
        ],
      },
    )
  }

  for (const role of [Role.ADMIN, Role.SUPERVISOR]) {
    const globalViewer: PermissionUser = {
      id: role === Role.ADMIN ? 1 : 2,
      role,
      departmentId: 1,
    }
    assert.equal(canViewWorkItem(globalViewer, work()), true)
    assert.deepEqual(await buildWorkVisibilityWhere(globalViewer), {})
  }

  console.log('Company leader visibility regression checks passed')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
