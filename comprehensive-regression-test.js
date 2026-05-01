const http = require('http');
const FormData = require('form-data');

const BASE_URL = 'localhost';
const PORT = 5000;

function request(method, path, data = null, cookies = [], headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Cookie': cookies.join('; '),
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = [];
      res.on('data', (chunk) => body.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(body);
        let responseBody;
        try {
          responseBody = JSON.parse(buffer.toString());
        } catch (e) {
          responseBody = buffer;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: responseBody,
          cookies: res.headers['set-cookie'] || []
        });
      });
    });

    req.on('error', (e) => reject(e));

    if (data) {
      if (typeof data === 'string' || Buffer.isBuffer(data)) {
        req.write(data);
      } else {
        req.write(JSON.stringify(data));
      }
    }
    req.end();
  });
}

async function login(username, password) {
  const res = await request('POST', '/api/auth/login', { username, password });
  return {
    success: res.statusCode === 200 && res.body?.success,
    cookies: res.cookies,
    user: res.body?.user
  };
}

async function createWork(type, title, deptId, proposedLeaderId, approvalLeaderId, creatorCookies) {
  const res = await request('POST', '/api/works', {
    type,
    workItem: title,
    title: title,
    departmentId: deptId,
    proposedLeaderId,
    approvalLeaderId
  }, creatorCookies);
  return res.body?.id;
}

async function runComprehensiveTests() {
  console.log('='.repeat(100));
  console.log('公司督办管理系统 - 全系统完整真实回归测试');
  console.log('='.repeat(100));
  console.log();

  const testResults = {
    passed: 0,
    failed: 0,
    codeCheckOnly: 0,
    untested: 0,
    details: []
  };

  function logTest(name, passed, message, type = 'real') {
    const symbol = type === 'real' ? (passed ? '✅' : '❌') : (type === 'code' ? '📝' : '⏸️');
    console.log(`  ${symbol} ${name}${message ? `: ${message}` : ''}`);
    if (type === 'real' && passed) testResults.passed++;
    else if (type === 'real' && !passed) testResults.failed++;
    else if (type === 'code') testResults.codeCheckOnly++;
    else if (type === 'untested') testResults.untested++;
    testResults.details.push({ name, passed, message, type });
  }

  function printFailedDetails(context, response) {
    console.log(`    Context: ${context}`);
    console.log(`    Status: ${response.statusCode}`);
    console.log(`    Body: ${JSON.stringify(response.body)}`);
  }

  // --------------------
  // 阶段 1: 登录
  // --------------------
  console.log('【阶段 1】登录所有测试账号');
  const adminLogin = await login('admin', '123456');
  logTest('admin 登录', adminLogin.success, `ID: ${adminLogin.user?.id}`);

  const supervisorLogin = await login('supervisor', '123456');
  logTest('supervisor 登录', supervisorLogin.success, `ID: ${supervisorLogin.user?.id}`);

  const vicePresidentLogin = await login('vice_president', '123456');
  logTest('vice_president 登录', vicePresidentLogin.success, `ID: ${vicePresidentLogin.user?.id}`);

  const presidentLogin = await login('president', '123456');
  logTest('president 登录', presidentLogin.success, `ID: ${presidentLogin.user?.id}`);

  const deptLeaderLogin = await login('dept_leader', '123456');
  logTest('dept_leader (综合处) 登录', deptLeaderLogin.success, `ID: ${deptLeaderLogin.user?.id}`);

  const deptManagerLogin = await login('dept_manager', '123456');
  logTest('dept_manager (综合处) 登录', deptManagerLogin.success, `ID: ${deptManagerLogin.user?.id}`);

  const deptLeader2Login = await login('dept_leader_2', '123456');
  logTest('dept_leader_2 (计划生产处) 登录', deptLeader2Login.success, `ID: ${deptLeader2Login.user?.id}`);

  const deptManager2Login = await login('dept_manager_2', '123456');
  logTest('dept_manager_2 (计划生产处) 登录', deptManager2Login.success, `ID: ${deptManager2Login.user?.id}`);

  const deptsRes = await request('GET', '/api/departments', null, adminLogin.cookies);
  const zhDept = Array.isArray(deptsRes.body) ? deptsRes.body.find(d => d.code === 'ZH') : null;
  const jhDept = Array.isArray(deptsRes.body) ? deptsRes.body.find(d => d.code === 'JH') : null;
  const zhDeptId = zhDept?.id || 2;
  const jhDeptId = jhDept?.id || 3;

  console.log(`  部门: 综合处=${zhDeptId}, 计划生产处=${jhDeptId}`);
  console.log();

  // --------------------
  // 阶段 2: 待办事项完整流程测试
  // --------------------
  console.log('【阶段 2】待办事项完整流程测试');

  console.log('  2.1 公司领导发起 TODO → 分解 → 部门审批 → 公司审批 → 完成');

  // 公司领导发起的待办：proposedLeaderId = 当前公司领导 user.id，approvalLeaderId = 空
  const todoByVPId = await createWork(
    'TODO',
    'Test-TODO-VP-Create-' + Date.now(),
    zhDeptId,
    vicePresidentLogin.user?.id, // proposedLeaderId
    null, // approvalLeaderId
    vicePresidentLogin.cookies
  );
  logTest('  公司领导创建待办', !!todoByVPId, todoByVPId ? `ID: ${todoByVPId}` : '失败');

  const todoVPSubmitRes = await request('POST', `/api/works/${todoByVPId}/workflow`, {
    action: 'submit'
  }, vicePresidentLogin.cookies);
  logTest('  待办提交审批', todoVPSubmitRes.statusCode === 200 && todoVPSubmitRes.body?.success, todoVPSubmitRes.body?.error || `Status: ${todoVPSubmitRes.statusCode}`);
  if (todoVPSubmitRes.statusCode !== 200) printFailedDetails('待办提交审批', todoVPSubmitRes);

  const todoAfterSubmit = await request('GET', `/api/works/${todoByVPId}`, null, vicePresidentLogin.cookies);
  logTest('  提交后状态 PENDING_DECOMPOSE', todoAfterSubmit.body?.status === 'PENDING_DECOMPOSE', `状态: ${todoAfterSubmit.body?.status}`);

  // 部门领导分解待办 - 正确调用 decompose
  const todoDecomposeRes = await request('POST', `/api/works/${todoByVPId}/workflow`, {
    action: 'decompose',
    nodes: [
      {
        title: '任务分解1',
        responsiblePerson: '部门主管',
        planCompleteTime: '2026-05-20'
      }
    ],
    comment: '部门分解任务'
  }, deptLeaderLogin.cookies);
  logTest('  部门领导分解待办', todoDecomposeRes.statusCode === 200 && todoDecomposeRes.body?.success,
    todoDecomposeRes.body?.error || `Status: ${todoDecomposeRes.statusCode}`);
  if (todoDecomposeRes.statusCode !== 200) printFailedDetails('部门领导分解待办', todoDecomposeRes);

  const todoAfterDecompose = await request('GET', `/api/works/${todoByVPId}`, null, deptLeaderLogin.cookies);
  logTest('  分解后状态 PENDING_COMPANY', todoAfterDecompose.body?.status === 'PENDING_COMPANY', `状态: ${todoAfterDecompose.body?.status}`);

  // 公司领导审批
  const todoVPApprove = await request('POST', `/api/works/${todoByVPId}/workflow`, {
    action: 'approve',
    comment: '公司领导审批'
  }, vicePresidentLogin.cookies);
  logTest('  公司领导审批通过', todoVPApprove.statusCode === 200 && todoVPApprove.body?.success, todoVPApprove.body?.error || `Status: ${todoVPApprove.statusCode}`);
  if (todoVPApprove.statusCode !== 200) printFailedDetails('公司领导审批', todoVPApprove);

  const todoVPAfterApprove = await request('GET', `/api/works/${todoByVPId}`, null, vicePresidentLogin.cookies);
  logTest('  待办状态变为 IN_PROGRESS', todoVPAfterApprove.body?.status === 'IN_PROGRESS', `状态: ${todoVPAfterApprove.body?.status}`);

  // 提交见证材料
  const todoVPEvidence = await request('POST', `/api/works/${todoByVPId}/workflow`, {
    action: 'evidence',
    proof: '已完成所有工作',
    comment: '申请完成'
  }, vicePresidentLogin.cookies);
  logTest('  提交见证材料', todoVPEvidence.statusCode === 200 && todoVPEvidence.body?.success,
    todoVPEvidence.body?.error || `Status: ${todoVPEvidence.statusCode}`);
  if (todoVPEvidence.statusCode !== 200) printFailedDetails('提交见证材料', todoVPEvidence);

  const todoVPAfterEvidence = await request('GET', `/api/works/${todoByVPId}`, null, vicePresidentLogin.cookies);
  logTest('  提交后状态 PENDING_COMPLETE', todoVPAfterEvidence.body?.status === 'PENDING_COMPLETE', `状态: ${todoVPAfterEvidence.body?.status}`);

  // 公司领导审批见证材料
  const todoVPEvidenceApprove = await request('POST', `/api/works/${todoByVPId}/workflow`, {
    action: 'approve',
    comment: '见证材料审批通过'
  }, vicePresidentLogin.cookies);
  logTest('  公司领导审批见证材料', todoVPEvidenceApprove.statusCode === 200 && todoVPEvidenceApprove.body?.success,
    todoVPEvidenceApprove.body?.error || `Status: ${todoVPEvidenceApprove.statusCode}`);
  if (todoVPEvidenceApprove.statusCode !== 200) printFailedDetails('公司领导审批见证材料', todoVPEvidenceApprove);

  const todoVPFinal = await request('GET', `/api/works/${todoByVPId}`, null, vicePresidentLogin.cookies);
  logTest('  待办最终状态 COMPLETED', todoVPFinal.body?.status === 'COMPLETED', `状态: ${todoVPFinal.body?.status}`);

  console.log('  2.2 部门主管发起 TODO → 部门审批 → 公司审批 → 完成');

  // 部门主管发起的待办：approvalLeaderId = 指定公司领导 user.id，proposedLeaderId = 空
  const todoByMgrId = await createWork(
    'TODO',
    'Test-TODO-Mgr-Create-' + Date.now(),
    zhDeptId,
    null, // proposedLeaderId
    vicePresidentLogin.user?.id, // approvalLeaderId
    deptManagerLogin.cookies
  );
  logTest('  部门主管创建待办', !!todoByMgrId, todoByMgrId ? `ID: ${todoByMgrId}` : '失败');

  await request('POST', `/api/works/${todoByMgrId}/workflow`, { action: 'submit' }, deptManagerLogin.cookies);

  const todoMgrAfterSubmit = await request('GET', `/api/works/${todoByMgrId}`, null, deptManagerLogin.cookies);
  logTest('  部门发起待办提交后状态 PENDING_DEPT', todoMgrAfterSubmit.body?.status === 'PENDING_DEPT', `状态: ${todoMgrAfterSubmit.body?.status}`);

  await request('POST', `/api/works/${todoByMgrId}/workflow`, { action: 'approve' }, deptLeaderLogin.cookies);
  const todoMgrCoApprove = await request('POST', `/api/works/${todoByMgrId}/workflow`, { action: 'approve' }, vicePresidentLogin.cookies);
  logTest('  部门发起待办进入 IN_PROGRESS', todoMgrCoApprove.statusCode === 200, `Status: ${todoMgrCoApprove.statusCode}`);

  console.log('  2.3 TODO 取消流程');

  const todoForCancelId = await createWork(
    'TODO',
    'Test-TODO-Cancel-' + Date.now(),
    zhDeptId,
    vicePresidentLogin.user?.id,
    null,
    vicePresidentLogin.cookies
  );
  logTest('  创建待办用于取消测试', !!todoForCancelId, todoForCancelId ? `ID: ${todoForCancelId}` : '失败');

  await request('POST', `/api/works/${todoForCancelId}/workflow`, { action: 'submit' }, vicePresidentLogin.cookies);
  await request('POST', `/api/works/${todoForCancelId}/workflow`, {
    action: 'decompose',
    nodes: [{ title: '节点1', responsiblePerson: '负责人', planCompleteTime: '2026-05-15' }]
  }, deptLeaderLogin.cookies);
  await request('POST', `/api/works/${todoForCancelId}/workflow`, { action: 'approve' }, vicePresidentLogin.cookies);

  const todoCancelBefore = await request('GET', `/api/works/${todoForCancelId}`, null, vicePresidentLogin.cookies);
  logTest('  取消前待办状态 IN_PROGRESS', todoCancelBefore.body?.status === 'IN_PROGRESS', `状态: ${todoCancelBefore.body?.status}`);

  const todoCancelRes = await request('POST', `/api/works/${todoForCancelId}/workflow`, {
    action: 'cancel',
    cancelReason: '测试取消'
  }, vicePresidentLogin.cookies);
  logTest('  申请取消待办', todoCancelRes.statusCode === 200 && todoCancelRes.body?.success,
    todoCancelRes.body?.error || `Status: ${todoCancelRes.statusCode}`);
  if (todoCancelRes.statusCode !== 200) printFailedDetails('申请取消待办', todoCancelRes);

  const todoAfterCancelApply = await request('GET', `/api/works/${todoForCancelId}`, null, vicePresidentLogin.cookies);
  logTest('  取消申请后状态 CANCELLING', todoAfterCancelApply.body?.status === 'CANCELLING', `状态: ${todoAfterCancelApply.body?.status}`);

  await request('POST', `/api/works/${todoForCancelId}/workflow`, { action: 'approve' }, deptLeaderLogin.cookies);
  const todoCancelFinalRes = await request('POST', `/api/works/${todoForCancelId}/workflow`, { action: 'approve' }, vicePresidentLogin.cookies);

  const todoAfterCancel = await request('GET', `/api/works/${todoForCancelId}`, null, vicePresidentLogin.cookies);
  logTest('  待办取消后状态 CANCELLED', todoAfterCancel.body?.status === 'CANCELLED', `状态: ${todoAfterCancel.body?.status}`);
  console.log();

  // --------------------
  // 阶段 3: 重点工作取消完整链
  // --------------------
  console.log('【阶段 3】重点工作取消完整链');

  const priorityCancelId = await createWork(
    'PRIORITY',
    'Test-Priority-Cancel-Chain-' + Date.now(),
    zhDeptId,
    null, // proposedLeaderId
    deptLeaderLogin.user?.id, // approvalLeaderId
    deptManagerLogin.cookies
  );
  logTest('  创建重点工作用于取消', !!priorityCancelId, priorityCancelId ? `ID: ${priorityCancelId}` : '失败');

  await request('POST', `/api/works/${priorityCancelId}/workflow`, { action: 'submit' }, deptManagerLogin.cookies);
  await request('POST', `/api/works/${priorityCancelId}/workflow`, { action: 'approve' }, deptLeaderLogin.cookies);
  await request('POST', `/api/works/${priorityCancelId}/workflow`, { action: 'approve' }, vicePresidentLogin.cookies);

  const priorityAfterApprove = await request('GET', `/api/works/${priorityCancelId}`, null, deptManagerLogin.cookies);
  logTest('  重点工作已审批状态 APPROVED', priorityAfterApprove.body?.status === 'APPROVED', `状态: ${priorityAfterApprove.body?.status}`);

  // 申请取消 → 状态变为 CANCELLING，currentApproverRole = DEPARTMENT_LEADER
  const priorityCancelSubmit = await request('POST', `/api/works/${priorityCancelId}/workflow`, {
    action: 'cancel',
    cancelReason: '测试重点工作取消完整链'
  }, deptManagerLogin.cookies);
  logTest('  申请取消重点工作', priorityCancelSubmit.statusCode === 200 && priorityCancelSubmit.body?.success,
    priorityCancelSubmit.body?.error || `Status: ${priorityCancelSubmit.statusCode}`);
  if (priorityCancelSubmit.statusCode !== 200) printFailedDetails('申请取消重点工作', priorityCancelSubmit);

  const priorityAfterCancelSubmit = await request('GET', `/api/works/${priorityCancelId}`, null, deptManagerLogin.cookies);
  logTest('  取消申请后状态 CANCELLING，currentApproverRole=DEPARTMENT_LEADER',
    priorityAfterCancelSubmit.body?.status === 'CANCELLING' && priorityAfterCancelSubmit.body?.currentApproverRole === 'DEPARTMENT_LEADER',
    `状态: ${priorityAfterCancelSubmit.body?.status}, Role: ${priorityAfterCancelSubmit.body?.currentApproverRole}`);

  // 部门领导审批 → 状态变为 CANCELLING，currentApproverRole = VICE_PRESIDENT
  await request('POST', `/api/works/${priorityCancelId}/workflow`, { action: 'approve' }, deptLeaderLogin.cookies);

  const priorityAfterDeptApprove = await request('GET', `/api/works/${priorityCancelId}`, null, deptManagerLogin.cookies);
  logTest('  部门领导审批后状态 CANCELLING，currentApproverRole=VICE_PRESIDENT',
    priorityAfterDeptApprove.body?.status === 'CANCELLING' && priorityAfterDeptApprove.body?.currentApproverRole === 'VICE_PRESIDENT',
    `状态: ${priorityAfterDeptApprove.body?.status}, Role: ${priorityAfterDeptApprove.body?.currentApproverRole}`);

  // 公司主管领导审批 → 状态变为 PENDING_MAIN_LEADER_CANCEL，currentApproverRole = PRESIDENT
  await request('POST', `/api/works/${priorityCancelId}/workflow`, { action: 'approve' }, vicePresidentLogin.cookies);

  const priorityAfterVP = await request('GET', `/api/works/${priorityCancelId}`, null, deptManagerLogin.cookies);
  logTest('  公司主管领导审批后状态 PENDING_MAIN_LEADER_CANCEL',
    priorityAfterVP.body?.status === 'PENDING_MAIN_LEADER_CANCEL',
    `状态: ${priorityAfterVP.body?.status}`);

  // 公司主要领导审批 → CANCELLED
  const priorityCancelFinal = await request('POST', `/api/works/${priorityCancelId}/workflow`, { action: 'approve' }, presidentLogin.cookies);
  logTest('  公司主要领导审批成功', priorityCancelFinal.statusCode === 200 && priorityCancelFinal.body?.success,
    priorityCancelFinal.body?.error || `Status: ${priorityCancelFinal.statusCode}`);

  const priorityAfterFullCancel = await request('GET', `/api/works/${priorityCancelId}`, null, deptManagerLogin.cookies);
  logTest('  重点工作取消完整链 CANCELLED', priorityAfterFullCancel.body?.status === 'CANCELLED', `状态: ${priorityAfterFullCancel.body?.status}`);
  console.log();

  // --------------------
  // 阶段 4: 主要工作取消完整链
  // --------------------
  console.log('【阶段 4】主要工作取消完整链');

  const mainCancelId = await createWork(
    'MAIN',
    'Test-Main-Cancel-Chain-' + Date.now(),
    zhDeptId,
    null, // proposedLeaderId
    deptLeaderLogin.user?.id, // approvalLeaderId
    deptManagerLogin.cookies
  );
  logTest('  创建主要工作用于取消', !!mainCancelId, mainCancelId ? `ID: ${mainCancelId}` : '失败');

  await request('POST', `/api/works/${mainCancelId}/workflow`, { action: 'submit' }, deptManagerLogin.cookies);
  await request('POST', `/api/works/${mainCancelId}/workflow`, { action: 'approve' }, deptLeaderLogin.cookies);
  await request('POST', `/api/works/${mainCancelId}/workflow`, { action: 'approve' }, vicePresidentLogin.cookies);

  const mainAfterApprove = await request('GET', `/api/works/${mainCancelId}`, null, deptManagerLogin.cookies);
  logTest('  主要工作已审批状态 APPROVED', mainAfterApprove.body?.status === 'APPROVED', `状态: ${mainAfterApprove.body?.status}`);

  // 申请取消 → CANCELLING，currentApproverRole = DEPARTMENT_LEADER
  const mainCancelSubmit = await request('POST', `/api/works/${mainCancelId}/workflow`, {
    action: 'cancel',
    cancelReason: '测试主要工作取消'
  }, deptManagerLogin.cookies);
  logTest('  申请取消主要工作', mainCancelSubmit.statusCode === 200 && mainCancelSubmit.body?.success,
    mainCancelSubmit.body?.error || `Status: ${mainCancelSubmit.statusCode}`);

  const mainAfterCancelSubmit = await request('GET', `/api/works/${mainCancelId}`, null, deptManagerLogin.cookies);
  logTest('  取消申请后状态 CANCELLING', mainAfterCancelSubmit.body?.status === 'CANCELLING', `状态: ${mainAfterCancelSubmit.body?.status}`);

  // 部门领导审批 → CANCELLING，currentApproverRole = VICE_PRESIDENT
  await request('POST', `/api/works/${mainCancelId}/workflow`, { action: 'approve' }, deptLeaderLogin.cookies);

  const mainAfterDeptApprove = await request('GET', `/api/works/${mainCancelId}`, null, deptManagerLogin.cookies);
  logTest('  部门领导审批后状态 CANCELLING，currentApproverRole=VICE_PRESIDENT',
    mainAfterDeptApprove.body?.status === 'CANCELLING' && mainAfterDeptApprove.body?.currentApproverRole === 'VICE_PRESIDENT',
    `状态: ${mainAfterDeptApprove.body?.status}, Role: ${mainAfterDeptApprove.body?.currentApproverRole}`);

  // 公司主管领导审批 → CANCELLED
  const mainCancelFinal = await request('POST', `/api/works/${mainCancelId}/workflow`, { action: 'approve' }, vicePresidentLogin.cookies);
  logTest('  公司主管领导审批成功', mainCancelFinal.statusCode === 200 && mainCancelFinal.body?.success,
    mainCancelFinal.body?.error || `Status: ${mainCancelFinal.statusCode}`);

  const mainAfterFullCancel = await request('GET', `/api/works/${mainCancelId}`, null, deptManagerLogin.cookies);
  logTest('  主要工作取消完整链 CANCELLED', mainAfterFullCancel.body?.status === 'CANCELLED', `状态: ${mainAfterFullCancel.body?.status}`);
  console.log();

  // --------------------
  // 阶段 5: 退回后重新提交
  // --------------------
  console.log('【阶段 5】退回后重新提交');

  // 创建人是 dept_manager，所以 REJECTED → submit → PENDING_DEPT
  const rejectTest1Id = await createWork(
    'PRIORITY',
    'Test-Reject-Resubmit-' + Date.now(),
    zhDeptId,
    null, // proposedLeaderId
    deptLeaderLogin.user?.id, // approvalLeaderId
    deptManagerLogin.cookies // 创建人是部门主管
  );
  logTest('  创建待退回测试事项', !!rejectTest1Id, rejectTest1Id ? `ID: ${rejectTest1Id}` : '失败');

  await request('POST', `/api/works/${rejectTest1Id}/workflow`, { action: 'submit' }, deptManagerLogin.cookies);

  const rejectRes = await request('POST', `/api/works/${rejectTest1Id}/workflow`, {
    action: 'reject',
    rejectReason: '测试退回'
  }, deptLeaderLogin.cookies);
  logTest('  PENDING_DEPT 退回成功', rejectRes.statusCode === 200 && rejectRes.body?.success,
    rejectRes.body?.error || `Status: ${rejectRes.statusCode}`);

  const afterReject1 = await request('GET', `/api/works/${rejectTest1Id}`, null, deptManagerLogin.cookies);
  logTest('  退回后状态 REJECTED', afterReject1.body?.status === 'REJECTED', `状态: ${afterReject1.body?.status}`);

  const resubmitRes = await request('POST', `/api/works/${rejectTest1Id}/workflow`, { action: 'submit' }, deptManagerLogin.cookies);
  logTest('  重新提交成功', resubmitRes.statusCode === 200 && resubmitRes.body?.success,
    resubmitRes.body?.error || `Status: ${resubmitRes.statusCode}`);

  const afterResubmit1 = await request('GET', `/api/works/${rejectTest1Id}`, null, deptManagerLogin.cookies);
  logTest('  重新提交后状态 PENDING_DEPT（创建人是部门主管）', afterResubmit1.body?.status === 'PENDING_DEPT',
    `状态: ${afterResubmit1.body?.status}`);

  // 创建人是部门领导，所以 REJECTED → submit → PENDING_COMPANY
  const rejectTest2Id = await createWork(
    'PRIORITY',
    'Test-Reject-Co-Level-' + Date.now(),
    zhDeptId,
    null, // proposedLeaderId
    deptLeaderLogin.user?.id, // approvalLeaderId
    deptLeaderLogin.cookies // 创建人是部门领导
  );
  logTest('  创建公司级退回测试事项', !!rejectTest2Id, rejectTest2Id ? `ID: ${rejectTest2Id}` : '失败');

  await request('POST', `/api/works/${rejectTest2Id}/workflow`, { action: 'submit' }, deptLeaderLogin.cookies);

  const rejectCoRes = await request('POST', `/api/works/${rejectTest2Id}/workflow`, {
    action: 'reject',
    rejectReason: '公司级退回测试'
  }, vicePresidentLogin.cookies);
  logTest('  PENDING_COMPANY 退回成功', rejectCoRes.statusCode === 200 && rejectCoRes.body?.success,
    rejectCoRes.body?.error || `Status: ${rejectCoRes.statusCode}`);

  const afterReject2 = await request('GET', `/api/works/${rejectTest2Id}`, null, deptLeaderLogin.cookies);
  logTest('  公司级退回后状态 REJECTED', afterReject2.body?.status === 'REJECTED', `状态: ${afterReject2.body?.status}`);

  const resubmitCoRes = await request('POST', `/api/works/${rejectTest2Id}/workflow`, { action: 'submit' }, deptLeaderLogin.cookies);
  logTest('  公司级退回后重新提交成功', resubmitCoRes.statusCode === 200 && resubmitCoRes.body?.success,
    resubmitCoRes.body?.error || `Status: ${resubmitCoRes.statusCode}`);

  const afterResubmit2 = await request('GET', `/api/works/${rejectTest2Id}`, null, deptLeaderLogin.cookies);
  logTest('  重新提交后状态 PENDING_COMPANY（创建人是部门领导）', afterResubmit2.body?.status === 'PENDING_COMPANY',
    `状态: ${afterResubmit2.body?.status}`);
  console.log();

  // --------------------
  // 阶段 6: 附件跨部门权限
  // --------------------
  console.log('【阶段 6】附件跨部门权限测试');

  const attachTestId = await createWork(
    'PRIORITY',
    'Test-Attachment-Cross-Dept-' + Date.now(),
    zhDeptId,
    null, // proposedLeaderId
    deptLeaderLogin.user?.id, // approvalLeaderId
    deptManagerLogin.cookies
  );
  logTest('  创建A部门测试事项', !!attachTestId, attachTestId ? `ID: ${attachTestId}` : '失败');

  const uploadFormData = new FormData();
  uploadFormData.append('workItemId', String(attachTestId));
  uploadFormData.append('file', Buffer.from('%PDF-1.4 test'), {
    filename: 'test.pdf',
    contentType: 'application/pdf'
  });

  const uploadRes = await new Promise((resolve) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: '/api/upload',
      method: 'POST',
      headers: {
        'Cookie': deptManagerLogin.cookies.join('; '),
        ...uploadFormData.getHeaders()
      }
    };
    const req = http.request(options, (res) => {
      let body = [];
      res.on('data', (chunk) => body.push(chunk));
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: JSON.parse(Buffer.concat(body).toString())
          });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body: null });
        }
      });
    });
    uploadFormData.pipe(req);
  });

  const attachmentId = uploadRes.body?.attachment?.id;
  logTest('  A部门上传附件成功', uploadRes.statusCode === 200 && !!attachmentId,
    attachmentId ? `附件ID: ${attachmentId}` : `Status: ${uploadRes.statusCode}`);
  if (uploadRes.statusCode !== 200) printFailedDetails('上传附件', uploadRes);

  const crossDeptDownloadRes = await request('GET', `/api/attachments/${attachmentId}/download`, null, deptManager2Login.cookies);
  logTest('  B部门下载A部门附件返回403', crossDeptDownloadRes.statusCode === 403,
    `Status: ${crossDeptDownloadRes.statusCode}`);

  const crossDeptDeleteRes = await request('DELETE', `/api/attachments/${attachmentId}`, null, deptManager2Login.cookies);
  logTest('  B部门删除A部门附件返回403', crossDeptDeleteRes.statusCode === 403,
    `Status: ${crossDeptDeleteRes.statusCode}`);

  const ownDeptDownloadRes = await request('GET', `/api/attachments/${attachmentId}/download`, null, deptManagerLogin.cookies);
  logTest('  A部门下载自己的附件成功', ownDeptDownloadRes.statusCode === 200,
    `Status: ${ownDeptDownloadRes.statusCode}`);

  const ownDeptDeleteRes = await request('DELETE', `/api/attachments/${attachmentId}`, null, deptManagerLogin.cookies);
  logTest('  A部门删除自己的附件成功', ownDeptDeleteRes.statusCode === 200,
    `Status: ${ownDeptDeleteRes.statusCode}`);

  const afterDeleteDownloadRes = await request('GET', `/api/attachments/${attachmentId}/download`, null, deptManagerLogin.cookies);
  logTest('  删除后下载返回404', afterDeleteDownloadRes.statusCode === 404,
    `Status: ${afterDeleteDownloadRes.statusCode}`);
  console.log();

  // --------------------
  // 阶段 7: 权限控制测试
  // --------------------
  console.log('【阶段 7】权限控制测试');

  const otherDeptWorkId = await createWork('PRIORITY', 'Test-Other-Dept-' + Date.now(), jhDeptId,
    null, deptLeader2Login.user?.id, deptManager2Login.cookies);
  const deptMgrViewRes = await request('GET', `/api/works/${otherDeptWorkId}`, null, deptManagerLogin.cookies);
  logTest('  dept_manager 访问其他部门事项返回403', deptMgrViewRes.statusCode === 403,
    `Status: ${deptMgrViewRes.statusCode}`);

  await request('POST', `/api/works/${otherDeptWorkId}/workflow`, { action: 'submit' }, deptManager2Login.cookies);
  const deptLeaderAdjustRes = await request('POST', `/api/works/${otherDeptWorkId}/workflow`, {
    action: 'adjust',
    adjustReason: '跨部门调整测试'
  }, deptLeaderLogin.cookies);
  logTest('  dept_leader 调整其他部门事项失败', deptLeaderAdjustRes.statusCode !== 200,
    `Status: ${deptLeaderAdjustRes.statusCode}`);

  const deptLeaderCancelRes = await request('POST', `/api/works/${otherDeptWorkId}/workflow`, {
    action: 'cancel',
    cancelReason: '跨部门取消测试'
  }, deptLeaderLogin.cookies);
  logTest('  dept_leader 取消其他部门事项失败', deptLeaderCancelRes.statusCode !== 200,
    `Status: ${deptLeaderCancelRes.statusCode}`);

  const supervisorApproveRes = await request('POST', `/api/works/${otherDeptWorkId}/workflow`, { action: 'approve' }, supervisorLogin.cookies);
  logTest('  supervisor 审批失败', supervisorApproveRes.statusCode === 400 || !supervisorApproveRes.body?.success,
    supervisorApproveRes.body?.error || `Status: ${supervisorApproveRes.statusCode}`);

  const adminApproveRes = await request('POST', `/api/works/${otherDeptWorkId}/workflow`, { action: 'approve' }, adminLogin.cookies);
  logTest('  admin 审批失败', adminApproveRes.statusCode === 400 || !adminApproveRes.body?.success,
    adminApproveRes.body?.error || `Status: ${adminApproveRes.statusCode}`);
  console.log();

  // --------------------
  // 阶段 8: Excel 和统计
  // --------------------
  console.log('【阶段 8】Excel 和统计功能测试');

  const exportPriorityRes = await request('GET', '/api/excel/export?type=priority', null, adminLogin.cookies);
  logTest('  导出 priority Excel', exportPriorityRes.statusCode === 200 && Buffer.isBuffer(exportPriorityRes.body),
    `Status: ${exportPriorityRes.statusCode}`);

  const exportAllRes = await request('GET', '/api/excel/export', null, adminLogin.cookies);
  logTest('  导出全部事项 Excel', exportAllRes.statusCode === 200 && Buffer.isBuffer(exportAllRes.body),
    `Status: ${exportAllRes.statusCode}`);

  const completionRateRes = await request('GET', '/api/excel/completion-rate', null, adminLogin.cookies);
  logTest('  完成率导出 Excel', completionRateRes.statusCode === 200 && Buffer.isBuffer(completionRateRes.body),
    `Status: ${completionRateRes.statusCode}`);

  const summaryRes = await request('GET', '/api/dashboard/summary', null, adminLogin.cookies);
  logTest('  首页统计', summaryRes.statusCode === 200 && summaryRes.body?.priorityTotal !== undefined,
    `Status: ${summaryRes.statusCode}`);

  // 获取更多日志来检查 evidence 和 decompose
  const logsRes = await request('GET', '/api/operation-logs?pageSize=100', null, adminLogin.cookies);
  logTest('  获取操作日志', logsRes.statusCode === 200,
    `Status: ${logsRes.statusCode}`);

  // OperationLog 分页对象处理
  const logs = logsRes.body?.items || logsRes.body?.data || [];
  console.log(`    DEBUG: 总日志数: ${logs.length}, Total: ${logsRes.body?.total}`);
  if (logs.length > 0) {
    const actions = logs.map(l => (l.action || '').toLowerCase());
    const uniqueActions = [...new Set(actions)];
    console.log(`    DEBUG: 唯一actions: ${uniqueActions.join(', ')}`);
    logTest('  日志包含 approve', actions.some(a => a.includes('approve')), '');
    logTest('  日志包含 reject', actions.some(a => a.includes('reject')), '');
    logTest('  日志包含 cancel', actions.some(a => a.includes('cancel')), '');
    logTest('  日志包含 upload', actions.some(a => a.includes('upload')), '');
    logTest('  日志包含 delete', actions.some(a => a.includes('delete')), '');
    logTest('  日志包含 evidence', actions.some(a => a.includes('evidence')), '');
    logTest('  日志包含 decompose', actions.some(a => a.includes('decompose')), '');
  } else {
    console.log('    DEBUG: logs 数组为空');
  }
  console.log();

  // --------------------
  // 最终总结
  // --------------------
  console.log('='.repeat(100));
  console.log('📊 全系统完整真实回归测试总结');
  console.log('='.repeat(100));
  console.log(`  ✅ 已实际 API 测试通过: ${testResults.passed}`);
  console.log(`  ❌ 已实际 API 测试失败: ${testResults.failed}`);
  console.log(`  📝 仅代码逻辑检查: ${testResults.codeCheckOnly}`);
  console.log(`  ⏸️  未测试: ${testResults.untested}`);
  console.log('='.repeat(100));
  console.log();

  if (testResults.failed > 0) {
    console.log('❌ 测试失败，退出代码 1');
    process.exit(1);
  } else if (testResults.codeCheckOnly > 0) {
    console.log('⚠️  部分真实测试通过，仍有代码检查项');
    console.log('✅ 核心业务流程已通过真实API测试');
    process.exit(0);
  } else {
    console.log('✅ 全系统完整真实回归测试通过！');
    process.exit(0);
  }

  return testResults;
}

runComprehensiveTests().catch(err => {
  console.error('测试执行出错:', err);
  process.exit(1);
});
