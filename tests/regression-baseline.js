const http = require('http');
const FormData = require('form-data');

const BASE_URL = 'localhost';
const PORT = 5000;
const RUN_ID = `Regression-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now()}`;

console.log(`[${RUN_ID}] 测试开始`);
console.log();

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
        } catch {
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

  const createdWorkIds = [];

  function logTest(name, passed, message, type = 'real') {
    const symbol = type === 'real' ? (passed ? '✅' : '❌') : (type === 'code' ? '📝' : '⏸️');
    console.log(`  ${symbol} ${name}${message ? `: ${message}` : ''}`);
    if (type === 'real' && passed) testResults.passed++;
    else if (type === 'real' && !passed) testResults.failed++;
    else if (type === 'code') testResults.codeCheckOnly++;
    else if (type === 'untested') testResults.untested++;
    testResults.details.push({ name, passed, message, type });
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

  const deptLeader1Login = await login('dept_leader', '123456');
  logTest('dept_leader（综合处）登录', deptLeader1Login.success, `ID: ${deptLeader1Login.user?.id}`);

  const deptManager1Login = await login('dept_manager', '123456');
  logTest('dept_manager（综合处）登录', deptManager1Login.success, `ID: ${deptManager1Login.user?.id}`);

  const deptLeader2Login = await login('dept_leader_2', '123456');
  logTest('dept_leader_2（计划生产处）登录', deptLeader2Login.success, `ID: ${deptLeader2Login.user?.id}`);

  const deptManager2Login = await login('dept_manager_2', '123456');
  logTest('dept_manager_2（计划生产处）登录', deptManager2Login.success, `ID: ${deptManager2Login.user?.id}`);

  const deptsRes = await request('GET', '/api/departments', null, adminLogin.cookies);
  const depts = Array.isArray(deptsRes.body) ? deptsRes.body : [];
  const zhDept = depts.find(d => d.code === 'ZH');
  const jhDept = depts.find(d => d.code === 'JH');
  const zhDeptId = zhDept?.id || 2;
  const jhDeptId = jhDept?.id || 3;

  console.log(`  部门: 综合处=${zhDeptId}, 计划生产处=${jhDeptId}`);
  console.log();

  // --------------------
  // 阶段 2: 公司领导发起 TODO 完整完成流程
  // --------------------
  console.log('【阶段 2】公司领导发起 TODO 完整完成流程');

  const companyTodoRes = await request('POST', '/api/works', {
    type: 'todo',
    workItem: `[${RUN_ID}] 公司领导发起TODO`,
    title: `[${RUN_ID}] 公司领导发起TODO`,
    departmentId: zhDeptId,
    proposedLeaderId: vicePresidentLogin.user?.id
  }, vicePresidentLogin.cookies);
  const companyTodoId = companyTodoRes.body?.id;
  createdWorkIds.push(companyTodoId);
  logTest('公司领导创建待办事项', !!companyTodoId, companyTodoId ? `ID: ${companyTodoId}` : '失败');

  const companyTodoSubmitRes = await request('POST', `/api/works/${companyTodoId}/workflow`, {
    action: 'submit'
  }, vicePresidentLogin.cookies);
  logTest('公司领导提交待办（进入待分解）', companyTodoSubmitRes.statusCode === 200 && companyTodoSubmitRes.body?.success, companyTodoSubmitRes.body?.error || `Status: ${companyTodoSubmitRes.statusCode}`);

  const companyTodoAfterSubmit = await request('GET', `/api/works/${companyTodoId}`, null, vicePresidentLogin.cookies);
  logTest('提交后状态为PENDING_DECOMPOSE', companyTodoAfterSubmit.body?.status === 'PENDING_DECOMPOSE', `Status: ${companyTodoAfterSubmit.body?.status}`);

  const decomposeRes = await request('POST', `/api/works/${companyTodoId}/workflow`, {
    action: 'decompose',
    nodes: [{
      title: `[${RUN_ID}] 分解任务 1`,
      responsiblePerson: '部门主管',
      planCompleteTime: '2026-05-20'
    }],
    comment: '部门分解'
  }, deptManager1Login.cookies);
  logTest('部门主管分解待办（进入待部门审批）', decomposeRes.statusCode === 200 && decomposeRes.body?.success, decomposeRes.body?.error || `Status: ${decomposeRes.statusCode}`);

  const companyTodoAfterDecompose = await request('GET', `/api/works/${companyTodoId}`, null, deptManager1Login.cookies);
  logTest('分解后状态为PENDING_DEPT', companyTodoAfterDecompose.body?.status === 'PENDING_DEPT', `Status: ${companyTodoAfterDecompose.body?.status}`);

  const deptLeaderApproveRes = await request('POST', `/api/works/${companyTodoId}/workflow`, {
    action: 'approve'
  }, deptLeader1Login.cookies);
  logTest('部门领导审批分解待办（进入公司审批）', deptLeaderApproveRes.statusCode === 200 && deptLeaderApproveRes.body?.success, deptLeaderApproveRes.body?.error || `Status: ${deptLeaderApproveRes.statusCode}`);

  const companyTodoAfterDeptApprove = await request('GET', `/api/works/${companyTodoId}`, null, vicePresidentLogin.cookies);
  logTest('部门审批后状态为PENDING_COMPANY', companyTodoAfterDeptApprove.body?.status === 'PENDING_COMPANY', `Status: ${companyTodoAfterDeptApprove.body?.status}`);
  logTest('currentApproverId为proposedLeaderId', companyTodoAfterDeptApprove.body?.currentApproverId === vicePresidentLogin.user?.id, `currentApproverId: ${companyTodoAfterDeptApprove.body?.currentApproverId}`);

  const vpApproveCompanyTodoRes = await request('POST', `/api/works/${companyTodoId}/workflow`, {
    action: 'approve'
  }, vicePresidentLogin.cookies);
  logTest('公司领导审批待办（进入进行中）', vpApproveCompanyTodoRes.statusCode === 200 && vpApproveCompanyTodoRes.body?.success, vpApproveCompanyTodoRes.body?.error || `Status: ${vpApproveCompanyTodoRes.statusCode}`);

  const companyTodoAfterVPApprove = await request('GET', `/api/works/${companyTodoId}`, null, vicePresidentLogin.cookies);
  logTest('公司审批后状态为IN_PROGRESS', companyTodoAfterVPApprove.body?.status === 'IN_PROGRESS', `Status: ${companyTodoAfterVPApprove.body?.status}`);

  const submitEvidenceRes = await request('POST', `/api/works/${companyTodoId}/workflow`, {
    action: 'evidence',
    proof: `[${RUN_ID}] 已完成工作`,
    comment: '申请完成'
  }, deptManager1Login.cookies);
  logTest('部门主管提交见证材料（进入待完成）', submitEvidenceRes.statusCode === 200 && submitEvidenceRes.body?.success, submitEvidenceRes.body?.error || `Status: ${submitEvidenceRes.statusCode}`);

  const companyTodoAfterEvidence = await request('GET', `/api/works/${companyTodoId}`, null, vicePresidentLogin.cookies);
  logTest('见证提交后状态PENDING_COMPLETE', companyTodoAfterEvidence.body?.status === 'PENDING_COMPLETE', `Status: ${companyTodoAfterEvidence.body?.status}`);
  logTest('见证提交后currentApproverId为proposedLeaderId', companyTodoAfterEvidence.body?.currentApproverId === vicePresidentLogin.user?.id, `currentApproverId: ${companyTodoAfterEvidence.body?.currentApproverId}`);

  const approveEvidenceRes = await request('POST', `/api/works/${companyTodoId}/workflow`, {
    action: 'approve'
  }, vicePresidentLogin.cookies);
  logTest('公司领导批准完成申请（完成）', approveEvidenceRes.statusCode === 200 && approveEvidenceRes.body?.success, approveEvidenceRes.body?.error || `Status: ${approveEvidenceRes.statusCode}`);

  const companyTodoFinal = await request('GET', `/api/works/${companyTodoId}`, null, vicePresidentLogin.cookies);
  logTest('最终状态COMPLETED', companyTodoFinal.body?.status === 'COMPLETED', `Status: ${companyTodoFinal.body?.status}`);

  console.log();

  // --------------------
  // 阶段 3: 部门发起 TODO 完整完成流程
  // --------------------
  console.log('【阶段 3】部门发起 TODO 完整完成流程');

  const deptTodoRes = await request('POST', '/api/works', {
    type: 'todo',
    workItem: `[${RUN_ID}] 部门发起TODO`,
    title: `[${RUN_ID}] 部门发起TODO`,
    departmentId: zhDeptId,
    proposedLeaderId: vicePresidentLogin.user?.id
  }, deptManager1Login.cookies);
  const deptTodoId = deptTodoRes.body?.id;
  createdWorkIds.push(deptTodoId);
  logTest('部门主管创建待办事项', !!deptTodoId, deptTodoId ? `ID: ${deptTodoId}` : '失败');

  const deptTodoSubmitRes = await request('POST', `/api/works/${deptTodoId}/workflow`, {
    action: 'submit'
  }, deptManager1Login.cookies);
  logTest('部门主管提交待办（进入待部门审批）', deptTodoSubmitRes.statusCode === 200 && deptTodoSubmitRes.body?.success, deptTodoSubmitRes.body?.error || `Status: ${deptTodoSubmitRes.statusCode}`);

  const deptTodoAfterSubmit = await request('GET', `/api/works/${deptTodoId}`, null, deptManager1Login.cookies);
  logTest('提交后状态PENDING_DEPT', deptTodoAfterSubmit.body?.status === 'PENDING_DEPT', `Status: ${deptTodoAfterSubmit.body?.status}`);

  const deptLeaderTodoApproveRes = await request('POST', `/api/works/${deptTodoId}/workflow`, {
    action: 'approve'
  }, deptLeader1Login.cookies);
  logTest('部门领导审批部门发起待办', deptLeaderTodoApproveRes.statusCode === 200 && deptLeaderTodoApproveRes.body?.success, deptLeaderTodoApproveRes.body?.error || `Status: ${deptLeaderTodoApproveRes.statusCode}`);

  const deptTodoAfterDeptApprove = await request('GET', `/api/works/${deptTodoId}`, null, deptManager1Login.cookies);
  logTest('部门审批后状态PENDING_COMPANY', deptTodoAfterDeptApprove.body?.status === 'PENDING_COMPANY', `Status: ${deptTodoAfterDeptApprove.body?.status}`);
  logTest('currentApproverId为proposedLeaderId', deptTodoAfterDeptApprove.body?.currentApproverId === vicePresidentLogin.user?.id, `currentApproverId: ${deptTodoAfterDeptApprove.body?.currentApproverId}`);

  const vpApproveDeptTodoRes = await request('POST', `/api/works/${deptTodoId}/workflow`, {
    action: 'approve'
  }, vicePresidentLogin.cookies);
  logTest('公司领导审批部门发起待办', vpApproveDeptTodoRes.statusCode === 200 && vpApproveDeptTodoRes.body?.success, vpApproveDeptTodoRes.body?.error || `Status: ${vpApproveDeptTodoRes.statusCode}`);

  const deptTodoAfterVPApprove = await request('GET', `/api/works/${deptTodoId}`, null, deptManager1Login.cookies);
  logTest('最终状态IN_PROGRESS', deptTodoAfterVPApprove.body?.status === 'IN_PROGRESS', `Status: ${deptTodoAfterVPApprove.body?.status}`);

  console.log();

  // --------------------
  // 阶段 4: TODO 取消完整流程
  // --------------------
  console.log('【阶段 4】TODO 取消完整流程');

  const todoCancelRes = await request('POST', '/api/works', {
    type: 'todo',
    workItem: `[${RUN_ID}] TODO取消`,
    title: `[${RUN_ID}] TODO取消`,
    departmentId: zhDeptId,
    proposedLeaderId: vicePresidentLogin.user?.id
  }, deptManager1Login.cookies);
  const todoCancelId = todoCancelRes.body?.id;
  createdWorkIds.push(todoCancelId);
  logTest('创建TODO用于取消测试', !!todoCancelId, todoCancelId ? `ID: ${todoCancelId}` : '失败');

  await request('POST', `/api/works/${todoCancelId}/workflow`, { action: 'submit' }, deptManager1Login.cookies);
  await request('POST', `/api/works/${todoCancelId}/workflow`, { action: 'approve' }, deptLeader1Login.cookies);
  await request('POST', `/api/works/${todoCancelId}/workflow`, { action: 'approve' }, vicePresidentLogin.cookies);

  const todoCancelBefore = await request('GET', `/api/works/${todoCancelId}`, null, deptManager1Login.cookies);
  logTest('取消前状态为IN_PROGRESS', todoCancelBefore.body?.status === 'IN_PROGRESS', `Status: ${todoCancelBefore.body?.status}`);

  const todoCancelApplyRes = await request('POST', `/api/works/${todoCancelId}/workflow`, {
    action: 'cancel',
    cancelReason: `[${RUN_ID}] 测试取消`
  }, deptManager1Login.cookies);
  logTest('部门主管申请取消TODO', todoCancelApplyRes.statusCode === 200 && todoCancelApplyRes.body?.success, todoCancelApplyRes.body?.error || `Status: ${todoCancelApplyRes.statusCode}`);

  const todoCancelAfterApply = await request('GET', `/api/works/${todoCancelId}`, null, deptManager1Login.cookies);
  logTest('取消申请后状态CANCELLING', todoCancelAfterApply.body?.status === 'CANCELLING', `Status: ${todoCancelAfterApply.body?.status}`);

  await request('POST', `/api/works/${todoCancelId}/workflow`, { action: 'approve' }, deptLeader1Login.cookies);

  const todoCancelAfterDeptApprove = await request('GET', `/api/works/${todoCancelId}`, null, deptManager1Login.cookies);
  logTest('部门领导审批取消后状态CANCELLING', todoCancelAfterDeptApprove.body?.status === 'CANCELLING', `Status: ${todoCancelAfterDeptApprove.body?.status}`);
  logTest('部门审批后currentApproverId为proposedLeaderId', todoCancelAfterDeptApprove.body?.currentApproverId === vicePresidentLogin.user?.id, `currentApproverId: ${todoCancelAfterDeptApprove.body?.currentApproverId}`);

  await request('POST', `/api/works/${todoCancelId}/workflow`, { action: 'approve' }, vicePresidentLogin.cookies);

  const todoCancelFinal = await request('GET', `/api/works/${todoCancelId}`, null, deptManager1Login.cookies);
  logTest('TODO取消后最终状态CANCELLED', todoCancelFinal.body?.status === 'CANCELLED', `Status: ${todoCancelFinal.body?.status}`);

  console.log();

  // --------------------
  // 阶段 5: TODO 调整完整流程
  // --------------------
  console.log('【阶段 5】TODO 调整完整流程');

  const todoAdjustRes = await request('POST', '/api/works', {
    type: 'todo',
    workItem: `[${RUN_ID}] TODO调整`,
    title: `[${RUN_ID}] TODO调整`,
    departmentId: zhDeptId,
    proposedLeaderId: vicePresidentLogin.user?.id
  }, deptManager1Login.cookies);
  const todoAdjustId = todoAdjustRes.body?.id;
  createdWorkIds.push(todoAdjustId);
  logTest('创建TODO用于调整测试', !!todoAdjustId, todoAdjustId ? `ID: ${todoAdjustId}` : '失败');

  await request('POST', `/api/works/${todoAdjustId}/workflow`, { action: 'submit' }, deptManager1Login.cookies);
  await request('POST', `/api/works/${todoAdjustId}/workflow`, { action: 'approve' }, deptLeader1Login.cookies);
  await request('POST', `/api/works/${todoAdjustId}/workflow`, { action: 'approve' }, vicePresidentLogin.cookies);

  const todoAdjustBefore = await request('GET', `/api/works/${todoAdjustId}`, null, deptManager1Login.cookies);
  logTest('调整前状态为IN_PROGRESS', todoAdjustBefore.body?.status === 'IN_PROGRESS', `Status: ${todoAdjustBefore.body?.status}`);

  const todoAdjustApplyRes = await request('POST', `/api/works/${todoAdjustId}/workflow`, {
    action: 'adjust',
    adjustReason: `[${RUN_ID}] 测试调整`
  }, deptManager1Login.cookies);
  logTest('部门主管申请调整TODO', todoAdjustApplyRes.statusCode === 200 && todoAdjustApplyRes.body?.success, todoAdjustApplyRes.body?.error || `Status: ${todoAdjustApplyRes.statusCode}`);

  const todoAdjustAfterApply = await request('GET', `/api/works/${todoAdjustId}`, null, deptManager1Login.cookies);
  logTest('调整申请后状态ADJUSTING', todoAdjustAfterApply.body?.status === 'ADJUSTING', `Status: ${todoAdjustAfterApply.body?.status}`);

  await request('POST', `/api/works/${todoAdjustId}/workflow`, { action: 'approve' }, deptLeader1Login.cookies);

  const todoAdjustAfterDeptApprove = await request('GET', `/api/works/${todoAdjustId}`, null, deptManager1Login.cookies);
  logTest('部门领导审批调整后状态ADJUSTING', todoAdjustAfterDeptApprove.body?.status === 'ADJUSTING', `Status: ${todoAdjustAfterDeptApprove.body?.status}`);
  logTest('部门审批后currentApproverId为proposedLeaderId', todoAdjustAfterDeptApprove.body?.currentApproverId === vicePresidentLogin.user?.id, `currentApproverId: ${todoAdjustAfterDeptApprove.body?.currentApproverId}`);

  await request('POST', `/api/works/${todoAdjustId}/workflow`, { action: 'approve' }, vicePresidentLogin.cookies);

  const todoAdjustFinal = await request('GET', `/api/works/${todoAdjustId}`, null, deptManager1Login.cookies);
  logTest('TODO调整后状态IN_PROGRESS', todoAdjustFinal.body?.status === 'IN_PROGRESS', `Status: ${todoAdjustFinal.body?.status}`);

  console.log();

  // --------------------
  // 阶段 6: 重点工作取消完整链
  // --------------------
  console.log('【阶段 6】重点工作取消完整链');

  const priorityRes = await request('POST', '/api/works', {
    type: 'priority',
    workItem: `[${RUN_ID}] 重点工作`,
    title: `[${RUN_ID}] 重点工作`,
    departmentId: zhDeptId
  }, deptManager1Login.cookies);
  const priorityId = priorityRes.body?.id;
  createdWorkIds.push(priorityId);
  logTest('创建重点工作', !!priorityId, priorityId ? `ID: ${priorityId}` : '失败');

  await request('POST', `/api/works/${priorityId}/workflow`, { action: 'submit' }, deptManager1Login.cookies);
  await request('POST', `/api/works/${priorityId}/workflow`, { action: 'approve' }, deptLeader1Login.cookies);
  await request('POST', `/api/works/${priorityId}/workflow`, { action: 'approve' }, vicePresidentLogin.cookies);

  const priorityAfterApprove = await request('GET', `/api/works/${priorityId}`, null, deptManager1Login.cookies);
  logTest('重点工作进入APPROVED', priorityAfterApprove.body?.status === 'APPROVED', `Status: ${priorityAfterApprove.body?.status}`);

  const priorityCancelSubmitRes = await request('POST', `/api/works/${priorityId}/workflow`, {
    action: 'cancel',
    cancelReason: `[${RUN_ID}] 测试取消`
  }, deptManager1Login.cookies);
  logTest('申请取消重点工作', priorityCancelSubmitRes.statusCode === 200 && priorityCancelSubmitRes.body?.success, priorityCancelSubmitRes.body?.error || `Status: ${priorityCancelSubmitRes.statusCode}`);

  const priorityAfterCancelSubmit = await request('GET', `/api/works/${priorityId}`, null, deptManager1Login.cookies);
  logTest('取消申请后状态CANCELLING', priorityAfterCancelSubmit.body?.status === 'CANCELLING', `Status: ${priorityAfterCancelSubmit.body?.status}`);
  logTest('取消申请后currentApproverRole为DEPARTMENT_LEADER', priorityAfterCancelSubmit.body?.currentApproverRole === 'DEPARTMENT_LEADER', `currentApproverRole: ${priorityAfterCancelSubmit.body?.currentApproverRole}`);

  await request('POST', `/api/works/${priorityId}/workflow`, { action: 'approve' }, deptLeader1Login.cookies);

  const priorityAfterDeptCancelApprove = await request('GET', `/api/works/${priorityId}`, null, deptManager1Login.cookies);
  logTest('部门领导审批取消后状态CANCELLING', priorityAfterDeptCancelApprove.body?.status === 'CANCELLING', `Status: ${priorityAfterDeptCancelApprove.body?.status}`);
  logTest('部门审批取消后currentApproverRole为VICE_PRESIDENT', priorityAfterDeptCancelApprove.body?.currentApproverRole === 'VICE_PRESIDENT', `currentApproverRole: ${priorityAfterDeptCancelApprove.body?.currentApproverRole}`);

  await request('POST', `/api/works/${priorityId}/workflow`, { action: 'approve' }, vicePresidentLogin.cookies);

  const priorityAfterVPCancelApprove = await request('GET', `/api/works/${priorityId}`, null, deptManager1Login.cookies);
  logTest('公司领导审批取消后状态PENDING_MAIN_LEADER_CANCEL', priorityAfterVPCancelApprove.body?.status === 'PENDING_MAIN_LEADER_CANCEL', `Status: ${priorityAfterVPCancelApprove.body?.status}`);

  await request('POST', `/api/works/${priorityId}/workflow`, { action: 'approve' }, presidentLogin.cookies);

  const priorityAfterPresCancelApprove = await request('GET', `/api/works/${priorityId}`, null, deptManager1Login.cookies);
  logTest('重点工作最终状态CANCELLED', priorityAfterPresCancelApprove.body?.status === 'CANCELLED', `Status: ${priorityAfterPresCancelApprove.body?.status}`);

  console.log();

  // --------------------
  // 阶段 7: 主要工作取消完整链
  // --------------------
  console.log('【阶段 7】主要工作取消完整链');

  const mainRes = await request('POST', '/api/works', {
    type: 'main',
    workItem: `[${RUN_ID}] 主要工作`,
    title: `[${RUN_ID}] 主要工作`,
    departmentId: zhDeptId
  }, deptManager1Login.cookies);
  const mainId = mainRes.body?.id;
  createdWorkIds.push(mainId);
  logTest('创建主要工作', !!mainId, mainId ? `ID: ${mainId}` : '失败');

  await request('POST', `/api/works/${mainId}/workflow`, { action: 'submit' }, deptManager1Login.cookies);
  await request('POST', `/api/works/${mainId}/workflow`, { action: 'approve' }, deptLeader1Login.cookies);
  await request('POST', `/api/works/${mainId}/workflow`, { action: 'approve' }, vicePresidentLogin.cookies);

  await request('POST', `/api/works/${mainId}/workflow`, {
    action: 'cancel',
    cancelReason: `[${RUN_ID}] 主要工作取消测试`
  }, deptManager1Login.cookies);

  await request('POST', `/api/works/${mainId}/workflow`, { action: 'approve' }, deptLeader1Login.cookies);
  await request('POST', `/api/works/${mainId}/workflow`, { action: 'approve' }, vicePresidentLogin.cookies);

  const mainAfterCancelFinal = await request('GET', `/api/works/${mainId}`, null, deptManager1Login.cookies);
  logTest('主要工作取消后最终状态CANCELLED', mainAfterCancelFinal.body?.status === 'CANCELLED', `Status: ${mainAfterCancelFinal.body?.status}`);
  logTest('主要工作取消后没有进入PENDING_MAIN_LEADER_CANCEL', mainAfterCancelFinal.body?.status !== 'PENDING_MAIN_LEADER_CANCEL', `Status: ${mainAfterCancelFinal.body?.status}`);

  console.log();

  // --------------------
  // 阶段 8: 部门主管创建事项退回后重新提交
  // --------------------
  console.log('【阶段 8】部门主管创建事项退回后重新提交');

  const rejectTest1Res = await request('POST', '/api/works', {
    type: 'priority',
    workItem: `[${RUN_ID}] 部门主管退回`,
    title: `[${RUN_ID}] 部门主管退回`,
    departmentId: zhDeptId
  }, deptManager1Login.cookies);
  const rejectTest1Id = rejectTest1Res.body?.id;
  createdWorkIds.push(rejectTest1Id);
  logTest('部门主管创建事项', !!rejectTest1Id, rejectTest1Id ? `ID: ${rejectTest1Id}` : '失败');

  await request('POST', `/api/works/${rejectTest1Id}/workflow`, { action: 'submit' }, deptManager1Login.cookies);
  await request('POST', `/api/works/${rejectTest1Id}/workflow`, {
    action: 'reject',
    rejectReason: `[${RUN_ID}] 测试退回`
  }, deptLeader1Login.cookies);

  const afterReject1 = await request('GET', `/api/works/${rejectTest1Id}`, null, deptManager1Login.cookies);
  logTest('部门主管创建事项被退回后状态REJECTED', afterReject1.body?.status === 'REJECTED', `Status: ${afterReject1.body?.status}`);

  await request('POST', `/api/works/${rejectTest1Id}/workflow`, { action: 'submit' }, deptManager1Login.cookies);

  const afterResubmit1 = await request('GET', `/api/works/${rejectTest1Id}`, null, deptManager1Login.cookies);
  logTest('部门主管重新提交后状态PENDING_DEPT', afterResubmit1.body?.status === 'PENDING_DEPT', `Status: ${afterResubmit1.body?.status}`);

  console.log();

  // --------------------
  // 阶段 9: 部门领导创建事项退回后重新提交
  // --------------------
  console.log('【阶段 9】部门领导创建事项退回后重新提交');

  const rejectTest2Res = await request('POST', '/api/works', {
    type: 'priority',
    workItem: `[${RUN_ID}] 部门领导退回`,
    title: `[${RUN_ID}] 部门领导退回`,
    departmentId: zhDeptId
  }, deptLeader1Login.cookies);
  const rejectTest2Id = rejectTest2Res.body?.id;
  createdWorkIds.push(rejectTest2Id);
  logTest('部门领导创建事项', !!rejectTest2Id, rejectTest2Id ? `ID: ${rejectTest2Id}` : '失败');

  await request('POST', `/api/works/${rejectTest2Id}/workflow`, { action: 'submit' }, deptLeader1Login.cookies);
  await request('POST', `/api/works/${rejectTest2Id}/workflow`, {
    action: 'reject',
    rejectReason: `[${RUN_ID}] 公司级退回测试`
  }, vicePresidentLogin.cookies);

  const afterReject2 = await request('GET', `/api/works/${rejectTest2Id}`, null, deptLeader1Login.cookies);
  logTest('部门领导创建事项被退回后状态REJECTED', afterReject2.body?.status === 'REJECTED', `Status: ${afterReject2.body?.status}`);

  await request('POST', `/api/works/${rejectTest2Id}/workflow`, { action: 'submit' }, deptLeader1Login.cookies);

  const afterResubmit2 = await request('GET', `/api/works/${rejectTest2Id}`, null, deptLeader1Login.cookies);
  logTest('部门领导重新提交后状态PENDING_COMPANY', afterResubmit2.body?.status === 'PENDING_COMPANY', `Status: ${afterResubmit2.body?.status}`);

  console.log();

  // --------------------
  // 阶段 10: 附件跨部门权限
  // --------------------
  console.log('【阶段 10】附件跨部门权限');

  const attachTestRes = await request('POST', '/api/works', {
    type: 'priority',
    workItem: `[${RUN_ID}] 附件`,
    title: `[${RUN_ID}] 附件`,
    departmentId: zhDeptId
  }, deptManager1Login.cookies);
  const attachTestId = attachTestRes.body?.id;
  createdWorkIds.push(attachTestId);

  await request('POST', `/api/works/${attachTestId}/workflow`, { action: 'submit' }, deptManager1Login.cookies);
  await request('POST', `/api/works/${attachTestId}/workflow`, { action: 'approve' }, deptLeader1Login.cookies);
  await request('POST', `/api/works/${attachTestId}/workflow`, { action: 'approve' }, vicePresidentLogin.cookies);

  const uploadForm = new FormData();
  uploadForm.append('workItemId', String(attachTestId));
  uploadForm.append('file', Buffer.from('%PDF-1.4 cross-dept'), {
    filename: 'cross-dept.pdf',
    contentType: 'application/pdf'
  });

  const uploadRes = await new Promise((resolve) => {
    const opts = {
      hostname: BASE_URL,
      port: PORT,
      path: '/api/upload',
      method: 'POST',
      headers: {
        'Cookie': deptManager1Login.cookies.join('; '),
        ...uploadForm.getHeaders()
      }
    };
    const req = http.request(opts, (res) => {
      let body = [];
      res.on('data', (chunk) => body.push(chunk));
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(Buffer.concat(body).toString()) });
        } catch {
          resolve({ statusCode: res.statusCode, body: null });
        }
      });
    });
    uploadForm.pipe(req);
  });

  const attachmentId = uploadRes.body?.attachment?.id;
  logTest('上传附件成功', uploadRes.statusCode === 200 && !!attachmentId, attachmentId ? `附件ID: ${attachmentId}` : '失败');

  const crossDownloadRes = await request('GET', `/api/attachments/${attachmentId}/download`, null, deptManager2Login.cookies);
  logTest('跨部门下载附件返回403', crossDownloadRes.statusCode === 403, `Status: ${crossDownloadRes.statusCode}`);

  const ownDownloadRes = await request('GET', `/api/attachments/${attachmentId}/download`, null, deptManager1Login.cookies);
  logTest('本部门下载附件成功', ownDownloadRes.statusCode === 200, `Status: ${ownDownloadRes.statusCode}`);

  const deleteAttachRes = await request('DELETE', `/api/attachments/${attachmentId}`, null, deptManager1Login.cookies);
  logTest('删除附件成功', deleteAttachRes.statusCode === 200, `Status: ${deleteAttachRes.statusCode}`);

  const afterDeleteDownloadRes = await request('GET', `/api/attachments/${attachmentId}/download`, null, deptManager1Login.cookies);
  logTest('删除后下载返回404', afterDeleteDownloadRes.statusCode === 404, `Status: ${afterDeleteDownloadRes.statusCode}`);

  console.log();

  // --------------------
  // 阶段 11: Excel和统计
  // --------------------
  console.log('【阶段 11】Excel和统计功能');

  const exportPriorityRes = await request('GET', '/api/excel/export?type=priority', null, adminLogin.cookies);
  logTest('导出priority Excel成功', exportPriorityRes.statusCode === 200 && Buffer.isBuffer(exportPriorityRes.body), `Status: ${exportPriorityRes.statusCode}`);

  const exportAllRes = await request('GET', '/api/excel/export', null, adminLogin.cookies);
  logTest('导出全部事项Excel成功', exportAllRes.statusCode === 200 && Buffer.isBuffer(exportAllRes.body), `Status: ${exportAllRes.statusCode}`);

  const completionRes = await request('GET', '/api/excel/completion-rate', null, adminLogin.cookies);
  logTest('完成率导出Excel成功', completionRes.statusCode === 200 && Buffer.isBuffer(completionRes.body), `Status: ${completionRes.statusCode}`);

  const summaryRes = await request('GET', '/api/dashboard/summary', null, adminLogin.cookies);
  logTest('首页统计API成功', summaryRes.statusCode === 200, `Status: ${summaryRes.statusCode}`);

  console.log();

  // --------------------
  // 阶段 12: OperationLog 明细验证
  // --------------------
  console.log('【阶段 12】OperationLog 明细验证');

  const logsRes = await request('GET', '/api/operation-logs?pageSize=200', null, adminLogin.cookies);
  logTest('操作日志API返回200', logsRes.statusCode === 200, `Status: ${logsRes.statusCode}`);

  const logs = logsRes.body?.items || logsRes.body?.data || [];
  logTest('获取到操作日志数据', logs.length > 0, `共 ${logs.length} 条日志`);

  if (logs.length > 0) {
    const actions = logs.map((l) => (l.action || '').toLowerCase());
    logTest('日志包含create', actions.some(a => a.includes('create')), '');
    logTest('日志包含submit', actions.some(a => a.includes('submit')), '');
    logTest('日志包含approve', actions.some(a => a.includes('approve')), '');
    logTest('日志包含reject', actions.some(a => a.includes('reject')), '');
    logTest('日志包含cancel', actions.some(a => a.includes('cancel')), '');
    logTest('日志包含adjust', actions.some(a => a.includes('adjust')), '');
    logTest('日志包含evidence', actions.some(a => a.includes('evidence')), '');
    logTest('日志包含decompose', actions.some(a => a.includes('decompose')), '');
    logTest('日志包含upload', actions.some(a => a.includes('upload')), '');
    logTest('日志包含delete', actions.some(a => a.includes('delete')), '');
    logTest('日志包含export', actions.some(a => a.includes('export')), '');
  }

  console.log();

  // --------------------
  // 最终总结
  // --------------------
  console.log('='.repeat(100));
  console.log('📊 全系统完整真实回归测试总结');
  console.log(`[${RUN_ID}]`);
  console.log('='.repeat(100));
  console.log(`  ✅ 已实际 API 测试通过: ${testResults.passed}`);
  console.log(`  ❌ 已实际 API 测试失败: ${testResults.failed}`);
  console.log(`  📝 仅代码逻辑检查: ${testResults.codeCheckOnly}`);
  console.log(`  ⏸️ 未测试: ${testResults.untested}`);
  console.log(`  📋 本次测试创建的事项ID: ${createdWorkIds.join(', ')}`);
  console.log('='.repeat(100));
  console.log();

  if (testResults.failed > 0) {
    console.log('❌ 测试失败，退出代码 1');
    process.exit(1);
  } else if (testResults.codeCheckOnly > 0) {
    console.log('❌ 仍有代码逻辑检查项，退出代码 1');
    process.exit(1);
  } else if (testResults.untested > 0) {
    console.log('❌ 仍有未测试项，退出代码 1');
    process.exit(1);
  } else {
    console.log('✅ 全系统完整真实回归测试通过！');
    console.log(`[${RUN_ID}] 测试完成`);
    process.exit(0);
  }

  return testResults;
}

runComprehensiveTests().catch((error) => {
  console.error('测试执行出错:', error);
  process.exit(1);
});
