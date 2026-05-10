const http = require('http');
const { PrismaClient } = require('@prisma/client');

const BASE_URL = process.env.REGRESSION_BASE_HOST || 'localhost';
const PORT = Number(process.env.REGRESSION_BASE_PORT || 5000);
const RUN_ID = `Regression-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const prisma = new PrismaClient();

const results = [];
const createdWorkIds = [];

function request(method, path, data = null, cookies = []) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: BASE_URL,
        port: PORT,
        path,
        method,
        headers: {
          Cookie: cookies.join('; '),
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString();
          let body = raw;
          try {
            body = raw ? JSON.parse(raw) : null;
          } catch {
            // Keep non-JSON responses as text.
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body,
            cookies: res.headers['set-cookie'] || [],
          });
        });
      }
    );

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function login(username, password = '123456') {
  const res = await request('POST', '/api/auth/login', { username, password });
  return {
    success: res.statusCode === 200 && Boolean(res.body?.success),
    cookies: res.cookies,
    user: res.body?.user,
  };
}

function assert(name, condition, detail = '') {
  results.push({ name, passed: Boolean(condition), detail });
  const marker = condition ? 'PASS' : 'FAIL';
  console.log(`[${marker}] ${name}${detail ? ` - ${detail}` : ''}`);
}

function assertStatus(name, response, expectedStatus) {
  assert(
    name,
    response.body?.status === expectedStatus,
    `expected=${expectedStatus}, actual=${response.body?.status}`
  );
}

function responseSummary(response) {
  return JSON.stringify({
    statusCode: response.statusCode,
    success: response.body?.success,
    status: response.body?.status,
    error: response.body?.error,
    workItemStatus: response.body?.workItem?.status,
    currentApproverRole: response.body?.currentApproverRole ?? response.body?.workItem?.currentApproverRole,
  });
}

function workflowWorkResponse(response) {
  return {
    statusCode: response.statusCode,
    body: response.body?.workItem,
  };
}

async function getWork(id, cookies) {
  return request('GET', `/api/works/${id}`, null, cookies);
}

async function createWork(cookies, data) {
  const res = await request('POST', '/api/works', data, cookies);
  if (res.body?.id) createdWorkIds.push(res.body.id);
  return res;
}

async function workflow(id, cookies, action, extra = {}) {
  return request('POST', `/api/works/${id}/workflow`, { action, ...extra }, cookies);
}

async function cleanup(cookies) {
  for (const id of createdWorkIds.reverse()) {
    await request('DELETE', `/api/works/${id}`, null, cookies).catch(() => null);
  }
}

async function main() {
  console.log(`[${RUN_ID}] 9-state regression baseline started`);

  const admin = await login('admin');
  const president = await login('president');
  const vicePresident = await login('vp_a');
  const deptLeader = await login('dept_leader_a');
  const deptManager = await login('dept_manager_a1');

  assert('admin login', admin.success);
  assert('president login', president.success);
  assert('vice president login', vicePresident.success);
  assert('department leader login', deptLeader.success);
  assert('department manager login', deptManager.success);

  if (!admin.success || !president.success || !vicePresident.success || !deptLeader.success || !deptManager.success) {
    throw new Error('Required regression accounts are unavailable.');
  }

  const departmentId = deptManager.user?.departmentId;
  assert('department resolved', Boolean(departmentId), `departmentId=${departmentId}`);

  try {
    const todo = await createWork(deptManager.cookies, {
      type: 'todo',
      title: `${RUN_ID} todo proposal`,
      workItem: `${RUN_ID} todo proposal`,
      departmentId,
      proposedLeaderId: vicePresident.user.id,
      planCompleteTime: '2026-12-31',
    });
    assert('department manager creates todo draft', Boolean(todo.body?.id), `id=${todo.body?.id}`);

    await workflow(todo.body.id, deptManager.cookies, 'submit');
    let todoState = await getWork(todo.body.id, deptManager.cookies);
    assertStatus('todo submit enters PROPOSING', todoState, 'PROPOSING');
    assert('todo proposal stores beforeApprovalStatus', todoState.body?.beforeApprovalStatus === 'DRAFT');
    assert('todo proposal stores approvalType', todoState.body?.approvalType === 'PROPOSE');

    await workflow(todo.body.id, deptLeader.cookies, 'approve');
    todoState = await getWork(todo.body.id, deptManager.cookies);
    assertStatus('department approval keeps PROPOSING', todoState, 'PROPOSING');
    assert('company approver is selected', todoState.body?.currentApproverId === vicePresident.user.id);

    await workflow(todo.body.id, vicePresident.cookies, 'approve');
    todoState = await getWork(todo.body.id, deptManager.cookies);
    assertStatus('final proposal approval enters IN_PROGRESS', todoState, 'IN_PROGRESS');
    assert('proposal helper fields are cleared', !todoState.body?.beforeApprovalStatus && !todoState.body?.approvalType);

    await workflow(todo.body.id, deptManager.cookies, 'evidence', {
      proof: `${RUN_ID} completed`,
      comment: 'complete request',
    });
    todoState = await getWork(todo.body.id, deptManager.cookies);
    assertStatus('completion request enters COMPLETING', todoState, 'COMPLETING');
    assert('completion approvalType is COMPLETE', todoState.body?.approvalType === 'COMPLETE');

    await workflow(todo.body.id, vicePresident.cookies, 'approve');
    todoState = await getWork(todo.body.id, deptManager.cookies);
    assertStatus('completion approval enters COMPLETED', todoState, 'COMPLETED');

    const returned = await createWork(deptManager.cookies, {
      type: 'priority',
      title: `${RUN_ID} returned draft`,
      workItem: `${RUN_ID} returned draft`,
      departmentId,
      completeTime: '2026-12-31',
    });
    assert('department manager creates priority draft', Boolean(returned.body?.id), `id=${returned.body?.id}`);

    await workflow(returned.body.id, deptManager.cookies, 'submit');
    await workflow(returned.body.id, deptLeader.cookies, 'reject', {
      rejectReason: `${RUN_ID} needs changes`,
    });
    let returnedState = await getWork(returned.body.id, deptManager.cookies);
    assertStatus('proposal reject returns to DRAFT', returnedState, 'DRAFT');
    assert('returned draft keeps reject trace', Boolean(returnedState.body?.rejectReason || returnedState.body?.rejectedFromStatus));

    await workflow(returned.body.id, deptManager.cookies, 'submit');
    returnedState = await getWork(returned.body.id, deptManager.cookies);
    assertStatus('returned draft resubmits to PROPOSING', returnedState, 'PROPOSING');

    const companyTodo = await createWork(vicePresident.cookies, {
      type: 'todo',
      title: `${RUN_ID} company todo`,
      workItem: `${RUN_ID} company todo`,
      departmentId,
      proposedLeaderId: vicePresident.user.id,
      planCompleteTime: '2026-12-31',
    });
    assert('company leader creates todo draft', Boolean(companyTodo.body?.id), `id=${companyTodo.body?.id}`);

    await workflow(companyTodo.body.id, vicePresident.cookies, 'submit');
    let companyTodoState = await getWork(companyTodo.body.id, vicePresident.cookies);
    assertStatus('company todo submit enters PENDING_DECOMPOSE', companyTodoState, 'PENDING_DECOMPOSE');

    const decomposeSubmit = await workflow(companyTodo.body.id, deptManager.cookies, 'decompose', {
      nodes: [{ title: `${RUN_ID} node`, responsiblePerson: 'owner', planCompleteTime: '2026-12-31' }],
      comment: 'decomposed',
    });
    assert('department manager submits decomposition', decomposeSubmit.statusCode === 200 && decomposeSubmit.body?.success, responseSummary(decomposeSubmit));
    companyTodoState = workflowWorkResponse(decomposeSubmit);
    assertStatus('decompose enters PROPOSING', companyTodoState, 'PROPOSING');
    assert('decompose beforeApprovalStatus is PENDING_DECOMPOSE', companyTodoState.body?.beforeApprovalStatus === 'PENDING_DECOMPOSE');

    const decomposeReject = await workflow(companyTodo.body.id, deptLeader.cookies, 'reject', {
      rejectReason: `${RUN_ID} decompose rejected`,
    });
    assert('department leader rejects decomposition', decomposeReject.statusCode === 200 && decomposeReject.body?.success, responseSummary(decomposeReject));
    companyTodoState = workflowWorkResponse(decomposeReject);
    assertStatus('decompose reject returns to PENDING_DECOMPOSE', companyTodoState, 'PENDING_DECOMPOSE');

    const priority = await createWork(deptManager.cookies, {
      type: 'priority',
      title: `${RUN_ID} priority cancel`,
      workItem: `${RUN_ID} priority cancel`,
      departmentId,
      completeTime: '2026-12-31',
    });
    assert('department manager creates priority for cancel', Boolean(priority.body?.id), `id=${priority.body?.id}`);

    await workflow(priority.body.id, deptManager.cookies, 'submit');
    await workflow(priority.body.id, deptLeader.cookies, 'approve');
    await workflow(priority.body.id, vicePresident.cookies, 'approve');
    await prisma.workItem.update({
      where: { id: priority.body.id },
      data: { needMainLeaderCancel: true },
    });
    let priorityState = await getWork(priority.body.id, deptManager.cookies);
    assertStatus('priority proposal approval enters IN_PROGRESS', priorityState, 'IN_PROGRESS');

    await workflow(priority.body.id, deptManager.cookies, 'cancel', {
      cancelReason: `${RUN_ID} cancel`,
    });
    priorityState = await getWork(priority.body.id, deptManager.cookies);
    assertStatus('priority cancel request enters CANCELLING', priorityState, 'CANCELLING');
    assert('cancel approvalType is CANCEL', priorityState.body?.approvalType === 'CANCEL');

    await workflow(priority.body.id, deptLeader.cookies, 'approve');
    priorityState = await getWork(priority.body.id, deptManager.cookies);
    assertStatus('department cancel approval keeps CANCELLING', priorityState, 'CANCELLING');

    await workflow(priority.body.id, vicePresident.cookies, 'approve');
    priorityState = await getWork(priority.body.id, deptManager.cookies);
    assertStatus('main leader cancel node keeps CANCELLING', priorityState, 'CANCELLING');
    assert('main leader approver role is PRESIDENT', priorityState.body?.currentApproverRole === 'PRESIDENT');

    await workflow(priority.body.id, president.cookies, 'approve');
    priorityState = await getWork(priority.body.id, deptManager.cookies);
    assertStatus('priority cancel final approval enters CANCELLED', priorityState, 'CANCELLED');

    const legacyStatusFilter = await request('GET', '/api/works?status=APPROVED', null, admin.cookies);
    assert('legacy status filter is rejected', legacyStatusFilter.statusCode === 400, `statusCode=${legacyStatusFilter.statusCode}`);

    const inProgressFilter = await request('GET', '/api/works?status=inProgress', null, admin.cookies);
    const statuses = Array.isArray(inProgressFilter.body)
      ? Array.from(new Set(inProgressFilter.body.map((work) => work.status))).sort()
      : [];
    assert('inProgress filter only returns IN_PROGRESS', inProgressFilter.statusCode === 200 && statuses.every((status) => status === 'IN_PROGRESS'), statuses.join(','));
  } finally {
    await cleanup(admin.cookies);
  }

  const failed = results.filter((result) => !result.passed);
  console.log();
  console.log(`[${RUN_ID}] summary: ${results.length - failed.length} passed, ${failed.length} failed`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
