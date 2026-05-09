# API 说明

本文档记录当前首页相关调用链和目标 API 设计。现阶段代码仍保留多个历史接口，后续应按目标接口逐步收敛。

## 一、首页当前调用链

当前首页 `src/app/(app)/page.tsx` 主要依赖：

| 调用 | 用途 | 当前问题 |
| --- | --- | --- |
| `getVisibleWorks(user)` | 获取可见事项，前端计算临超期、待处理列表 | 拉取完整事项，首页承担过多计算 |
| `GET /api/dashboard/summary` | 首页卡片统计 | 与列表、详情、导出口径存在差异 |
| `GET /api/excel/completion-rate` | 部门完成率 | 与 Dashboard summary 分属不同统计实现 |

## 二、目标首页调用链

目标首页只调用：

```http
GET /api/dashboard
```

接口一次返回：

```ts
{
  summary: {
    priorityTotal: number;
    mainTotal: number;
    todoTotal: number;
    approving: number;
    handling: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    overdue: number;
    expiring: number;
    completionRate?: number;
  };
  lists: {
    expiringAndOverdue: DashboardWorkListItem[];
    myActionRequired: DashboardWorkListItem[];
  };
}
```

`DashboardWorkListItem` 是首页轻量列表项，只返回首页需要字段：

```ts
{
  id: string;
  type: "PRIORITY" | "MAIN" | "TODO";
  title: string;
  status: WorkItemStatus;
  completeTime?: string;
  planCompleteTime?: string;
  departmentName?: string;
  responsibleLeader?: string;
  responsiblePerson?: string; // 目标字段，当前 schema 尚需迁移或由兼容字段派生
  actionLabel?: string;
}
```

说明：

1. `prisma/schema.prisma` 中当前不存在 `planEndDate` 字段。重点工作、主要工作当前使用 `completeTime` 表示计划完成时间；待办事项当前使用 `planCompleteTime`。
2. `responsiblePerson` 是重点/主要事项的目标责任人姓名字段，当前 schema 尚未落地时，Dashboard 可在服务端由当前实现兼容字段派生，但必须明确这是迁移期兼容值。
3. 如后续希望统一为 `dueAt` 或 `planEndDate` 之类展示字段，必须明确标注为目标派生字段或另行迁移，不能混写为当前数据库字段。

## 三、目标统计字段来源

| 字段 | 来源 |
| --- | --- |
| `priorityTotal` | 当前用户组织可见范围内 `type=PRIORITY` |
| `mainTotal` | 当前用户组织可见范围内 `type=MAIN` |
| `todoTotal` | 当前用户组织可见范围内 `type=TODO` |
| `approving` | 当前用户可审批事项，按 `currentApproverId` / `currentApproverRole` |
| `handling` | 当前用户可办理事项，按部门管理权限和业务动作 |
| `inProgress` | 目标状态 `IN_PROGRESS`，不含审批态 |
| `completed` | `COMPLETED` |
| `cancelled` | `CANCELLED` |
| `overdue` | 当前用户可见且未完成、未取消、超过计划时间 |
| `expiring` | 当前用户可见且临近计划时间 |

## 四、角色口径

1. `ADMIN`、`SUPERVISOR`：全局统计和全局轻量列表。
2. `DEPT_MANAGER`、`DEPT_LEADER`：本部门相关事项统计，包含主责部门和配合部门可见项。
3. `VICE_PRESIDENT`：围绕其提出、分管、当前审批或明确授权范围统计，不默认继承其他公司领导事项。
4. `PRESIDENT`：围绕本人提出、当前审批、主要领导审批事项统计；是否全局统计需明确授权。

## 五、TODO 多部门口径

1. 主责部门多选目标字段为 `responsibleDepartmentIds`。
2. 如果本轮做数据库迁移，则将当前 `departmentIds` 迁移/重命名为 `responsibleDepartmentIds`。
3. 如果本轮暂不做数据库迁移，则通过统一 helper，例如 `getResponsibleDepartmentIds(work)`，按 `responsibleDepartmentIds` -> `departmentIds` -> `departmentId` 顺序读取。
4. 权限、统计、导入导出中不要各自手写部门字段兼容逻辑，应通过统一 helper 或统一权限模块读取。
5. `cooperateDepartmentIds` 只表示配合部门。
6. 可见范围：主责部门和配合部门均可见。
7. 待办理：默认仅主责部门的部门事项管理岗和部门领导可办理；配合部门不自动获得主责办理权。
8. 完成率：按主责部门计入分母和分子；一个 TODO 有多个主责部门时，可计入多个主责部门。配合部门不计入完成率。

## 六、兼容策略

1. 目标接口上线初期可与 `/api/dashboard/summary` 并存。
2. 首页切换到 `GET /api/dashboard` 后，再清理旧 summary 和前端全量事项计算。
3. Dashboard 接口必须复用统一权限模块，不再自定义局部权限函数。
