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

function normalizeCooperators(cooperators) {
  if (!Array.isArray(cooperators)) return cooperators;
  return cooperators.map((c) => ({
    departmentId: c?.departmentId,
    departmentName: c?.departmentName || undefined,
    leader: c?.leader || undefined,
    person: c?.person || undefined,
  }));
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
    'cooperators',
    'responsibleLeader',
    'responsiblePerson',
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
      note: 'Target: summary follows docs/rules/首页统计口径.md using target status groups, organization visibility, my approval/handling, expiring/overdue.',
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

    const allDashboardItems = [...expiringAndOverdue, ...myActionRequired];
    const itemsWithCooperators = allDashboardItems.filter(
      (item) => Array.isArray(item?.cooperators) && item.cooperators.length > 0
    );
    const sample = itemsWithCooperators.length > 0 ? itemsWithCooperators[0].cooperators[0] : null;
    const hasCoops = itemsWithCooperators.length > 0;
    const hasRespLeader = allDashboardItems.some((item) => typeof item?.responsibleLeader === 'string' && item.responsibleLeader.length > 0);
    const hasRespPerson = allDashboardItems.some((item) => typeof item?.responsiblePerson === 'string' && item.responsiblePerson.length > 0);
    // required cooperator keys; leader/person are optional and may be omitted via JSON undefined stripping
    const requiredKeys = ['departmentId', 'departmentName'];
    const hasRequiredKeys = sample ? requiredKeys.every((k) => k in sample) : true;
    record({
      role: userDef.username,
      endpoint: 'GET /api/dashboard cooperators structure',
      actual: {
        hasCooperators: hasCoops,
        hasResponsibleLeader: hasRespLeader,
        hasResponsiblePerson: hasRespPerson,
        cooperatorRequiredKeys: hasRequiredKeys,
        cooperatorSampleKeys: sample ? Object.keys(sample).sort() : [],
        noLegacyArrays: !allDashboardItems.some(
          (item) => 'responsibleDepartmentNames' in (item || {}) || 'cooperateDepartmentNames' in (item || {})
        ),
      },
      expected: {
        hasCooperators: hasCoops,
        hasResponsibleLeader: hasRespLeader,
        hasResponsiblePerson: hasRespPerson,
        cooperatorRequiredKeys: true,
        cooperatorSampleKeys: sample ? Object.keys(sample).sort() : [],
        noLegacyArrays: true,
      },
      expectedFailure: false,
      note: 'Phase 8C: dashboard lightweight lists return cooperators with departmentId/departmentName; leader/person optional. Legacy arrays removed.',
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
        'Phase 8C: /api/works visibility uses departmentId and cooperators[].departmentId for organization scope.',
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
  const managerBSeesResponsible = await visibleFor('dept_manager_b1', byTitle['TC-主责A配合B待办']);
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
      endpoint: 'target fact: responsiblePerson/responsibleLeader do not grant visibility',
      actual: { visible: managerASeesNameOnly.visible },
      expected: { visible: false },
      note: managerASeesNameOnly.responseError ? `Non-array response: ${JSON.stringify(managerASeesNameOnly.responseError)}` : '',
    },
    {
      role: 'dept_manager_b1',
      endpoint: 'target fact: cooperators grant visibility to coop dept',
      actual: { visible: managerBSeesResponsible.visible },
      expected: { visible: true },
      expectedFailure: false,
      note: [
        'Phase 8B: cooperators[].departmentId grant organization visibility.',
        managerBSeesResponsible.responseError ? `Non-array response: ${JSON.stringify(managerBSeesResponsible.responseError)}` : '',
      ].filter(Boolean).join(' '),
    },
    {
      role: 'dept_manager_b1',
      endpoint: 'target fact: cooperators grant visibility',
      actual: { visible: managerBSeesCooperate.visible },
      expected: { visible: true },
      expectedFailure: false,
      note: [
        'Phase 8B: cooperators[].departmentId grant organization visibility.',
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
    TDA: 'Phase 8C: completion-rate uses departmentId ownership and excludes cooperators. Department A has both main and cooperator items.',
    TDB: 'Phase 8C: completion-rate uses departmentId ownership and excludes cooperators. Department B has cooperator-only items that should not count toward completion rate.',
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

  const headers = rows[0] || [];
  const col = Object.fromEntries(headers.map((h, i) => [String(h).trim(), i]));
  const byTitle = Object.fromEntries(dataRows.map((row) => [row[col['工作事项'] ?? 4], row]));

  record({
    role: 'admin',
    endpoint: 'GET /api/excel/export department/person fields',
    actual: {
      mainDept: byTitle['TC-多配合部门待办-BC']?.[col['主责部门']],
      responsibleLeader: byTitle['TC-多配合部门待办-BC']?.[col['责任领导']],
      responsiblePersonRow: byTitle['TC-多配合部门待办-BC']?.[col['责任人']],
      cooperatorsCol: byTitle['TC-多配合部门待办-BC']?.[col['配合方']],
    },
    expected: {
      mainDept: '测试A部门',
      responsibleLeader: '',
      responsiblePersonRow: '业务主责人A',
      cooperatorsCol: '测试B部门||业务配合人B；测试C部门||业务配合人C',
    },
    expectedFailure: false,
    note: 'Phase 8C: Excel export uses header-based column lookup; cooperators string covers department, leader and person.',
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
    '责任领导',
    '责任人',
    '配合方',
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
      '',
      '重名主责人',
      'TDA||重名配合人',
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
      '',
      '重名主责人',
      'TDB|配合领导B|重名配合人',
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
      departmentId: imported?.departmentId,
      cooperators: normalizeCooperators(imported?.cooperators),
      responsiblePerson: imported?.responsiblePerson,
    },
    expected: {
      statusCode: 200,
      success: true,
      status: 'DRAFT',
      departmentId: deptByCode.TDA.id,
      cooperators: [{ departmentId: deptByCode.TDB.id, departmentName: 'TDB', leader: '配合领导B', person: '重名配合人' }],
      responsiblePerson: '重名主责人',
    },
    expectedFailure: false,
    note: 'Phase 8C: TODO import uses departmentId, responsibleLeader, responsiblePerson, cooperators.',
  });

  const invalidStatusHeaders = [
    ...todoHeaders,
    '当前状态',
  ];
  const invalidStatusRows = [
    invalidStatusHeaders,
    [
      userByUsername.vp_a.name,
      userByUsername.vp_a.name,
      'target-contract import status',
      'TC-导入非法状态-APPROVED',
      '2026-05-01',
      'TDA',
      '',
      '非法状态责任人',
      '',
      '验证普通导入不能绕过 workflow',
      '2026-12-31',
      '未开始',
      'APPROVED',
    ],
  ];
  const invalidStatusResponse = await requestMultipart(
    baseUrl,
    '/api/excel/import/todo',
    'invalid-status.xlsx',
    buildWorkbookBuffer(invalidStatusRows),
    loginByUsername.dept_manager_a1.cookies
  );

  record({
    role: 'dept_manager_a1',
    endpoint: 'POST /api/excel/import/todo rejects old/non-draft status',
    actual: {
      statusCode: invalidStatusResponse.statusCode,
      success: invalidStatusResponse.body?.success,
      exists: Boolean(await prisma.workItem.findFirst({ where: { title: 'TC-导入非法状态-APPROVED' } })),
    },
    expected: {
      statusCode: 400,
      success: false,
      exists: false,
    },
    expectedFailure: false,
    note: 'PR 6.3: ordinary Excel import only accepts empty status or DRAFT/草稿; old and non-draft states must go through workflow.',
  });

  // --- priority import ---
  const priorityHeaders = [
    '业务类别',
    '工作事项',
    '是否为创新工作',
    '工作节点',
    '完成时间',
    '完成形式',
    '责任部门',
    '责任领导',
    '责任人',
    '配合方',
  ];
  const priorityRows = [
    priorityHeaders,
    [
      'target-contract import',
      'TC-导入重点工作-cooperators',
      '否',
      '导入节点',
      '2026-12-31',
      '验收材料',
      'TDA',
      '导入责任领导',
      '导入责任人',
      'TDB|导入配合领导|导入配合人',
    ],
  ];
  const priorityImportResponse = await requestMultipart(
    baseUrl,
    '/api/excel/import/priority',
    'priority.xlsx',
    buildWorkbookBuffer(priorityRows),
    loginByUsername.dept_manager_a1.cookies
  );
  const importedPriority = await prisma.workItem.findFirst({
    where: { title: 'TC-导入重点工作-cooperators' },
    orderBy: { id: 'desc' },
  });

  record({
    role: 'dept_manager_a1',
    endpoint: 'POST /api/excel/import/priority imports with cooperators',
    actual: {
      statusCode: priorityImportResponse.statusCode,
      success: priorityImportResponse.body?.success,
      status: importedPriority?.status,
      departmentId: importedPriority?.departmentId,
      responsibleLeader: importedPriority?.responsibleLeader,
      responsiblePerson: importedPriority?.responsiblePerson,
      cooperators: normalizeCooperators(importedPriority?.cooperators),
    },
    expected: {
      statusCode: 200,
      success: true,
      status: 'DRAFT',
      departmentId: deptByCode.TDA.id,
      responsibleLeader: '导入责任领导',
      responsiblePerson: '导入责任人',
      cooperators: [{ departmentId: deptByCode.TDB.id, departmentName: 'TDB', leader: '导入配合领导', person: '导入配合人' }],
    },
    expectedFailure: false,
    note: 'Phase 8C: priority import supports cooperators with leader field.',
  });

  // --- main import ---
  const mainHeaders = [
    '业务类别',
    '工作事项',
    '工作节点',
    '完成时间',
    '完成形式',
    '责任部门',
    '责任领导',
    '责任人',
    '配合方',
  ];
  const mainRows = [
    mainHeaders,
    [
      'target-contract import',
      'TC-导入主要工作-cooperators',
      '导入节点',
      '2026-12-31',
      '验收材料',
      'TDA',
      '导入责任领导M',
      '导入责任人M',
      'TDC||导入配合人M',
    ],
  ];
  const mainImportResponse = await requestMultipart(
    baseUrl,
    '/api/excel/import/main',
    'main.xlsx',
    buildWorkbookBuffer(mainRows),
    loginByUsername.dept_manager_a1.cookies
  );
  const importedMain = await prisma.workItem.findFirst({
    where: { title: 'TC-导入主要工作-cooperators' },
    orderBy: { id: 'desc' },
  });

  record({
    role: 'dept_manager_a1',
    endpoint: 'POST /api/excel/import/main imports with cooperators',
    actual: {
      statusCode: mainImportResponse.statusCode,
      success: mainImportResponse.body?.success,
      status: importedMain?.status,
      departmentId: importedMain?.departmentId,
      responsibleLeader: importedMain?.responsibleLeader,
      responsiblePerson: importedMain?.responsiblePerson,
      cooperators: normalizeCooperators(importedMain?.cooperators),
    },
    expected: {
      statusCode: 200,
      success: true,
      status: 'DRAFT',
      departmentId: deptByCode.TDA.id,
      responsibleLeader: '导入责任领导M',
      responsiblePerson: '导入责任人M',
      cooperators: [{ departmentId: deptByCode.TDC.id, departmentName: 'TDC', person: '导入配合人M' }],
    },
    expectedFailure: false,
    note: 'Phase 8C: main import supports cooperators with optional leader.',
  });
}

const WORKFLOW_TEST_PREFIX = 'TC-WF-';

async function cleanupWorkflowContractWorks() {
  await prisma.workItem.deleteMany({
    where: {
      title: {
        startsWith: WORKFLOW_TEST_PREFIX,
      },
    },
  });
}

function workflowBaseData({ title, type, status, creator, dept, vp, needMainLeaderCancel = false }) {
  const dueDate = new Date();
  dueDate.setHours(12, 0, 0, 0);
  dueDate.setDate(dueDate.getDate() + 30);

  return {
    type,
    title,
    workItem: title,
    status,
    departmentId: dept.id,
    creatorId: creator.id,
    firstSubmitterId: status === 'DRAFT' || status === 'PENDING_DECOMPOSE' ? null : creator.id,
    proposedLeaderId: vp.id,
    approvalLeaderId: vp.id,
    needMainLeaderCancel,
    completeTime: type === 'TODO' ? null : dueDate,
    planCompleteTime: type === 'TODO' ? dueDate : null,
    completeForm: 'target-contract workflow',
    nodes: JSON.stringify([{ title: 'workflow-node', completeTime: dueDate.toISOString() }]),
    responsibleLeader: '测试责任领导',
    responsiblePerson: '测试责任人',
    action: status === 'PENDING_DECOMPOSE' ? 'TODO_DECOMPOSE' : 'CREATE',
    currentApproverId: null,
    currentApproverRole: null,
    beforeApprovalStatus: null,
    approvalType: null,
    isInnovation: false,
  };
}

async function createWorkflowWork(options) {
  const work = await prisma.workItem.create({
    data: workflowBaseData(options),
  });
  return work.id;
}

function pickWorkflowState(work) {
  return {
    status: work.status,
    beforeApprovalStatus: work.beforeApprovalStatus,
    approvalType: work.approvalType,
    currentApproverId: work.currentApproverId,
    currentApproverRole: work.currentApproverRole,
    rejectedFromStatus: work.rejectedFromStatus,
  };
}

async function latestWorkflowRecord(workId) {
  const recordItem = await prisma.workflowRecord.findFirst({
    where: { workItemId: workId },
    orderBy: [{ id: 'desc' }],
  });
  return recordItem
    ? {
        actionType: recordItem.actionType,
        statusBefore: recordItem.statusBefore,
        statusAfter: recordItem.statusAfter,
      }
    : null;
}

async function runWorkflowStep(baseUrl, loginByUsername, username, workId, payload) {
  const response = await request(
    baseUrl,
    'POST',
    `/api/works/${workId}/workflow`,
    payload,
    loginByUsername[username].cookies
  );
  const work = await prisma.workItem.findUnique({ where: { id: workId } });
  return {
    statusCode: response.statusCode,
    success: response.body?.success === true,
    work: pickWorkflowState(work),
    record: await latestWorkflowRecord(workId),
  };
}

async function verifyWorkflowTransitions(baseUrl, loginByUsername, deptByCode, userByUsername) {
  await cleanupWorkflowContractWorks();

  const deptA = deptByCode.TDA;
  const manager = userByUsername.dept_manager_a1;
  const vp = userByUsername.vp_a;
  const president = userByUsername.president;

  const submitNodes = [{ title: '分解节点', completeTime: new Date().toISOString(), children: [] }];

  const normalApproveId = await createWorkflowWork({
    title: `${WORKFLOW_TEST_PREFIX}普通立项通过`,
    type: 'PRIORITY',
    status: 'DRAFT',
    creator: manager,
    dept: deptA,
    vp,
    president,
  });
  const normalSubmit = await runWorkflowStep(baseUrl, loginByUsername, 'dept_manager_a1', normalApproveId, { action: 'submit' });
  const normalDeptApprove = await runWorkflowStep(baseUrl, loginByUsername, 'dept_leader_a', normalApproveId, { action: 'approve' });
  const normalCompanyApprove = await runWorkflowStep(baseUrl, loginByUsername, 'vp_a', normalApproveId, { action: 'approve' });

  record({
    role: 'workflow',
    endpoint: 'POST /api/works/[id]/workflow DRAFT -> PROPOSING -> IN_PROGRESS',
    actual: { normalSubmit, normalDeptApprove, normalCompanyApprove },
    expected: {
      normalSubmit: {
        statusCode: 200,
        success: true,
        work: {
          status: 'PROPOSING',
          beforeApprovalStatus: 'DRAFT',
          approvalType: 'PROPOSE',
          currentApproverId: null,
          currentApproverRole: 'DEPARTMENT_LEADER',
          rejectedFromStatus: null,
        },
        record: { actionType: 'submit', statusBefore: 'DRAFT', statusAfter: 'PROPOSING' },
      },
      normalDeptApprove: {
        statusCode: 200,
        success: true,
        work: {
          status: 'PROPOSING',
          beforeApprovalStatus: 'DRAFT',
          approvalType: 'PROPOSE',
          currentApproverId: vp.id,
          currentApproverRole: 'VICE_PRESIDENT',
          rejectedFromStatus: null,
        },
        record: { actionType: 'approve', statusBefore: 'PROPOSING', statusAfter: 'PROPOSING' },
      },
      normalCompanyApprove: {
        statusCode: 200,
        success: true,
        work: {
          status: 'IN_PROGRESS',
          beforeApprovalStatus: null,
          approvalType: null,
          currentApproverId: null,
          currentApproverRole: null,
          rejectedFromStatus: null,
        },
        record: { actionType: 'approve', statusBefore: 'PROPOSING', statusAfter: 'IN_PROGRESS' },
      },
    },
    note: 'PR 6.2: ordinary proposal approval keeps PROPOSING across nodes, then clears approval helper fields.',
  });

  const normalRejectId = await createWorkflowWork({
    title: `${WORKFLOW_TEST_PREFIX}普通立项退回`,
    type: 'MAIN',
    status: 'DRAFT',
    creator: manager,
    dept: deptA,
    vp,
    president,
  });
  const normalRejectSubmit = await runWorkflowStep(baseUrl, loginByUsername, 'dept_manager_a1', normalRejectId, { action: 'submit' });
  const normalReject = await runWorkflowStep(baseUrl, loginByUsername, 'dept_leader_a', normalRejectId, {
    action: 'reject',
    rejectReason: 'target-contract reject draft',
  });

  record({
    role: 'workflow',
    endpoint: 'POST /api/works/[id]/workflow PROPOSING reject -> DRAFT',
    actual: { normalRejectSubmit, normalReject },
    expected: {
      normalRejectSubmit: {
        statusCode: 200,
        success: true,
        work: {
          status: 'PROPOSING',
          beforeApprovalStatus: 'DRAFT',
          approvalType: 'PROPOSE',
          currentApproverId: null,
          currentApproverRole: 'DEPARTMENT_LEADER',
          rejectedFromStatus: null,
        },
        record: { actionType: 'submit', statusBefore: 'DRAFT', statusAfter: 'PROPOSING' },
      },
      normalReject: {
        statusCode: 200,
        success: true,
        work: {
          status: 'DRAFT',
          beforeApprovalStatus: null,
          approvalType: null,
          currentApproverId: null,
          currentApproverRole: null,
          rejectedFromStatus: 'PROPOSING',
        },
        record: { actionType: 'reject', statusBefore: 'PROPOSING', statusAfter: 'DRAFT' },
      },
    },
    note: 'PR 6.2: proposal reject returns to beforeApprovalStatus instead of REJECTED.',
  });

  const decomposeApproveId = await createWorkflowWork({
    title: `${WORKFLOW_TEST_PREFIX}待分解通过`,
    type: 'TODO',
    status: 'PENDING_DECOMPOSE',
    creator: vp,
    dept: deptA,
    vp,
    president,
  });
  const decomposeSubmit = await runWorkflowStep(baseUrl, loginByUsername, 'dept_manager_a1', decomposeApproveId, {
    action: 'decompose',
    nodes: submitNodes,
  });
  const decomposeDeptApprove = await runWorkflowStep(baseUrl, loginByUsername, 'dept_leader_a', decomposeApproveId, { action: 'approve' });
  const decomposeCompanyApprove = await runWorkflowStep(baseUrl, loginByUsername, 'vp_a', decomposeApproveId, { action: 'approve' });

  record({
    role: 'workflow',
    endpoint: 'POST /api/works/[id]/workflow PENDING_DECOMPOSE -> PROPOSING -> IN_PROGRESS',
    actual: { decomposeSubmit, decomposeDeptApprove, decomposeCompanyApprove },
    expected: {
      decomposeSubmit: {
        statusCode: 200,
        success: true,
        work: {
          status: 'PROPOSING',
          beforeApprovalStatus: 'PENDING_DECOMPOSE',
          approvalType: 'PROPOSE',
          currentApproverId: null,
          currentApproverRole: 'DEPARTMENT_LEADER',
          rejectedFromStatus: null,
        },
        record: { actionType: 'decompose', statusBefore: 'PENDING_DECOMPOSE', statusAfter: 'PROPOSING' },
      },
      decomposeDeptApprove: {
        statusCode: 200,
        success: true,
        work: {
          status: 'PROPOSING',
          beforeApprovalStatus: 'PENDING_DECOMPOSE',
          approvalType: 'PROPOSE',
          currentApproverId: vp.id,
          currentApproverRole: 'VICE_PRESIDENT',
          rejectedFromStatus: null,
        },
        record: { actionType: 'approve', statusBefore: 'PROPOSING', statusAfter: 'PROPOSING' },
      },
      decomposeCompanyApprove: {
        statusCode: 200,
        success: true,
        work: {
          status: 'IN_PROGRESS',
          beforeApprovalStatus: null,
          approvalType: null,
          currentApproverId: null,
          currentApproverRole: null,
          rejectedFromStatus: null,
        },
        record: { actionType: 'approve', statusBefore: 'PROPOSING', statusAfter: 'IN_PROGRESS' },
      },
    },
    note: 'PR 6.2: decomposed todo uses PROPOSING and returns to PENDING_DECOMPOSE when rejected.',
  });

  const decomposeRejectId = await createWorkflowWork({
    title: `${WORKFLOW_TEST_PREFIX}待分解退回`,
    type: 'TODO',
    status: 'PENDING_DECOMPOSE',
    creator: vp,
    dept: deptA,
    vp,
    president,
  });
  const decomposeRejectSubmit = await runWorkflowStep(baseUrl, loginByUsername, 'dept_manager_a1', decomposeRejectId, {
    action: 'decompose',
    nodes: submitNodes,
  });
  const decomposeReject = await runWorkflowStep(baseUrl, loginByUsername, 'dept_leader_a', decomposeRejectId, {
    action: 'reject',
    rejectReason: 'target-contract reject decompose',
  });

  record({
    role: 'workflow',
    endpoint: 'POST /api/works/[id]/workflow PENDING_DECOMPOSE proposal reject',
    actual: { decomposeRejectSubmit, decomposeReject },
    expected: {
      decomposeRejectSubmit: {
        statusCode: 200,
        success: true,
        work: {
          status: 'PROPOSING',
          beforeApprovalStatus: 'PENDING_DECOMPOSE',
          approvalType: 'PROPOSE',
          currentApproverId: null,
          currentApproverRole: 'DEPARTMENT_LEADER',
          rejectedFromStatus: null,
        },
        record: { actionType: 'decompose', statusBefore: 'PENDING_DECOMPOSE', statusAfter: 'PROPOSING' },
      },
      decomposeReject: {
        statusCode: 200,
        success: true,
        work: {
          status: 'PENDING_DECOMPOSE',
          beforeApprovalStatus: null,
          approvalType: null,
          currentApproverId: null,
          currentApproverRole: null,
          rejectedFromStatus: 'PROPOSING',
        },
        record: { actionType: 'reject', statusBefore: 'PROPOSING', statusAfter: 'PENDING_DECOMPOSE' },
      },
    },
    note: 'PR 6.2: beforeApprovalStatus preserves PENDING_DECOMPOSE reject target.',
  });

  const adjustApproveId = await createWorkflowWork({
    title: `${WORKFLOW_TEST_PREFIX}调整通过`,
    type: 'PRIORITY',
    status: 'IN_PROGRESS',
    creator: manager,
    dept: deptA,
    vp,
    president,
  });
  const adjustSubmit = await runWorkflowStep(baseUrl, loginByUsername, 'dept_manager_a1', adjustApproveId, {
    action: 'adjust',
    adjustReason: 'target-contract adjust',
  });
  const adjustDeptApprove = await runWorkflowStep(baseUrl, loginByUsername, 'dept_leader_a', adjustApproveId, { action: 'approve' });
  const adjustCompanyApprove = await runWorkflowStep(baseUrl, loginByUsername, 'vp_a', adjustApproveId, { action: 'approve' });

  record({
    role: 'workflow',
    endpoint: 'POST /api/works/[id]/workflow IN_PROGRESS -> ADJUSTING -> IN_PROGRESS',
    actual: { adjustSubmit, adjustDeptApprove, adjustCompanyApprove },
    expected: {
      adjustSubmit: {
        statusCode: 200,
        success: true,
        work: {
          status: 'ADJUSTING',
          beforeApprovalStatus: 'IN_PROGRESS',
          approvalType: 'ADJUST',
          currentApproverId: null,
          currentApproverRole: 'DEPARTMENT_LEADER',
          rejectedFromStatus: null,
        },
        record: { actionType: 'adjust', statusBefore: 'IN_PROGRESS', statusAfter: 'ADJUSTING' },
      },
      adjustDeptApprove: {
        statusCode: 200,
        success: true,
        work: {
          status: 'ADJUSTING',
          beforeApprovalStatus: 'IN_PROGRESS',
          approvalType: 'ADJUST',
          currentApproverId: vp.id,
          currentApproverRole: 'VICE_PRESIDENT',
          rejectedFromStatus: null,
        },
        record: { actionType: 'approve', statusBefore: 'ADJUSTING', statusAfter: 'ADJUSTING' },
      },
      adjustCompanyApprove: {
        statusCode: 200,
        success: true,
        work: {
          status: 'IN_PROGRESS',
          beforeApprovalStatus: null,
          approvalType: null,
          currentApproverId: null,
          currentApproverRole: null,
          rejectedFromStatus: null,
        },
        record: { actionType: 'approve', statusBefore: 'ADJUSTING', statusAfter: 'IN_PROGRESS' },
      },
    },
    note: 'PR 6.2: adjustment approval returns to IN_PROGRESS and clears helper fields.',
  });

  const adjustRejectId = await createWorkflowWork({
    title: `${WORKFLOW_TEST_PREFIX}调整退回`,
    type: 'MAIN',
    status: 'IN_PROGRESS',
    creator: manager,
    dept: deptA,
    vp,
    president,
  });
  const adjustRejectSubmit = await runWorkflowStep(baseUrl, loginByUsername, 'dept_manager_a1', adjustRejectId, {
    action: 'adjust',
    adjustReason: 'target-contract adjust reject',
  });
  const adjustReject = await runWorkflowStep(baseUrl, loginByUsername, 'dept_leader_a', adjustRejectId, {
    action: 'reject',
    rejectReason: 'target-contract reject adjust',
  });

  record({
    role: 'workflow',
    endpoint: 'POST /api/works/[id]/workflow ADJUSTING reject -> IN_PROGRESS',
    actual: { adjustRejectSubmit, adjustReject },
    expected: {
      adjustRejectSubmit: {
        statusCode: 200,
        success: true,
        work: {
          status: 'ADJUSTING',
          beforeApprovalStatus: 'IN_PROGRESS',
          approvalType: 'ADJUST',
          currentApproverId: null,
          currentApproverRole: 'DEPARTMENT_LEADER',
          rejectedFromStatus: null,
        },
        record: { actionType: 'adjust', statusBefore: 'IN_PROGRESS', statusAfter: 'ADJUSTING' },
      },
      adjustReject: {
        statusCode: 200,
        success: true,
        work: {
          status: 'IN_PROGRESS',
          beforeApprovalStatus: null,
          approvalType: null,
          currentApproverId: null,
          currentApproverRole: null,
          rejectedFromStatus: 'ADJUSTING',
        },
        record: { actionType: 'reject', statusBefore: 'ADJUSTING', statusAfter: 'IN_PROGRESS' },
      },
    },
    note: 'PR 6.2: adjustment reject restores beforeApprovalStatus.',
  });

  const cancelApproveId = await createWorkflowWork({
    title: `${WORKFLOW_TEST_PREFIX}取消通过`,
    type: 'MAIN',
    status: 'IN_PROGRESS',
    creator: manager,
    dept: deptA,
    vp,
    president,
  });
  const cancelSubmit = await runWorkflowStep(baseUrl, loginByUsername, 'dept_manager_a1', cancelApproveId, {
    action: 'cancel',
    cancelReason: 'target-contract cancel',
  });
  const cancelDeptApprove = await runWorkflowStep(baseUrl, loginByUsername, 'dept_leader_a', cancelApproveId, { action: 'approve' });
  const cancelCompanyApprove = await runWorkflowStep(baseUrl, loginByUsername, 'vp_a', cancelApproveId, { action: 'approve' });

  record({
    role: 'workflow',
    endpoint: 'POST /api/works/[id]/workflow IN_PROGRESS -> CANCELLING -> CANCELLED',
    actual: { cancelSubmit, cancelDeptApprove, cancelCompanyApprove },
    expected: {
      cancelSubmit: {
        statusCode: 200,
        success: true,
        work: {
          status: 'CANCELLING',
          beforeApprovalStatus: 'IN_PROGRESS',
          approvalType: 'CANCEL',
          currentApproverId: null,
          currentApproverRole: 'DEPARTMENT_LEADER',
          rejectedFromStatus: null,
        },
        record: { actionType: 'cancel', statusBefore: 'IN_PROGRESS', statusAfter: 'CANCELLING' },
      },
      cancelDeptApprove: {
        statusCode: 200,
        success: true,
        work: {
          status: 'CANCELLING',
          beforeApprovalStatus: 'IN_PROGRESS',
          approvalType: 'CANCEL',
          currentApproverId: vp.id,
          currentApproverRole: 'VICE_PRESIDENT',
          rejectedFromStatus: null,
        },
        record: { actionType: 'approve', statusBefore: 'CANCELLING', statusAfter: 'CANCELLING' },
      },
      cancelCompanyApprove: {
        statusCode: 200,
        success: true,
        work: {
          status: 'CANCELLED',
          beforeApprovalStatus: null,
          approvalType: null,
          currentApproverId: null,
          currentApproverRole: null,
          rejectedFromStatus: null,
        },
        record: { actionType: 'approve', statusBefore: 'CANCELLING', statusAfter: 'CANCELLED' },
      },
    },
    note: 'PR 6.2: cancel approval uses CANCELLING until final approval.',
  });

  const cancelRejectId = await createWorkflowWork({
    title: `${WORKFLOW_TEST_PREFIX}取消退回`,
    type: 'MAIN',
    status: 'IN_PROGRESS',
    creator: manager,
    dept: deptA,
    vp,
    president,
  });
  const cancelRejectSubmit = await runWorkflowStep(baseUrl, loginByUsername, 'dept_manager_a1', cancelRejectId, {
    action: 'cancel',
    cancelReason: 'target-contract cancel reject',
  });
  const cancelReject = await runWorkflowStep(baseUrl, loginByUsername, 'dept_leader_a', cancelRejectId, {
    action: 'reject',
    rejectReason: 'target-contract reject cancel',
  });

  record({
    role: 'workflow',
    endpoint: 'POST /api/works/[id]/workflow CANCELLING reject -> IN_PROGRESS',
    actual: { cancelRejectSubmit, cancelReject },
    expected: {
      cancelRejectSubmit: {
        statusCode: 200,
        success: true,
        work: {
          status: 'CANCELLING',
          beforeApprovalStatus: 'IN_PROGRESS',
          approvalType: 'CANCEL',
          currentApproverId: null,
          currentApproverRole: 'DEPARTMENT_LEADER',
          rejectedFromStatus: null,
        },
        record: { actionType: 'cancel', statusBefore: 'IN_PROGRESS', statusAfter: 'CANCELLING' },
      },
      cancelReject: {
        statusCode: 200,
        success: true,
        work: {
          status: 'IN_PROGRESS',
          beforeApprovalStatus: null,
          approvalType: null,
          currentApproverId: null,
          currentApproverRole: null,
          rejectedFromStatus: 'CANCELLING',
        },
        record: { actionType: 'reject', statusBefore: 'CANCELLING', statusAfter: 'IN_PROGRESS' },
      },
    },
    note: 'PR 6.2: cancel reject restores IN_PROGRESS.',
  });

  const completeApproveId = await createWorkflowWork({
    title: `${WORKFLOW_TEST_PREFIX}完成通过`,
    type: 'TODO',
    status: 'IN_PROGRESS',
    creator: manager,
    dept: deptA,
    vp,
    president,
  });
  const completeSubmit = await runWorkflowStep(baseUrl, loginByUsername, 'dept_manager_a1', completeApproveId, {
    action: 'complete',
    proof: 'target-contract proof',
  });
  const completeApprove = await runWorkflowStep(baseUrl, loginByUsername, 'vp_a', completeApproveId, { action: 'approve' });

  record({
    role: 'workflow',
    endpoint: 'POST /api/works/[id]/workflow IN_PROGRESS -> COMPLETING -> COMPLETED',
    actual: { completeSubmit, completeApprove },
    expected: {
      completeSubmit: {
        statusCode: 200,
        success: true,
        work: {
          status: 'COMPLETING',
          beforeApprovalStatus: 'IN_PROGRESS',
          approvalType: 'COMPLETE',
          currentApproverId: vp.id,
          currentApproverRole: 'VICE_PRESIDENT',
          rejectedFromStatus: null,
        },
        record: { actionType: 'evidence', statusBefore: 'IN_PROGRESS', statusAfter: 'COMPLETING' },
      },
      completeApprove: {
        statusCode: 200,
        success: true,
        work: {
          status: 'COMPLETED',
          beforeApprovalStatus: null,
          approvalType: null,
          currentApproverId: null,
          currentApproverRole: null,
          rejectedFromStatus: null,
        },
        record: { actionType: 'approve', statusBefore: 'COMPLETING', statusAfter: 'COMPLETED' },
      },
    },
    note: 'PR 6.2: complete action is accepted as an alias of evidence and enters COMPLETING.',
  });

  const completeRejectId = await createWorkflowWork({
    title: `${WORKFLOW_TEST_PREFIX}完成退回`,
    type: 'TODO',
    status: 'IN_PROGRESS',
    creator: manager,
    dept: deptA,
    vp,
    president,
  });
  const completeRejectSubmit = await runWorkflowStep(baseUrl, loginByUsername, 'dept_manager_a1', completeRejectId, {
    action: 'complete',
    proof: 'target-contract proof reject',
  });
  const completeReject = await runWorkflowStep(baseUrl, loginByUsername, 'vp_a', completeRejectId, {
    action: 'reject',
    rejectReason: 'target-contract reject complete',
  });

  record({
    role: 'workflow',
    endpoint: 'POST /api/works/[id]/workflow COMPLETING reject -> IN_PROGRESS',
    actual: { completeRejectSubmit, completeReject },
    expected: {
      completeRejectSubmit: {
        statusCode: 200,
        success: true,
        work: {
          status: 'COMPLETING',
          beforeApprovalStatus: 'IN_PROGRESS',
          approvalType: 'COMPLETE',
          currentApproverId: vp.id,
          currentApproverRole: 'VICE_PRESIDENT',
          rejectedFromStatus: null,
        },
        record: { actionType: 'evidence', statusBefore: 'IN_PROGRESS', statusAfter: 'COMPLETING' },
      },
      completeReject: {
        statusCode: 200,
        success: true,
        work: {
          status: 'IN_PROGRESS',
          beforeApprovalStatus: null,
          approvalType: null,
          currentApproverId: null,
          currentApproverRole: null,
          rejectedFromStatus: 'COMPLETING',
        },
        record: { actionType: 'reject', statusBefore: 'COMPLETING', statusAfter: 'IN_PROGRESS' },
      },
    },
    note: 'PR 6.2: complete reject restores IN_PROGRESS.',
  });

  const draftCancelId = await createWorkflowWork({
    title: `${WORKFLOW_TEST_PREFIX}草稿取消`,
    type: 'MAIN',
    status: 'DRAFT',
    creator: manager,
    dept: deptA,
    vp,
    president,
  });
  const draftCancel = await runWorkflowStep(baseUrl, loginByUsername, 'dept_manager_a1', draftCancelId, {
    action: 'cancel',
    cancelReason: 'target-contract draft cancel',
  });

  record({
    role: 'workflow',
    endpoint: 'POST /api/works/[id]/workflow DRAFT -> CANCELLED',
    actual: { draftCancel },
    expected: {
      draftCancel: {
        statusCode: 200,
        success: true,
        work: {
          status: 'CANCELLED',
          beforeApprovalStatus: null,
          approvalType: null,
          currentApproverId: null,
          currentApproverRole: null,
          rejectedFromStatus: null,
        },
        record: { actionType: 'cancel', statusBefore: 'DRAFT', statusAfter: 'CANCELLED' },
      },
    },
    note: 'PR 6.2: draft cancellation is direct and does not enter CANCELLING.',
  });

  const mainLeaderCancelId = await createWorkflowWork({
    title: `${WORKFLOW_TEST_PREFIX}重点取消主要领导审批`,
    type: 'PRIORITY',
    status: 'IN_PROGRESS',
    creator: manager,
    dept: deptA,
    vp,
    president,
    needMainLeaderCancel: true,
  });
  const mainCancelSubmit = await runWorkflowStep(baseUrl, loginByUsername, 'dept_manager_a1', mainLeaderCancelId, {
    action: 'cancel',
    cancelReason: 'target-contract priority cancel',
  });
  const mainCancelDeptApprove = await runWorkflowStep(baseUrl, loginByUsername, 'dept_leader_a', mainLeaderCancelId, { action: 'approve' });
  const mainCancelCompanyApprove = await runWorkflowStep(baseUrl, loginByUsername, 'vp_a', mainLeaderCancelId, { action: 'approve' });
  const mainCancelPresidentApprove = await runWorkflowStep(baseUrl, loginByUsername, 'president', mainLeaderCancelId, { action: 'approve' });

  record({
    role: 'workflow',
    endpoint: 'POST /api/works/[id]/workflow priority cancel main leader node',
    actual: {
      mainCancelSubmit,
      mainCancelDeptApprove,
      mainCancelCompanyApprove,
      mainCancelPresidentApprove,
    },
    expected: {
      mainCancelSubmit: {
        statusCode: 200,
        success: true,
        work: {
          status: 'CANCELLING',
          beforeApprovalStatus: 'IN_PROGRESS',
          approvalType: 'CANCEL',
          currentApproverId: null,
          currentApproverRole: 'DEPARTMENT_LEADER',
          rejectedFromStatus: null,
        },
        record: { actionType: 'cancel', statusBefore: 'IN_PROGRESS', statusAfter: 'CANCELLING' },
      },
      mainCancelDeptApprove: {
        statusCode: 200,
        success: true,
        work: {
          status: 'CANCELLING',
          beforeApprovalStatus: 'IN_PROGRESS',
          approvalType: 'CANCEL',
          currentApproverId: vp.id,
          currentApproverRole: 'VICE_PRESIDENT',
          rejectedFromStatus: null,
        },
        record: { actionType: 'approve', statusBefore: 'CANCELLING', statusAfter: 'CANCELLING' },
      },
      mainCancelCompanyApprove: {
        statusCode: 200,
        success: true,
        work: {
          status: 'CANCELLING',
          beforeApprovalStatus: 'IN_PROGRESS',
          approvalType: 'CANCEL',
          currentApproverId: president.id,
          currentApproverRole: 'PRESIDENT',
          rejectedFromStatus: null,
        },
        record: { actionType: 'approve', statusBefore: 'CANCELLING', statusAfter: 'CANCELLING' },
      },
      mainCancelPresidentApprove: {
        statusCode: 200,
        success: true,
        work: {
          status: 'CANCELLED',
          beforeApprovalStatus: null,
          approvalType: null,
          currentApproverId: null,
          currentApproverRole: null,
          rejectedFromStatus: null,
        },
        record: { actionType: 'approve', statusBefore: 'CANCELLING', statusAfter: 'CANCELLED' },
      },
    },
    note: 'PR 6.2: priority cancel no longer uses PENDING_MAIN_LEADER_CANCEL; main leader is a CANCELLING approval node.',
  });
}

async function verifyStateFilters(baseUrl, loginByUsername, deptByCode, userByUsername) {
  await prisma.workItem.deleteMany({
    where: { title: { startsWith: 'TC-STATE-' } },
  });

  const returnedDraft = await prisma.workItem.create({
    data: {
      type: 'MAIN',
      title: 'TC-STATE-returned-draft',
      workItem: 'TC-STATE-returned-draft',
      status: 'DRAFT',
      departmentId: deptByCode.TDA.id,
      creatorId: userByUsername.dept_manager_a2.id,
      firstSubmitterId: userByUsername.dept_manager_a1.id,
      proposedLeaderId: userByUsername.vp_a.id,
      approvalLeaderId: userByUsername.vp_a.id,
      rejectReason: 'target-contract returned draft',
      rejectedFromStatus: 'PROPOSING',
      completeTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const oldStatusResponse = await request(baseUrl, 'GET', '/api/works?status=APPROVED', null, loginByUsername.admin.cookies);
  record({
    role: 'admin',
    endpoint: 'GET /api/works rejects legacy status filter',
    actual: { statusCode: oldStatusResponse.statusCode },
    expected: { statusCode: 400 },
    expectedFailure: false,
    note: 'PR 6.3: /api/works status filter only accepts 9 current states or documented derived filters.',
  });

  const inProgressResponse = await request(baseUrl, 'GET', '/api/works?status=inProgress', null, loginByUsername.admin.cookies);
  const inProgressStatuses = Array.isArray(inProgressResponse.body)
    ? Array.from(new Set(inProgressResponse.body.map((item) => item.status))).sort()
    : [];
  record({
    role: 'admin',
    endpoint: 'GET /api/works status=inProgress',
    actual: { statusCode: inProgressResponse.statusCode, statuses: inProgressStatuses },
    expected: { statusCode: 200, statuses: ['IN_PROGRESS'] },
    expectedFailure: false,
    note: 'PR 6.3: inProgress no longer includes APPROVED.',
  });

  const approvingResponse = await request(baseUrl, 'GET', '/api/works?status=approving', null, loginByUsername.admin.cookies);
  const approvingStatuses = Array.isArray(approvingResponse.body)
    ? Array.from(new Set(approvingResponse.body.map((item) => item.status))).sort()
    : [];
  record({
    role: 'admin',
    endpoint: 'GET /api/works status=approving',
    actual: { statusCode: approvingResponse.statusCode, statuses: approvingStatuses },
    expected: {
      statusCode: 200,
      statuses: ['ADJUSTING', 'CANCELLING', 'COMPLETING', 'PROPOSING'],
    },
    expectedFailure: false,
    note: 'PR 6.3: approving covers PROPOSING/ADJUSTING/CANCELLING/COMPLETING only.',
  });

  const returnedResponse = await request(baseUrl, 'GET', '/api/works?status=returnedDraft', null, loginByUsername.dept_manager_a1.cookies);
  const returnedIds = Array.isArray(returnedResponse.body) ? returnedResponse.body.map((item) => item.id) : [];
  const returnedItem = Array.isArray(returnedResponse.body)
    ? returnedResponse.body.find((item) => item.id === returnedDraft.id)
    : null;
  record({
    role: 'dept_manager_a1',
    endpoint: 'GET /api/works status=returnedDraft',
    actual: {
      statusCode: returnedResponse.statusCode,
      containsReturnedDraft: returnedIds.includes(returnedDraft.id),
      status: returnedItem?.status,
      rejectedFromStatus: returnedItem?.rejectedFromStatus,
    },
    expected: {
      statusCode: 200,
      containsReturnedDraft: true,
      status: 'DRAFT',
      rejectedFromStatus: 'PROPOSING',
    },
    expectedFailure: false,
    note: 'PR 6.3: returned draft is derived from DRAFT plus reject traces, not a database status.',
  });

  const handlingOtherUserResponse = await request(baseUrl, 'GET', '/api/works?status=handling', null, loginByUsername.dept_manager_a2.cookies);
  const handlingOtherUserIds = Array.isArray(handlingOtherUserResponse.body)
    ? handlingOtherUserResponse.body.map((item) => item.id)
    : [];
  record({
    role: 'dept_manager_a2',
    endpoint: 'GET /api/works status=handling excludes others returned draft',
    actual: {
      statusCode: handlingOtherUserResponse.statusCode,
      containsReturnedDraft: handlingOtherUserIds.includes(returnedDraft.id),
    },
    expected: {
      statusCode: 200,
      containsReturnedDraft: false,
    },
    expectedFailure: false,
    note: 'PR 6.3: returned draft handling belongs to firstSubmitterId, not every same-department user.',
  });

  const exportOldStatus = await requestBinary(baseUrl, 'GET', '/api/excel/export?status=APPROVED', loginByUsername.admin.cookies);
  record({
    role: 'admin',
    endpoint: 'GET /api/excel/export rejects legacy status filter',
    actual: { statusCode: exportOldStatus.statusCode },
    expected: { statusCode: 400 },
    expectedFailure: false,
    note: 'PR 6.3: ordinary Excel export does not accept legacy state filters.',
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
  await verifyWorkflowTransitions(baseUrl, loginByUsername, deptByCode, userByUsername);
  await verifyStateFilters(baseUrl, loginByUsername, deptByCode, userByUsername);

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
