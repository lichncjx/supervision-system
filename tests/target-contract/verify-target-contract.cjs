require('dotenv').config();

const http = require('http');
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const {
  users,
  expectedSummary,
  expectedCompletionRate,
  canViewWork,
} = require('./target-contract-data.cjs');
const {
  assertLocalOrTestEnvironment,
  assertSafeBaseUrl,
  assertSafeDatabaseUrl,
  printEnvironmentSummary,
} = require('./target-contract-safety.cjs');

const prisma = new PrismaClient();
const DEFAULT_BASE_URL = process.env.TARGET_CONTRACT_BASE_URL || 'http://localhost:5000';
const PASSWORD = process.env.TARGET_CONTRACT_PASSWORD || '123456';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = { baseUrl: DEFAULT_BASE_URL };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--base-url' && args[index + 1]) {
      options.baseUrl = args[index + 1];
      index += 1;
    }
  }
  return options;
}

function normalizeCookies(cookies) {
  return (cookies || []).map((cookie) => cookie.split(';')[0]);
}

function request(baseUrl, method, path, data = null, cookies = []) {
  const url = new URL(path, baseUrl);
  const body = data ? JSON.stringify(data) : null;

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        method,
        path: `${url.pathname}${url.search}`,
        headers: {
          Cookie: cookies.join('; '),
          ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let parsed = text;
          try {
            parsed = text ? JSON.parse(text) : null;
          } catch {
            parsed = text;
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            cookies: normalizeCookies(res.headers['set-cookie']),
            body: parsed,
          });
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error(`Request timed out: ${method} ${path}`));
    });
    if (body) req.write(body);
    req.end();
  });
}

function requestBinary(baseUrl, method, path, cookies = []) {
  const url = new URL(path, baseUrl);

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        method,
        path: `${url.pathname}${url.search}`,
        headers: {
          Cookie: cookies.join('; '),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks),
          });
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error(`Request timed out: ${method} ${path}`));
    });
    req.end();
  });
}

function requestMultipart(baseUrl, path, fileName, fileBuffer, cookies = []) {
  const url = new URL(path, baseUrl);
  const boundary = `----target-contract-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const chunks = [
    Buffer.from(`--${boundary}\r\n`),
    Buffer.from(`Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`),
    Buffer.from('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n'),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ];
  const body = Buffer.concat(chunks);

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        method: 'POST',
        path: `${url.pathname}${url.search}`,
        headers: {
          Cookie: cookies.join('; '),
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
        },
      },
      (res) => {
        const responseChunks = [];
        res.on('data', (chunk) => responseChunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(responseChunks).toString('utf8');
          let parsed = text;
          try {
            parsed = text ? JSON.parse(text) : null;
          } catch {
            parsed = text;
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error(`Request timed out: POST ${path}`));
    });
    req.write(body);
    req.end();
  });
}

async function login(baseUrl, username) {
  const response = await request(baseUrl, 'POST', '/api/auth/login', { username, password: PASSWORD });
  if (response.statusCode !== 200 || !response.body?.success) {
    throw new Error(`Login failed for ${username}: ${response.statusCode} ${JSON.stringify(response.body)}`);
  }
  return {
    user: response.body.user,
    cookies: response.cookies,
  };
}

function pickSummaryFields(value) {
  return {
    priorityTotal: value.priorityTotal,
    mainTotal: value.mainTotal,
    todoTotal: value.todoTotal,
    approving: value.approving,
    handling: value.handling,
    inProgress: value.inProgress,
    completed: value.completed,
    cancelled: value.cancelled,
    overdue: value.overdue,
    expiring: value.expiring ?? value.thisMonthDue,
  };
}

function pickDashboardSummaryFields(value) {
  return {
    total: value.total,
    priorityTotal: value.priorityTotal,
    mainTotal: value.mainTotal,
    todoTotal: value.todoTotal,
    priorityCompleted: value.priorityCompleted,
    mainCompleted: value.mainCompleted,
    todoCompleted: value.todoCompleted,
    pendingApprovalCount: value.pendingApprovalCount,
    pendingHandlingCount: value.pendingHandlingCount,
    myActionRequiredCount: value.myActionRequiredCount,
    inProgressCount: value.inProgressCount,
    completingCount: value.completingCount,
    completedCount: value.completedCount,
    cancelledCount: value.cancelledCount,
    expiringCount: value.expiringCount,
    overdueCount: value.overdueCount,
  };
}

function pickDashboardSummaryCompat(value) {
  return {
    priorityTotal: value.priorityTotal,
    mainTotal: value.mainTotal,
    todoTotal: value.todoTotal,
    approving: value.pendingApprovalCount ?? value.approving,
    handling: value.pendingHandlingCount ?? value.handling,
    inProgress: value.inProgressCount ?? value.inProgress,
    completed: value.completedCount ?? value.completed,
    cancelled: value.cancelledCount ?? value.cancelled,
    overdue: value.overdueCount ?? value.overdue,
    expiring: value.expiringCount ?? value.expiring ?? value.thisMonthDue,
  };
}

function format(value) {
  return JSON.stringify(value);
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function responseArray(response) {
  return Array.isArray(response.body) ? response.body : [];
}

function responseError(response) {
  if (Array.isArray(response.body)) return null;
  return {
    statusCode: response.statusCode,
    body: response.body,
  };
}

function parseWorkbookRows(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
}

function buildWorkbookBuffer(rows) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '数据');
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
}

const results = [];

function record({ role, endpoint, actual, expected, expectedFailure = false, note = '' }) {
  const passed = deepEqual(actual, expected);
  const status = passed
    ? (expectedFailure ? 'UNEXPECTED_PASS' : 'PASS')
    : (expectedFailure ? 'EXPECTED_FAILURE' : 'FAIL');

  results.push({ role, endpoint, status, actual, expected, note });
  console.log(`[${status}] role=${role} endpoint=${endpoint}`);
  console.log(`  actual:   ${format(actual)}`);
  console.log(`  expected: ${format(expected)}`);
  if (note) console.log(`  note:     ${note}`);
}

async function loadTargetFixture() {
  const dbUsers = await prisma.user.findMany();
  const userByUsername = Object.fromEntries(dbUsers.map((user) => [user.username, user]));
  const works = await prisma.workItem.findMany({
    orderBy: { id: 'asc' },
  });
  const departments = await prisma.department.findMany();
  const deptByCode = Object.fromEntries(departments.map((dept) => [dept.code, dept]));
  return { userByUsername, works, deptByCode };
}

function expectedRoleSummary(user, works) {
  const summary = expectedSummary(user, works);
  return {
    priorityTotal: summary.priorityTotal,
    mainTotal: summary.mainTotal,
    todoTotal: summary.todoTotal,
    approving: summary.approving,
    handling: summary.handling,
    inProgress: summary.inProgress,
    completed: summary.completed,
    cancelled: summary.cancelled,
    overdue: summary.overdue,
    expiring: summary.expiring,
  };
}

function expectedDashboardSummary(user, works) {
  const summary = expectedSummary(user, works);
  const visible = works.filter((work) => canViewWork(user, work));
  return {
    total: summary.visibleTotal,
    priorityTotal: summary.priorityTotal,
    mainTotal: summary.mainTotal,
    todoTotal: summary.todoTotal,
    priorityCompleted: visible.filter((work) => work.type === 'PRIORITY' && work.status === 'COMPLETED').length,
    mainCompleted: visible.filter((work) => work.type === 'MAIN' && work.status === 'COMPLETED').length,
    todoCompleted: visible.filter((work) => work.type === 'TODO' && work.status === 'COMPLETED').length,
    pendingApprovalCount: summary.approving,
    pendingHandlingCount: summary.handling,
    myActionRequiredCount: summary.actionRequired,
    inProgressCount: summary.inProgress,
    completingCount: visible.filter((work) => work.status === 'COMPLETING').length,
    completedCount: summary.completed,
    cancelledCount: summary.cancelled,
    expiringCount: summary.expiring,
    overdueCount: summary.overdue,
  };
}

function findUnexpectedDashboardKeys(items) {
  const allowed = new Set([
    'id',
    'title',
    'type',
    'typeLabel',
    'status',
    'statusLabel',
    'departmentName',
    'departmentNames',
    'responsibleDepartmentNames',
    'cooperateDepartmentNames',
    'completeTime',
    'planCompleteTime',
    'dueTime',
    'isOverdue',
    'isExpiring',
    'actionType',
    'currentApproverName',
  ]);
  return Array.from(
    new Set(
      items.flatMap((item) =>
        Object.keys(item || {}).filter((key) => !allowed.has(key))
      )
    )
  ).sort();
}

async function verifyDashboardSummary(baseUrl, loginByUsername, userByUsername, works) {
  for (const userDef of users) {
    const loginInfo = loginByUsername[userDef.username];
    const dbUser = userByUsername[userDef.username];
    const response = await request(baseUrl, 'GET', '/api/dashboard/summary', null, loginInfo.cookies);
    const actual = response.statusCode === 200 ? pickSummaryFields(response.body) : { statusCode: response.statusCode };
    const expected = expectedRoleSummary(dbUser, works);
    record({
      role: userDef.username,
      endpoint: 'GET /api/dashboard/summary',
      actual,
      expected,
      expectedFailure: false,
      note: 'Target: summary follows docs/首页统计口径.md using target status groups, organization visibility, my approval/handling, expiring/overdue.',
    });
  }
}

async function verifyDashboardUnified(baseUrl, loginByUsername, userByUsername, works) {
  for (const userDef of users) {
    const loginInfo = loginByUsername[userDef.username];
    const dbUser = userByUsername[userDef.username];
    const dashboardResponse = await request(baseUrl, 'GET', '/api/dashboard?limit=100', null, loginInfo.cookies);
    const summaryResponse = await request(baseUrl, 'GET', '/api/dashboard/summary', null, loginInfo.cookies);
    const body = dashboardResponse.body || {};
    const summary = body.summary || {};
    const lists = body.lists || {};
    const expiringAndOverdue = Array.isArray(lists.expiringAndOverdue) ? lists.expiringAndOverdue : [];
    const myActionRequired = Array.isArray(lists.myActionRequired) ? lists.myActionRequired : [];

    record({
      role: userDef.username,
      endpoint: 'GET /api/dashboard summary target',
      actual: dashboardResponse.statusCode === 200
        ? pickDashboardSummaryFields(summary)
        : { statusCode: dashboardResponse.statusCode },
      expected: expectedDashboardSummary(dbUser, works),
      expectedFailure: false,
      note: 'Phase 4: unified dashboard summary uses the same target visibility, approval, handling and deadline口径.',
    });

    record({
      role: userDef.username,
      endpoint: 'GET /api/dashboard summary equals /api/dashboard/summary',
      actual: dashboardResponse.statusCode === 200
        ? pickDashboardSummaryCompat(summary)
        : { statusCode: dashboardResponse.statusCode },
      expected: summaryResponse.statusCode === 200
        ? pickSummaryFields(summaryResponse.body)
        : { statusCode: summaryResponse.statusCode },
      expectedFailure: false,
      note: 'Phase 4: /api/dashboard and /api/dashboard/summary share one summary calculation helper.',
    });

    const unexpectedKeys = findUnexpectedDashboardKeys([
      ...expiringAndOverdue,
      ...myActionRequired,
    ]);
    record({
      role: userDef.username,
      endpoint: 'GET /api/dashboard lightweight lists',
      actual: {
        unexpectedKeys,
        hasLargeFields: unexpectedKeys.some((key) =>
          ['nodes', 'workPlan', 'proof', 'attachments', 'workflowRecords', 'description'].includes(key)
        ),
      },
      expected: {
        unexpectedKeys: [],
        hasLargeFields: false,
      },
      expectedFailure: false,
      note: 'Phase 4: dashboard lists return lightweight WorkDashboardItem fields only.',
    });

    record({
      role: userDef.username,
      endpoint: 'GET /api/dashboard lists counts',
      actual: {
        expiringAndOverdue: expiringAndOverdue.length,
        expiringAndOverdueExpected: (summary.expiringCount ?? 0) + (summary.overdueCount ?? 0),
        expiringAndOverdueFlags: expiringAndOverdue.every((item) => item.isExpiring || item.isOverdue),
        myActionRequired: myActionRequired.length,
        myActionRequiredExpected: summary.myActionRequiredCount ?? 0,
        myActionRequiredSumMatches:
          (summary.myActionRequiredCount ?? 0) ===
          (summary.pendingApprovalCount ?? 0) + (summary.pendingHandlingCount ?? 0),
        myActionRequiredFlags: myActionRequired.every((item) =>
          item.actionType === 'approval' || item.actionType === 'handling'
        ),
      },
      expected: {
        expiringAndOverdue: (summary.expiringCount ?? 0) + (summary.overdueCount ?? 0),
        expiringAndOverdueExpected: (summary.expiringCount ?? 0) + (summary.overdueCount ?? 0),
        expiringAndOverdueFlags: true,
        myActionRequired: summary.myActionRequiredCount ?? 0,
        myActionRequiredExpected: summary.myActionRequiredCount ?? 0,
        myActionRequiredSumMatches: true,
        myActionRequiredFlags: true,
      },
      expectedFailure: false,
      note: 'Phase 4: limit=100 verifies list口径 against summary counts; homepage default limit remains 5.',
    });
  }
}

async function verifyWorksVisibility(baseUrl, loginByUsername, userByUsername, works) {
  for (const userDef of users) {
    const loginInfo = loginByUsername[userDef.username];
    const dbUser = userByUsername[userDef.username];
    const response = await request(baseUrl, 'GET', '/api/works', null, loginInfo.cookies);
    const worksBody = responseArray(response);
    const actualIds = worksBody.map((work) => work.id).sort((a, b) => a - b);
    const expectedIds = works
      .filter((work) => canViewWork(dbUser, work))
      .map((work) => work.id)
      .sort((a, b) => a - b);

    record({
      role: userDef.username,
      endpoint: 'GET /api/works',
      actual: actualIds,
      expected: expectedIds,
      expectedFailure: false,
      note: [
        'Phase 2 closeout: /api/works now follows target visibility scope for company leaders and department responsible/cooperate departments.',
        responseError(response) ? `Non-array response: ${JSON.stringify(responseError(response))}` : '',
      ].filter(Boolean).join(' '),
    });
  }
}

async function verifyTargetPermissionFacts(baseUrl, loginByUsername, works) {
  const byTitle = Object.fromEntries(works.map((work) => [work.title, work.id]));
  async function visibleFor(username, workId) {
    const response = await request(baseUrl, 'GET', '/api/works', null, loginByUsername[username].cookies);
    const list = responseArray(response);
    return {
      visible: list.some((work) => work.id === workId),
      responseError: responseError(response),
    };
  }

  const vpASeesVpB = await visibleFor('vp_a', byTitle['TC-副总B负责待办-B']);
  const managerASeesNameOnly = await visibleFor('dept_manager_a1', byTitle['TC-责任人姓名不授权-B']);
  const managerBSeesResponsible = await visibleFor('dept_manager_b1', byTitle['TC-多主责部门待办-AB']);
  const managerBSeesCooperate = await visibleFor('dept_manager_b1', byTitle['TC-多配合部门待办-BC']);

  const facts = [
    {
      role: 'vp_a',
      endpoint: 'target fact: VP_A cannot see VP_B work by default',
      actual: { visible: vpASeesVpB.visible },
      expected: { visible: false },
      expectedFailure: false,
      note: [
        'Phase 2 closeout: VICE_PRESIDENT no longer sees another VP work by default.',
        vpASeesVpB.responseError ? `Non-array response: ${JSON.stringify(vpASeesVpB.responseError)}` : '',
      ].filter(Boolean).join(' '),
    },
    {
      role: 'dept_manager_a1',
      endpoint: 'target fact: responsiblePersons do not grant visibility',
      actual: { visible: managerASeesNameOnly.visible },
      expected: { visible: false },
      note: managerASeesNameOnly.responseError ? `Non-array response: ${JSON.stringify(managerASeesNameOnly.responseError)}` : '',
    },
    {
      role: 'dept_manager_b1',
      endpoint: 'target fact: responsibleDepartmentIds grant visibility',
      actual: { visible: managerBSeesResponsible.visible },
      expected: { visible: true },
      expectedFailure: false,
      note: [
        'Phase 2 closeout: responsibleDepartmentIds/departmentIds grant organization visibility.',
        managerBSeesResponsible.responseError ? `Non-array response: ${JSON.stringify(managerBSeesResponsible.responseError)}` : '',
      ].filter(Boolean).join(' '),
    },
    {
      role: 'dept_manager_b1',
      endpoint: 'target fact: cooperateDepartmentIds grant visibility',
      actual: { visible: managerBSeesCooperate.visible },
      expected: { visible: true },
      expectedFailure: false,
      note: [
        'Phase 2 closeout: cooperateDepartmentIds grant organization visibility.',
        managerBSeesCooperate.responseError ? `Non-array response: ${JSON.stringify(managerBSeesCooperate.responseError)}` : '',
      ].filter(Boolean).join(' '),
    },
  ];

  for (const fact of facts) {
    record(fact);
  }
}

async function verifyCompletionRate(baseUrl, loginByUsername, deptByCode, works) {
  const response = await request(baseUrl, 'GET', '/api/dashboard/completion-rate', null, loginByUsername.admin.cookies);
  const items = response.body?.items || [];

  const expectedFailureByDeptCode = {
    TDA: false,
    TDB: false,
  };
  const noteByDeptCode = {
    TDA: 'Target: completion-rate uses responsible department ownership and excludes cooperate departments. Current fixture for department A currently matches this target case, so it should pass.',
    TDB: 'Phase 2 closeout: completion-rate uses responsibleDepartmentIds/departmentIds for ownership and excludes cooperate departments, including the department B multi-responsible case.',
  };

  for (const code of ['TDA', 'TDB']) {
    const dept = deptByCode[code];
    const actualItem = items.find((item) => item.departmentId === dept.id);
    const actual = actualItem
      ? {
          priorityTotal: actualItem.priorityTotal,
          priorityCompleted: actualItem.priorityCompleted,
          mainTotal: actualItem.mainTotal,
          mainCompleted: actualItem.mainCompleted,
          todoTotal: actualItem.todoTotal,
          todoCompleted: actualItem.todoCompleted,
          total: actualItem.total,
          completed: actualItem.completed,
          cancelled: actualItem.cancelled,
          completionRate: actualItem.completionRate,
        }
      : null;
    const expected = expectedCompletionRate(dept.id, works);
    record({
      role: 'admin',
      endpoint: `GET /api/dashboard/completion-rate dept=${code}`,
      actual,
      expected,
      expectedFailure: expectedFailureByDeptCode[code],
      note: noteByDeptCode[code],
    });
  }
}

async function verifyExcelExport(baseUrl, loginByUsername, userByUsername, works) {
  for (const userDef of users) {
    const loginInfo = loginByUsername[userDef.username];
    const dbUser = userByUsername[userDef.username];
    const response = await requestBinary(baseUrl, 'GET', '/api/excel/export', loginInfo.cookies);
    const rows = response.statusCode === 200 ? parseWorkbookRows(response.body) : [];
    const headers = rows[0] || [];
    const dataRows = rows.slice(1);
    const exportedTitles = dataRows.map((row) => row[4]).filter(Boolean).sort();
    const expectedTitles = works
      .filter((work) => canViewWork(dbUser, work))
      .map((work) => work.workItem || work.title)
      .sort();

    record({
      role: userDef.username,
      endpoint: 'GET /api/excel/export visibility',
      actual: response.statusCode === 200
        ? { statusCode: response.statusCode, titles: exportedTitles }
        : { statusCode: response.statusCode },
      expected: { statusCode: 200, titles: expectedTitles },
      expectedFailure: false,
      note: 'Phase 5: ordinary Excel export follows the same visible scope as GET /api/works.',
    });

    const largeFieldHeaders = headers.filter((header) =>
      ['nodes', 'proof', 'attachments', 'workflowRecords'].includes(String(header))
    );
    record({
      role: userDef.username,
      endpoint: 'GET /api/excel/export lightweight fields',
      actual: {
        largeFieldHeaders,
        hasStatusLabel: dataRows.every((row) => row[2] && !Object.keys(require('@prisma/client').WorkItemStatus).includes(String(row[2]))),
      },
      expected: {
        largeFieldHeaders: [],
        hasStatusLabel: true,
      },
      expectedFailure: false,
      note: 'Phase 5: ordinary Excel export uses status labels and does not expose detail-only large fields.',
    });
  }

  const adminResponse = await requestBinary(baseUrl, 'GET', '/api/excel/export', loginByUsername.admin.cookies);
  const rows = parseWorkbookRows(adminResponse.body);
  const dataRows = rows.slice(1);
  const byTitle = Object.fromEntries(dataRows.map((row) => [row[4], row]));

  record({
    role: 'admin',
    endpoint: 'GET /api/excel/export department/person fields',
    actual: {
      multiResponsibleDepartments: byTitle['TC-多主责部门待办-AB']?.[9],
      multiCooperateDepartments: byTitle['TC-多配合部门待办-BC']?.[12],
      responsiblePersons: byTitle['TC-多主责部门待办-AB']?.[11],
      cooperatePersons: byTitle['TC-多配合部门待办-BC']?.[13],
    },
    expected: {
      multiResponsibleDepartments: 'TDA/TDB',
      multiCooperateDepartments: 'TDB/TDC',
      responsiblePersons: '业务主责人A/业务主责人B',
      cooperatePersons: '业务配合人B/业务配合人C',
    },
    expectedFailure: false,
    note: 'Phase 5: ordinary Excel export uses responsible department IDs, cooperate department IDs, and text person fields for display only.',
  });
}

async function verifyExcelImport(baseUrl, loginByUsername, deptByCode, userByUsername) {
  const todoHeaders = [
    '事项提出领导',
    '指定审批领导',
    '事项提出场景',
    '待办事项',
    '形成时间',
    '主责部门',
    '主责责任人',
    '配合部门',
    '配合责任人',
    '工作计划',
    '计划完成时间',
    '进展情况',
  ];
  const invalidRows = [
    todoHeaders,
    [
      userByUsername.vp_a.name,
      userByUsername.vp_a.name,
      'target-contract import',
      'TC-导入越权待办-B',
      '2026-05-01',
      'TDB',
      '重名主责人',
      'TDA',
      '重名配合人',
      '验证部门用户不能跨主责部门导入',
      '2026-12-31',
      '未开始',
    ],
  ];
  const invalidResponse = await requestMultipart(
    baseUrl,
    '/api/excel/import/todo',
    'invalid.xlsx',
    buildWorkbookBuffer(invalidRows),
    loginByUsername.dept_manager_a1.cookies
  );

  record({
    role: 'dept_manager_a1',
    endpoint: 'POST /api/excel/import/todo rejects unrelated responsible department',
    actual: {
      statusCode: invalidResponse.statusCode,
      success: invalidResponse.body?.success,
      exists: Boolean(await prisma.workItem.findFirst({ where: { title: 'TC-导入越权待办-B' } })),
    },
    expected: {
      statusCode: 403,
      success: false,
      exists: false,
    },
    expectedFailure: false,
    note: 'Phase 5: department users cannot import work whose responsible departments do not include their own department.',
  });

  const validRows = [
    todoHeaders,
    [
      userByUsername.vp_a.name,
      userByUsername.vp_a.name,
      'target-contract import',
      'TC-导入允许待办-A配合B',
      '2026-05-01',
      'TDA',
      '重名主责人/非系统人员',
      'TDB',
      '重名配合人/非系统人员',
      '验证姓名文本不要求匹配系统用户',
      '2026-12-31',
      '未开始',
    ],
  ];
  const validResponse = await requestMultipart(
    baseUrl,
    '/api/excel/import/todo',
    'valid.xlsx',
    buildWorkbookBuffer(validRows),
    loginByUsername.dept_manager_a1.cookies
  );
  const imported = await prisma.workItem.findFirst({
    where: { title: 'TC-导入允许待办-A配合B' },
    orderBy: { id: 'desc' },
  });

  record({
    role: 'dept_manager_a1',
    endpoint: 'POST /api/excel/import/todo accepts own responsible department with external cooperate department',
    actual: {
      statusCode: validResponse.statusCode,
      success: validResponse.body?.success,
      status: imported?.status,
      departmentIds: imported?.departmentIds || [],
      cooperateDepartmentIds: imported?.cooperateDepartmentIds || [],
      responsiblePersons: imported?.responsiblePersons || [],
      cooperatePersons: imported?.cooperatePersons || [],
    },
    expected: {
      statusCode: 200,
      success: true,
      status: 'DRAFT',
      departmentIds: [deptByCode.TDA.id],
      cooperateDepartmentIds: [deptByCode.TDB.id],
      responsiblePersons: ['重名主责人', '非系统人员'],
      cooperatePersons: ['重名配合人', '非系统人员'],
    },
    expectedFailure: false,
    note: 'Phase 5: ordinary import defaults to DRAFT and treats responsible/cooperate persons as display text only.',
  });
}

async function main() {
  const { baseUrl } = parseArgs();
  printEnvironmentSummary('[target-contract-verify]');
  assertLocalOrTestEnvironment();
  assertSafeDatabaseUrl();
  assertSafeBaseUrl(baseUrl);
  console.log(`[target-contract-verify] baseUrl=${baseUrl}`);
  console.log('[target-contract-verify] loading fixture from database...');
  const { userByUsername, works, deptByCode } = await loadTargetFixture();

  console.log('[target-contract-verify] logging in fixed users...');
  const loginByUsername = {};
  for (const userDef of users) {
    loginByUsername[userDef.username] = await login(baseUrl, userDef.username);
  }

  console.log('[target-contract-verify] comparing current APIs with target contract...');
  await verifyDashboardSummary(baseUrl, loginByUsername, userByUsername, works);
  await verifyDashboardUnified(baseUrl, loginByUsername, userByUsername, works);
  await verifyWorksVisibility(baseUrl, loginByUsername, userByUsername, works);
  await verifyTargetPermissionFacts(baseUrl, loginByUsername, works);
  await verifyCompletionRate(baseUrl, loginByUsername, deptByCode, works);
  await verifyExcelExport(baseUrl, loginByUsername, userByUsername, works);
  await verifyExcelImport(baseUrl, loginByUsername, deptByCode, userByUsername);

  const totals = results.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    },
    {}
  );

  console.log('[target-contract-verify] summary');
  console.log(JSON.stringify(totals, null, 2));

  const hardFailures = results.filter((item) => item.status === 'FAIL');
  if (hardFailures.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error('[target-contract-verify] failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
