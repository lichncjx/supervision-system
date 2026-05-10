const targetStateGroups = {
  DRAFT: ['DRAFT'],
  PENDING_DECOMPOSE: ['PENDING_DECOMPOSE'],
  PROPOSING: ['PROPOSING'],
  IN_PROGRESS: ['IN_PROGRESS'],
  ADJUSTING: ['ADJUSTING'],
  CANCELLING: ['CANCELLING'],
  COMPLETING: ['COMPLETING'],
  COMPLETED: ['COMPLETED'],
  CANCELLED: ['CANCELLED'],
};

const departments = [
  { key: 'leadership', name: '测试公司领导组', code: 'TLD', isBusiness: false },
  { key: 'deptA', name: '测试A部门', code: 'TDA', isBusiness: true },
  { key: 'deptB', name: '测试B部门', code: 'TDB', isBusiness: true },
  { key: 'deptC', name: '测试C部门', code: 'TDC', isBusiness: true },
];

const users = [
  { key: 'admin', username: 'admin', name: '测试系统管理员', role: 'ADMIN', departmentKey: 'leadership' },
  { key: 'supervisor', username: 'supervisor', name: '测试督办管理员', role: 'SUPERVISOR', departmentKey: 'leadership' },
  { key: 'president', username: 'president', name: '测试公司主要领导', role: 'PRESIDENT', departmentKey: 'leadership' },
  { key: 'vpA', username: 'vp_a', name: '测试副总A', role: 'VICE_PRESIDENT', departmentKey: 'leadership' },
  { key: 'vpB', username: 'vp_b', name: '测试副总B', role: 'VICE_PRESIDENT', departmentKey: 'leadership' },
  { key: 'deptLeaderA', username: 'dept_leader_a', name: '测试A部门领导', role: 'DEPARTMENT_LEADER', departmentKey: 'deptA' },
  { key: 'deptManagerA1', username: 'dept_manager_a1', name: '测试A部门事项管理岗1', role: 'DEPARTMENT_MANAGER', departmentKey: 'deptA' },
  { key: 'deptManagerA2', username: 'dept_manager_a2', name: '测试A部门事项管理岗2', role: 'DEPARTMENT_MANAGER', departmentKey: 'deptA' },
  { key: 'deptLeaderB', username: 'dept_leader_b', name: '测试B部门领导', role: 'DEPARTMENT_LEADER', departmentKey: 'deptB' },
  { key: 'deptManagerB1', username: 'dept_manager_b1', name: '测试B部门事项管理岗1', role: 'DEPARTMENT_MANAGER', departmentKey: 'deptB' },
];

function daysFromNow(days) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

function buildWorkItems(ctx) {
  const { dept, user } = ctx;
  const farFuture = daysFromNow(30);
  const expiring = daysFromNow(3);
  const overdue = daysFromNow(-3);

  const base = {
    businessCategory: '目标口径自动化验证',
    completeForm: '验证材料',
    isInnovation: false,
    // Current /api/works parses JSON.parse(String(work.nodes)), so store a JSON string
    // until the business route is refactored to handle Prisma Json values directly.
    nodes: JSON.stringify([{ title: '验证节点', completeTime: farFuture.toISOString() }]),
    adjustHistory: [],
  };

  return [
    {
      key: 'priority_plain_in_progress_dept_a',
      label: '普通重点工作',
      targetStatus: 'IN_PROGRESS',
      data: {
        ...base,
        type: 'PRIORITY',
        title: 'TC-普通重点工作-A',
        workItem: 'TC-普通重点工作-A',
        status: 'IN_PROGRESS',
        departmentId: dept.deptA.id,
        creatorId: user.deptManagerA1.id,
        firstSubmitterId: user.deptManagerA1.id,
        proposedLeaderId: user.vpA.id,
        approvalLeaderId: user.vpA.id,
        responsibleLeader: '业务责任领导A',
        responsiblePerson: '事项实际责任人A',
        completeTime: farFuture,
      },
    },
    {
      key: 'main_plain_in_progress_dept_a',
      label: '普通主要工作',
      targetStatus: 'IN_PROGRESS',
      data: {
        ...base,
        type: 'MAIN',
        title: 'TC-普通主要工作-A',
        workItem: 'TC-普通主要工作-A',
        status: 'IN_PROGRESS',
        departmentId: dept.deptA.id,
        creatorId: user.deptManagerA2.id,
        firstSubmitterId: user.deptManagerA2.id,
        proposedLeaderId: user.vpA.id,
        approvalLeaderId: user.vpA.id,
        responsibleLeader: '业务责任领导A2',
        responsiblePerson: '事项实际责任人A2',
        completeTime: farFuture,
      },
    },
    {
      key: 'todo_company_pending_decompose',
      label: '公司领导发起的待办',
      targetStatus: 'PENDING_DECOMPOSE',
      data: {
        ...base,
        type: 'TODO',
        title: 'TC-公司领导发起待办-A',
        workItem: 'TC-公司领导发起待办-A',
        status: 'PENDING_DECOMPOSE',
        departmentId: dept.deptA.id,
        creatorId: user.vpA.id,
        proposedLeaderId: user.vpA.id,
        approvalLeaderId: user.vpA.id,
        responsiblePerson: '业务主责人A',
        planCompleteTime: farFuture,
      },
    },
    {
      key: 'todo_multi_responsible_ab',
      label: '多主责部门待办',
      targetStatus: 'IN_PROGRESS',
      data: {
        ...base,
        type: 'TODO',
        title: 'TC-多主责部门待办-AB',
        workItem: 'TC-多主责部门待办-AB',
        status: 'IN_PROGRESS',
        departmentId: dept.deptA.id,
        cooperators: [
          { departmentId: dept.deptB.id, departmentName: '测试B部门', leader: undefined, person: '业务主责人B' },
        ],
        creatorId: user.deptManagerA1.id,
        firstSubmitterId: user.deptManagerA1.id,
        proposedLeaderId: user.vpA.id,
        approvalLeaderId: user.vpA.id,
        responsiblePerson: '业务主责人A',
        planCompleteTime: farFuture,
      },
    },
    {
      key: 'todo_multi_cooperate_bc',
      label: '多配合部门待办',
      targetStatus: 'IN_PROGRESS',
      data: {
        ...base,
        type: 'TODO',
        title: 'TC-多配合部门待办-BC',
        workItem: 'TC-多配合部门待办-BC',
        status: 'IN_PROGRESS',
        departmentId: dept.deptA.id,
        cooperators: [
          { departmentId: dept.deptB.id, departmentName: '测试B部门', leader: undefined, person: '业务配合人B' },
          { departmentId: dept.deptC.id, departmentName: '测试C部门', leader: undefined, person: '业务配合人C' },
        ],
        creatorId: user.deptManagerA1.id,
        firstSubmitterId: user.deptManagerA1.id,
        proposedLeaderId: user.vpA.id,
        approvalLeaderId: user.vpA.id,
        responsiblePerson: '业务主责人A',
        planCompleteTime: farFuture,
      },
    },
    {
      key: 'priority_proposing_dept',
      label: '立项审批中事项-部门节点',
      targetStatus: 'PROPOSING',
      data: {
        ...base,
        type: 'PRIORITY',
        title: 'TC-立项审批中-部门节点-A',
        workItem: 'TC-立项审批中-部门节点-A',
        status: 'PROPOSING',
        beforeApprovalStatus: 'DRAFT',
        approvalType: 'PROPOSE',
        departmentId: dept.deptA.id,
        creatorId: user.deptManagerA1.id,
        firstSubmitterId: user.deptManagerA1.id,
        currentApproverRole: 'DEPARTMENT_LEADER',
        proposedLeaderId: user.vpA.id,
        approvalLeaderId: user.vpA.id,
        responsibleLeader: '业务责任领导待审',
        responsiblePerson: '事项实际责任人待审',
        completeTime: farFuture,
      },
    },
    {
      key: 'main_proposing_company',
      label: '立项审批中事项-公司节点',
      targetStatus: 'PROPOSING',
      data: {
        ...base,
        type: 'MAIN',
        title: 'TC-立项审批中-公司节点-A',
        workItem: 'TC-立项审批中-公司节点-A',
        status: 'PROPOSING',
        beforeApprovalStatus: 'DRAFT',
        approvalType: 'PROPOSE',
        departmentId: dept.deptA.id,
        creatorId: user.deptLeaderA.id,
        firstSubmitterId: user.deptLeaderA.id,
        currentApproverId: user.vpA.id,
        proposedLeaderId: user.vpA.id,
        approvalLeaderId: user.vpA.id,
        responsibleLeader: '业务责任领导公司审',
        responsiblePerson: '事项实际责任人公司审',
        completeTime: farFuture,
      },
    },
    {
      key: 'todo_vp_b_in_progress',
      label: '副总B负责事项',
      targetStatus: 'IN_PROGRESS',
      data: {
        ...base,
        type: 'TODO',
        title: 'TC-副总B负责待办-B',
        workItem: 'TC-副总B负责待办-B',
        status: 'IN_PROGRESS',
        departmentId: dept.deptB.id,
        creatorId: user.deptManagerB1.id,
        firstSubmitterId: user.deptManagerB1.id,
        proposedLeaderId: user.vpB.id,
        approvalLeaderId: user.vpB.id,
        responsiblePerson: '业务主责人B',
        planCompleteTime: farFuture,
      },
    },
    {
      key: 'priority_adjusting',
      label: '调整中事项',
      targetStatus: 'ADJUSTING',
      data: {
        ...base,
        type: 'PRIORITY',
        title: 'TC-调整中事项-A',
        workItem: 'TC-调整中事项-A',
        status: 'ADJUSTING',
        beforeApprovalStatus: 'IN_PROGRESS',
        approvalType: 'ADJUST',
        action: 'ADJUST',
        departmentId: dept.deptA.id,
        creatorId: user.deptManagerA2.id,
        firstSubmitterId: user.deptManagerA2.id,
        currentApproverRole: 'DEPARTMENT_LEADER',
        proposedLeaderId: user.vpA.id,
        approvalLeaderId: user.vpA.id,
        responsibleLeader: '业务责任领导调整',
        responsiblePerson: '事项实际责任人调整',
        completeTime: farFuture,
      },
    },
    {
      key: 'priority_cancelling_president',
      label: '取消中事项',
      targetStatus: 'CANCELLING',
      data: {
        ...base,
        type: 'PRIORITY',
        title: 'TC-取消中事项-主要领导节点',
        workItem: 'TC-取消中事项-主要领导节点',
        status: 'CANCELLING',
        beforeApprovalStatus: 'IN_PROGRESS',
        approvalType: 'CANCEL',
        action: 'CANCEL',
        needMainLeaderCancel: true,
        departmentId: dept.deptA.id,
        creatorId: user.deptManagerA1.id,
        firstSubmitterId: user.deptManagerA1.id,
        currentApproverId: user.president.id,
        proposedLeaderId: user.vpA.id,
        approvalLeaderId: user.president.id,
        responsibleLeader: '业务责任领导取消',
        responsiblePerson: '事项实际责任人取消',
        completeTime: farFuture,
      },
    },
    {
      key: 'todo_completing',
      label: '完成中事项',
      targetStatus: 'COMPLETING',
      data: {
        ...base,
        type: 'TODO',
        title: 'TC-完成中待办-A',
        workItem: 'TC-完成中待办-A',
        status: 'COMPLETING',
        beforeApprovalStatus: 'IN_PROGRESS',
        approvalType: 'COMPLETE',
        departmentId: dept.deptA.id,
        creatorId: user.deptManagerA1.id,
        firstSubmitterId: user.deptManagerA1.id,
        currentApproverId: user.vpA.id,
        proposedLeaderId: user.vpA.id,
        approvalLeaderId: user.vpA.id,
        responsiblePerson: '业务主责人完成',
        planCompleteTime: farFuture,
      },
    },
    {
      key: 'priority_evidence_completing',
      label: '完成中重点工作',
      targetStatus: 'COMPLETING',
      data: {
        ...base,
        type: 'PRIORITY',
        title: 'TC-完成中重点工作-A',
        workItem: 'TC-完成中重点工作-A',
        status: 'COMPLETING',
        beforeApprovalStatus: 'IN_PROGRESS',
        approvalType: 'COMPLETE',
        departmentId: dept.deptA.id,
        creatorId: user.deptManagerA1.id,
        firstSubmitterId: user.deptManagerA1.id,
        currentApproverId: user.vpA.id,
        proposedLeaderId: user.vpA.id,
        approvalLeaderId: user.vpA.id,
        responsibleLeader: '业务责任领导完成',
        responsiblePerson: '事项实际责任人完成',
        completeTime: farFuture,
      },
    },
    {
      key: 'priority_completed',
      label: '已完成事项',
      targetStatus: 'COMPLETED',
      data: {
        ...base,
        type: 'PRIORITY',
        title: 'TC-已完成重点工作-A',
        workItem: 'TC-已完成重点工作-A',
        status: 'COMPLETED',
        departmentId: dept.deptA.id,
        creatorId: user.deptManagerA1.id,
        proposedLeaderId: user.vpA.id,
        approvalLeaderId: user.vpA.id,
        responsibleLeader: '业务责任领导完成归档',
        responsiblePerson: '事项实际责任人完成归档',
        completeTime: overdue,
      },
    },
    {
      key: 'main_cancelled',
      label: '已取消事项',
      targetStatus: 'CANCELLED',
      data: {
        ...base,
        type: 'MAIN',
        title: 'TC-已取消主要工作-A',
        workItem: 'TC-已取消主要工作-A',
        status: 'CANCELLED',
        departmentId: dept.deptA.id,
        creatorId: user.deptManagerA1.id,
        proposedLeaderId: user.vpA.id,
        approvalLeaderId: user.vpA.id,
        responsibleLeader: '业务责任领导取消归档',
        responsiblePerson: '事项实际责任人取消归档',
        completeTime: overdue,
      },
    },
    {
      key: 'todo_expiring',
      label: '临期事项',
      targetStatus: 'IN_PROGRESS',
      data: {
        ...base,
        type: 'TODO',
        title: 'TC-临期待办-A',
        workItem: 'TC-临期待办-A',
        status: 'IN_PROGRESS',
        departmentId: dept.deptA.id,
        creatorId: user.deptManagerA2.id,
        firstSubmitterId: user.deptManagerA2.id,
        proposedLeaderId: user.vpA.id,
        approvalLeaderId: user.vpA.id,
        responsiblePerson: '业务主责人临期',
        planCompleteTime: expiring,
      },
    },
    {
      key: 'priority_overdue',
      label: '超期事项',
      targetStatus: 'IN_PROGRESS',
      data: {
        ...base,
        type: 'PRIORITY',
        title: 'TC-超期重点工作-A',
        workItem: 'TC-超期重点工作-A',
        status: 'IN_PROGRESS',
        departmentId: dept.deptA.id,
        creatorId: user.deptManagerA1.id,
        firstSubmitterId: user.deptManagerA1.id,
        proposedLeaderId: user.vpA.id,
        approvalLeaderId: user.vpA.id,
        responsibleLeader: '业务责任领导超期',
        responsiblePerson: '事项实际责任人超期',
        completeTime: overdue,
      },
    },
    {
      key: 'main_draft_creator_a2',
      label: '草稿事项-同部门非创建人可见',
      targetStatus: 'DRAFT',
      data: {
        ...base,
        type: 'MAIN',
        title: 'TC-草稿主要工作-A2创建',
        workItem: 'TC-草稿主要工作-A2创建',
        status: 'DRAFT',
        departmentId: dept.deptA.id,
        creatorId: user.deptManagerA2.id,
        proposedLeaderId: user.vpA.id,
        approvalLeaderId: user.vpA.id,
        responsibleLeader: '业务责任领导草稿',
        responsiblePerson: '事项实际责任人草稿',
        completeTime: farFuture,
      },
    },
    {
      key: 'todo_responsible_name_only_b',
      label: '责任人同名但无组织权限事项',
      targetStatus: 'IN_PROGRESS',
      data: {
        ...base,
        type: 'TODO',
        title: 'TC-责任人姓名不授权-B',
        workItem: 'TC-责任人姓名不授权-B',
        status: 'IN_PROGRESS',
        departmentId: dept.deptB.id,
        creatorId: user.deptManagerB1.id,
        firstSubmitterId: user.deptManagerB1.id,
        proposedLeaderId: user.vpB.id,
        approvalLeaderId: user.vpB.id,
        responsiblePerson: user.deptManagerA1.name,
        planCompleteTime: farFuture,
      },
    },
  ];
}

function getTargetStatus(work) {
  return work.status;
}

function getDueDate(work) {
  if (work.type === 'TODO') return work.planCompleteTime || null;
  return work.completeTime || null;
}

function getResponsibleDepartmentIds(work) {
  return work.departmentId ? [work.departmentId] : [];
}

function getCooperatorDepartmentIds(work) {
  if (!Array.isArray(work.cooperators)) return [];
  return work.cooperators.map((c) => c.departmentId).filter((id) => id > 0);
}

function isDeptRelated(work, departmentId) {
  return (
    getResponsibleDepartmentIds(work).includes(departmentId) ||
    getCooperatorDepartmentIds(work).includes(departmentId)
  );
}

function isMainResponsibleDept(work, departmentId) {
  return getResponsibleDepartmentIds(work).includes(departmentId);
}

function canViewWork(user, work) {
  if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') return true;
  if (user.role === 'DEPARTMENT_MANAGER' || user.role === 'DEPARTMENT_LEADER') {
    return isDeptRelated(work, user.departmentId);
  }
  if (user.role === 'VICE_PRESIDENT') {
    return (
      work.proposedLeaderId === user.id ||
      work.approvalLeaderId === user.id ||
      work.currentApproverId === user.id
    );
  }
  if (user.role === 'PRESIDENT') {
    return (
      work.proposedLeaderId === user.id ||
      work.approvalLeaderId === user.id ||
      work.currentApproverId === user.id ||
      work.currentApproverRole === 'PRESIDENT' ||
      work.needMainLeaderCancel === true
    );
  }
  return false;
}

function canApprove(user, work) {
  const targetStatus = getTargetStatus(work);
  if (!['PROPOSING', 'ADJUSTING', 'CANCELLING', 'COMPLETING'].includes(targetStatus)) {
    return false;
  }
  if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') return false;
  if (work.currentApproverId) return work.currentApproverId === user.id;
  if (work.currentApproverRole !== user.role) return false;
  if (user.role === 'DEPARTMENT_LEADER' || user.role === 'DEPARTMENT_MANAGER') {
    return isMainResponsibleDept(work, user.departmentId);
  }
  return true;
}

function canHandle(user, work) {
  if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') return false;
  const targetStatus = getTargetStatus(work);

  if (user.role === 'DEPARTMENT_MANAGER' || user.role === 'DEPARTMENT_LEADER') {
    const mainDept = isMainResponsibleDept(work, user.departmentId);
    if (!mainDept) return false;
    return ['DRAFT', 'PENDING_DECOMPOSE', 'IN_PROGRESS'].includes(targetStatus);
  }

  return false;
}

function isOverdue(work, now = new Date()) {
  const targetStatus = getTargetStatus(work);
  if (targetStatus === 'COMPLETED' || targetStatus === 'CANCELLED') return false;
  const due = getDueDate(work);
  return due ? new Date(due) < now : false;
}

function isExpiring(work, now = new Date(), days = 7) {
  const targetStatus = getTargetStatus(work);
  if (targetStatus === 'COMPLETED' || targetStatus === 'CANCELLED') return false;
  const due = getDueDate(work);
  if (!due) return false;
  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() + days);
  return new Date(due) >= now && new Date(due) <= deadline;
}

function expectedSummary(user, works, now = new Date()) {
  const visible = works.filter((work) => canViewWork(user, work));
  return {
    priorityTotal: visible.filter((work) => work.type === 'PRIORITY').length,
    mainTotal: visible.filter((work) => work.type === 'MAIN').length,
    todoTotal: visible.filter((work) => work.type === 'TODO').length,
    approving: visible.filter((work) => canApprove(user, work)).length,
    handling: visible.filter((work) => canHandle(user, work)).length,
    actionRequired: visible.filter((work) => canApprove(user, work) || canHandle(user, work)).length,
    inProgress: visible.filter((work) => getTargetStatus(work) === 'IN_PROGRESS').length,
    completed: visible.filter((work) => getTargetStatus(work) === 'COMPLETED').length,
    cancelled: visible.filter((work) => getTargetStatus(work) === 'CANCELLED').length,
    overdue: visible.filter((work) => isOverdue(work, now)).length,
    expiring: visible.filter((work) => isExpiring(work, now)).length,
    visibleTotal: visible.length,
  };
}

function expectedCompletionRate(departmentId, works) {
  const responsible = works.filter((work) => isMainResponsibleDept(work, departmentId));
  const priority = responsible.filter((work) => work.type === 'PRIORITY');
  const main = responsible.filter((work) => work.type === 'MAIN');
  const todo = responsible.filter((work) => work.type === 'TODO');
  const completed = responsible.filter((work) => getTargetStatus(work) === 'COMPLETED');
  const cancelled = responsible.filter((work) => getTargetStatus(work) === 'CANCELLED');
  const validTotal = responsible.length - cancelled.length;
  return {
    priorityTotal: priority.length,
    priorityCompleted: priority.filter((work) => getTargetStatus(work) === 'COMPLETED').length,
    mainTotal: main.length,
    mainCompleted: main.filter((work) => getTargetStatus(work) === 'COMPLETED').length,
    todoTotal: todo.length,
    todoCompleted: todo.filter((work) => getTargetStatus(work) === 'COMPLETED').length,
    total: responsible.length,
    completed: completed.length,
    cancelled: cancelled.length,
    completionRate: validTotal > 0 ? Math.round((completed.length / validTotal) * 10000) / 100 : 0,
  };
}

module.exports = {
  departments,
  users,
  buildWorkItems,
  targetStateGroups,
  getTargetStatus,
  getResponsibleDepartmentIds,
  canViewWork,
  canApprove,
  canHandle,
  expectedSummary,
  expectedCompletionRate,
};
