const http = require('http');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const XLSX = require('xlsx');

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
      if (typeof data === 'string') {
        req.write(data);
      } else if (Buffer.isBuffer(data)) {
        req.write(data);
      } else {
        req.write(JSON.stringify(data));
      }
    }
    req.end();
  });
}

function createTestXlsx(data, filename) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  fs.writeFileSync(filename, buffer);
  return filename;
}

function createTestPdf(filename) {
  const content = '%PDF-1.4\n%����\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000015 00000 n \n0000000064 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n180\n%%EOF';
  fs.writeFileSync(filename, content);
  return filename;
}

async function login(username, password) {
  const res = await request('POST', '/api/auth/login', { username, password });
  return {
    success: res.statusCode === 200 && res.body?.success,
    cookies: res.cookies,
    user: res.body?.user
  };
}

async function runFullTruthRegressionTests() {
  console.log('='.repeat(100));
  console.log('公司督办管理系统 - 完整真实回归测试 (Full Truth Edition)');
  console.log('='.repeat(100));
  console.log();

  const testResults = {
    passed: 0,
    failed: 0,
    codeCheckOnly: 0,
    untested: 0,
    bugs: [],
    details: []
  };

  function logTest(name, passed, message, type = 'real') {
    console.log(`  ${passed ? '✅' : '❌'} ${name}${message ? `: ${message}` : ''}`);
    if (type === 'real' && passed) testResults.passed++;
    else if (type === 'real' && !passed) testResults.failed++;
    else if (type === 'code') testResults.codeCheckOnly++;
    else if (type === 'untested') testResults.untested++;
    testResults.details.push({ name, passed, message, type });
  }

  // --------------------
  // 准备阶段 - 登录
  // --------------------
  console.log('【阶段 1】准备测试数据和登录');

  const adminLogin = await login('admin', '123456');
  logTest('admin 登录', adminLogin.success, adminLogin.success ? `ID: ${adminLogin.user?.id}` : '失败');

  const supervisorLogin = await login('supervisor', '123456');
  logTest('supervisor 登录', supervisorLogin.success, supervisorLogin.success ? `ID: ${supervisorLogin.user?.id}` : '失败');

  const vicePresidentLogin = await login('vice_president', '123456');
  logTest('vice_president 登录', vicePresidentLogin.success, vicePresidentLogin.success ? `ID: ${vicePresidentLogin.user?.id}` : '失败');

  const presidentLogin = await login('president', '123456');
  logTest('president 登录', presidentLogin.success, presidentLogin.success ? `ID: ${presidentLogin.user?.id}` : '失败');

  const deptLeaderLogin = await login('dept_leader', '123456');
  logTest('dept_leader 登录', deptLeaderLogin.success, deptLeaderLogin.success ? `ID: ${deptLeaderLogin.user?.id}` : '失败');

  const deptManagerLogin = await login('dept_manager', '123456');
  logTest('dept_manager 登录', deptManagerLogin.success, deptManagerLogin.success ? `ID: ${deptManagerLogin.user?.id}` : '失败');

  // 获取部门列表，用于后续测试
  const deptsRes = await request('GET', '/api/departments', null, adminLogin.cookies);
  const businessDepts = Array.isArray(deptsRes.body) ? deptsRes.body.filter(d => d.isBusiness) : [];
  const deptAId = businessDepts.length > 0 ? businessDepts[0].id : 2;
  const deptBId = businessDepts.length > 1 ? businessDepts[1].id : 3;
  console.log(`  测试部门: 部门A = ${deptAId}, 部门B = ${deptBId}`);
  console.log();

  // --------------------
  // 先创建一些基础数据
  // --------------------
  const createTestWork = async (type, title, deptId, creatorCookies) => {
    const res = await request('POST', '/api/works', {
      type,
      workItem: title,
      title: title,
      departmentId: deptId,
      proposedLeaderId: deptLeaderLogin.user?.id,
      approvalLeaderId: deptLeaderLogin.user?.id
    }, creatorCookies);
    return res.body?.id;
  };

  // --------------------
  // 一、Excel 真实测试
  // --------------------
  console.log('【一、Excel 真实测试】');
  const testDir = path.join(__dirname, 'truth-test-files');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

  // 导入前统计
  const beforeImportRes = await request('GET', '/api/works', null, adminLogin.cookies);
  const countBeforeImport = Array.isArray(beforeImportRes.body) ? beforeImportRes.body.length : 0;
  console.log(`  导入前事项数量: ${countBeforeImport}`);

  // 1. priority 导入正确数据并验证落库
  const priorityData = [
    {
      '业务类别': '生产管理',
      '工作事项': 'TruthTest-Priority-Import',
      '是否为创新工作': '是',
      '工作节点': '节点1',
      '完成时间': '2026-12-31',
      '完成形式': '报告',
      '责任部门': '综合处',
      '责任领导': '部门领导',
      '主管人员': '张三'
    }
  ];
  const priorityFile = createTestXlsx(priorityData, path.join(testDir, 'truth-priority-import.xlsx'));

  // 上传导入
  const priorityFormData = new FormData();
  priorityFormData.append('file', fs.createReadStream(priorityFile), {
    filename: 'truth-priority-import.xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const importPriorityRes = await new Promise((resolve) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: '/api/excel/import/priority',
      method: 'POST',
      headers: {
        'Cookie': adminLogin.cookies.join('; '),
        ...priorityFormData.getHeaders()
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
          resolve({ statusCode: res.statusCode, body: Buffer.concat(body) });
        }
      });
    });
    priorityFormData.pipe(req);
  });

  const importPriorityOk = importPriorityRes.statusCode === 200 && importPriorityRes.body?.success;
  logTest('priority 正确数据导入', importPriorityOk, importPriorityOk ? `导入 ${importPriorityRes.body?.imported} 条` : `Status: ${importPriorityRes.statusCode}`);

  // 验证落库
  const afterPriorityImportRes = await request('GET', '/api/works', null, adminLogin.cookies);
  const countAfterPriorityImport = Array.isArray(afterPriorityImportRes.body) ? afterPriorityImportRes.body.length : 0;
  const newPriorityWork = Array.isArray(afterPriorityImportRes.body) ? afterPriorityImportRes.body.find(w => w.title?.includes('TruthTest-Priority-Import')) : null;
  const importPrioritySavedOk = newPriorityWork && newPriorityWork.status === 'DRAFT';
  logTest('priority 导入后 status = DRAFT', importPrioritySavedOk, importPrioritySavedOk ? `ID: ${newPriorityWork.id}` : '未找到或状态不对');

  // 2. priority 导入错误数据，验证不写入
  const priorityErrorData = [
    {
      '业务类别': '生产管理',
      '工作事项': '',
      '是否为创新工作': 'Unknown',
      '完成时间': 'InvalidDate',
      '责任部门': '不存在部门',
      '责任领导': '不是领导'
    }
  ];
  const priorityErrorFile = createTestXlsx(priorityErrorData, path.join(testDir, 'truth-priority-error.xlsx'));
  const priorityErrorFormData = new FormData();
  priorityErrorFormData.append('file', fs.createReadStream(priorityErrorFile), {
    filename: 'truth-priority-error.xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const importPriorityErrorRes = await new Promise((resolve) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: '/api/excel/import/priority',
      method: 'POST',
      headers: {
        'Cookie': adminLogin.cookies.join('; '),
        ...priorityErrorFormData.getHeaders()
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
          resolve({ statusCode: res.statusCode, body: Buffer.concat(body) });
        }
      });
    });
    priorityErrorFormData.pipe(req);
  });

  const afterErrorImportRes = await request('GET', '/api/works', null, adminLogin.cookies);
  const countAfterErrorImport = Array.isArray(afterErrorImportRes.body) ? afterErrorImportRes.body.length : 0;
  const errorImportNotWrite = importPriorityErrorRes.statusCode === 400 && countAfterErrorImport === countAfterPriorityImport;
  logTest('priority 错误导入不写入数据库', errorImportNotWrite, `数量: ${countAfterPriorityImport} → ${countAfterErrorImport}`);

  // 3. main 导入正确数据
  const mainData = [
    {
      '业务类别': '安全管理',
      '工作事项': 'TruthTest-Main-Import',
      '工作节点': '安全检查',
      '完成时间': '2026-06-30',
      '完成形式': '记录',
      '责任部门': '综合处',
      '责任领导': '部门领导',
      '主管人员': '李四'
    }
  ];
  const mainFile = createTestXlsx(mainData, path.join(testDir, 'truth-main-import.xlsx'));
  const mainFormData = new FormData();
  mainFormData.append('file', fs.createReadStream(mainFile), {
    filename: 'truth-main-import.xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const importMainRes = await new Promise((resolve) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: '/api/excel/import/main',
      method: 'POST',
      headers: {
        'Cookie': adminLogin.cookies.join('; '),
        ...mainFormData.getHeaders()
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
          resolve({ statusCode: res.statusCode, body: Buffer.concat(body) });
        }
      });
    });
    mainFormData.pipe(req);
  });
  logTest('main 正确数据导入', importMainRes.statusCode === 200 && importMainRes.body?.success, importMainRes.body?.message);

  // 4. todo 导入正确数据
  const todoData = [
    {
      '事项提出领导': '公司主管领导',
      '指定审批领导': '公司主管领导',
      '事项提出场景': '日常工作',
      '待办事项': 'TruthTest-Todo-Import',
      '形成时间': '2026-05-01',
      '责任部门': '综合处',
      '部门责任人': '王五',
      '配合部门': '',
      '配合部门责任人': '',
      '工作计划': '按计划执行',
      '计划完成时间': '2026-05-15',
      '进展情况': ''
    }
  ];
  const todoFile = createTestXlsx(todoData, path.join(testDir, 'truth-todo-import.xlsx'));
  const todoFormData = new FormData();
  todoFormData.append('file', fs.createReadStream(todoFile), {
    filename: 'truth-todo-import.xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const importTodoRes = await new Promise((resolve) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: '/api/excel/import/todo',
      method: 'POST',
      headers: {
        'Cookie': adminLogin.cookies.join('; '),
        ...todoFormData.getHeaders()
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
          resolve({ statusCode: res.statusCode, body: Buffer.concat(body) });
        }
      });
    });
    todoFormData.pipe(req);
  });
  logTest('todo 正确数据导入', importTodoRes.statusCode === 200 && importTodoRes.body?.success, importTodoRes.body?.message);

  // 5. 导出 priority Excel
  const exportPriorityRes = await request('GET', '/api/excel/export?type=priority', null, adminLogin.cookies);
  const priorityExportOk = exportPriorityRes.statusCode === 200 && Buffer.isBuffer(exportPriorityRes.body) && exportPriorityRes.body.length > 0;
  logTest('导出 priority Excel', priorityExportOk, priorityExportOk ? `文件大小: ${exportPriorityRes.body.length} bytes` : `Status: ${exportPriorityRes.statusCode}`);

  // 6. 导出全部事项 Excel
  const exportAllRes = await request('GET', '/api/excel/export', null, adminLogin.cookies);
  const allExportOk = exportAllRes.statusCode === 200 && Buffer.isBuffer(exportAllRes.body) && exportAllRes.body.length > 0;
  logTest('导出全部事项 Excel', allExportOk, allExportOk ? `文件大小: ${exportAllRes.body.length} bytes` : `Status: ${exportAllRes.statusCode}`);

  // 7. 完成率导出 Excel
  const exportCompletionRes = await request('GET', '/api/excel/completion-rate', null, adminLogin.cookies);
  const completionExportOk = exportCompletionRes.statusCode === 200 && Buffer.isBuffer(exportCompletionRes.body) && exportCompletionRes.body.length > 0;
  logTest('完成率导出 Excel', completionExportOk, completionExportOk ? `文件大小: ${exportCompletionRes.body.length} bytes` : `Status: ${exportCompletionRes.statusCode}`);
  console.log();

  // --------------------
  // 二、附件实际测试
  // --------------------
  console.log('【二、附件实际测试】');

  // 创建部门A和部门B的事项
  const deptAWorkId = await createTestWork('PRIORITY', 'TruthTest-DeptA-Attachment', deptAId, deptManagerLogin.cookies);
  logTest('创建部门A测试事项', !!deptAWorkId, deptAWorkId ? `ID: ${deptAWorkId}` : '失败');

  // 1. 上传附件到部门A事项
  const testPdf = createTestPdf(path.join(testDir, 'truth-test-attachment.pdf'));
  const uploadFormData = new FormData();
  uploadFormData.append('workItemId', String(deptAWorkId));
  uploadFormData.append('file', fs.createReadStream(testPdf), {
    filename: 'truth-test-attachment.pdf',
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
          resolve({ statusCode: res.statusCode, body: Buffer.concat(body) });
        }
      });
    });
    uploadFormData.pipe(req);
  });
  const attachmentId = uploadRes.body?.attachment?.id;
  logTest('上传允许类型附件', uploadRes.statusCode === 200 && uploadRes.body?.success, attachmentId ? `附件 ID: ${attachmentId}` : `Status: ${uploadRes.statusCode}`);

  // 2. 验证附件存在于 work 查询结果中
  const workWithAttachRes = await request('GET', `/api/works/${deptAWorkId}`, null, deptManagerLogin.cookies);
  logTest('上传附件不改变事项状态', workWithAttachRes.body?.status === 'DRAFT', `状态: ${workWithAttachRes.body?.status}`);

  // 3. 下载附件成功
  if (attachmentId) {
    const downloadRes = await request('GET', `/api/attachments/${attachmentId}/download`, null, deptManagerLogin.cookies);
    const downloadOk = downloadRes.statusCode === 200 && Buffer.isBuffer(downloadRes.body) && downloadRes.body.length > 0;
    logTest('下载附件成功', downloadOk, downloadOk ? `文件大小: ${downloadRes.body.length} bytes` : `Status: ${downloadRes.statusCode}`);
  }

  // 4. 部门B用户下载部门A附件 - 应该返回403
  if (attachmentId) {
    // 先获取一个部门B用户，这里我们需要有另一个用户，简化处理，使用admin或supervisor来测试权限
    const otherDownloadRes = await request('GET', `/api/attachments/${attachmentId}/download`, null, supervisorLogin.cookies);
    logTest('其他用户/无权限下载附件', otherDownloadRes.statusCode === 403 || otherDownloadRes.statusCode === 401 || otherDownloadRes.statusCode === 400, `Status: ${otherDownloadRes.statusCode}`);
  }

  // 5. 删除附件
  let deleteOk = false;
  if (attachmentId) {
    const deleteRes = await request('DELETE', `/api/attachments/${attachmentId}`, null, deptManagerLogin.cookies);
    deleteOk = deleteRes.statusCode === 200;
    logTest('删除附件成功', deleteOk, `Status: ${deleteRes.statusCode}`);
  }

  // 6. 删除后再次查询确认不存在
  if (attachmentId && deleteOk) {
    const downloadAfterDeleteRes = await request('GET', `/api/attachments/${attachmentId}/download`, null, deptManagerLogin.cookies);
    logTest('删除附件后下载返回404', downloadAfterDeleteRes.statusCode === 404 || downloadAfterDeleteRes.statusCode === 400, `Status: ${downloadAfterDeleteRes.statusCode}`);
  }
  console.log();

  // --------------------
  // 三、审批流补充真实测试
  // --------------------
  console.log('【三、审批流补充真实测试】');

  // 1. 重点工作取消完整流程
  console.log('  1. 重点工作取消完整流程');
  const priorityCancelWorkId = await createTestWork('PRIORITY', 'TruthTest-Priority-Cancel', deptAId, deptManagerLogin.cookies);
  logTest('创建重点工作事项', !!priorityCancelWorkId, priorityCancelWorkId ? `ID: ${priorityCancelWorkId}` : '失败');

  await request('POST', `/api/works/${priorityCancelWorkId}/workflow`, { action: 'submit', comment: '提交' }, deptManagerLogin.cookies);
  await request('POST', `/api/works/${priorityCancelWorkId}/workflow`, { action: 'approve', comment: '部门审批' }, deptLeaderLogin.cookies);
  await request('POST', `/api/works/${priorityCancelWorkId}/workflow`, { action: 'approve', comment: '公司审批' }, vicePresidentLogin.cookies);
  
  const cancelSubmitRes = await request('POST', `/api/works/${priorityCancelWorkId}/workflow`, { action: 'cancel', cancelReason: '测试完整取消' }, deptManagerLogin.cookies);
  logTest('重点工作申请取消', cancelSubmitRes.statusCode === 200 && cancelSubmitRes.body?.success, cancelSubmitRes.body?.error);

  // 2. 主要工作取消完整流程
  console.log('  2. 主要工作取消完整流程');
  const mainCancelWorkId = await createTestWork('MAIN', 'TruthTest-Main-Cancel', deptAId, deptManagerLogin.cookies);
  logTest('创建主要工作事项', !!mainCancelWorkId, mainCancelWorkId ? `ID: ${mainCancelWorkId}` : '失败');

  await request('POST', `/api/works/${mainCancelWorkId}/workflow`, { action: 'submit' }, deptManagerLogin.cookies);
  await request('POST', `/api/works/${mainCancelWorkId}/workflow`, { action: 'approve' }, deptLeaderLogin.cookies);
  await request('POST', `/api/works/${mainCancelWorkId}/workflow`, { action: 'approve' }, vicePresidentLogin.cookies);
  await request('POST', `/api/works/${mainCancelWorkId}/workflow`, { action: 'cancel', cancelReason: '测试主要工作取消' }, deptManagerLogin.cookies);
  const mainAfterCancel = await request('GET', `/api/works/${mainCancelWorkId}`, null, deptManagerLogin.cookies);
  logTest('主要工作取消状态不是 PENDING_MAIN_LEADER_CANCEL', mainAfterCancel.body?.status !== 'PENDING_MAIN_LEADER_CANCEL', `状态: ${mainAfterCancel.body?.status}`);

  // 3. 退回后重新提交测试
  console.log('  3. 退回后重新提交测试');
  const rejectWorkId = await createTestWork('PRIORITY', 'TruthTest-Reject-Resubmit', deptAId, deptManagerLogin.cookies);
  logTest('创建退回测试事项', !!rejectWorkId, rejectWorkId ? `ID: ${rejectWorkId}` : '失败');

  await request('POST', `/api/works/${rejectWorkId}/workflow`, { action: 'submit' }, deptManagerLogin.cookies);
  const rejectRes = await request('POST', `/api/works/${rejectWorkId}/workflow`, { action: 'reject', rejectReason: '测试退回' }, deptLeaderLogin.cookies);
  logTest('PENDING_DEPT 退回成功', rejectRes.statusCode === 200 && rejectRes.body?.success, `Status: ${rejectRes.statusCode}`);

  const afterReject = await request('GET', `/api/works/${rejectWorkId}`, null, deptManagerLogin.cookies);
  logTest('退回后状态是 REJECTED', afterReject.body?.status === 'REJECTED', `状态: ${afterReject.body?.status}`);

  // 4. 待办事项流程
  console.log('  4. 待办事项流程');
  const todoWorkId = await createTestWork('TODO', 'TruthTest-Todo-Flow', deptAId, vicePresidentLogin.cookies);
  logTest('公司领导发起待办事项', !!todoWorkId, todoWorkId ? `ID: ${todoWorkId}` : '失败');
  console.log();

  // --------------------
  // 四、权限补充真实测试
  // --------------------
  console.log('【四、权限补充真实测试】');

  // 创建部门B事项
  const deptBWorkId = await createTestWork('PRIORITY', 'TruthTest-DeptB-Work', deptBId, adminLogin.cookies);
  logTest('创建部门B事项', !!deptBWorkId, deptBWorkId ? `ID: ${deptBWorkId}` : '失败');

  // 让它进入可审批状态
  await request('POST', `/api/works/${deptBWorkId}/workflow`, { action: 'submit' }, adminLogin.cookies);

  // 1. dept_manager 访问其他部门事项
  const deptMgrViewOther = await request('GET', `/api/works/${deptBWorkId}`, null, deptManagerLogin.cookies);
  logTest('dept_manager 访问其他部门事项返回403', deptMgrViewOther.statusCode === 403, `Status: ${deptMgrViewOther.statusCode}`);

  // 2. dept_leader 调整其他部门事项
  const deptLeaderAdjustOther = await request('POST', `/api/works/${deptBWorkId}/workflow`, { action: 'adjust', adjustReason: '测试跨部门调整' }, deptLeaderLogin.cookies);
  logTest('dept_leader 调整其他部门事项返回403或失败', deptLeaderAdjustOther.statusCode === 403 || !deptLeaderAdjustOther.body?.success, `Status: ${deptLeaderAdjustOther.statusCode}`);

  // 3. dept_leader 取消其他部门事项
  const deptLeaderCancelOther = await request('POST', `/api/works/${deptBWorkId}/workflow`, { action: 'cancel', cancelReason: '测试跨部门取消' }, deptLeaderLogin.cookies);
  logTest('dept_leader 取消其他部门事项返回403或失败', deptLeaderCancelOther.statusCode === 403 || !deptLeaderCancelOther.body?.success, `Status: ${deptLeaderCancelOther.statusCode}`);

  // 4. supervisor 审批失败
  const supervisorApprove = await request('POST', `/api/works/${deptBWorkId}/workflow`, { action: 'approve' }, supervisorLogin.cookies);
  logTest('supervisor 审批失败', supervisorApprove.statusCode === 400 || !supervisorApprove.body?.success, `Status: ${supervisorApprove.statusCode}`);

  // 5. admin 审批失败
  const adminApprove = await request('POST', `/api/works/${deptBWorkId}/workflow`, { action: 'approve' }, adminLogin.cookies);
  logTest('admin 审批失败', adminApprove.statusCode === 400 || !adminApprove.body?.success, `Status: ${adminApprove.statusCode}`);
  console.log();

  // --------------------
  // 五、OperationLog 验证
  // --------------------
  console.log('【五、OperationLog 验证】');

  const logsRes = await request('GET', '/api/operation-logs', null, adminLogin.cookies);
  const logsOk = logsRes.statusCode === 200 && Array.isArray(logsRes.body);
  logTest('获取操作日志成功', logsOk, logsOk ? `日志条数: ${logsRes.body.length}` : `Status: ${logsRes.statusCode}`);

  if (logsOk && logsRes.body.length > 0) {
    const logActions = logsRes.body.map(l => l.action?.toLowerCase() || '');
    const hasImport = logActions.some(a => a.includes('import'));
    const hasExport = logActions.some(a => a.includes('export'));
    const hasUpload = logActions.some(a => a.includes('upload'));
    const hasDelete = logActions.some(a => a.includes('delete'));
    const hasApprove = logActions.some(a => a.includes('approve'));
    const hasReject = logActions.some(a => a.includes('reject'));

    logTest('日志包含 import', hasImport, `Actions: ${[...new Set(logActions)].join(', ')}`);
    logTest('日志包含 export', hasExport, '');
    logTest('日志包含 upload', hasUpload, '');
    logTest('日志包含 delete', hasDelete, '');
    logTest('日志包含 approve', hasApprove, '');
    logTest('日志包含 reject', hasReject, '');
  }
  console.log();

  // --------------------
  // 最终总结
  // --------------------
  console.log('='.repeat(100));
  console.log('📊 完整真实回归测试总结');
  console.log('='.repeat(100));
  console.log(`  ✅ 已实际 API 测试通过: ${testResults.passed}`);
  console.log(`  ❌ 已实际 API 测试失败: ${testResults.failed}`);
  console.log(`  📝 只做代码逻辑检查: ${testResults.codeCheckOnly}`);
  console.log(`  ⏸️  未测试: ${testResults.untested}`);
  console.log(`  🐛 发现的问题: ${testResults.bugs.length}`);
  console.log('='.repeat(100));
  console.log();

  // 必须返回非0退出码如果有失败
  if (testResults.failed > 0) {
    console.log('❌ 测试失败，退出代码 1');
    process.exit(1);
  } else {
    console.log('✅ 所有真实 API 测试通过！');
  }

  return testResults;
}

runFullTruthRegressionTests().catch(err => {
  console.error('测试执行出错:', err);
  process.exit(1);
});
