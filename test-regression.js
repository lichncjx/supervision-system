const http = require('http');

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

async function runTests() {
  console.log('='.repeat(80));
  console.log('公司督办管理系统 - 真实运行回归测试');
  console.log('='.repeat(80));
  console.log();

  // 测试 1: 未登录访问 /api/auth/me 应返回 401
  console.log('【测试 1】未登录访问 /api/auth/me');
  const res1 = await request('GET', '/api/auth/me');
  console.log(`  状态码: ${res1.statusCode}`);
  console.log(`  结果: ${res1.statusCode === 401 ? '✅ 通过' : '❌ 失败'}`);
  console.log();

  // 测试账号列表
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

  // 测试 2: 所有账号登录
  console.log('【测试 2】所有账号登录');
  for (const user of users) {
    const res = await request('POST', '/api/auth/login', {
      username: user.username,
      password: user.password
    });
    const success = res.statusCode === 200 && res.body?.success;
    if (success) {
      cookies[user.username] = res.cookies;
      userInfo[user.username] = res.body?.user;
      console.log(`  ${user.username} (${user.role}): ✅ 登录成功 (ID: ${res.body?.user?.id})`);
    } else {
      console.log(`  ${user.username} (${user.role}): ❌ 登录失败 - ${res.statusCode}`);
    }
  }
  console.log();

  // 测试 3: 用 dept_manager 创建重点工作
  console.log('【测试 3】dept_manager 创建重点工作');
  const createWorkRes = await request('POST', '/api/works', {
    type: 'PRIORITY',
    workItem: '回归测试-重点工作-' + Date.now(),
    title: '回归测试-重点工作-' + Date.now(),
    departmentId: 2, // 综合处
    proposedLeaderId: userInfo.dept_leader?.id,
    approvalLeaderId: userInfo.dept_leader?.id
  }, cookies.dept_manager);
  const workId = createWorkRes.body?.id;
  console.log(`  状态码: ${createWorkRes.statusCode}`);
  console.log(`  响应: ${JSON.stringify(createWorkRes.body)}`);
  console.log(`  工作ID: ${workId || 'N/A'}`);
  console.log(`  结果: ${workId ? '✅ 通过' : '❌ 失败'}`);
  console.log();

  if (workId) {
    // 测试 4: dept_manager 提交审批
    console.log('【测试 4】dept_manager 提交审批');
    const submitRes = await request('POST', `/api/works/${workId}/workflow`, {
      action: 'submit',
      comment: '请审批'
    }, cookies.dept_manager);
    console.log(`  状态码: ${submitRes.statusCode}`);
    console.log(`  响应: ${JSON.stringify(submitRes.body)}`);
    console.log(`  结果: ${submitRes.statusCode === 200 && submitRes.body?.success ? '✅ 通过' : '❌ 失败'}`);
    console.log();

    // 测试 5: 获取事项详情，查看状态
    console.log('【测试 5】获取事项详情，查看状态');
    const workRes1 = await request('GET', `/api/works/${workId}`, null, cookies.dept_manager);
    console.log(`  状态码: ${workRes1.statusCode}`);
    console.log(`  当前状态: ${workRes1.body?.status}`);
    console.log();

    // 测试 6: dept_leader 审批通过
    console.log('【测试 6】dept_leader 审批通过');
    const approve1Res = await request('POST', `/api/works/${workId}/workflow`, {
      action: 'approve',
      comment: '部门审批通过'
    }, cookies.dept_leader);
    console.log(`  状态码: ${approve1Res.statusCode}`);
    console.log(`  响应: ${JSON.stringify(approve1Res.body)}`);
    console.log(`  结果: ${approve1Res.statusCode === 200 && approve1Res.body?.success ? '✅ 通过' : '❌ 失败'}`);
    console.log();

    // 测试 7: 查看状态
    console.log('【测试 7】查看事项状态');
    const workRes2 = await request('GET', `/api/works/${workId}`, null, cookies.dept_manager);
    console.log(`  状态码: ${workRes2.statusCode}`);
    console.log(`  当前状态: ${workRes2.body?.status}`);
    console.log();

    // 测试 8: vice_president 审批通过
    console.log('【测试 8】vice_president 审批通过');
    const approve2Res = await request('POST', `/api/works/${workId}/workflow`, {
      action: 'approve',
      comment: '公司审批通过'
    }, cookies.vice_president);
    console.log(`  状态码: ${approve2Res.statusCode}`);
    console.log(`  响应: ${JSON.stringify(approve2Res.body)}`);
    console.log(`  结果: ${approve2Res.statusCode === 200 && approve2Res.body?.success ? '✅ 通过' : '❌ 失败'}`);
    console.log();

    // 测试 9: 验证状态变为 APPROVED
    console.log('【测试 9】验证事项状态');
    const workRes3 = await request('GET', `/api/works/${workId}`, null, cookies.dept_manager);
    console.log(`  状态码: ${workRes3.statusCode}`);
    console.log(`  当前状态: ${workRes3.body?.status}`);
    console.log(`  结果: ${workRes3.body?.status === 'APPROVED' ? '✅ 通过' : '❌ 失败'}`);
    console.log();

    // 测试 10: 下载 Excel 模板
    console.log('【测试 10】下载 Excel 模板（priority）');
    const templateRes = await request('GET', '/api/excel/template/priority', null, cookies.admin);
    console.log(`  状态码: ${templateRes.statusCode}`);
    console.log(`  结果: ${templateRes.statusCode === 200 ? '✅ 通过' : '❌ 失败'}`);
    console.log();

    // 测试 11: 首页统计
    console.log('【测试 11】首页统计');
    const summaryRes = await request('GET', '/api/dashboard/summary', null, cookies.admin);
    console.log(`  状态码: ${summaryRes.statusCode}`);
    console.log(`  响应: ${JSON.stringify(summaryRes.body)}`);
    console.log(`  结果: ${summaryRes.statusCode === 200 ? '✅ 通过' : '❌ 失败'}`);
    console.log();

    // 测试 12: 操作日志
    console.log('【测试 12】操作日志');
    const logRes = await request('GET', '/api/operation-logs', null, cookies.admin);
    console.log(`  状态码: ${logRes.statusCode}`);
    console.log(`  结果: ${logRes.statusCode === 200 ? '✅ 通过' : '❌ 失败'}`);
    console.log();

    // 测试 13: supervisor 审批（应失败）
    console.log('【测试 13】权限测试 - supervisor 审批（应失败）');
    const approveSupervisorRes = await request('POST', `/api/works/${workId}/workflow`, {
      action: 'approve',
      comment: 'supervisor 尝试审批'
    }, cookies.supervisor);
    console.log(`  状态码: ${approveSupervisorRes.statusCode}`);
    console.log(`  响应: ${JSON.stringify(approveSupervisorRes.body)}`);
    console.log(`  结果: ${approveSupervisorRes.statusCode === 400 || !approveSupervisorRes.body?.success ? '✅ 通过（被禁止）' : '❌ 失败'}`);
    console.log();
  }

  console.log('='.repeat(80));
  console.log('测试完成！');
  console.log('='.repeat(80));
}

runTests().catch(console.error);
