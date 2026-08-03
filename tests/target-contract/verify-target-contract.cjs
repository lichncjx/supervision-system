require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const {
  users,
  TARGET_ASSESSMENT_YEAR,
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

function requestMultipart(baseUrl, path, fileName, fileBuffer, cookies = [], fields = {}) {
  const url = new URL(path, baseUrl);
  const boundary = `----target-contract-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const chunks = [];
  for (const [name, value] of Object.entries(fields)) {
    chunks.push(
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from(`Content-Disposition: form-data; name="${name}"\r\n\r\n`),
      Buffer.from(`${value}\r\n`),
    );
  }
  chunks.push(
    Buffer.from(`--${boundary}\r\n`),
    Buffer.from(`Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`),
    Buffer.from('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n'),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  );
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

async function importWorkbook(baseUrl, type, fileName, fileBuffer, cookies = []) {
  const fields = { assessmentYear: String(TARGET_ASSESSMENT_YEAR) };
  const preview = await requestMultipart(
    baseUrl,
    `/api/excel/import/${type}/preview`,
    fileName,
    fileBuffer,
    cookies,
    fields,
  );
  const previewToken = preview.body?.previewToken;
  if (!previewToken) return { preview, confirmation: null };

  const confirmation = await requestMultipart(
    baseUrl,
    `/api/excel/import/${type}`,
    fileName,
    fileBuffer,
    cookies,
    { ...fields, previewToken },
  );
  return { preview, confirmation };
}

async function login(baseUrl, username) {
  const response = await request(baseUrl, 'POST', '/api/auth/login', { username, password: PASSWORD });
  if (response.statusCode !== 200 || !response.body?.id) {
    throw new Error(`Login failed for ${username}: ${response.statusCode} ${JSON.stringify(response.body)}`);
  }
  return {
    user: response.body,
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

function buildWorkbookBuffer(rows, merges = []) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!merges'] = merges;
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
  if (!passed && actual && typeof actual.statusCode === 'number' && actual.statusCode >= 400) {
    console.log(`  errorDetail: ${JSON.stringify(actual._body || actual)}`);
  }
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

function worksForAssessmentYear(works) {
  return works.filter((work) => work.assessmentYear === TARGET_ASSESSMENT_YEAR);
}

function expectedRoleSummary(user, works) {
  const summary = expectedSummary(user, worksForAssessmentYear(works));
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
  const yearWorks = worksForAssessmentYear(works);
  const summary = expectedSummary(user, yearWorks);
  const visible = yearWorks.filter((work) => canViewWork(user, work));
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
    const response = await request(baseUrl, 'GET', `/api/dashboard?year=${TARGET_ASSESSMENT_YEAR}`, null, loginInfo.cookies);
    const summary = response.body?.summary || {};
    const actual = response.statusCode === 200 ? pickSummaryFields(summary) : { statusCode: response.statusCode };
    const expected = expectedRoleSummary(dbUser, works);
    record({
      role: userDef.username,
      endpoint: `GET /api/dashboard?year=${TARGET_ASSESSMENT_YEAR} (summary)`,
      actual,
      expected,
      expectedFailure: false,
      note: 'Target: summary follows docs/core/API说明.md using target status groups, organization visibility, my approval/handling, expiring/overdue.',
    });
  }
}

async function verifyDashboardUnified(baseUrl, loginByUsername, userByUsername, works) {
  for (const userDef of users) {
    const loginInfo = loginByUsername[userDef.username];
    const dbUser = userByUsername[userDef.username];
    const dashboardResponse = await request(baseUrl, 'GET', `/api/dashboard?limit=100&year=${TARGET_ASSESSMENT_YEAR}`, null, loginInfo.cookies);
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
      endpoint: 'GET /api/dashboard summary structure',
      actual: dashboardResponse.statusCode === 200
        ? pickDashboardSummaryCompat(summary)
        : { statusCode: dashboardResponse.statusCode },
      expected: dashboardResponse.statusCode === 200
        ? pickSummaryFields(summary)
        : { statusCode: dashboardResponse.statusCode },
      expectedFailure: false,
      note: 'Phase 4: /api/dashboard summary structure verified.',
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
    const response = await request(baseUrl, 'GET', '/api/works?assessmentYear=all', null, loginInfo.cookies);
    const worksBody = responseArray(response);
    const actualIds = worksBody.map((work) => work.id).sort((a, b) => a - b);
    const expectedIds = works
      .filter((work) => canViewWork(dbUser, work))
      .map((work) => work.id)
      .sort((a, b) => a - b);

    record({
      role: userDef.username,
      endpoint: 'GET /api/works?assessmentYear=all',
      actual: actualIds,
      expected: expectedIds,
      expectedFailure: false,
      note: [
        'Visibility contract explicitly queries all assessment years and uses departmentId/cooperators[].departmentId for organization scope.',
        responseError(response) ? `Non-array response: ${JSON.stringify(responseError(response))}` : '',
      ].filter(Boolean).join(' '),
    });
  }
}

async function verifyTargetPermissionFacts(baseUrl, loginByUsername, works) {
  const byTitle = Object.fromEntries(works.map((work) => [work.title, work.id]));
  async function visibleFor(username, workId) {
    const response = await request(baseUrl, 'GET', '/api/works?assessmentYear=all', null, loginByUsername[username].cookies);
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
      endpoint: 'target fact: VP_A can see VP_B non-draft work',
      actual: { visible: vpASeesVpB.visible },
      expected: { visible: true },
      expectedFailure: false,
      note: [
        'PR #132: company leaders can view all non-draft work company-wide.',
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
  const response = await request(baseUrl, 'GET', `/api/dashboard/completion-rate?year=${TARGET_ASSESSMENT_YEAR}`, null, loginByUsername.admin.cookies);
  const items = Array.isArray(response.body) ? response.body : [];

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
    const expected = expectedCompletionRate(dept.id, worksForAssessmentYear(works));
    record({
      role: 'admin',
      endpoint: `GET /api/dashboard/completion-rate?year=${TARGET_ASSESSMENT_YEAR} dept=${code}`,
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
    const response = await requestBinary(baseUrl, 'GET', '/api/excel/export?assessmentYear=all', loginInfo.cookies);
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
      endpoint: 'GET /api/excel/export?assessmentYear=all visibility',
      actual: response.statusCode === 200
        ? { statusCode: response.statusCode, titles: exportedTitles }
        : { statusCode: response.statusCode },
      expected: { statusCode: 200, titles: expectedTitles },
      expectedFailure: false,
      note: 'Ordinary Excel export explicitly queries all assessment years and follows the same visible scope as GET /api/works.',
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

  const adminResponse = await requestBinary(baseUrl, 'GET', '/api/excel/export?assessmentYear=all', loginByUsername.admin.cookies);
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
    '完成时间',
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
      userByUsername.dept_leader_b.name,
      userByUsername.dept_manager_b1.name,
      'TDA||重名配合人',
      '验证部门用户不能跨主责部门导入',
      '2026-12-31',
      '未开始',
    ],
  ];
  const invalidAttempt = await importWorkbook(
    baseUrl,
    'todo',
    'invalid.xlsx',
    buildWorkbookBuffer(invalidRows),
    loginByUsername.dept_manager_a1.cookies
  );

  record({
    role: 'dept_manager_a1',
    endpoint: 'POST /api/excel/import/todo/preview rejects unrelated responsible department',
    actual: {
      statusCode: invalidAttempt.preview.statusCode,
      errorFields: invalidAttempt.preview.body?.errors?.map((error) => error.field).sort() || [],
      exists: Boolean(await prisma.workItem.findFirst({ where: { title: 'TC-导入越权待办-B' } })),
    },
    expected: {
      statusCode: 200,
      errorFields: ['主责部门'],
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
      userByUsername.dept_leader_a.name,
      userByUsername.dept_manager_a1.name,
      'TDB|配合领导B|重名配合人',
      '验证主责责任人解析为系统用户',
      '2026-12-31',
      '未开始',
    ],
  ];
  const validAttempt = await importWorkbook(
    baseUrl,
    'todo',
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
    endpoint: 'Excel preview then POST /api/excel/import/todo accepts own responsible department',
    actual: {
      statusCode: validAttempt.confirmation?.statusCode,
      status: imported?.status,
      departmentId: imported?.departmentId,
      cooperators: normalizeCooperators(imported?.cooperators),
      responsiblePerson: imported?.responsiblePerson,
      responsibleLeaderUserId: imported?.responsibleLeaderUserId,
      responsiblePersonUserId: imported?.responsiblePersonUserId,
      assessmentYear: imported?.assessmentYear,
    },
    expected: {
      statusCode: 200,
      status: 'DRAFT',
      departmentId: deptByCode.TDA.id,
      cooperators: [{ departmentId: deptByCode.TDB.id, departmentName: 'TDB', leader: '配合领导B', person: '重名配合人' }],
      responsiblePerson: userByUsername.dept_manager_a1.name,
      responsibleLeaderUserId: userByUsername.dept_leader_a.id,
      responsiblePersonUserId: userByUsername.dept_manager_a1.id,
      assessmentYear: TARGET_ASSESSMENT_YEAR,
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
      userByUsername.dept_leader_a.name,
      userByUsername.dept_manager_a1.name,
      '',
      '验证普通导入不能绕过 workflow',
      '2026-12-31',
      '未开始',
      'APPROVED',
    ],
  ];
  const invalidStatusAttempt = await importWorkbook(
    baseUrl,
    'todo',
    'invalid-status.xlsx',
    buildWorkbookBuffer(invalidStatusRows),
    loginByUsername.dept_manager_a1.cookies
  );

  record({
    role: 'dept_manager_a1',
    endpoint: 'POST /api/excel/import/todo/preview rejects old/non-draft status',
    actual: {
      statusCode: invalidStatusAttempt.preview.statusCode,
      errorFields: invalidStatusAttempt.preview.body?.errors?.map((error) => error.field).sort() || [],
      exists: Boolean(await prisma.workItem.findFirst({ where: { title: 'TC-导入非法状态-APPROVED' } })),
    },
    expected: {
      statusCode: 200,
      errorFields: ['当前状态'],
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
      userByUsername.dept_leader_a.name,
      userByUsername.dept_manager_a1.name,
      'TDB|导入配合领导|导入配合人',
    ],
  ];
  const priorityImportAttempt = await importWorkbook(
    baseUrl,
    'priority',
    'priority.xlsx',
    buildWorkbookBuffer(priorityRows),
    loginByUsername.dept_manager_a1.cookies
  );
  const importedPriority = await prisma.workItem.findFirst({
    where: { title: 'TC-导入重点工作-cooperators｜导入节点' },
    orderBy: { id: 'desc' },
  });

  record({
    role: 'dept_manager_a1',
    endpoint: 'Excel preview then POST /api/excel/import/priority imports with cooperators',
    actual: {
      statusCode: priorityImportAttempt.confirmation?.statusCode,
      status: importedPriority?.status,
      departmentId: importedPriority?.departmentId,
      responsibleLeader: importedPriority?.responsibleLeader,
      responsiblePerson: importedPriority?.responsiblePerson,
      responsibleLeaderUserId: importedPriority?.responsibleLeaderUserId,
      responsiblePersonUserId: importedPriority?.responsiblePersonUserId,
      cooperators: normalizeCooperators(importedPriority?.cooperators),
      assessmentYear: importedPriority?.assessmentYear,
    },
    expected: {
      statusCode: 200,
      status: 'DRAFT',
      departmentId: deptByCode.TDA.id,
      responsibleLeader: userByUsername.dept_leader_a.name,
      responsiblePerson: userByUsername.dept_manager_a1.name,
      responsibleLeaderUserId: userByUsername.dept_leader_a.id,
      responsiblePersonUserId: userByUsername.dept_manager_a1.id,
      cooperators: [{ departmentId: deptByCode.TDB.id, departmentName: 'TDB', leader: '导入配合领导', person: '导入配合人' }],
      assessmentYear: TARGET_ASSESSMENT_YEAR,
    },
    expectedFailure: false,
    note: 'Phase 8C: priority import supports cooperators with leader field.',
  });

  const mergedPriorityWorkItem = 'TC-导入重点工作-事项属性合并';
  const mergedPriorityRows = [
    priorityHeaders,
    [
      'target-contract merged import',
      mergedPriorityWorkItem,
      '是',
      '编制导入方案',
      '2026-11-15',
      '导入方案',
      'TDA',
      userByUsername.dept_leader_a.name,
      userByUsername.dept_manager_a1.name,
      '',
    ],
    [
      '',
      '',
      '',
      '组织导入验收',
      '2026-12-15',
      '验收记录',
      'TDA',
      userByUsername.dept_leader_a.name,
      userByUsername.dept_manager_a1.name,
      '',
    ],
  ];
  const mergedPriorityAttempt = await importWorkbook(
    baseUrl,
    'priority',
    'priority-merged-item-attributes.xlsx',
    buildWorkbookBuffer(mergedPriorityRows, [
      { s: { r: 1, c: 0 }, e: { r: 2, c: 0 } },
      { s: { r: 1, c: 1 }, e: { r: 2, c: 1 } },
      { s: { r: 1, c: 2 }, e: { r: 2, c: 2 } },
    ]),
    loginByUsername.dept_manager_a1.cookies,
  );
  const mergedPriorityWorks = await prisma.workItem.findMany({
    where: { workItem: mergedPriorityWorkItem },
  });
  const mergedPriorityNodeNames = ['编制导入方案', '组织导入验收'];
  const mergedPriorityNodeOrder = new Map(
    mergedPriorityNodeNames.map((workNode, index) => [workNode, index]),
  );

  record({
    role: 'dept_manager_a1',
    endpoint: 'Excel priority import inherits merged work-item attributes only from true merged cells',
    actual: {
      statusCode: mergedPriorityAttempt.confirmation?.statusCode,
      nodes: mergedPriorityWorks
        .map((work) => ({
          workNode: work.workNode,
          businessCategory: work.businessCategory,
          isInnovation: work.isInnovation,
        }))
        .sort((left, right) => {
          const leftOrder = mergedPriorityNodeOrder.get(left.workNode) ?? Number.MAX_SAFE_INTEGER;
          const rightOrder = mergedPriorityNodeOrder.get(right.workNode) ?? Number.MAX_SAFE_INTEGER;
          return leftOrder - rightOrder
            || String(left.workNode || '').localeCompare(String(right.workNode || ''));
        }),
    },
    expected: {
      statusCode: 200,
      nodes: [
        { workNode: '编制导入方案', businessCategory: 'target-contract merged import', isInnovation: true },
        { workNode: '组织导入验收', businessCategory: 'target-contract merged import', isInnovation: true },
      ],
    },
    expectedFailure: false,
    note: 'Only actual single-column merged cells inherit work-item attributes; ordinary blank cells remain invalid or blank.',
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
      userByUsername.dept_leader_a.name,
      userByUsername.dept_manager_a2.name,
      'TDC||导入配合人M',
    ],
  ];
  const mainImportAttempt = await importWorkbook(
    baseUrl,
    'main',
    'main.xlsx',
    buildWorkbookBuffer(mainRows),
    loginByUsername.dept_manager_a1.cookies
  );
  const importedMain = await prisma.workItem.findFirst({
    where: { title: 'TC-导入主要工作-cooperators｜导入节点' },
    orderBy: { id: 'desc' },
  });

  record({
    role: 'dept_manager_a1',
    endpoint: 'Excel preview then POST /api/excel/import/main imports with cooperators',
    actual: {
      statusCode: mainImportAttempt.confirmation?.statusCode,
      status: importedMain?.status,
      departmentId: importedMain?.departmentId,
      responsibleLeader: importedMain?.responsibleLeader,
      responsiblePerson: importedMain?.responsiblePerson,
      responsibleLeaderUserId: importedMain?.responsibleLeaderUserId,
      responsiblePersonUserId: importedMain?.responsiblePersonUserId,
      cooperators: normalizeCooperators(importedMain?.cooperators),
      assessmentYear: importedMain?.assessmentYear,
    },
    expected: {
      statusCode: 200,
      status: 'DRAFT',
      departmentId: deptByCode.TDA.id,
      responsibleLeader: userByUsername.dept_leader_a.name,
      responsiblePerson: userByUsername.dept_manager_a2.name,
      responsibleLeaderUserId: userByUsername.dept_leader_a.id,
      responsiblePersonUserId: userByUsername.dept_manager_a2.id,
      cooperators: [{ departmentId: deptByCode.TDC.id, departmentName: 'TDC', person: '导入配合人M' }],
      assessmentYear: TARGET_ASSESSMENT_YEAR,
    },
    expectedFailure: false,
    note: 'Phase 8C: main import supports cooperators with optional leader.',
  });
}

async function verifyWorkItemOptionsAndBatchDrafts(baseUrl, loginByUsername, deptByCode, userByUsername) {
  const manager = userByUsername.dept_manager_a1;
  const leader = userByUsername.dept_leader_a;
  const managerLogin = loginByUsername.dept_manager_a1;
  const optionsResponse = await request(
    baseUrl,
    'GET',
    `/api/works/work-item-options?type=priority&assessmentYear=${TARGET_ASSESSMENT_YEAR}&departmentId=${deptByCode.TDA.id}`,
    null,
    managerLogin.cookies,
  );
  const options = Array.isArray(optionsResponse.body) ? optionsResponse.body : [];
  record({
    role: 'dept_manager_a1',
    endpoint: 'GET /api/works/work-item-options returns visible current-year work items',
    actual: {
      statusCode: optionsResponse.statusCode,
      hasPriorityOption: options.some((option) => (
        option.workItem === 'TC-普通重点工作-A'
        && option.visibleNodeCount >= 1
        && option.businessCategoryConsistent === true
        && option.businessCategoryDefault === '目标口径自动化验证'
        && option.isInnovationConsistent === true
        && option.isInnovationDefault === false
      )),
    },
    expected: { statusCode: 200, hasPriorityOption: true },
    expectedFailure: false,
    note: '工作事项候选按当前用户可见范围、年度和类型返回，不返回隐藏节点数量。',
  });

  const batchWorkItem = 'TC-批量新建工作事项';
  const batchNodes = [
    {
      workNode: '完成风险排查',
      departmentId: deptByCode.TDA.id,
      responsibleLeader: leader.name,
      responsibleLeaderUserId: leader.id,
      responsiblePerson: manager.name,
      responsiblePersonUserId: manager.id,
      planCompleteTime: '2026-12-20',
      completeForm: '风险排查报告',
    },
    {
      workNode: '形成整改闭环',
      departmentId: deptByCode.TDA.id,
      responsibleLeader: leader.name,
      responsibleLeaderUserId: leader.id,
      responsiblePerson: manager.name,
      responsiblePersonUserId: manager.id,
      planCompleteTime: '2026-12-25',
      completeForm: '整改闭环报告',
    },
  ];
  const batchResponse = await request(
    baseUrl,
    'POST',
    '/api/works/batch-drafts',
    {
      type: 'priority',
      assessmentYear: TARGET_ASSESSMENT_YEAR,
      workItem: batchWorkItem,
      nodes: batchNodes,
    },
    managerLogin.cookies,
  );
  const batchWorks = await prisma.workItem.findMany({
    where: { assessmentYear: TARGET_ASSESSMENT_YEAR, workItem: batchWorkItem },
    orderBy: { workNode: 'asc' },
  });
  record({
    role: 'dept_manager_a1',
    endpoint: 'POST /api/works/batch-drafts creates independent node drafts atomically',
    actual: {
      statusCode: batchResponse.statusCode,
      count: batchWorks.length,
      titles: batchWorks.map((work) => work.title),
      statuses: batchWorks.map((work) => work.status),
    },
    expected: {
      statusCode: 200,
      count: 2,
      titles: ['TC-批量新建工作事项｜完成风险排查', 'TC-批量新建工作事项｜形成整改闭环'],
      statuses: ['DRAFT', 'DRAFT'],
    },
    expectedFailure: false,
    note: '每个节点仍是独立 WorkItem 草稿，但共享工作事项归属。',
  });

  const duplicateWorkItem = 'TC-批量重复节点回滚';
  const duplicateResponse = await request(
    baseUrl,
    'POST',
    '/api/works/batch-drafts',
    {
      type: 'priority',
      assessmentYear: TARGET_ASSESSMENT_YEAR,
      workItem: duplicateWorkItem,
      nodes: [batchNodes[0], { ...batchNodes[0] }],
    },
    managerLogin.cookies,
  );
  record({
    role: 'dept_manager_a1',
    endpoint: 'POST /api/works/batch-drafts rejects duplicate nodes with zero writes',
    actual: {
      statusCode: duplicateResponse.statusCode,
      count: await prisma.workItem.count({ where: { workItem: duplicateWorkItem } }),
    },
    expected: { statusCode: 400, count: 0 },
    expectedFailure: false,
    note: '任一批量节点校验失败时，整批不写入。',
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

function pickOptional(options, key, defaultValue) {
  return Object.prototype.hasOwnProperty.call(options, key) ? options[key] : defaultValue;
}

function workflowBaseData(options) {
  const { title, type, status, creator, dept, vp, needMainLeaderCancel = false } = options;
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
    completeTime: null,
    planCompleteTime: dueDate,
    completeForm: 'target-contract workflow',
    nodes: JSON.stringify([{ title: 'workflow-node', completeTime: dueDate.toISOString() }]),
    responsibleLeader: '测试责任领导',
    responsiblePerson: '测试责任人',
    responsibleLeaderUserId: pickOptional(options, 'responsibleLeaderUserId', null),
    responsiblePersonUserId: pickOptional(options, 'responsiblePersonUserId', creator.id),
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
    success: response.statusCode === 204,
    work: pickWorkflowState(work),
    record: await latestWorkflowRecord(workId),
  };
}

async function runWorkUpdate(baseUrl, loginByUsername, username, workId, payload) {
  const response = await request(
    baseUrl,
    'PUT',
    `/api/works/${workId}`,
    payload,
    loginByUsername[username].cookies
  );
  const work = await prisma.workItem.findUnique({ where: { id: workId } });
  return {
    statusCode: response.statusCode,
    success: response.statusCode === 200,
    work: {
      status: work?.status,
      departmentId: work?.departmentId,
      responsibleLeaderUserId: work?.responsibleLeaderUserId,
      responsiblePersonUserId: work?.responsiblePersonUserId,
    },
  };
}

async function verifyWorkflowTransitions(baseUrl, loginByUsername, deptByCode, userByUsername) {
  await cleanupWorkflowContractWorks();

  const deptA = deptByCode.TDA;
  const deptB = deptByCode.TDB;
  const manager = userByUsername.dept_manager_a1;
  const otherManager = userByUsername.dept_manager_a2;
  const deptBManager = userByUsername.dept_manager_b1;
  const vp = userByUsername.vp_a;
  const president = userByUsername.president;

  await prisma.user.deleteMany({
    where: { username: { in: ['tc_workflow_admin_dept_a', 'tc_workflow_supervisor_dept_a'] } },
  });
  const tempAdmin = await prisma.user.create({
    data: {
      username: 'tc_workflow_admin_dept_a',
      passwordHash: 'target-contract-not-used',
      name: 'TC流程同部门管理员',
      role: 'ADMIN',
      departmentId: deptA.id,
      isActive: true,
    },
  });

  const submitNodes = [{ title: '分解节点', completeTime: new Date().toISOString(), children: [] }];
  const decomposePayloadBase = {
    action: 'decompose',
    nodes: submitNodes,
    workPlan: 'target-contract decompose plan',
    planCompleteTime: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  };

  const companyTodoNoResponsibleId = await createWorkflowWork({
    title: `${WORKFLOW_TEST_PREFIX}公司待办无责任人提交待分解`,
    type: 'TODO',
    status: 'DRAFT',
    creator: vp,
    dept: deptA,
    vp,
    president,
    responsiblePersonUserId: null,
  });
  const companyTodoSubmit = await runWorkflowStep(baseUrl, loginByUsername, 'vp_a', companyTodoNoResponsibleId, {
    action: 'submit',
  });

  record({
    role: 'workflow',
    endpoint: 'POST /api/works/[id]/workflow company TODO without responsible user -> PENDING_DECOMPOSE',
    actual: { companyTodoSubmit },
    expected: {
      companyTodoSubmit: {
        statusCode: 204,
        success: true,
        work: {
          status: 'PENDING_DECOMPOSE',
          beforeApprovalStatus: null,
          approvalType: null,
          currentApproverId: null,
          currentApproverRole: null,
          rejectedFromStatus: null,
        },
        record: { actionType: 'submit', statusBefore: 'DRAFT', statusAfter: 'PENDING_DECOMPOSE' },
      },
    },
    note: 'PR112: company leaders can submit TODO drafts without responsiblePersonUserId; the department assigns it during decomposition.',
  });

  const normalMissingResponsibleId = await createWorkflowWork({
    title: `${WORKFLOW_TEST_PREFIX}普通立项缺责任人拒绝`,
    type: 'PRIORITY',
    status: 'DRAFT',
    creator: manager,
    dept: deptA,
    vp,
    president,
    responsiblePersonUserId: null,
  });
  const normalMissingResponsibleSubmit = await runWorkflowStep(baseUrl, loginByUsername, 'dept_manager_a1', normalMissingResponsibleId, {
    action: 'submit',
  });

  record({
    role: 'workflow',
    endpoint: 'POST /api/works/[id]/workflow ordinary proposal rejects missing responsible user',
    actual: { normalMissingResponsibleSubmit },
    expected: {
      normalMissingResponsibleSubmit: {
        statusCode: 400,
        success: false,
        work: {
          status: 'DRAFT',
          beforeApprovalStatus: null,
          approvalType: null,
          currentApproverId: null,
          currentApproverRole: null,
          rejectedFromStatus: null,
        },
        record: null,
      },
    },
    note: 'PR112: non-company-TODO proposal must have responsiblePersonUserId before entering PROPOSING.',
  });

  const draftDepartmentChangeId = await createWorkflowWork({
    title: `${WORKFLOW_TEST_PREFIX}草稿改部门保留旧责任人拒绝`,
    type: 'MAIN',
    status: 'DRAFT',
    creator: manager,
    dept: deptA,
    vp,
    president,
    responsibleLeaderUserId: userByUsername.dept_leader_a.id,
    responsiblePersonUserId: manager.id,
  });
  const draftDepartmentChange = await runWorkUpdate(
    baseUrl,
    loginByUsername,
    'dept_manager_a1',
    draftDepartmentChangeId,
    { departmentId: deptB.id }
  );

  record({
    role: 'workflow',
    endpoint: 'PUT /api/works/[id] rejects retained responsible users after department change',
    actual: { draftDepartmentChange },
    expected: {
      draftDepartmentChange: {
        statusCode: 400,
        success: false,
        work: {
          status: 'DRAFT',
          departmentId: deptA.id,
          responsibleLeaderUserId: userByUsername.dept_leader_a.id,
          responsiblePersonUserId: manager.id,
        },
      },
    },
    note: 'PR112: crafted draft updates cannot switch department while retaining responsible users from the old department.',
  });

  const wrongPersonRoleDecomposeId = await createWorkflowWork({
    title: `${WORKFLOW_TEST_PREFIX}分解责任人角色错误拒绝`,
    type: 'TODO',
    status: 'PENDING_DECOMPOSE',
    creator: vp,
    dept: deptA,
    vp,
    president,
    responsiblePersonUserId: null,
  });
  const wrongPersonRoleDecompose = await runWorkflowStep(baseUrl, loginByUsername, 'dept_manager_a1', wrongPersonRoleDecomposeId, {
    ...decomposePayloadBase,
    responsiblePersonUserId: userByUsername.dept_leader_a.id,
    responsibleLeaderUserId: userByUsername.dept_leader_a.id,
    responsiblePerson: userByUsername.dept_leader_a.name,
    responsibleLeader: userByUsername.dept_leader_a.name,
  });

  const wrongLeaderRoleDecomposeId = await createWorkflowWork({
    title: `${WORKFLOW_TEST_PREFIX}分解责任领导角色错误拒绝`,
    type: 'TODO',
    status: 'PENDING_DECOMPOSE',
    creator: vp,
    dept: deptA,
    vp,
    president,
    responsiblePersonUserId: null,
  });
  const wrongLeaderRoleDecompose = await runWorkflowStep(baseUrl, loginByUsername, 'dept_manager_a1', wrongLeaderRoleDecomposeId, {
    ...decomposePayloadBase,
    responsiblePersonUserId: manager.id,
    responsibleLeaderUserId: manager.id,
    responsiblePerson: manager.name,
    responsibleLeader: manager.name,
  });

  record({
    role: 'workflow',
    endpoint: 'POST /api/works/[id]/workflow decompose rejects wrong responsible user roles',
    actual: { wrongPersonRoleDecompose, wrongLeaderRoleDecompose },
    expected: {
      wrongPersonRoleDecompose: {
        statusCode: 400,
        success: false,
        work: {
          status: 'PENDING_DECOMPOSE',
          beforeApprovalStatus: null,
          approvalType: null,
          currentApproverId: null,
          currentApproverRole: null,
          rejectedFromStatus: null,
        },
        record: null,
      },
      wrongLeaderRoleDecompose: {
        statusCode: 400,
        success: false,
        work: {
          status: 'PENDING_DECOMPOSE',
          beforeApprovalStatus: null,
          approvalType: null,
          currentApproverId: null,
          currentApproverRole: null,
          rejectedFromStatus: null,
        },
        record: null,
      },
    },
    note: 'PR112: workflow API enforces the same responsible leader/person role split as the UI.',
  });

  const adminPersonCreateResponse = await request(baseUrl, 'POST', '/api/works', {
    type: 'MAIN',
    departmentId: deptA.id,
    title: `${WORKFLOW_TEST_PREFIX}创建责任人为管理员拒绝`,
    workItem: `${WORKFLOW_TEST_PREFIX}创建责任人为管理员拒绝`,
    proposedLeaderId: vp.id,
    approvalLeaderId: vp.id,
    responsiblePersonUserId: tempAdmin.id,
    planCompleteTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  }, loginByUsername.dept_manager_a1.cookies);
  const adminPersonCreated = await prisma.workItem.findFirst({
    where: { title: `${WORKFLOW_TEST_PREFIX}创建责任人为管理员拒绝` },
  });

  const adminPersonDecomposeId = await createWorkflowWork({
    title: `${WORKFLOW_TEST_PREFIX}分解责任人为管理员拒绝`,
    type: 'TODO',
    status: 'PENDING_DECOMPOSE',
    creator: vp,
    dept: deptA,
    vp,
    president,
    responsiblePersonUserId: null,
  });
  const adminPersonDecompose = await runWorkflowStep(baseUrl, loginByUsername, 'dept_manager_a1', adminPersonDecomposeId, {
    ...decomposePayloadBase,
    responsiblePersonUserId: tempAdmin.id,
    responsibleLeaderUserId: userByUsername.dept_leader_a.id,
    responsiblePerson: tempAdmin.name,
    responsibleLeader: userByUsername.dept_leader_a.name,
  });

  record({
    role: 'workflow',
    endpoint: 'responsiblePersonUserId rejects same-department global roles',
    actual: {
      createStatusCode: adminPersonCreateResponse.statusCode,
      createPersisted: Boolean(adminPersonCreated),
      adminPersonDecompose,
    },
    expected: {
      createStatusCode: 400,
      createPersisted: false,
      adminPersonDecompose: {
        statusCode: 400,
        success: false,
        work: {
          status: 'PENDING_DECOMPOSE',
          beforeApprovalStatus: null,
          approvalType: null,
          currentApproverId: null,
          currentApproverRole: null,
          rejectedFromStatus: null,
        },
        record: null,
      },
    },
    note: 'PR112 review: responsible persons must be operable department manager users, not ADMIN/SUPERVISOR even when departmentId matches.',
  });

  const clearLeaderAdjustmentId = await createWorkflowWork({
    title: `${WORKFLOW_TEST_PREFIX}调整换部门清空责任领导`,
    type: 'MAIN',
    status: 'IN_PROGRESS',
    creator: manager,
    dept: deptA,
    vp,
    president,
    responsibleLeaderUserId: userByUsername.dept_leader_a.id,
    responsiblePersonUserId: manager.id,
  });
  const clearLeaderAdjustment = await runWorkflowStep(baseUrl, loginByUsername, 'dept_manager_a1', clearLeaderAdjustmentId, {
    action: 'adjust',
    adjustReason: 'target-contract clear leader while changing department',
    pendingAdjustment: {
      departmentId: deptB.id,
      responsibleLeaderUserId: null,
      responsiblePersonUserId: deptBManager.id,
    },
  });

  record({
    role: 'workflow',
    endpoint: 'POST /api/works/[id]/workflow adjustment allows clearing leader while changing department',
    actual: { clearLeaderAdjustment },
    expected: {
      clearLeaderAdjustment: {
        statusCode: 204,
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
    },
    note: 'PR112 review: explicit responsibleLeaderUserId=null means clear optional leader, not retain and revalidate the old department leader.',
  });

  const inactiveBeforeFinalApproveId = await createWorkflowWork({
    title: `${WORKFLOW_TEST_PREFIX}最终审批重校验责任人`,
    type: 'MAIN',
    status: 'DRAFT',
    creator: manager,
    dept: deptA,
    vp,
    president,
    responsiblePersonUserId: manager.id,
  });
  const inactiveBeforeFinalSubmit = await runWorkflowStep(baseUrl, loginByUsername, 'dept_manager_a1', inactiveBeforeFinalApproveId, {
    action: 'submit',
  });
  const inactiveBeforeFinalDeptApprove = await runWorkflowStep(baseUrl, loginByUsername, 'dept_leader_a', inactiveBeforeFinalApproveId, {
    action: 'approve',
  });
  await prisma.user.update({ where: { id: manager.id }, data: { isActive: false } });
  const inactiveBeforeFinalCompanyApprove = await runWorkflowStep(baseUrl, loginByUsername, 'vp_a', inactiveBeforeFinalApproveId, {
    action: 'approve',
  });
  await prisma.user.update({ where: { id: manager.id }, data: { isActive: true } });

  record({
    role: 'workflow',
    endpoint: 'POST /api/works/[id]/workflow final approval revalidates responsible person',
    actual: {
      inactiveBeforeFinalSubmit,
      inactiveBeforeFinalDeptApprove,
      inactiveBeforeFinalCompanyApprove,
    },
    expected: {
      inactiveBeforeFinalSubmit: {
        statusCode: 204,
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
      inactiveBeforeFinalDeptApprove: {
        statusCode: 204,
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
      inactiveBeforeFinalCompanyApprove: {
        statusCode: 400,
        success: false,
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
    },
    note: 'PR112 review: final approval must re-read responsiblePersonUserId and reject inactive or invalid handlers before IN_PROGRESS.',
  });

  const responsibleAdjustId = await createWorkflowWork({
    title: `${WORKFLOW_TEST_PREFIX}责任人移交调整`,
    type: 'MAIN',
    status: 'IN_PROGRESS',
    creator: otherManager,
    dept: deptA,
    vp,
    president,
    responsiblePersonUserId: manager.id,
  });
  const creatorAdjust = await runWorkflowStep(baseUrl, loginByUsername, 'dept_manager_a2', responsibleAdjustId, {
    action: 'adjust',
    adjustReason: 'target-contract creator should not adjust',
    pendingAdjustment: { planCompleteTime: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
  });
  const leaderAdjust = await runWorkflowStep(baseUrl, loginByUsername, 'dept_leader_a', responsibleAdjustId, {
    action: 'adjust',
    adjustReason: 'target-contract leader should not adjust',
    pendingAdjustment: { planCompleteTime: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
  });
  const responsibleAdjust = await runWorkflowStep(baseUrl, loginByUsername, 'dept_manager_a1', responsibleAdjustId, {
    action: 'adjust',
    adjustReason: 'target-contract responsible adjusts',
    pendingAdjustment: { planCompleteTime: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
  });

  const responsibleCancelId = await createWorkflowWork({
    title: `${WORKFLOW_TEST_PREFIX}责任人移交取消`,
    type: 'MAIN',
    status: 'IN_PROGRESS',
    creator: otherManager,
    dept: deptA,
    vp,
    president,
    responsiblePersonUserId: manager.id,
  });
  const creatorCancel = await runWorkflowStep(baseUrl, loginByUsername, 'dept_manager_a2', responsibleCancelId, {
    action: 'cancel',
    cancelReason: 'target-contract creator should not cancel',
  });
  const responsibleCancel = await runWorkflowStep(baseUrl, loginByUsername, 'dept_manager_a1', responsibleCancelId, {
    action: 'cancel',
    cancelReason: 'target-contract responsible cancels',
  });

  const responsibleCompleteId = await createWorkflowWork({
    title: `${WORKFLOW_TEST_PREFIX}责任人移交完成`,
    type: 'TODO',
    status: 'IN_PROGRESS',
    creator: otherManager,
    dept: deptA,
    vp,
    president,
    responsiblePersonUserId: manager.id,
  });
  const creatorComplete = await runWorkflowStep(baseUrl, loginByUsername, 'dept_manager_a2', responsibleCompleteId, {
    action: 'complete',
    proof: 'target-contract creator should not complete',
  });
  const responsibleComplete = await runWorkflowStep(baseUrl, loginByUsername, 'dept_manager_a1', responsibleCompleteId, {
    action: 'complete',
    proof: 'target-contract responsible completes',
  });

  record({
    role: 'workflow',
    endpoint: 'POST /api/works/[id]/workflow IN_PROGRESS operation belongs to responsiblePersonUserId',
    actual: {
      creatorAdjust,
      leaderAdjust,
      responsibleAdjust,
      creatorCancel,
      responsibleCancel,
      creatorComplete,
      responsibleComplete,
    },
    expected: {
      creatorAdjust: {
        statusCode: 403,
        success: false,
        work: {
          status: 'IN_PROGRESS',
          beforeApprovalStatus: null,
          approvalType: null,
          currentApproverId: null,
          currentApproverRole: null,
          rejectedFromStatus: null,
        },
        record: null,
      },
      leaderAdjust: {
        statusCode: 403,
        success: false,
        work: {
          status: 'IN_PROGRESS',
          beforeApprovalStatus: null,
          approvalType: null,
          currentApproverId: null,
          currentApproverRole: null,
          rejectedFromStatus: null,
        },
        record: null,
      },
      responsibleAdjust: {
        statusCode: 204,
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
      creatorCancel: {
        statusCode: 403,
        success: false,
        work: {
          status: 'IN_PROGRESS',
          beforeApprovalStatus: null,
          approvalType: null,
          currentApproverId: null,
          currentApproverRole: null,
          rejectedFromStatus: null,
        },
        record: null,
      },
      responsibleCancel: {
        statusCode: 204,
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
      creatorComplete: {
        statusCode: 403,
        success: false,
        work: {
          status: 'IN_PROGRESS',
          beforeApprovalStatus: null,
          approvalType: null,
          currentApproverId: null,
          currentApproverRole: null,
          rejectedFromStatus: null,
        },
        record: null,
      },
      responsibleComplete: {
        statusCode: 204,
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
    },
    note: 'PR112: after proposal approval, creator/firstSubmitter and same-department leaders do not keep IN_PROGRESS operation rights.',
  });

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
        statusCode: 204,
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
        statusCode: 204,
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
        statusCode: 204,
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
        statusCode: 204,
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
        statusCode: 204,
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
    ...decomposePayloadBase,
    responsiblePersonUserId: manager.id,
    responsibleLeaderUserId: userByUsername.dept_leader_a.id,
    responsiblePerson: manager.name,
    responsibleLeader: userByUsername.dept_leader_a.name,
  });
  const decomposeDeptApprove = await runWorkflowStep(baseUrl, loginByUsername, 'dept_leader_a', decomposeApproveId, { action: 'approve' });
  const decomposeCompanyApprove = await runWorkflowStep(baseUrl, loginByUsername, 'vp_a', decomposeApproveId, { action: 'approve' });

  record({
    role: 'workflow',
    endpoint: 'POST /api/works/[id]/workflow PENDING_DECOMPOSE -> PROPOSING -> IN_PROGRESS',
    actual: { decomposeSubmit, decomposeDeptApprove, decomposeCompanyApprove },
    expected: {
      decomposeSubmit: {
        statusCode: 204,
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
        statusCode: 204,
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
        statusCode: 204,
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
    ...decomposePayloadBase,
    responsiblePersonUserId: manager.id,
    responsibleLeaderUserId: userByUsername.dept_leader_a.id,
    responsiblePerson: manager.name,
    responsibleLeader: userByUsername.dept_leader_a.name,
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
        statusCode: 204,
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
        statusCode: 204,
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
    pendingAdjustment: { planCompleteTime: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
  });
  const adjustDeptApprove = await runWorkflowStep(baseUrl, loginByUsername, 'dept_leader_a', adjustApproveId, { action: 'approve' });
  const adjustCompanyApprove = await runWorkflowStep(baseUrl, loginByUsername, 'vp_a', adjustApproveId, { action: 'approve' });

  record({
    role: 'workflow',
    endpoint: 'POST /api/works/[id]/workflow IN_PROGRESS -> ADJUSTING -> IN_PROGRESS',
    actual: { adjustSubmit, adjustDeptApprove, adjustCompanyApprove },
    expected: {
      adjustSubmit: {
        statusCode: 204,
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
        statusCode: 204,
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
        statusCode: 204,
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
    pendingAdjustment: { planCompleteTime: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
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
        statusCode: 204,
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
        statusCode: 204,
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
        statusCode: 204,
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
        statusCode: 204,
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
        statusCode: 204,
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
        statusCode: 204,
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
        statusCode: 204,
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
        statusCode: 204,
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
        statusCode: 204,
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
        statusCode: 204,
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
        statusCode: 204,
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
    endpoint: 'POST /api/works/[id]/workflow DRAFT -> CANCELLED (rejected)',
    actual: { draftCancel },
    expected: {
      draftCancel: {
        statusCode: 400,
        success: false,
        work: {
          status: 'DRAFT',
          beforeApprovalStatus: null,
          approvalType: null,
          currentApproverId: null,
          currentApproverRole: null,
          rejectedFromStatus: null,
        },
        record: null,
      },
    },
    note: 'Commit 81c6d90: DRAFT cancellation path removed. Only IN_PROGRESS items can be cancelled via workflow. DRAFT items use DELETE /api/works/[id] instead.',
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
        statusCode: 204,
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
        statusCode: 204,
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
        statusCode: 204,
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
        statusCode: 204,
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
      assessmentYear: TARGET_ASSESSMENT_YEAR,
      departmentId: deptByCode.TDA.id,
      creatorId: userByUsername.dept_manager_a2.id,
      firstSubmitterId: userByUsername.dept_manager_a1.id,
      proposedLeaderId: userByUsername.vp_a.id,
      approvalLeaderId: userByUsername.vp_a.id,
      rejectReason: 'target-contract returned draft',
      rejectedFromStatus: 'PROPOSING',
      planCompleteTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  const returnedInProgress = await prisma.workItem.create({
    data: {
      type: 'MAIN',
      title: 'TC-STATE-returned-in-progress-responsible-user',
      workItem: 'TC-STATE-returned-in-progress-responsible-user',
      status: 'IN_PROGRESS',
      assessmentYear: TARGET_ASSESSMENT_YEAR,
      departmentId: deptByCode.TDA.id,
      creatorId: userByUsername.dept_manager_a2.id,
      firstSubmitterId: userByUsername.dept_manager_a2.id,
      responsiblePersonUserId: userByUsername.dept_manager_a1.id,
      proposedLeaderId: userByUsername.vp_a.id,
      approvalLeaderId: userByUsername.vp_a.id,
      rejectReason: 'target-contract returned in progress',
      rejectedFromStatus: 'ADJUSTING',
      planCompleteTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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

  const handlingCreatorResponse = await request(baseUrl, 'GET', '/api/works?status=handling', null, loginByUsername.dept_manager_a2.cookies);
  const handlingCreatorIds = Array.isArray(handlingCreatorResponse.body)
    ? handlingCreatorResponse.body.map((item) => item.id)
    : [];
  const handlingFirstSubmitterResponse = await request(baseUrl, 'GET', '/api/works?status=handling', null, loginByUsername.dept_manager_a1.cookies);
  const handlingFirstSubmitterIds = Array.isArray(handlingFirstSubmitterResponse.body)
    ? handlingFirstSubmitterResponse.body.map((item) => item.id)
    : [];
  record({
    role: 'dept_manager_a1/dept_manager_a2',
    endpoint: 'GET /api/works status=handling returned DRAFT uses creatorId',
    actual: {
      creatorStatusCode: handlingCreatorResponse.statusCode,
      firstSubmitterStatusCode: handlingFirstSubmitterResponse.statusCode,
      creatorContainsReturnedDraft: handlingCreatorIds.includes(returnedDraft.id),
      firstSubmitterContainsReturnedDraft: handlingFirstSubmitterIds.includes(returnedDraft.id),
    },
    expected: {
      creatorStatusCode: 200,
      firstSubmitterStatusCode: 200,
      creatorContainsReturnedDraft: true,
      firstSubmitterContainsReturnedDraft: false,
    },
    expectedFailure: false,
    note: 'DRAFT handling belongs to creatorId; firstSubmitterId does not grant handling permission.',
  });

  const responsibleHandlingResponse = await request(baseUrl, 'GET', '/api/works?status=handling', null, loginByUsername.dept_manager_a1.cookies);
  const responsibleHandlingIds = Array.isArray(responsibleHandlingResponse.body)
    ? responsibleHandlingResponse.body.map((item) => item.id)
    : [];
  const firstSubmitterHandlingResponse = await request(baseUrl, 'GET', '/api/works?status=handling', null, loginByUsername.dept_manager_a2.cookies);
  const firstSubmitterHandlingIds = Array.isArray(firstSubmitterHandlingResponse.body)
    ? firstSubmitterHandlingResponse.body.map((item) => item.id)
    : [];
  record({
    role: 'dept_manager_a1/dept_manager_a2',
    endpoint: 'GET /api/works status=handling returned IN_PROGRESS uses responsiblePersonUserId',
    actual: {
      responsibleStatusCode: responsibleHandlingResponse.statusCode,
      firstSubmitterStatusCode: firstSubmitterHandlingResponse.statusCode,
      responsibleContainsReturnedInProgress: responsibleHandlingIds.includes(returnedInProgress.id),
      firstSubmitterContainsReturnedInProgress: firstSubmitterHandlingIds.includes(returnedInProgress.id),
    },
    expected: {
      responsibleStatusCode: 200,
      firstSubmitterStatusCode: 200,
      responsibleContainsReturnedInProgress: true,
      firstSubmitterContainsReturnedInProgress: false,
    },
    expectedFailure: false,
    note: 'PR112: returned IN_PROGRESS handling follows responsiblePersonUserId, not firstSubmitterId or creatorId.',
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

async function verifyMemberEndpoints(baseUrl, loginByUsername, deptByCode, _works) {
  // Clean up leftover members from previous test runs to ensure idempotency
  await prisma.member.deleteMany({ where: { name: 'TC-新成员' } });
  // Unbind any user already bound to existing members (from prior import tests)
  const deptAId = deptByCode.TDA.id;
  const adminCookies = loginByUsername.admin.cookies;

  // 1. GET /api/members?departmentId=xxx — list all active members
  const listResponse = await request(baseUrl, 'GET', `/api/members?departmentId=${deptAId}`, null, adminCookies);
  const memberList = Array.isArray(listResponse.body) ? listResponse.body : [];
  record({
    role: 'admin',
    endpoint: 'GET /api/members?departmentId=TDA',
    actual: {
      statusCode: listResponse.statusCode,
      count: memberList.length,
      allActive: memberList.every((m) => m.isActive),
      allDeptA: memberList.every((m) => m.departmentId === deptAId),
    },
    expected: { statusCode: 200, count: 3, allActive: true, allDeptA: true },
    expectedFailure: false,
    note: 'Issue #56: /api/members returns active members for department.',
  });

  // 2. GET /api/members?departmentId=xxx&isLeader=true
  const leadersResponse = await request(baseUrl, 'GET', `/api/members?departmentId=${deptAId}&isLeader=true`, null, adminCookies);
  const leaders = Array.isArray(leadersResponse.body) ? leadersResponse.body : [];
  record({
    role: 'admin',
    endpoint: 'GET /api/members?departmentId=TDA&isLeader=true',
    actual: {
      statusCode: leadersResponse.statusCode,
      count: leaders.length,
      allLeaders: leaders.every((m) => m.isLeader === true),
    },
    expected: { statusCode: 200, count: 1, allLeaders: true },
    expectedFailure: false,
    note: 'Issue #56: isLeader=true filters to leaders only.',
  });

  // 3. GET /api/members?departmentId=xxx&isLeader=false
  const nonLeadersResponse = await request(baseUrl, 'GET', `/api/members?departmentId=${deptAId}&isLeader=false`, null, adminCookies);
  const nonLeaders = Array.isArray(nonLeadersResponse.body) ? nonLeadersResponse.body : [];
  record({
    role: 'admin',
    endpoint: 'GET /api/members?departmentId=TDA&isLeader=false',
    actual: {
      statusCode: nonLeadersResponse.statusCode,
      count: nonLeaders.length,
      noneLeaders: nonLeaders.every((m) => m.isLeader === false),
    },
    expected: { statusCode: 200, count: 2, noneLeaders: true },
    expectedFailure: false,
    note: 'Issue #56: isLeader=false filters to non-leaders only.',
  });

  // 4. isLeader invalid value → 400
  const invalidResponse = await request(baseUrl, 'GET', `/api/members?departmentId=${deptAId}&isLeader=yes`, null, adminCookies);
  record({
    role: 'admin',
    endpoint: 'GET /api/members?isLeader=invalid',
    actual: { statusCode: invalidResponse.statusCode },
    expected: { statusCode: 400 },
    expectedFailure: false,
    note: 'Issue #56: invalid isLeader returns 400.',
  });

  // 5. POST /api/members — create member
  const createResponse = await request(baseUrl, 'POST', '/api/members', {
    name: 'TC-新成员', departmentId: deptAId, isLeader: false, sortOrder: 99,
  }, adminCookies);
  const createdMember = createResponse.body;
  record({
    role: 'admin',
    endpoint: 'POST /api/members',
    actual: {
      statusCode: createResponse.statusCode,
      name: createdMember?.name,
      departmentId: createdMember?.departmentId,
      isLeader: createdMember?.isLeader,
      userId: createdMember?.userId,
      _error: createResponse.statusCode !== 201 ? (createResponse.body?.error || createResponse.body) : undefined,
    },
    expected: { statusCode: 201, name: 'TC-新成员', departmentId: deptAId, isLeader: false, userId: null },
    expectedFailure: false,
    note: 'Issue #56: POST creates member with optional userId.',
  });

  // 6. PATCH /api/members/[id] — update + bind userId
  const memberId = createdMember?.id;
  const bindResponse = await request(baseUrl, 'PATCH', `/api/members/${memberId}`, {
    userId: loginByUsername.dept_manager_a1.user.id,
  }, adminCookies);
  const boundMember = bindResponse.body;
  record({
    role: 'admin',
    endpoint: 'PATCH /api/members/[id] bind userId',
    actual: {
      statusCode: bindResponse.statusCode,
      userId: boundMember?.userId,
      user: boundMember?.user ? { id: boundMember.user.id } : null,
    },
    expected: {
      statusCode: 200,
      userId: loginByUsername.dept_manager_a1.user.id,
      user: { id: loginByUsername.dept_manager_a1.user.id },
    },
    expectedFailure: false,
    note: 'Issue #56: PATCH binds userId and returns user info.',
  });

  // 7. PATCH /api/members/[id] — unbind
  const unbindResponse = await request(baseUrl, 'PATCH', `/api/members/${memberId}`, {
    userId: null,
  }, adminCookies);
  record({
    role: 'admin',
    endpoint: 'PATCH /api/members/[id] unbind',
    actual: { statusCode: unbindResponse.statusCode, userId: unbindResponse.body?.userId },
    expected: { statusCode: 200, userId: null },
    expectedFailure: false,
    note: 'Issue #56: PATCH with userId=null unbinds.',
  });

  // 8. PATCH /api/members/[id] — deactivate
  const deactivateResponse = await request(baseUrl, 'PATCH', `/api/members/${memberId}`, {
    isActive: false,
  }, adminCookies);
  record({
    role: 'admin',
    endpoint: 'PATCH /api/members/[id] deactivate',
    actual: { statusCode: deactivateResponse.statusCode, isActive: deactivateResponse.body?.isActive },
    expected: { statusCode: 200, isActive: false },
    expectedFailure: false,
    note: 'Issue #56: deactivated members are excluded from GET.',
  });

  // 9. POST /api/members import from user
  const importResponse = await request(baseUrl, 'POST', '/api/members', {
    importFromUserId: loginByUsername.dept_manager_a2.user.id,
    isLeader: false,
    sortOrder: 10,
  }, adminCookies);
  const imported = importResponse.body;
  record({
    role: 'admin',
    endpoint: 'POST /api/members import from user',
    actual: {
      statusCode: importResponse.statusCode,
      name: imported?.name,
      userId: imported?.userId,
      user: imported?.user ? { id: imported.user.id } : null,
    },
    expected: {
      statusCode: 201,
      name: loginByUsername.dept_manager_a2.user.name,
      userId: loginByUsername.dept_manager_a2.user.id,
      user: { id: loginByUsername.dept_manager_a2.user.id },
    },
    expectedFailure: false,
    note: 'Issue #56: importFromUserId auto-fills name and binds userId.',
  });

  // 10. Work item userId persistence in GET /api/works
  const worksResponse = await request(baseUrl, 'GET', '/api/works', null, adminCookies);
  const worksBody = Array.isArray(worksResponse.body) ? worksResponse.body : [];
  const workWithUser = worksBody.find((w) => w.responsibleLeaderUserId != null || w.responsiblePersonUserId != null);
  record({
    role: 'admin',
    endpoint: 'GET /api/works responsibleXxxUserId fields present',
    actual: {
      hasUserIdWork: Boolean(workWithUser),
      responsibleLeaderUserId: workWithUser?.responsibleLeaderUserId,
      responsiblePersonUserId: workWithUser?.responsiblePersonUserId,
    },
    expected: {
      hasUserIdWork: true,
      responsibleLeaderUserId: workWithUser?.responsibleLeaderUserId,
      responsiblePersonUserId: workWithUser?.responsiblePersonUserId,
    },
    expectedFailure: false,
    note: 'Issue #XXX: work items carry responsibleLeaderUserId/responsiblePersonUserId for permission checks.',
  });

  // 11. Cooperator memberId persistence
  const workWithCoopMembers = worksBody.find((w) =>
    Array.isArray(w.cooperators) && w.cooperators.some((c) => c.leaderMemberId != null || c.personMemberId != null)
  );
  const coopSample = workWithCoopMembers?.cooperators?.find((c) => c.personMemberId != null);
  record({
    role: 'admin',
    endpoint: 'GET /api/works cooperator memberId fields present',
    actual: {
      hasCoopWithMemberId: Boolean(workWithCoopMembers),
      leaderMemberIdPresent: Boolean(coopSample),
    },
    expected: {
      hasCoopWithMemberId: true,
      leaderMemberIdPresent: true,
    },
    expectedFailure: false,
    note: 'Issue #56 phase 3: cooperators carry leaderMemberId/personMemberId.',
  });
}

async function verifyDraftDeletion(baseUrl, loginByUsername, deptByCode, userByUsername) {
  const creator = userByUsername.dept_manager_a1;
  const otherManager = userByUsername.dept_manager_a2;
  const vp = userByUsername.vp_a;
  const dept = deptByCode.TDA;

  const returnedDraft = await prisma.workItem.create({
    data: {
      ...workflowBaseData({
        title: `${WORKFLOW_TEST_PREFIX}DELETE-RETURNED`,
        type: 'PRIORITY',
        status: 'DRAFT',
        creator,
        dept,
        vp,
      }),
      firstSubmitterId: otherManager.id,
      // Historical fallback: reject metadata may be absent while workflow history remains.
      rejectReason: null,
      rejectedFromStatus: null,
    },
  });

  await prisma.workflowRecord.create({
    data: {
      workItemId: returnedDraft.id,
      actionType: 'reject',
      initiatorId: creator.id,
      approverId: userByUsername.dept_leader_a.id,
      approvalRole: 'DEPARTMENT_LEADER',
      statusBefore: 'PROPOSING',
      statusAfter: 'DRAFT',
      comment: 'target-contract returned draft',
    },
  });

  const attachmentDir = path.join(
    process.cwd(),
    'uploads',
    'attachments',
    'target-contract',
    String(returnedDraft.id),
  );
  const attachmentPath = path.join(attachmentDir, 'draft-delete.txt');
  fs.mkdirSync(attachmentDir, { recursive: true });
  fs.writeFileSync(attachmentPath, 'target-contract');
  const relativeAttachmentPath = path.relative(process.cwd(), attachmentPath);
  const cleanupPendingPath = path.join(attachmentDir, 'cleanup-pending-directory');
  fs.mkdirSync(cleanupPendingPath);
  const relativeCleanupPendingPath = path.relative(process.cwd(), cleanupPendingPath);

  const successfullyCleanedAttachment = await prisma.attachment.create({
    data: {
      workItemId: returnedDraft.id,
      userId: creator.id,
      fileName: 'draft-delete.txt',
      filePath: relativeAttachmentPath,
      fileSize: 15,
      fileType: 'text/plain',
    },
  });
  const cleanupPendingAttachment = await prisma.attachment.create({
    data: {
      workItemId: returnedDraft.id,
      userId: creator.id,
      fileName: 'cleanup-pending-directory',
      filePath: relativeCleanupPendingPath,
      fileSize: 0,
      fileType: 'test/directory',
    },
  });

  const firstSubmitterDelete = await request(
    baseUrl,
    'DELETE',
    `/api/works/${returnedDraft.id}`,
    null,
    loginByUsername.dept_manager_a2.cookies,
  );
  const supervisorDelete = await request(
    baseUrl,
    'DELETE',
    `/api/works/${returnedDraft.id}`,
    null,
    loginByUsername.supervisor.cookies,
  );
  const creatorDelete = await request(
    baseUrl,
    'DELETE',
    `/api/works/${returnedDraft.id}`,
    null,
    loginByUsername.dept_manager_a1.cookies,
  );

  const creatorDeleteLog = await prisma.operationLog.findFirst({
    where: {
      action: 'delete',
      module: 'works',
      targetId: returnedDraft.id,
      userId: creator.id,
    },
    orderBy: { id: 'desc' },
  });
  const cleanupPendingLog = await prisma.operationLog.findFirst({
    where: {
      action: 'cleanup_pending',
      module: 'attachment',
      targetType: 'work_delete',
      targetId: cleanupPendingAttachment.id,
      userId: creator.id,
    },
    orderBy: { id: 'desc' },
  });
  const cleanupPendingCompletedLog = await prisma.operationLog.findFirst({
    where: {
      action: 'cleanup_completed',
      module: 'attachment',
      targetType: 'work_delete',
      targetId: cleanupPendingAttachment.id,
      userId: creator.id,
    },
    orderBy: { id: 'desc' },
  });
  const successfulCleanupIntentLog = await prisma.operationLog.findFirst({
    where: {
      action: 'cleanup_pending',
      module: 'attachment',
      targetType: 'work_delete',
      targetId: successfullyCleanedAttachment.id,
      userId: creator.id,
    },
    orderBy: { id: 'desc' },
  });
  const successfulCleanupCompletedLog = await prisma.operationLog.findFirst({
    where: {
      action: 'cleanup_completed',
      module: 'attachment',
      targetType: 'work_delete',
      targetId: successfullyCleanedAttachment.id,
      userId: creator.id,
    },
    orderBy: { id: 'desc' },
  });

  record({
    role: 'draft-delete-creator',
    endpoint: 'DELETE /api/works/[id] creator-owned returned DRAFT',
    actual: {
      firstSubmitterStatus: firstSubmitterDelete.statusCode,
      supervisorStatus: supervisorDelete.statusCode,
      creatorStatus: creatorDelete.statusCode,
      workCount: await prisma.workItem.count({ where: { id: returnedDraft.id } }),
      workflowCount: await prisma.workflowRecord.count({ where: { workItemId: returnedDraft.id } }),
      attachmentCount: await prisma.attachment.count({ where: { workItemId: returnedDraft.id } }),
      physicalFileExists: fs.existsSync(attachmentPath),
      cleanupPendingPathExists: fs.existsSync(cleanupPendingPath),
      cleanupPendingLogged: Boolean(
        cleanupPendingLog?.description.includes(relativeCleanupPendingPath),
      ),
      failedCleanupHasNoCompletedLog: !cleanupPendingCompletedLog,
      successfulCleanupIntentLogged: Boolean(
        successfulCleanupIntentLog?.description.includes(relativeAttachmentPath),
      ),
      successfulCleanupCompleted: Boolean(
        successfulCleanupCompletedLog?.description.includes(relativeAttachmentPath),
      ),
      logRetained: Boolean(creatorDeleteLog),
      logHasSnapshot: Boolean(
        creatorDeleteLog?.description.includes(`原事项ID：${returnedDraft.id}`)
        && creatorDeleteLog.description.includes(`创建人：${creator.name}`)
        && creatorDeleteLog.description.includes('退回草稿')
        && creatorDeleteLog.description.includes('流程记录：1')
        && creatorDeleteLog.description.includes('附件：2'),
      ),
    },
    expected: {
      firstSubmitterStatus: 403,
      supervisorStatus: 403,
      creatorStatus: 204,
      workCount: 0,
      workflowCount: 0,
      attachmentCount: 0,
      physicalFileExists: false,
      cleanupPendingPathExists: true,
      cleanupPendingLogged: true,
      failedCleanupHasNoCompletedLog: true,
      successfulCleanupIntentLogged: true,
      successfulCleanupCompleted: true,
      logRetained: true,
      logHasSnapshot: true,
    },
    expectedFailure: false,
    note: 'DRAFT ownership uses creatorId; cleanup_pending intents commit with deletion, successful unlinks append cleanup_completed, failed unlinks remain pending, and the independent deletion log is retained.',
  });

  fs.rmSync(attachmentDir, { recursive: true, force: true });

  const adminDraftId = await createWorkflowWork({
    title: `${WORKFLOW_TEST_PREFIX}DELETE-ADMIN-DRAFT`,
    type: 'MAIN',
    status: 'DRAFT',
    creator,
    dept,
    vp,
  });
  const adminDraftDelete = await request(
    baseUrl,
    'DELETE',
    `/api/works/${adminDraftId}`,
    null,
    loginByUsername.admin.cookies,
  );
  const adminDeleteLog = await prisma.operationLog.findFirst({
    where: {
      action: 'delete',
      module: 'works',
      targetId: adminDraftId,
      userId: userByUsername.admin.id,
    },
  });

  const inProgressId = await createWorkflowWork({
    title: `${WORKFLOW_TEST_PREFIX}DELETE-ADMIN-IN-PROGRESS`,
    type: 'MAIN',
    status: 'IN_PROGRESS',
    creator,
    dept,
    vp,
  });
  const adminInProgressDelete = await request(
    baseUrl,
    'DELETE',
    `/api/works/${inProgressId}`,
    null,
    loginByUsername.admin.cookies,
  );

  record({
    role: 'draft-delete-admin',
    endpoint: 'DELETE /api/works/[id] ADMIN DRAFT-only override',
    actual: {
      draftStatus: adminDraftDelete.statusCode,
      draftCount: await prisma.workItem.count({ where: { id: adminDraftId } }),
      logRetained: Boolean(adminDeleteLog),
      inProgressStatus: adminInProgressDelete.statusCode,
      inProgressCount: await prisma.workItem.count({ where: { id: inProgressId } }),
    },
    expected: {
      draftStatus: 204,
      draftCount: 0,
      logRetained: true,
      inProgressStatus: 409,
      inProgressCount: 1,
    },
    expectedFailure: false,
    note: 'ADMIN may delete another user’s DRAFT but may not delete any non-DRAFT item.',
  });
}

async function main() {
  const { baseUrl } = parseArgs();
  printEnvironmentSummary('[target-contract-verify]');
  assertLocalOrTestEnvironment();
  assertSafeDatabaseUrl();
  assertSafeBaseUrl(baseUrl);
  console.log(`[target-contract-verify] baseUrl=${baseUrl}`);
  console.log('[target-contract-verify] cleaning up leftover workflow contract data...');
  await cleanupWorkflowContractWorks();
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
  await verifyMemberEndpoints(baseUrl, loginByUsername, deptByCode, works);
  await verifyWorksVisibility(baseUrl, loginByUsername, userByUsername, works);
  await verifyTargetPermissionFacts(baseUrl, loginByUsername, works);
  await verifyCompletionRate(baseUrl, loginByUsername, deptByCode, works);
  await verifyExcelExport(baseUrl, loginByUsername, userByUsername, works);
  await verifyExcelImport(baseUrl, loginByUsername, deptByCode, userByUsername);
  await verifyWorkItemOptionsAndBatchDrafts(baseUrl, loginByUsername, deptByCode, userByUsername);
  await verifyWorkflowTransitions(baseUrl, loginByUsername, deptByCode, userByUsername);
  await verifyStateFilters(baseUrl, loginByUsername, deptByCode, userByUsername);
  await verifyDraftDeletion(baseUrl, loginByUsername, deptByCode, userByUsername);

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
