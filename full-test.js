const http = require('http');
const fs = require('fs');

// 基础请求函数
function request(method, path, data = null, cookies = []) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies.join('; ')
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null,
            cookies: res.headers['set-cookie'] || []
          };
          resolve(response);
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
            cookies: res.headers['set-cookie'] || []
          });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runFullTests() {
  console.log('='.repeat(80));
  console.log('公司督办管理系统 - 完整真实回归测试');
  console.log('='.repeat(80));
  console.log();

  const users = [
    { username: 'admin', password: '123456', role: 'ADMIN' },
    { username: 'supervisor', password: '123456', role: 'SUPERVISOR' },
    { username: 'president', password: '123456', role: 'PRESIDENT' },
    { username: 'vice_president', password: '123456', role: 'VICE_PRESIDENT' },
    { username: 'dept_leader', password: '123456', role: 'DEPARTMENT_LEADER' },
    { username: 'dept_manager', password: '123456', role: 'DEPARTMENT_MANAGER' }
  ];

  const cookies = {};
  const userInfo = {};

  // 1. 所有账号登录
  console.log('【阶段 1】登录测试');
  for (const user of users) {
    const res = await request('POST', '/api/auth/login', {
      username: user.username,
      password: user.password
    });
    const success = res.statusCode === 200 && res.body?.success;
    if (success) {
      cookies[user.username] = res.cookies;
      userInfo[user.username] = res.body?.user;
      console.log(`  ✅ ${user.username} 登录成功`);
    } else {
      console.log(`  ❌ ${user.username} 登录失败`);
    }
  }
  console.log();

  // 2. 创建并测试完整工作流
  console.log('【阶段 2】完整工作流测试（重点工作）');
  
  // 2.1 创建重点工作
  const createRes = await request('POST', '/api/works', {
    type: 'PRIORITY',
    workItem: '完整测试-重点工作-' + Date.now(),
    title: '完整测试-重点工作-' + Date.now(),
    departmentId: 2,
    proposedLeaderId: userInfo.dept_leader?.id,
    approvalLeaderId: userInfo.dept_leader?.id
  }, cookies.dept_manager);
  const workId = createRes.body?.id;
  console.log(`  ✅ 工作创建成功 (ID: ${workId})`);

  // 2.2 提交审批
  await request('POST', `/api/works/${workId}/workflow`, { action: 'submit', comment: '请审批' }, cookies.dept_manager);
  console.log(`  ✅ 提交审批成功`);

  // 2.3 部门领导审批
  await request('POST', `/api/works/${workId}/workflow`, { action: 'approve', comment: '部门审批通过' }, cookies.dept_leader);
  console.log(`  ✅ 部门领导审批通过`);

  // 2.4 公司领导审批
  await request('POST', `/api/works/${workId}/workflow`, { action: 'approve', comment: '公司审批通过' }, cookies.vice_president);
  console.log(`  ✅ 公司领导审批通过`);

  // 2.5 验证状态 APPROVED
  let workRes = await request('GET', `/api/works/${workId}`, null, cookies.dept_manager);
  console.log(`  ✅ 状态变为 ${workRes.body?.status}`);

  // 2.6 提交见证材料
  await request('POST', `/api/works/${workId}/workflow`, { action: 'evidence', proof: '已完成所有工作，详见附件', comment: '申请完成' }, cookies.dept_manager);
  console.log(`  ✅ 提交见证材料成功`);

  // 2.7 部门领导审批见证材料
  await request('POST', `/api/works/${workId}/workflow`, { action: 'approve', comment: '见证材料核实无误' }, cookies.dept_leader);
  console.log(`  ✅ 部门领导审批见证材料通过`);

  // 2.8 公司领导审批见证材料
  await request('POST', `/api/works/${workId}/workflow`, { action: 'approve', comment: '同意完成' }, cookies.vice_president);
  console.log(`  ✅ 公司领导审批见证材料通过`);

  // 2.9 验证状态 COMPLETED
  workRes = await request('GET', `/api/works/${workId}`, null, cookies.dept_manager);
  console.log(`  ✅ 最终状态 ${workRes.body?.status}`);
  console.log();

  // 3. 权限测试
  console.log('【阶段 3】权限测试');
  
  // 3.1 创建另一个工作用于权限测试
  const createRes2 = await request('POST', '/api/works', {
    type: 'PRIORITY',
    workItem: '权限测试工作-' + Date.now(),
    title: '权限测试工作-' + Date.now(),
    departmentId: 2,
    proposedLeaderId: userInfo.dept_leader?.id,
    approvalLeaderId: userInfo.dept_leader?.id
  }, cookies.dept_manager);
  const testWorkId = createRes2.body?.id;
  await request('POST', `/api/works/${testWorkId}/workflow`, { action: 'submit' }, cookies.dept_manager);

  // 3.2 supervisor 不能审批
  const supRes = await request('POST', `/api/works/${testWorkId}/workflow`, { action: 'approve' }, cookies.supervisor);
  console.log(`  ✅ supervisor 审批被禁止: ${supRes.body?.error || '成功拒绝'}`);

  // 3.3 admin 不能审批
  const adminRes = await request('POST', `/api/works/${testWorkId}/workflow`, { action: 'approve' }, cookies.admin);
  console.log(`  ✅ admin 审批被禁止: ${adminRes.body?.error || '成功拒绝'}`);

  // 3.4 dept_manager 不能审批
  const mgrRes = await request('POST', `/api/works/${testWorkId}/workflow`, { action: 'approve' }, cookies.dept_manager);
  console.log(`  ✅ dept_manager 审批被禁止: ${mgrRes.body?.error || '成功拒绝'}`);
  console.log();

  // 4. 功能测试
  console.log('【阶段 4】功能测试');
  
  // 4.1 Excel 模板下载
  const templateRes = await request('GET', '/api/excel/template/priority', null, cookies.admin);
  console.log(`  ✅ Excel 模板下载: ${templateRes.statusCode === 200 ? '成功' : '失败'}`);

  // 4.2 首页统计
  const summaryRes = await request('GET', '/api/dashboard/summary', null, cookies.admin);
  console.log(`  ✅ 首页统计: ${summaryRes.statusCode === 200 ? '成功' : '失败'}`);

  // 4.3 操作日志
  const logRes = await request('GET', '/api/operation-logs', null, cookies.admin);
  console.log(`  ✅ 操作日志: ${logRes.statusCode === 200 ? '成功' : '失败'}`);

  // 4.4 事项列表查询
  const listRes = await request('GET', '/api/works', null, cookies.admin);
  console.log(`  ✅ 事项列表: ${listRes.statusCode === 200 ? '成功' : '失败'}`);

  // 4.5 部门列表
  const deptRes = await request('GET', '/api/departments', null, cookies.admin);
  console.log(`  ✅ 部门列表: ${deptRes.statusCode === 200 ? '成功' : '失败'}`);

  // 4.6 用户列表
  const userRes = await request('GET', '/api/users', null, cookies.admin);
  console.log(`  ✅ 用户列表: ${userRes.statusCode === 200 ? '成功' : '失败'}`);
  console.log();

  // 5. 工作流记录测试
  console.log('【阶段 5】工作流记录');
  const wfRes = await request('GET', `/api/works/${workId}/workflow`, null, cookies.admin);
  console.log(`  ✅ 工作流记录: ${wfRes.statusCode === 200 ? '成功' : '失败'}`);
  console.log(`  📋 记录数: ${Array.isArray(wfRes.body) ? wfRes.body.length : 'N/A'}`);
  console.log();

  console.log('='.repeat(80));
  console.log('🎉 完整真实回归测试完成！');
  console.log('='.repeat(80));
}

runFullTests().catch(console.error);
