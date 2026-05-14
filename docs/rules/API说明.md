# API说明

> 当前系统运行态为 9 状态，详见 [状态机设计](状态机设计.md)。

## 首页调用链

首页通过 `GET /api/dashboard` 获取 `summary`、`lists.expiringAndOverdue`、`lists.myActionRequired`。首页不再通过 `/api/works` 或 `getVisibleWorks(user)` 拉全量事项后前端计算列表。

`GET /api/dashboard/summary` 继续保留兼容，并与 `GET /api/dashboard` 复用同一套 summary 计算 helper。

完成率由 `GET /api/dashboard/completion-rate` / `GET /api/excel/completion-rate` 独立提供，未并入 `GET /api/dashboard`。

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

### Summary 字段口径

| 字段 | 当前口径 |
| --- | --- |
| `total` | 当前用户可见事项总数 |
| `priorityTotal` / `mainTotal` / `todoTotal` | 当前用户可见范围内按事项类型统计 |
| `priorityCompleted` / `mainCompleted` / `todoCompleted` | 对应类型中 `COMPLETED` 数量 |
| `pendingApprovalCount` | `canApproveWorkItem(user, work)` 为 true |
| `pendingHandlingCount` | `canHandleWorkItem(user, work)` 为 true |
| `myActionRequiredCount` | `pendingApprovalCount + pendingHandlingCount` |
| `inProgressCount` | 只统计 `IN_PROGRESS` |
| `completingCount` | 只统计 `COMPLETING` |
| `completedCount` | `COMPLETED` |
| `cancelledCount` | `CANCELLED` |
| `expiringCount` | 非终态且计划时间在当前日期起 7 天窗口内 |
| `overdueCount` | 非终态且计划时间早于当前日期 |

兼容字段 `approving`、`handling`、`inProgress`、`completing`、`completed`、`cancelled`、`expiring`、`overdue`、`thisMonthDue` 仍保留。

### 派生展示口径

“退回待修改”不是数据库状态，不写入 `WorkItemStatus`。页面和筛选按以下规则派生：

`status = DRAFT`，且存在 `rejectReason`、`rejectedFromStatus`、`rejectedAt`，或最新 workflow record 为 `reject` / `rejected`。

普通草稿仍显示为”草稿”；符合上述规则的草稿显示为”退回待修改”。退回待修改的办理人优先按 `firstSubmitterId` 判断，兼容历史数据时回退到 `creatorId`。

### 状态页和列表页筛选

| 筛选 | 当前口径 |
| --- | --- |
| 草稿 | `DRAFT` 且无退回痕迹 |
| 退回待修改 | `DRAFT` + 退回痕迹 |
| 待分解 | `PENDING_DECOMPOSE` |
| 审批中 | `PROPOSING` / `ADJUSTING` / `CANCELLING` / `COMPLETING` |
| 待办理 | `canHandleWorkItem(user, work)` |
| 进行中 | `IN_PROGRESS` |
| 已完成 | `COMPLETED` |
| 已取消 | `CANCELLED` |
| 临期 | 非 `COMPLETED` / `CANCELLED` 且计划时间在 7 天窗口内 |
| 超期 | 非 `COMPLETED` / `CANCELLED` 且计划时间早于当前日期 |

### 轻量列表

`lists.expiringAndOverdue` 只返回当前用户可见、非终态、临期或超期事项，按超期优先和计划时间升序排序。

`lists.myActionRequired` 只返回 `canApproveWorkItem` 或 `canHandleWorkItem` 命中的事项。`SUPERVISOR` 的督办跟踪口径仍未拆分为独立字段，继续作为后续遗留项。

## WorkDashboardItem

首页轻量列表不返回完整 `WorkItem`：

```ts
{
  id: number;
  title: string;
  type: “PRIORITY” | “MAIN” | “TODO”;
  typeLabel: string;
  status: string;
  statusLabel: string;
  departmentName: string | null;
  responsibleLeader: string | null;
  responsiblePerson: string | null;
  cooperators: Array<{
    departmentId: number;
    departmentName?: string;
    leader?: string;
    person?: string;
  }>;
  completeTime: string | null;
  planCompleteTime: string | null;
  dueTime: string | null;
  isOverdue: boolean;
  isExpiring: boolean;
  actionType: “approval” | “handling” | “view”;
  currentApproverName: string | null;
}
```

不得返回 `nodes`、`proof`、`attachments`、`workflowRecords`、长文本详情等详情页字段。

`responsibleDepartmentNames` / `cooperateDepartmentNames` / `departmentNames` 已废弃（Phase 8C），前端如需展示字符串请从 `cooperators` 派生。

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

`POST /api/excel/import/[type]` 普通导入默认创建 `DRAFT`，状态列仅允许空、`DRAFT` 或”草稿”；审批中、进行中、终态和旧状态不得通过普通导入写入，必须通过 workflow 流转。
