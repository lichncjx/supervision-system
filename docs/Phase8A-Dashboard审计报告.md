# Phase 8A：Dashboard 模块现状审计与统计口径对齐地图

审计日期：2026-05-11

---

## 1. 当前 Dashboard 相关文件清单和行数

| 文件 | 行数 | 类型 |
|------|------|------|
| `src/lib/dashboard-data.ts` | 395 | 核心业务逻辑（查询+统计+排序） |
| `src/app/api/dashboard/route.ts` | 26 | API Route（首页数据） |
| `src/app/api/dashboard/summary/route.ts` | 23 | API Route（统计摘要） |
| `src/app/api/dashboard/completion-rate/route.ts` | 175 | API Route（完成率统计） |
| `src/features/excel/application/export-completion-rate.usecase.ts` | ~125 | Excel 完成率导出（含 `getDepartmentStats`） |
| `src/features/excel/infrastructure/completion-rate.repository.ts` | ~50 | Excel 完成率 Prisma 查询 |
| `src/features/excel/infrastructure/completion-rate-exporter.ts` | ~55 | Excel 完成率 xlsx 生成 |
| **合计** | **~850** | |

---

## 2. 每个接口的职责说明

### `GET /api/dashboard`（26 行）

直接调用 `getDashboardData(currentUser, { limit })` 并返回 JSON：
- `summary`：统计摘要对象
- `lists.expiringAndOverdue`：临超期事项列表（去重，最多limit条）
- `lists.myActionRequired`：待我处理列表（待审批+待办理，最多limit条）
- limit 默认值：5，最大值：100

### `GET /api/dashboard/summary`（23 行）

调用 `getDashboardSummary(currentUser)` = `getDashboardData(currentUser, { limit: 1 }).summary`，只返回统计摘要。

### `GET /api/dashboard/completion-rate`（175 行）

按部门计算完成率，返回 `{ items: DepartmentStats[], total: number }`：
- 使用 `buildWorkVisibilityWhere` 做可见性过滤
- 按角色确定部门范围（全局角色→所有业务部门；部门角色→本部门；其他→可见事项涉及部门）
- `getDepartmentStats` 函数计算每个部门的完成率

### Excel `exportCompletionRateUseCase`（Phase 6D）

与 dashboard completion-rate **几乎相同**的统计逻辑，但：
- 仅 ADMIN/SUPERVISOR 可访问
- 不对 workItem 做可见性过滤（`prisma.workItem.findMany({ AND: [{ departmentId }, dateFilter] })`）
- 输出 xlsx 而非 JSON

---

## 3. dashboard/route.ts 返回结构

```ts
{
  summary: DashboardSummary,  // 见 §3b
  lists: {
    expiringAndOverdue: WorkDashboardItem[],   // 去重后的临超期列表
    myActionRequired: WorkDashboardItem[],     // 待审批 + 待办理
  }
}
```

`WorkDashboardItem` 字段（15 个）：
`id, title, type, typeLabel, status, statusLabel, departmentName, responsibleLeader, responsiblePerson, cooperators, completeTime, planCompleteTime, dueTime, isOverdue, isExpiring, actionType, currentApproverName`

---

## 4. dashboard/summary/route.ts 返回结构

`DashboardSummary` 对象（22 个数字字段）：

| 字段 | 含义 |
|------|------|
| `total` | 可见事项总数 |
| `priorityTotal` / `mainTotal` / `todoTotal` | 各类型事项数 |
| `priorityCompleted` / `mainCompleted` / `todoCompleted` | 各类型已完成数 |
| `pendingApprovalCount` | 待审批数 |
| `pendingHandlingCount` | 待办理数 |
| `myActionRequiredCount` | = pendingApprovalCount + pendingHandlingCount |
| `inProgressCount` / `completingCount` / `completedCount` / `cancelledCount` | 各状态事项数 |
| `expiringCount` / `overdueCount` | 临期/超期数 |
| `approving ~ overdue` | 与上面重复的别名字段 |
| `thisMonthDue` | = expiringCount |

---

## 5. dashboard/completion-rate/route.ts 返回结构

```ts
{
  items: DepartmentStats[],   // 按部门完成率数组
  total: number               // items 长度
}
```

`DepartmentStats`（15 个字段）：
`departmentId, departmentName, priorityTotal, priorityCompleted, priorityRate, mainTotal, mainCompleted, mainRate, todoTotal, todoCompleted, todoRate, total, completed, cancelled, overdue, completionRate`

---

## 6. src/lib/dashboard-data.ts 当前导出

### 导出类型（3 个）
| 名称 | 说明 |
|------|------|
| `DashboardSummary` | 22 个汇总数字字段 |
| `WorkDashboardItem` | 列表项（15 字段） |
| `DashboardData` | `{ summary, lists: { expiringAndOverdue, myActionRequired } }` |
| `DashboardDataOptions` | `{ limit?: number }` |

### 导出函数（2 个）
| 函数 | 说明 |
|------|------|
| `getDashboardData(user, options?)` | 查询→过滤→统计→排序→返回 |
| `getDashboardSummary(user)` | = `getDashboardData().summary` |

### 内部函数/常量（不导出）
- `EXPIRING_DAYS = 7`
- `IN_PROGRESS_STATUSES` / `COMPLETING_STATUSES` / `COMPLETED_STATUSES` / `CANCELLED_STATUSES` / `TERMINAL_STATUSES`
- `DEFAULT_LIST_LIMIT = 5` / `MAX_LIST_LIMIT = 100`
- `dashboardWorkSelect`（Prisma select，13 字段 + 2 include）
- `DashboardWork`（内部类型）
- `normalizeLimit` / `serializeDate` / `getWorkDueDate` / `isOverdueWorkItem` / `isExpiringWorkItem`
- `getTypeLabel` / `getActionType` / `parseCooperators` / `toDashboardItem`
- `compareDueDate` / `sortExpiringAndOverdue` / `actionPriority` / `sortMyActionRequired`
- `buildSummary`

---

## 7. Prisma 查询分布

| 位置 | 查询 |
|------|------|
| `dashboard-data.ts` L351-354 | `prisma.workItem.findMany`（`buildWorkVisibilityWhere` + `dashboardWorkSelect`） |
| `dashboard/completion-rate/route.ts` L56-58 | `prisma.workItem.findMany`（`{ AND: [visibilityWhere, { departmentId }, dateFilter] }`） |
| `dashboard/completion-rate/route.ts` L129-134 | `prisma.department.findMany`（`{ isBusiness: true }`） |
| `excel/completion-rate.repository.ts` | `prisma.workItem.findMany`（`{ AND: [{ departmentId }, dateFilter] }`） |
| `excel/completion-rate.repository.ts` | `prisma.department.findMany`（`{ isBusiness: true }`） |

---

## 8-9. Excel completion-rate 与 Dashboard completion-rate 口径对比

| 口径 | Dashboard completion-rate | Excel completion-rate | 一致？ |
|------|--------------------------|----------------------|--------|
| **业务部门范围** | 按角色：全局→所有业务部门；部门→本部门；其他→可见事项涉及部门 | 所有 `isBusiness: true` 部门 | **不一致** |
| **可见性过滤** | 含 `buildWorkVisibilityWhere` | 不含 | **不一致** |
| **重点工作完成率** | `priorityCompleted / priorityTotal * 100` | 同 | ✅ 公式同 |
| **主要工作完成率** | `mainCompleted / mainTotal * 100` | 同 | ✅ |
| **待办事项完成率** | `todoCompleted / todoTotal * 100` | 同 | ✅ |
| **总完成率** | `completed / (total - cancelled) * 100` | 同 | ✅ |
| **已完成状态** | `status === 'COMPLETED'` | 同 | ✅ |
| **已取消状态** | `status === 'CANCELLED'` | 同 | ✅ |
| **超期状态** | TODO→planCompleteTime，其他→completeTime | 同 | ✅ |
| **分母是否包含取消** | 否（`validTotal = total - cancelled`） | 同 | ✅ |
| **精度** | `Math.round((completed / validTotal) * 10000) / 100` | 同 | ✅ |

**结论**：核心计算口径（完成/取消/超期判定、完成率公式）**完全一致**，但数据范围（可见性、部门选择）**不同**。两处 `getDepartmentStats` 函数存在约 90% 重叠代码。

---

## 10. 当前 Dashboard 是否写 operationLog

**不写。** Dashboard 和 dashboard/summary 接口均不写 operationLog。只有 `dashboard/completion-rate` 和 Excel completion-rate 写 operationLog（在导出时）。

---

## 11. 建议迁移到 `features/dashboard/domain/`

| 原位置 | 逻辑 | 建议文件 |
|--------|------|----------|
| `dashboard-data.ts` L32-53 | `dashboardWorkSelect` 常量 | 可留 infrastructure |
| `dashboard-data.ts` L55-76 | `DashboardWork` 类型 | `domain/dashboard.types.ts` |
| `dashboard-data.ts` L78-104 | `DashboardSummary` 接口 | `domain/dashboard.types.ts` |
| `dashboard-data.ts` L106-124 | `WorkDashboardItem` 接口 | `domain/dashboard.types.ts` |
| `dashboard-data.ts` L126-136 | `DashboardData` / `DashboardDataOptions` | `domain/dashboard.types.ts` |
| `dashboard-data.ts` L12-27 | 状态常量组 | `domain/dashboard.constants.ts` |
| `dashboard-data.ts` L147-174 | `getWorkDueDate` / `isOverdueWorkItem` / `isExpiringWorkItem` | `domain/dashboard.rules.ts`（或 `completion-rate.rules.ts`） |
| `dashboard-data.ts` L176-201 | `getTypeLabel` / `getActionType` / `parseCooperators` / `toDashboardItem` | `domain/dashboard.rules.ts` |
| `dashboard-data.ts` L232-275 | 排序函数 | `domain/dashboard.rules.ts` |
| `dashboard-data.ts` L277-343 | `buildSummary` | `domain/dashboard.rules.ts` |
| 两个 completion-rate 的 `getDepartmentStats` | 完成率计算 | **建议提升为 `shared/completion-rate.rules.ts`** |

---

## 12. 建议迁移到 `features/dashboard/application/`

| 原位置 | 逻辑 | 建议文件 |
|--------|------|----------|
| `dashboard-data.ts` L345-394 | `getDashboardData` | `application/get-dashboard-data.usecase.ts` |
| `dashboard-data.ts` L391-394 | `getDashboardSummary` | `application/get-dashboard-summary.usecase.ts` |
| `dashboard/completion-rate/route.ts` 编排 | GET handler 编排 | `application/get-completion-rate.usecase.ts` |

---

## 13. 建议迁移到 `features/dashboard/infrastructure/`

| 原位置 | 逻辑 | 建议文件 |
|--------|------|----------|
| `dashboard-data.ts` L351-354 | `prisma.workItem.findMany` | `infrastructure/dashboard.repository.ts` |
| `dashboard/completion-rate/route.ts` | Prisma 查询 | `infrastructure/dashboard.repository.ts` |

---

## 14. 建议迁移到 `features/dashboard/presentation/`

| 原位置 | 逻辑 | 建议文件 |
|--------|------|----------|
| 三个 API route 的 DTO 类型 | input/output 类型 | `presentation/dashboard.dto.ts` |

---

## 15. 可与 features/excel 复用的逻辑

| 逻辑 | Excel 位置 | Dashboard 位置 | 复用建议 |
|------|-----------|---------------|----------|
| `getDepartmentStats` | `export-completion-rate.usecase.ts` | `dashboard/completion-rate/route.ts` | **提升为 `shared/completion-rate.rules.ts`** |
| `isCompleted`/`isCancelled`/`isOverdue` | usecase 内 | route 内 | 同上 |
| `completionRate`/`priorityRate` 等公式 | usecase 内 | route 内 | 同上 |
| `TERMINAL_STATUSES` | `excel-export.rules.ts`（计划中） | `dashboard-data.ts` | 已在 `work-status.rules.ts` |
| `getDueDate` | usecase 内 | `dashboard-data.ts` | 统一位置 |

---

## 16. 是否建议把 completion-rate 提升为共享规则

**强烈建议。** `getDepartmentStats` 及其内部的 `isCompleted`/`isCancelled`/`isOverdue`/`completionRate` 公式在两处有几乎相同的实现（约 60 行重复代码）。

建议方案：
- 新建 `src/shared/completion-rate.rules.ts`（或 `src/features/dashboard/domain/completion-rate.rules.ts`）
- 包含 `calculateDepartmentStats`（接受 works 数组、departmentId、departmentName）
- Excel 和 Dashboard 双方调用同一函数
- 各自传入不同范围的数据（Excel 传入无可见性过滤的数据，Dashboard 传入含可见性过滤的数据）
- 不改变任何统计口径

---

## 17. 建议 Phase 8B/8C/8D 拆分顺序

| Phase | 内容 | 风险 |
|-------|------|------|
| **8B** | Domain + completion-rate 共享规则：<br>- `dashboard.types.ts`（DashboardSummary, WorkDashboardItem 等）<br>- `dashboard.rules.ts`（getDueDate, isOverdue, isExpiring, toDashboardItem 等）<br>- **共享 `completion-rate.rules.ts`**（提取两处 `getDepartmentStats` 统一实现）<br>- `dashboard-data.ts` 保留兼容重导出 | **低** |
| **8C** | Infrastructure + Application 迁移：<br>- `dashboard.repository.ts`（Prisma 查询统一）<br>- `get-dashboard-data.usecase.ts`<br>- `get-dashboard-summary.usecase.ts`<br>- `get-completion-rate.usecase.ts`<br>- dashboard/completion-rate route 使用共享 `completion-rate.rules.ts` | **中** |
| **8D** | Route 瘦身：<br>- 三个 dashboard route 改造为 auth + usecase dispatch<br>- Excel completion-rate usecase 改为调用共享规则<br>- `dashboard-data.ts` 转为纯重导出 | **低** |

---

## 18. 风险点和必须保持不变的接口契约

### 不可改变的接口契约

| 接口 | 入参 | 返回 |
|------|------|------|
| `GET /api/dashboard` | query `?limit=N` | `{ summary: DashboardSummary, lists: { expiringAndOverdue, myActionRequired } }` |
| `GET /api/dashboard/summary` | 无 | `DashboardSummary`（22 字段） |
| `GET /api/dashboard/completion-rate` | query `?type&startDate&endDate` | `{ items: DepartmentStats[], total: number }` |

### 不可改变的统计口径

- 首页卡片数量必须和点击后列表结果对应（AGENTS.md L6）
- 待我处理 = 待审批 + 待办理（AGENTS.md L7）
- 待审批只统计当前用户作为当前审批人的待审批事项（AGENTS.md L8）
- 统计口径必须和列表查询口径一致（AGENTS.md L5）

### 不可更改的行为

- `canViewWorkItem` post-filter 不可移除
- `buildWorkVisibilityWhere` 不可改变
- limit 默认值 5、最大值 100
- 排序规则（overdue优先→expiring→actionType→dueDate）
- dashboard route 不写 operationLog（当前行为）
