require('dotenv').config();

const http = require('http');
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
  await verifyWorksVisibility(baseUrl, loginByUsername, userByUsername, works);
  await verifyTargetPermissionFacts(baseUrl, loginByUsername, works);
  await verifyCompletionRate(baseUrl, loginByUsername, deptByCode, works);

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
