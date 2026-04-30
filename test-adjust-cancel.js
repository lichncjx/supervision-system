const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, body: body, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function extractCookie(headers) {
  if (!headers || !headers['set-cookie']) return '';
  return headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
}

async function testAdjust() {
  console.log('=== 测试 Adjust 调整功能 ===\n');

  // 创建并提交
  let opts = { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } };
  let result = await makeRequest(opts, { username: 'dept_manager', password: '123456' });
  const cookie = extractCookie(result.headers);

  opts = { hostname: 'localhost', port: 5000, path: '/api/works', method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': cookie } };
  result = await makeRequest(opts, { type: 'PRIORITY', title: 'Test Adjust', departmentId: 2 });
  console.log('1. Create PRIORITY:', result.body.id ? 'OK, id=' + result.body.id : 'FAIL');
  const workId = result.body.id;

  // 提交审批
  opts = { hostname: 'localhost', port: 5000, path: `/api/works/${workId}/workflow`, method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': cookie } };
  result = await makeRequest(opts, { action: 'submit' });
  console.log('2. Submit:', result.body.success ? 'OK, status=' + result.body.workItem?.status : 'FAIL');

  // dept_leader 审批通过
  opts = { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } };
  result = await makeRequest(opts, { username: 'dept_leader', password: '123456' });
  const leaderCookie = extractCookie(result.headers);

  opts = { hostname: 'localhost', port: 5000, path: `/api/works/${workId}/workflow`, method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': leaderCookie } };
  result = await makeRequest(opts, { action: 'approve' });
  console.log('3. First Approve:', result.body.success ? 'OK, status=' + result.body.workItem?.status : 'FAIL');

  // vice_president 审批通过（立项）
  opts = { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } };
  result = await makeRequest(opts, { username: 'vice_president', password: '123456' });
  const vpCookie = extractCookie(result.headers);

  opts = { hostname: 'localhost', port: 5000, path: `/api/works/${workId}/workflow`, method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': vpCookie } };
  result = await makeRequest(opts, { action: 'approve' });
  console.log('4. Second Approve:', result.body.success ? 'OK, status=' + result.body.workItem?.status : 'FAIL');

  // dept_manager 申请调整
  opts = { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } };
  result = await makeRequest(opts, { username: 'dept_manager', password: '123456' });
  const cookie2 = extractCookie(result.headers);

  opts = { hostname: 'localhost', port: 5000, path: `/api/works/${workId}/workflow`, method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': cookie2 } };
  result = await makeRequest(opts, { action: 'adjust', adjustReason: '需要延期' });
  console.log('5. Submit Adjust:', result.body.success ? 'OK, status=' + result.body.workItem?.status : 'FAIL');

  // 清理
  opts = { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } };
  result = await makeRequest(opts, { username: 'admin', password: '123456' });
  const adminCookie = extractCookie(result.headers);
  opts = { hostname: 'localhost', port: 5000, path: `/api/works/${workId}`, method: 'DELETE', headers: { 'Cookie': adminCookie } };
  result = await makeRequest(opts);
  console.log('6. Cleanup:', result.body.success ? 'OK' : 'FAIL');
}

async function testCancel() {
  console.log('\n=== 测试 Cancel 取消功能 ===\n');

  let opts = { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } };
  let result = await makeRequest(opts, { username: 'dept_manager', password: '123456' });
  const cookie = extractCookie(result.headers);

  opts = { hostname: 'localhost', port: 5000, path: '/api/works', method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': cookie } };
  result = await makeRequest(opts, { type: 'TODO', title: 'Test Cancel', departmentId: 2, proposedLeaderId: 1 });
  console.log('1. Create TODO:', result.body.id ? 'OK, id=' + result.body.id : 'FAIL');
  const workId = result.body.id;

  // 提交并完成整个审批流程
  opts = { hostname: 'localhost', port: 5000, path: `/api/works/${workId}/workflow`, method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': cookie } };
  result = await makeRequest(opts, { action: 'submit' });

  opts = { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } };
  result = await makeRequest(opts, { username: 'dept_leader', password: '123456' });
  const leaderCookie = extractCookie(result.headers);
  opts = { hostname: 'localhost', port: 5000, path: `/api/works/${workId}/workflow`, method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': leaderCookie } };
  result = await makeRequest(opts, { action: 'approve' });

  // dept_manager 申请取消
  opts = { hostname: 'localhost', port: 5000, path: `/api/works/${workId}/workflow`, method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': cookie } };
  result = await makeRequest(opts, { action: 'cancel', cancelReason: '计划变更' });
  console.log('2. Submit Cancel:', result.body.success ? 'OK, status=' + result.body.workItem?.status : 'FAIL');

  // 清理
  opts = { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } };
  result = await makeRequest(opts, { username: 'admin', password: '123456' });
  const adminCookie = extractCookie(result.headers);
  opts = { hostname: 'localhost', port: 5000, path: `/api/works/${workId}`, method: 'DELETE', headers: { 'Cookie': adminCookie } };
  result = await makeRequest(opts);
  console.log('3. Cleanup:', result.body.success ? 'OK' : 'FAIL');
}

async function test() {
  await testAdjust();
  await testCancel();
  console.log('\n=== 所有测试完成 ===');
}

test().catch(console.error);