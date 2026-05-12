# Phase 10A：work-store.ts 前端大文件审计与拆分地图

审计日期：2026-05-11

---

## 一、基础信息

### 1. 行数

**1203 行**

### 2. 导出清单（39 项）

#### 类型（14 个）
| 导出 | 行号 | 说明 |
|------|------|------|
| `WorkType` | 14 | `'重点' \| '主要' \| '待办'` |
| `WorkStatusFilter` | 16-27 | 11 种筛选状态 |
| `WorkQuery` | 29-34 | 查询参数接口（4 字段） |
| `Status` | 36 | = `WorkStatusValue`（复用 work-status.ts） |
| `ActionType` | 38-43 | 5 种 action 枚举 |
| `WorkSubNode` | 54-58 | 工作子节点接口 |
| `WorkNode` | 60-65 | 工作节点接口 |
| `Attachment` | 67-76 | 附件接口（7 字段） |
| `AdjustHistory` | 78-87 | 调整历史接口 |
| `Work` | 89-167 | 核心 Work 接口（~40 字段） |
| `Cooperator` | 169-174 | 配合方接口 |
| `WorkEditablePatch` | 176-202 | 可编辑字段 Partial |
| `WorkFilter` | 797 | = `WorkStatusFilter` 别名 |
| `WorkflowStep` | 1126-1129 | 审批步骤接口 |
| `WorkflowRecord` | 1173-1183 | 审批记录接口（8 字段） |

#### 数据转换（1 个）
| 导出 | 行号 | 说明 |
|------|------|------|
| `transformWorkFromAPI` | 216-278 | API JSON → Work 对象 |

#### Works API（8 个）
| 导出 | 行号 | 说明 |
|------|------|------|
| `getWorks` | 280-291 | GET /api/works |
| `getVisibleWorks` | 311-333 | 基于角色可见性过滤 |
| `getWorkById` | 335-346 | GET /api/works/[id] |
| `queryWorks` | 348-423 | 前端筛选（type/status/dept/keyword） |
| `addWork` | 425-466 | POST /api/works |
| `updateWork` | 468-503 | PUT /api/works/[id] |
| `deleteWork` | 505-515 | DELETE /api/works/[id] |
| `resubmitRejectedWork` | 517-538 | 退回重提交 |
| `getStats` | 1104-1124 | 前端统计（9 个数字） |
| `getFilteredWorks` | 799-815 | 按 WorkFilter 筛选 |

#### Workflow API（7 个）
| 导出 | 行号 | 说明 |
|------|------|------|
| `approveWork` | 970-987 | POST workflow action=approve |
| `rejectWork` | 989-1006 | POST workflow action=reject |
| `submitComplete` | 1008-1025 | POST workflow action=evidence |
| `submitAdjust` | 1027-1044 | POST workflow action=adjust |
| `submitCancel` | 1046-1063 | POST workflow action=cancel |
| `submitWork` | 1065-1082 | POST workflow action=submit |
| `submitTodoDecomposition` | 1084-1102 | POST workflow action=decompose |
| `getWorkflowRecords` | 1185-1202 | GET workflow records |

#### 状态/展示工具（12 个）
| 导出 | 行号 | 说明 |
|------|------|------|
| `getStatusName` | 541-543 | → `getWorkStatusLabel` |
| `getWorkDisplayStatusName` | 545-547 | → `getWorkDisplayStatusLabel` |
| `getActionName` | 549-563 | action 中文名映射 |
| `getCurrentProcessDescription` | 565-611 | 当前流程描述文本 |
| `getWorkflowRecordDescription` | 613-698 | 审批记录描述文本 |
| `isInProgressStatus` | 700-702 | → `isWorkStatusInProgress` |
| `getWorkDueDate` | 704-706 | 取截止日期 |
| `isOverdueWork` | 708-723 | 前端超期判断 |
| `isReturnedDraft` | 758-760 | → `isReturnedDraftWork` |
| `isPendingApprovalStatus` | 762-764 | → `isWorkStatusInPendingApprovalFilter` |
| `isSupervisorTrackingWork` | 766-776 | 督办员追踪状态集合 |
| `isExpiringWork` | 778-795 | 前端临期判断（7天） |
| `sortWorksByDueDate` | 725-736 | 按截止日期排序 |
| `getWorkflowSteps` | 1131-1171 | 审批步骤 UI 数据 |

#### 前端权限辅助（3 个）
| 导出 | 行号 | 说明 |
|------|------|------|
| `canHandleWork` | 817-879 | 前端办理权限判断 |
| `canProcessWork` | 881-883 | = `canApproveWork \|\| canHandleWork` |
| `canApproveWork` | 885-929 | 前端审批权限判断 |

### 3-4. 引用分析

| 引用文件 | 导入内容 | 使用类型 |
|-----------|----------|----------|
| `alert/page.tsx` | `getStatusName`, `getActionName`, `getWorkDueDate`, `Work`, `WorkStatusFilter`, `getFilteredWorks`, `sortWorksByDueDate`, `getVisibleWorks`, `canHandleWork`, `canProcessWork`, `canApproveWork`, `isOverdueWork`, `isExpiringWork`, `getWorkflowRecordDescription`, `deleteWork`, `updateWork` | 综合（含写操作） |
| `process/page.tsx` | `getFilteredWorks`, `approveWork` 等 | 综合（含 write） |
| `status/[filter]/page.tsx` | `getFilteredWorks`, `Work` 等 | 读+写 |
| `[type]/new/page.tsx` | `addWork`, `submitWork`, `WorkType`, `WorkNode` | 写 |
| `[type]/page.tsx` | `getVisibleWorks`, `queryWorks`, `Work`, `WorkType`, `WorkStatusFilter` | 读 |
| `[type]/[id]/page.tsx` | 大量导入（deleteWork, updateWork 等） | 综合 |
| `workflow-progress.tsx` | `getWorkflowSteps`, `Work` | 展示 |
| `priority-main-work-list-item.tsx` | `Work` | 类型 |
| `todo-work-list-item.tsx` | `Work` | 类型 |
| `work-list-toolbar.tsx` | `WorkStatusFilter` | 类型 |
| `work-operation-panel.tsx` | `getCurrentProcessDescription`, `Attachment` | 展示+类型 |
| `work-pending-adjustment-panel.tsx` | `Work` | 类型 |
| `work-workflow-records.tsx` | `getActionName`, `getStatusName`, `getWorkflowRecordDescription` | 展示 |
| `completion-rate-client.ts` | `Work` | 类型 |
| `excel-export-client.ts` | `Work` | 类型 |
| `excel-import-client.ts` | `Work` | 类型 |
| `use-search-pagination.ts` | `Work` | 类型 |

### 5. 无人使用的导出

`WorkFilter`（L797，= `WorkStatusFilter` 别名）— 无直接引用。`WorkEditablePatch` 被 `resubmitRejectedWork` 和 `addWork` 使用。

### 6. 默认导出

无。

---

## 二、类型定义分类

### → features/works/domain/（7 个）
`WorkType`、`WorkSubNode`、`WorkNode`、`Cooperator`、`Status`（= WorkStatusValue）、`WorkStatusFilter`、`WorkQuery` — 这些是纯业务类型，可安全迁入 domain。

### → features/works/client/（3 个）
`Work`、`WorkEditablePatch`、`WorkFilter` — 前端 Work 数据模型（含 display-only 字符串字段），可迁入 client。

### → features/workflow/domain/（2 个）
`WorkflowStep`、`WorkflowRecord` — 审批步骤 + 审批记录接口。

### → features/attachments/domain/（1 个）
`Attachment` — 附件接口。

### → features/works/domain/ or 保留（1 个）
`AdjustHistory` — 调整历史接口。

### → features/works/domain/（1 个）
`ActionType` — action 枚举。

---

## 三、API client 分类

### → features/works/client/work-api.ts（7 个）
`getWorks`、`getVisibleWorks`、`getWorkById`、`queryWorks`、`addWork`、`updateWork`、`deleteWork`

### → features/works/client/work-api.ts（1 个）
`resubmitRejectedWork` — 两步操作：updateWork → submitWork

### → features/dashboard/client/dashboard-api.ts（1 个）
`getStats` — 前端统计计算

### → features/works/client/work-filters.ts（1 个）
`getFilteredWorks` — 前端筛选逻辑

### → features/workflow/client/workflow-api.ts（8 个）
`approveWork`、`rejectWork`、`submitComplete`、`submitAdjust`、`submitCancel`、`submitWork`、`submitTodoDecomposition`、`getWorkflowRecords`

---

## 四、状态与展示工具分类

| 函数 | 现有来源 | 建议 |
|------|----------|------|
| `getStatusName` | → `getWorkStatusLabel` | 已有，可删（直接导入 domain） |
| `getWorkDisplayStatusName` | → `getWorkDisplayStatusLabel` | 已有，可删 |
| `getActionName` | 新增 action map | → `features/works/client/work-display.utils.ts` |
| `getCurrentProcessDescription` | 新增逻辑 | 同上 |
| `getWorkflowRecordDescription` | 新增逻辑 | → `features/workflow/client/workflow-display.utils.ts` |
| `isInProgressStatus` | → `isWorkStatusInProgress` | 已有，可删 |
| `isReturnedDraft` | → `isReturnedDraftWork` | 已有，可删 |
| `isPendingApprovalStatus` | → `isWorkStatusInPendingApprovalFilter` | 已有，可删 |
| `getWorkflowSteps` | 新增逻辑 | → `features/workflow/client/workflow-display.utils.ts` |
| `isOverdueWork` | 新增（前端实现） | → `features/works/client/work-date.utils.ts` |
| `isExpiringWork` | 新增（前端实现） | 同上 |
| `getWorkDueDate` | 新增 | 同上 |
| `sortWorksByDueDate` | 新增 | 同上 |
| `isSupervisorTrackingWork` | 新增 | → `features/works/client/work-filters.ts` |

---

## 五、排序筛选分类

| 函数 | 建议迁移 |
|------|----------|
| `sortWorksByDueDate` | `features/works/client/work-sort.ts` |
| `getFilteredWorks` | `features/works/client/work-filters.ts` |
| `isSupervisorTrackingWork` | 同上 |
| `getWorkDepartmentIds`（内部） | 同上 |
| `isWorkRelatedToDepartment`（内部） | 同上 |
| `isCompanyVisibleWork`（内部） | 同上 |
| `queryWorks` | 同上 |

---

## 六、前端权限辅助分类

| 函数 | 建议迁移 |
|------|----------|
| `canHandleWork` | `features/works/client/work-client-permissions.ts` |
| `canProcessWork` | 同上 |
| `canApproveWork` | 同上 |
| `isSelectedCompanyApprover`（内部） | 同上 |

---

## 七、数据转换 / ViewModel 分类

| 函数 | 建议迁移 |
|------|----------|
| `transformWorkFromAPI` | `features/works/client/work-view-model.ts` |
| `normalizeAction`（内部） | 同上 |
| `parseCooperators`（内部） | 同上 |

---

## 八、建议 Phase 10B/10C/10D/10E/10F 拆分顺序

| Phase | 内容 | 风险 |
|-------|------|------|
| **10B** | 类型剥离：`WorkType`/`WorkQuery`/`WorkNode` 等轻量类型 → `features/works/domain/`；`WorkflowStep`/`WorkflowRecord` → `features/workflow/domain/`；`Attachment` → `features/attachments/domain/`；保留兼容重导出 | **低**（仅类型，不涉及逻辑） |
| **10C** | 纯展示工具剥离：`getStatusName`/`getWorkDisplayStatusName`/`isInProgressStatus`/`isReturnedDraft`/`isPendingApprovalStatus` → 直接重导出到已有 domain 函数；`getActionName`/`getCurrentProcessDescription` → `features/works/client/work-display.utils.ts`；`getWorkflowRecordDescription`/`getWorkflowSteps` → `features/workflow/client/` | **低**（大多为已有函数的 thin wrapper） |
| **10D** | 前端权限辅助：`canHandleWork`/`canApproveWork`/`canProcessWork`/`isSelectedCompanyApprover` → `features/works/client/work-client-permissions.ts` | **中**（涉及权限逻辑，需仔细核对） |
| **10E** | API client：Works CRUD → `features/works/client/work-api.ts`；Workflow API → `features/workflow/client/workflow-api.ts`；`getStats` → `features/dashboard/client/` | **中**（含写操作，影响多个页面） |
| **10F** | 收口：`work-store.ts` 归零为纯重导出；确认所有 17 处引用兼容 | **低** |

---

## 九、风险点

### 影响面最大的函数
`canHandleWork`（alert/process/status 页面）、`canApproveWork`（alert/process/status 页面）、`transformWorkFromAPI`（所有读 API 调用）、`getFilteredWorks`（alert/process/status 页面）

### 涉及写操作的函数
`addWork`、`updateWork`、`deleteWork`、`resubmitRejectedWork`、`approveWork`、`rejectWork`、`submitComplete`、`submitAdjust`、`submitCancel`、`submitWork`、`submitTodoDecomposition`

### 涉及 Workflow 状态流转的函数
`approveWork`、`rejectWork`、`submitComplete`、`submitCancel`、`submitAdjust`、`submitWork`、`submitTodoDecomposition`

### 前端表单数据转换
`transformWorkFromAPI`（API JSON → Work）、`addWork`（Work → API body）、`updateWork`（Work → API body）、`resubmitRejectedWork`（组合操作）

### 最不适合第一阶段迁移的函数
- `canHandleWork`（62 行业务逻辑，涉及多种角色/状态分支）
- `canApproveWork`（45 行业务逻辑 + `isSelectedCompanyApprover`）
- `transformWorkFromAPI`（63 行，涉及 `extractName` 等字段兼容逻辑）
- `resubmitRejectedWork`（两步 API 调用）

### 必须保持的兼容导出
- `Work` 类型（8 处 type-only import）
- `transformWorkFromAPI`（内嵌于所有读 API）
- `getFilteredWorks` / `getVisibleWorks`（3 个页面）
- `getStatusName` / `getActionName` / `getWorkflowRecordDescription`（workflow-records 组件）
- `addWork` / `submitWork`（new page）
- `canHandleWork` / `canApproveWork`（多个页面）
