# API 说明

## 首页调用链

PR 6.3 后首页调用链为：

| 调用 | 用途 | 说明 |
| --- | --- | --- |
| `GET /api/dashboard` | 首页卡片统计、临超期轻量列表、待处理轻量列表 | 首页不再通过 `/api/works` 或 `getVisibleWorks(user)` 拉全量事项后前端计算列表 |
| `GET /api/excel/completion-rate` | 管理员 / 督办导出完成率 | 仍独立提供，未并入 `GET /api/dashboard` |

`GET /api/dashboard/summary` 继续保留兼容，并与 `GET /api/dashboard.summary` 复用同一套 summary 计算 helper。

## GET /api/dashboard

```http
GET /api/dashboard
GET /api/dashboard?limit=5
```

返回结构：

```ts
{
  summary: {
    total: number;
    priorityTotal: number;
    mainTotal: number;
    todoTotal: number;
    priorityCompleted: number;
    mainCompleted: number;
    todoCompleted: number;
    pendingApprovalCount: number;
    pendingHandlingCount: number;
    myActionRequiredCount: number;
    inProgressCount: number;
    completingCount: number;
    completedCount: number;
    cancelledCount: number;
    expiringCount: number;
    overdueCount: number;

    approving: number;
    handling: number;
    inProgress: number;
    completing: number;
    completed: number;
    cancelled: number;
    expiring: number;
    overdue: number;
    thisMonthDue: number;
  };
  lists: {
    expiringAndOverdue: WorkDashboardItem[];
    myActionRequired: WorkDashboardItem[];
  };
}
```

`inProgressCount` 只统计 `IN_PROGRESS`，`completingCount` 只统计 `COMPLETING`。`thisMonthDue` 仅为 `expiring` 的兼容别名。

## WorkDashboardItem

首页轻量列表不返回完整 `WorkItem`：

```ts
{
  id: number;
  title: string;
  type: "PRIORITY" | "MAIN" | "TODO";
  typeLabel: string;
  status: string;
  statusLabel: string;
  departmentName: string | null;
  departmentNames: string[];
  responsibleDepartmentNames: string[];
  cooperateDepartmentNames: string[];
  completeTime: string | null;
  planCompleteTime: string | null;
  dueTime: string | null;
  isOverdue: boolean;
  isExpiring: boolean;
  actionType: "approval" | "handling" | "view";
  currentApproverName: string | null;
}
```

不得返回 `nodes`、`proof`、`attachments`、`workflowRecords`、长文本详情等详情页字段。

## GET /api/works 状态筛选

`status` 查询参数支持当前 9 状态和派生筛选：

| 参数 | 口径 |
| --- | --- |
| `DRAFT` / `draft` | 普通草稿，不包含退回待修改 |
| `returnedDraft` / `returned_draft` | `DRAFT` + 退回痕迹 |
| `PENDING_DECOMPOSE` / `pendingDecompose` | 待分解 |
| `approving` | `PROPOSING` / `ADJUSTING` / `CANCELLING` / `COMPLETING` |
| `handling` | `canHandleWorkItem(user, work)` |
| `IN_PROGRESS` / `inProgress` | 进行中 |
| `COMPLETED` / `completed` | 已完成 |
| `CANCELLED` / `cancelled` | 已取消 |
| `expiring` | 非终态且计划时间在 7 天窗口内 |
| `overdue` | 非终态且计划时间早于当前日期 |

旧状态值 `APPROVED`、`REJECTED`、`PENDING_DEPT`、`PENDING_COMPANY`、`PENDING_COMPLETE`、`PENDING_EVIDENCE_DEPT`、`PENDING_EVIDENCE_COMPANY`、`PENDING_MAIN_LEADER_CANCEL` 不再接受为当前筛选值。

## 退回待修改

“退回待修改”不是 `WorkItemStatus`。接口和页面通过 `DRAFT` 加退回痕迹派生展示：`rejectReason`、`rejectedFromStatus`、`rejectedAt`，或最新 workflow record 为 `reject` / `rejected`。

普通编辑接口 `PUT /api/works/[id]` 不写入 `status`、`beforeApprovalStatus`、`approvalType`、`rejectReason`、`rejectedFromStatus`；状态流转必须通过 workflow 接口。

## 普通 Excel 导入导出

`GET /api/excel/export` 的数据范围与 `/api/works` 可见范围一致，并使用统一状态元数据输出状态文案。导出状态筛选同样不接受旧状态值。

`POST /api/excel/import/[type]` 普通导入默认创建 `DRAFT`，状态列仅允许空、`DRAFT` 或“草稿”；审批中、进行中、终态和旧状态不得通过普通导入写入，必须通过 workflow 流转。
