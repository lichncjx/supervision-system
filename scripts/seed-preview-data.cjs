require('dotenv').config();

const bcrypt = require('bcrypt');
const {
  ActionType,
  ApprovalType,
  PrismaClient,
  Role,
  WorkItemStatus,
  WorkItemType,
} = require('@prisma/client');

const prisma = new PrismaClient();

const PREVIEW_PREFIX = '[PREVIEW]';

function assertPreviewSeedAllowed() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required.');
  }

  if (process.env.PREVIEW_SEED !== '1') {
    throw new Error('Refusing to seed preview data. Set PREVIEW_SEED=1 to continue.');
  }
}

function maskDatabaseUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.username) parsed.username = '***';
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return '<invalid DATABASE_URL>';
  }
}

async function clearBusinessData() {
  await prisma.attachment.deleteMany();
  await prisma.workflowRecord.deleteMany();
  await prisma.operationLog.deleteMany();
  await prisma.workItem.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
}

async function createDepartments() {
  const departments = [
    { name: '综合处', code: 'ZH', isBusiness: true },
    { name: '计划生产处', code: 'JH', isBusiness: true },
    { name: '工艺技术处', code: 'GY', isBusiness: true },
    { name: '质量管理处', code: 'ZL', isBusiness: true },
  ];

  const result = {};
  for (const department of departments) {
    result[department.code] = await prisma.department.create({ data: department });
  }

  return result;
}

async function createUsers(departments, passwordHash) {
  const users = [
    { username: 'admin', name: '系统管理员', role: Role.ADMIN, departmentCode: 'ZH' },
    { username: 'supervisor', name: '督办管理员', role: Role.SUPERVISOR, departmentCode: 'ZH' },
    { username: 'president', name: '公司主要领导', role: Role.PRESIDENT, departmentCode: 'ZH' },
    { username: 'vp_a', name: '公司分管领导A', role: Role.VICE_PRESIDENT, departmentCode: 'ZH' },
    { username: 'vp_b', name: '公司分管领导B', role: Role.VICE_PRESIDENT, departmentCode: 'ZH' },
    { username: 'dept_leader_a', name: '计划生产处领导', role: Role.DEPARTMENT_LEADER, departmentCode: 'JH' },
    { username: 'dept_manager_a', name: '计划生产处主管', role: Role.DEPARTMENT_MANAGER, departmentCode: 'JH' },
    { username: 'dept_leader_b', name: '工艺技术处领导', role: Role.DEPARTMENT_LEADER, departmentCode: 'GY' },
    { username: 'dept_manager_b', name: '工艺技术处主管', role: Role.DEPARTMENT_MANAGER, departmentCode: 'GY' },
  ];

  const result = {};
  for (const user of users) {
    const department = departments[user.departmentCode];
    result[user.username] = await prisma.user.create({
      data: {
        username: user.username,
        passwordHash,
        name: user.name,
        role: user.role,
        departmentId: department.id,
        isActive: true,
      },
    });
  }

  return result;
}

function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(9, 0, 0, 0);
  return date;
}

async function createPreviewWorks(departments, users) {
  const planDept = departments.JH;
  const techDept = departments.GY;
  const qualityDept = departments.ZL;
  const managerA = users.dept_manager_a;
  const leaderA = users.dept_leader_a;
  const managerB = users.dept_manager_b;
  const leaderB = users.dept_leader_b;
  const president = users.president;
  const vpA = users.vp_a;
  const vpB = users.vp_b;

  const commonPriority = {
    type: WorkItemType.PRIORITY,
    departmentId: planDept.id,
    creatorId: managerA.id,
    proposedLeaderId: vpA.id,
    approvalLeaderId: vpA.id,
    responsibleLeader: leaderA.name,
    responsiblePerson: managerA.name,
    cooperators: [{ departmentId: techDept.id, departmentName: techDept.name, leader: leaderB.name, person: managerB.name }],
    completeTime: daysFromNow(30),
    completeForm: '演示验收材料',
  };

  const commonTodo = {
    type: WorkItemType.TODO,
    departmentId: planDept.id,
    creatorId: president.id,
    proposedLeaderId: vpA.id,
    approvalLeaderId: vpA.id,
    responsibleLeader: leaderA.name,
    responsiblePerson: '张三',
    cooperators: [
      { departmentId: techDept.id, departmentName: techDept.name, leader: leaderB.name, person: '李四' },
      { departmentId: qualityDept.id, departmentName: qualityDept.name, leader: undefined, person: '王五' },
    ],
    proposedScene: '演示场景',
    formedTime: daysFromNow(-3),
    planCompleteTime: daysFromNow(14),
    workPlan: '按演示计划推进。',
    progress: '已完成基础准备。',
  };

  const works = [
    {
      ...commonPriority,
      title: `${PREVIEW_PREFIX} 草稿重点工作`,
      status: WorkItemStatus.DRAFT,
      workItem: '用于演示草稿状态。',
    },
    {
      ...commonTodo,
      title: `${PREVIEW_PREFIX} 公司领导待分解待办`,
      status: WorkItemStatus.PENDING_DECOMPOSE,
      action: ActionType.TODO_DECOMPOSE,
      workItem: '用于演示待分解状态。',
    },
    {
      ...commonPriority,
      title: `${PREVIEW_PREFIX} 立项审批中主要工作`,
      type: WorkItemType.MAIN,
      status: WorkItemStatus.PROPOSING,
      beforeApprovalStatus: WorkItemStatus.DRAFT,
      approvalType: ApprovalType.PROPOSE,
      currentApproverId: leaderA.id,
      currentApproverRole: Role.DEPARTMENT_LEADER,
      workItem: '用于演示立项审批中。',
    },
    {
      ...commonTodo,
      title: `${PREVIEW_PREFIX} 进行中多部门待办`,
      status: WorkItemStatus.IN_PROGRESS,
      creatorId: managerA.id,
      workItem: '用于演示进行中状态。',
      planCompleteTime: daysFromNow(5),
    },
    {
      ...commonPriority,
      title: `${PREVIEW_PREFIX} 调整审批中重点工作`,
      status: WorkItemStatus.ADJUSTING,
      beforeApprovalStatus: WorkItemStatus.IN_PROGRESS,
      approvalType: ApprovalType.ADJUST,
      currentApproverId: vpA.id,
      currentApproverRole: Role.VICE_PRESIDENT,
      adjustReason: '演示调整审批。',
      workItem: '用于演示调整审批中。',
    },
    {
      ...commonPriority,
      title: `${PREVIEW_PREFIX} 取消审批中重点工作`,
      status: WorkItemStatus.CANCELLING,
      beforeApprovalStatus: WorkItemStatus.IN_PROGRESS,
      approvalType: ApprovalType.CANCEL,
      currentApproverId: president.id,
      currentApproverRole: Role.PRESIDENT,
      cancelReason: '演示取消审批。',
      needMainLeaderCancel: true,
      workItem: '用于演示取消审批中和主要领导节点。',
    },
    {
      ...commonTodo,
      title: `${PREVIEW_PREFIX} 完成审批中待办`,
      status: WorkItemStatus.COMPLETING,
      beforeApprovalStatus: WorkItemStatus.IN_PROGRESS,
      approvalType: ApprovalType.COMPLETE,
      currentApproverId: vpA.id,
      currentApproverRole: Role.VICE_PRESIDENT,
      proof: '演示完成材料。',
      workItem: '用于演示完成审批中。',
    },
    {
      ...commonPriority,
      title: `${PREVIEW_PREFIX} 已完成重点工作`,
      status: WorkItemStatus.COMPLETED,
      completeTime: daysFromNow(-5),
      workItem: '用于演示已完成状态。',
    },
    {
      ...commonTodo,
      title: `${PREVIEW_PREFIX} 已取消待办`,
      status: WorkItemStatus.CANCELLED,
      creatorId: managerB.id,
      proposedLeaderId: vpB.id,
      approvalLeaderId: vpB.id,
      departmentId: techDept.id,
      responsibleLeader: leaderB.name,
      responsiblePerson: '赵六',
      cooperators: [{ departmentId: planDept.id, departmentName: planDept.name, leader: undefined, person: '钱七' }],
      cancelReason: '演示已取消事项。',
      workItem: '用于演示已取消状态。',
    },
  ];

  const created = [];
  for (const work of works) {
    created.push(await prisma.workItem.create({ data: work }));
  }

  await prisma.workflowRecord.createMany({
    data: [
      {
        workItemId: created[2].id,
        actionType: 'submit',
        initiatorId: managerA.id,
        statusBefore: WorkItemStatus.DRAFT,
        statusAfter: WorkItemStatus.PROPOSING,
        approvalRole: Role.DEPARTMENT_LEADER,
        comment: '演示立项提交。',
      },
      {
        workItemId: created[4].id,
        actionType: 'adjust',
        initiatorId: managerA.id,
        statusBefore: WorkItemStatus.IN_PROGRESS,
        statusAfter: WorkItemStatus.ADJUSTING,
        approvalRole: Role.VICE_PRESIDENT,
        comment: '演示调整申请。',
      },
      {
        workItemId: created[5].id,
        actionType: 'cancel',
        initiatorId: managerA.id,
        statusBefore: WorkItemStatus.IN_PROGRESS,
        statusAfter: WorkItemStatus.CANCELLING,
        approvalRole: Role.PRESIDENT,
        comment: '演示取消申请。',
      },
      {
        workItemId: created[6].id,
        actionType: 'evidence',
        initiatorId: managerA.id,
        statusBefore: WorkItemStatus.IN_PROGRESS,
        statusAfter: WorkItemStatus.COMPLETING,
        approvalRole: Role.VICE_PRESIDENT,
        comment: '演示完成材料提交。',
      },
    ],
  });

  return created;
}

async function main() {
  assertPreviewSeedAllowed();

  console.log('[preview-seed] DATABASE_URL:', maskDatabaseUrl(process.env.DATABASE_URL));
  console.log('[preview-seed] clearing business tables: attachments, workflow_records, operation_logs, work_items, users, departments');

  await clearBusinessData();

  const password = process.env.PREVIEW_SEED_PASSWORD || '123456';
  const passwordHash = await bcrypt.hash(password, 10);
  const departments = await createDepartments();
  const users = await createUsers(departments, passwordHash);
  const works = await createPreviewWorks(departments, users);

  console.log('[preview-seed] done');
  console.log(JSON.stringify({
    departments: Object.keys(departments).length,
    users: Object.keys(users).length,
    works: works.length,
    password: process.env.PREVIEW_SEED_PASSWORD ? '<from PREVIEW_SEED_PASSWORD>' : '<default 123456>',
  }, null, 2));
}

main()
  .catch((error) => {
    console.error('[preview-seed] failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
