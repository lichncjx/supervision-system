# API 说明

本文档记录当前首页相关调用链和 Dashboard API 设计。

## 一、首页当前调用链

第四阶段后，首页 `src/app/(app)/page.tsx` 已改为：

| 调用 | 用途 | 说明 |
| --- | --- | --- |
| `GET /api/dashboard` | 首页卡片统计、临超期轻量列表、待处理轻量列表 | 首页不再通过 `/api/works` 或 `getVisibleWorks(user)` 拉取完整事项后计算列表 |
| `GET /api/excel/completion-rate` | 管理员 / 督办导出完成率 | 仅用于导出按钮，未并入 Dashboard 聚合接口 |

`GET /api/dashboard/summary` 仍保留兼容旧调用，但首页不再依赖它。

## 二、`GET /api/dashboard`

```http
GET /api/dashboard
GET /api/dashboard?limit=5
```

`limit` 控制每个轻量列表最多返回条数，默认 5，最大 100。target-contract 使用 `limit=100` 验证完整列表口径，首页使用默认 5。

接口返回：

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

    // 兼容旧 summary 字段
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

`WorkDashboardItem` 是首页轻量列表项，不返回完整 `WorkItem`：

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

说明：

1. `prisma/schema.prisma` 中当前不存在 `planEndDate` 字段。重点工作、主要工作当前使用 `completeTime` 表示计划完成时间；待办事项当前使用 `planCompleteTime`。
2. `dueTime` 是接口派生展示字段，不是数据库字段。
3. 轻量列表不得返回 `nodes`、`workPlan`、`proof`、`attachments`、`workflowRecords`、长文本描述等详情页字段。

## 三、统计字段来源

| 字段 | 来源 |
| --- | --- |
| `total` | 当前用户可见事项总数 |
| `priorityTotal` / `mainTotal` / `todoTotal` | 当前用户可见范围内按事项类型统计 |
| `priorityCompleted` / `mainCompleted` / `todoCompleted` | 当前用户可见范围内按事项类型统计 `COMPLETED` |
| `pendingApprovalCount` | 复用 `canApproveWorkItem(user, work)` |
| `pendingHandlingCount` | 复用 `canHandleWorkItem(user, work)` |
| `myActionRequiredCount` | `pendingApprovalCount + pendingHandlingCount` |
| `inProgressCount` | 当前 15 状态中兼容 `APPROVED` + `IN_PROGRESS` |
| `completingCount` | 当前 15 状态中兼容 `PENDING_COMPLETE` + `PENDING_EVIDENCE_DEPT` + `PENDING_EVIDENCE_COMPANY` |
| `completedCount` | `COMPLETED` |
| `cancelledCount` | `CANCELLED` |
| `overdueCount` | 可见范围内未完成、未取消且超过计划时间 |
| `expiringCount` | 可见范围内未完成、未取消且计划时间在当前时间起 7 天内 |

## 四、轻量列表口径

`lists.expiringAndOverdue`：

1. 只返回当前用户可见事项。
2. 只返回临期或超期事项。
3. 排除 `COMPLETED` / `CANCELLED`。
4. 按超期优先、计划完成时间升序排序。

`lists.myActionRequired`：

1. 普通用户只返回 `canApproveWorkItem` 或 `canHandleWorkItem` 为 true 的事项。
2. `actionType=approval` 表示待审批，`actionType=handling` 表示待办理。
3. `SUPERVISOR` 暂不混入“督办跟踪”特殊口径；该拆分作为后续遗留项记录。

## 五、角色与部门口径

1. `ADMIN`、`SUPERVISOR`：全局统计和全局临超期列表。
2. `DEPARTMENT_MANAGER`、`DEPARTMENT_LEADER`：本部门主责或配合相关事项可见；待办理仍只按主责部门判断。
3. `VICE_PRESIDENT`：围绕其提出、分管、当前审批或明确授权范围统计，不默认继承其他副总事项。
4. `PRESIDENT`：围绕本人提出、当前审批、主要领导审批事项统计；不默认全局统计。
5. TODO 多主责部门通过统一 helper `getResponsibleDepartmentIds(work)` 兼容 `responsibleDepartmentIds` -> `departmentIds` -> `departmentId`；当前阶段不修改 Prisma schema。

## 六、兼容策略

1. `GET /api/dashboard/summary` 保留兼容，并与 `GET /api/dashboard.summary` 复用同一个 summary 计算 helper。
2. 第四阶段只移除首页全量事项拉取，不强制合并完成率接口。
3. `GET /api/dashboard/completion-rate` 和 `GET /api/excel/completion-rate` 继续按第二阶段主责部门完成率口径独立提供。
