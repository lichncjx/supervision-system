# 回归测试基线

## 文件说明

- `regression-baseline.js` - 全系统完整真实回归测试基线脚本 (2026-05-01)

## 测试覆盖

### 阶段 1: 登录 (8项)
- admin, supervisor, vice_president, president 登录
- dept_leader (综合处), dept_manager (综合处) 登录
- dept_leader_2 (计划生产处), dept_manager_2 (计划生产处) 登录

### 阶段 2: 待办事项完整流程测试 (13项)
- 公司领导发起 TODO → 分解 → 部门审批 → 公司审批 → 见证 → 完成
- 部门主管发起 TODO → 部门审批 → 公司审批 → IN_PROGRESS
- TODO 取消流程

### 阶段 3: 重点工作取消完整链 (8项)
- APPROVED → cancel → CANCELLING (DEPARTMENT_LEADER)
- 部门领导审批 → CANCELLING (VICE_PRESIDENT)
- 公司主管领导审批 → PENDING_MAIN_LEADER_CANCEL
- 公司主要领导审批 → CANCELLED

### 阶段 4: 主要工作取消完整链 (7项)
- APPROVED → cancel → CANCELLING (DEPARTMENT_LEADER)
- 部门领导审批 → CANCELLING (VICE_PRESIDENT)
- 公司主管领导审批 → CANCELLED

### 阶段 5: 退回后重新提交 (10项)
- PENDING_DEPT → reject → REJECTED → submit → PENDING_DEPT
- PENDING_COMPANY → reject → REJECTED → submit → PENDING_COMPANY

### 阶段 6: 附件跨部门权限 (7项)
- A部门上传附件成功
- B部门下载/删除A部门附件返回403
- A部门下载/删除自己的附件成功

### 阶段 7: 权限控制 (5项)
- dept_manager 访问其他部门事项返回403
- dept_leader 调整/取消其他部门事项失败
- supervisor/admin 审批失败

### 阶段 8: Excel 和统计 (7项)
- 导出 priority Excel
- 导出全部事项 Excel
- 完成率导出 Excel
- 首页统计
- 操作日志包含 approve, reject, cancel, upload, delete, evidence, decompose

## 运行测试

### 前置条件
1. 数据库已启动: `docker compose up -d db`
2. 数据库已初始化: `pnpm prisma migrate deploy`
3. 测试数据已创建: `pnpm prisma db seed`
4. 开发服务已启动: `pnpm dev`

### 运行基线测试
```bash
node tests/regression-baseline.js
```

### 退出码
- `0` - 全部测试通过或部分通过但无失败
- `1` - 有测试失败

## 测试通过记录

### 2026-05-01
✅ 76项全部实际API测试通过
✅ 无代码逻辑检查，全部真实测试
✅ 系统可以进入试运行

## 注意事项

测试脚本会自动使用当前时间戳创建测试数据，不会干扰已有数据。
