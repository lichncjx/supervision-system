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

async function test() {
  console.log('=== 测试 Reject 退回功能 ===\n');

  // 1. dept_manager 创建并提交
  let opts = { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } };
  let result = await makeRequest(opts, { username: 'dept_manager', password: '123456' });
  const cookie = extractCookie(result.headers);

  opts = { hostname: 'localhost', port: 5000, path: '/api/works', method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': cookie } };
  result = await makeRequest(opts, { type: 'TODO', title: 'Test Reject', departmentId: 2, proposedLeaderId: 1 });
  console.log('1. Create TODO:', result.body.id ? 'OK, id=' + result.body.id : 'FAIL');
  const workId = result.body.id;

  opts = { hostname: 'localhost', port: 5000, path: `/api/works/${workId}/workflow`, method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': cookie } };
  result = await makeRequest(opts, { action: 'submit' });
  console.log('2. Submit:', result.body.success ? 'OK, status=' + result.body.workItem?.status : 'FAIL');

  // 2. dept_leader 退回
  opts = { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } };
  result = await makeRequest(opts, { username: 'dept_leader', password: '123456' });
  const leaderCookie = extractCookie(result.headers);

  opts = { hostname: 'localhost', port: 5000, path: `/api/works/${workId}/workflow`, method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': leaderCookie } };
  result = await makeRequest(opts, { action: 'reject', rejectReason: '材料不完整' });
  console.log('3. Reject:', result.body.success ? 'OK, status=' + result.body.workItem?.status : 'FAIL');
  console.log('   rejectReason:', result.body.workItem?.rejectReason);

  // 3. 清理
  opts = { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } };
  result = await makeRequest(opts, { username: 'admin', password: '123456' });
  const adminCookie = extractCookie(result.headers);
  opts = { hostname: 'localhost', port: 5000, path: `/api/works/${workId}`, method: 'DELETE', headers: { 'Cookie': adminCookie } };
  result = await makeRequest(opts);
  console.log('4. Cleanup:', result.body.success ? 'OK' : 'FAIL');

  console.log('\n=== 测试完成 ===');
}

test().catch(console.error);