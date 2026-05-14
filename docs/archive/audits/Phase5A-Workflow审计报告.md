# Phase 5A：Workflow 模块现状审计与拆分地图

审计日期：2026-05-11

---

## 1. workflow.ts 导出清单

### 导出的类型/接口

| 名称 | 行号 |
|------|------|
| `UserSession` | 17-22 |
| `WorkflowResult` | 24-28 |

### 导出的函数

| 函数 | 行号 |
|------|------|
| `canUserApprove` | 259-261 |
| `canUserSubmit` | 263-271 |
| `submitForApproval` | 273-355 |
| `approveWorkItem` | 357-431 |
| `rejectWorkItem` | 433-483 |
| `submitEvidence` | 485-536 |
| `submitAdjust` | 538-585 |
| `submitCancel` | 587-671 |
| `decomposeTodo` | 673-731 |
| `getWorkflowRecords` | 733-758 |

### 内部（非导出）函数/常量

| 名称 | 行号 |
|------|------|
| `APPROVAL_STATUSES` | 37-42 |
| `APPROVAL_TARGET_STATUS` | 44-49 |
| `toPermissionUser` | 51-57 |
| `isApprovalStatus` | 59-61 |
| `isDepartmentRole` | 63-65 |
| `isCompanyLeaderRole` | 67-69 |
| `findWorkItem` | 71-75 |
| `getWorkItem` | 77-79 |
| `createWorkflowRecord` | 81-102 |
| `logOperation` | 104-125 |
| `departmentLeaderAssignment` | 127-132 |
| `companyLeaderAssignment` | 134-147 |
| `presidentAssignment` | 149-163 |
| `getProposalFirstApprover` | 165-179 |
| `getProcessFirstApprover` | 181-191 |
| `shouldEscalateCancelToPresident` | 193-195 |
| `isDepartmentApprovalNode` | 197-199 |
| `isPresidentApprovalNode` | 201-203 |
| `getNextApprovalAssignment` | 205-236 |
| `canUserHandle` | 238-240 |
| `canUserCancelDraft` | 242-246 |
| `ensureMainResponsibleDepartment` | 248-253 |
| `rejectableBeforeStatus` | 255-257 |
| `WorkflowWorkItem` (类型) | 30 |

---

## 2. 逐函数职责 + 迁移建议

### 类型/接口

| 名称 | 职责 | 建议目录 |
|------|------|----------|
| `UserSession` | 操作者身份（userId/name/role/deptId） | `domain/workflow.types.ts` |
| `WorkflowResult` | workflow 操作返回结构 `{success, workItem?, error?}` | `presentation/workflow.dto.ts` |
| `WorkflowWorkItem` | 内部类型别名（Prisma findUnique 返回值） | `infrastructure` 内部使用 |

### 审批常量

| 名称 | 职责 | Prisma | 状态规则 | 权限 | 日志 | 建议目录 |
|------|------|--------|----------|------|------|----------|
| `APPROVAL_STATUSES` | 四种审批中状态 | - | 是 | - | - | `domain` |
| `APPROVAL_TARGET_STATUS` | 审批类型 -> 目标状态映射 | - | 是 | - | - | `domain` |

### 用户/角色辅助函数

| 函数 | 职责 | Prisma | 状态规则 | 权限 | 日志 | 建议目录 |
|------|------|--------|----------|------|------|----------|
| `toPermissionUser` | UserSession -> PermissionUser 转换 | - | - | 桥接 | - | `domain` |
| `isApprovalStatus` | 判断状态是否审批中 | - | 是 | - | - | `domain` |
| `isDepartmentRole` | 判断是否部门角色 | - | - | 是 | - | `domain` |
| `isCompanyLeaderRole` | 判断是否公司领导 | - | - | 是 | - | `domain` |
| `isDepartmentApprovalNode` | 判断当前审批节点是否部门级 | - | 是 | - | - | `domain` |
| `isPresidentApprovalNode` | 判断当前审批节点是否总裁级 | - | 是 | - | - | `domain` |

### 审批人分配函数（域规则）

| 函数 | 职责 | Prisma | 状态规则 | 权限 | 日志 | 建议目录 |
|------|------|--------|----------|------|------|----------|
| `departmentLeaderAssignment` | 返回部门领导审批人 | - | 是 | - | - | `domain` |
| `companyLeaderAssignment` | 返回公司领导审批人 | - | 是 | - | - | `domain` |
| `presidentAssignment` | 查库取总裁用户 | **是** | 是 | - | - | `infrastructure` |
| `getProposalFirstApprover` | 提交审批时确定第一审批人 | - | 是 | - | - | `domain` |
| `getProcessFirstApprover` | 过程操作时确定第一审批人 | - | 是 | - | - | `domain` |
| `shouldEscalateCancelToPresident` | 重点事项取消是否需总裁审批 | - | 是 | - | - | `domain` |
| `getNextApprovalAssignment` | 审批通过后计算下一节点 | 调用 `presidentAssignment` | 是 | - | - | `application` |

> `presidentAssignment` 包含 Prisma 查询（`prisma.user.findFirst`），需要迁到 `infrastructure`。`getNextApprovalAssignment` 间接依赖它，属于编排层。

### 权限/状态规则

| 函数 | 职责 | Prisma | 状态规则 | 权限 | 日志 | 建议目录 |
|------|------|--------|----------|------|------|----------|
| `canUserHandle` | 包装 canHandleWorkItem | - | - | 是 | - | `domain` |
| `canUserCancelDraft` | 草稿取消的权限判断 | - | 是 | 是 | - | `domain` |
| `ensureMainResponsibleDepartment` | 是否主责部门 | - | - | 是 | - | `domain` |
| `rejectableBeforeStatus` | 提取退回前状态 | - | 是 | - | - | `domain` |
| `canUserApprove` | 包装 canApproveWorkItem | - | - | 是 | - | `domain` |
| `canUserSubmit` | 是否可提交审批 | - | 是 | 是 | - | `domain` |

### 基础设施函数

| 函数 | 职责 | Prisma | 状态规则 | 权限 | 日志 | 建议目录 |
|------|------|--------|----------|------|------|----------|
| `findWorkItem` | 按 ID 查事项（裸查） | **是** | - | - | - | `infrastructure` |
| `getWorkItem` | `findWorkItem` 包装 | **是** | - | - | - | `infrastructure` |
| `createWorkflowRecord` | 写入审批记录 | **是** | - | - | - | `infrastructure` |
| `logOperation` | 写入操作日志 | **是** | - | - | **是** | `infrastructure` |

### 用例函数（导出）

| 函数 | 职责 | Prisma | 状态规则 | 权限 | 日志 | 建议目录 |
|------|------|--------|----------|------|------|----------|
| `submitForApproval` | 提交审批（DRAFT -> PENDING_DECOMPOSE 或 PROPOSING） | **是** | **是** | **是** | **是** | `application` |
| `approveWorkItem` | 审批通过 -> 下一节点 或 终态 | **是** | **是** | **是** | **是** | `application` |
| `rejectWorkItem` | 审批退回 -> beforeApprovalStatus | **是** | **是** | **是** | **是** | `application` |
| `submitEvidence` | 提交完成材料（IN_PROGRESS -> COMPLETING） | **是** | **是** | **是** | **是** | `application` |
| `submitAdjust` | 申请调整（IN_PROGRESS -> ADJUSTING） | **是** | **是** | **是** | **是** | `application` |
| `submitCancel` | 取消（DRAFT -> CANCELLED / IN_PROGRESS -> CANCELLING） | **是** | **是** | **是** | **是** | `application` |
| `decomposeTodo` | 待办分解（PENDING_DECOMPOSE -> PROPOSING） | **是** | **是** | **是** | **是** | `application` |
| `getWorkflowRecords` | 查询审批记录列表 | **是** | - | - | - | `application` / `infrastructure` |

---

## 3. Prisma 依赖汇总

workflow.ts 共 **15 处** Prisma 调用：

| 行号 | 操作 | 表 | 类型 |
|------|------|-----|------|
| 72-74 | `findUnique` | `workItem` | 读 |
| 91-101 | `create` | `workflowRecord` | 写 |
| 113-124 | `create` | `operationLog` | 写 |
| 150-157 | `findFirst` | `user` | 读（查总裁） |
| 297-308 | `update` | `workItem` | 写（submit TODO -> PENDING_DECOMPOSE） |
| 327-340 | `update` | `workItem` | 写（submit -> PROPOSING） |
| 383-388 | `update` | `workItem` | 写（approve 流转节点） |
| 407-415 | `update` | `workItem` | 写（approve 终态） |
| 457-467 | `update` | `workItem` | 写（reject） |
| 510-520 | `update` | `workItem` | 写（evidence） |
| 559-569 | `update` | `workItem` | 写（adjust） |
| 603-613 | `update` | `workItem` | 写（cancel draft -> CANCELLED） |
| 645-655 | `update` | `workItem` | 写（cancel -> CANCELLING） |
| 702-715 | `update` | `workItem` | 写（decompose） |
| 734-744 | `findMany` | `workflowRecord` | 读 |

所有 Prisma 调用应全部进入 `infrastructure/workflow.repository.ts`。

---

## 4. route.ts 中 action -> workflow 函数映射

| action | 调用函数 | 额外参数 |
|--------|----------|----------|
| `submit` | `submitForApproval` | `comment` |
| `approve` | `approveWorkItem` | `comment` |
| `reject` | `rejectWorkItem` | `rejectReason`（必填） |
| `evidence` / `complete` | `submitEvidence` | `proof`（必填）、`comment` |
| `adjust` | `submitAdjust` | `adjustReason`（必填）、`comment` |
| `cancel` | `submitCancel` | `cancelReason`（必填）、`comment` |
| `decompose` | `decomposeTodo` | `nodes`（必填，数组）、`comment` |

GET 仅调用 `getWorkflowRecords`，附带 `canViewWorkItem` 权限检查。

---

## 5. 建议的 Phase 5B/5C/5D 拆分顺序

| Phase | 内容 | 风险 |
|-------|------|------|
| **5B** | 将内部函数和常量迁入 `features/workflow/domain/`：<br>- `workflow.types.ts`（UserSession, WorkflowResult 等）<br>- `workflow.constants.ts`（APPROVAL_STATUSES, APPROVAL_TARGET_STATUS）<br>- `workflow.rules.ts`（所有审批人分配、角色判断、状态判断）<br>- 将 `presidentAssignment` 的 Prisma 查询提取到 infrastructure<br>- `src/lib/workflow.ts` 保留兼容重导出 | **低** - 只移定义不改逻辑 |
| **5C** | 将 Prisma 操作迁入 `features/workflow/infrastructure/`：<br>- `workflow.repository.ts`（findWorkItem, createWorkflowRecord, logOperation, findPresident 等）<br>- 7 个 usecase 函数继续留在 `src/lib/workflow.ts`，改为调用 repository | **中** - Prisma 依赖重定向 |
| **5D** | 将 7 个 usecase 迁入 `features/workflow/application/`：<br>- `submit-for-approval.usecase.ts`<br>- `approve-work.usecase.ts`<br>- `reject-work.usecase.ts`<br>- `submit-evidence.usecase.ts`<br>- `submit-adjust.usecase.ts`<br>- `submit-cancel.usecase.ts`<br>- `decompose-todo.usecase.ts`<br>- `get-workflow-records.usecase.ts`<br>- workflow route 变薄 | **中** - 逐 action 改造测试 |

---

## 6. 风险点和必须保持不变的接口契约

### 不可改变的接口契约

| 契约 | 说明 |
|------|------|
| `POST /api/works/[id]/workflow` | `{ action, comment?, proof?, adjustReason?, cancelReason?, rejectReason?, nodes? }` -> `{ success: boolean, workItem: {...} }` |
| `GET /api/works/[id]/workflow` | 返回审批记录数组，字段 `id, action, initiatorId, initiatorName, initiatorRole, previousStatus, newStatus, comment, createdAt` |
| 错误条件 | 每步的 400/401/403/404 判断不可移除 |
| 错误消息 | 全部错误消息（"事项不存在" / "无权提交该事项" / "只有草稿事项可以提交审批" 等）不得变化 |
| 状态流转 | 9 状态的流转路径不可变（target-contract 已严格验证） |

### 高耦合点

| 耦合 | 处理策略 |
|------|----------|
| `presidentAssignment` 查库 | 必须抽到 infrastructure，避免 domain 依赖 Prisma |
| `canApproveWorkItem` / `canHandleWorkItem` / `isWorkMainResponsibleDepartment` | 从 `works/domain/work.permissions.ts` 导入，Phase 2 已迁移 |
| `UserSession` 类型 | 被 workflow route 引用，迁移后需兼容重导出 |
| `WorkflowWorkItem` 类型 | 内部使用，不需要外部兼容 |

### 安全红线

- workflowRecord 记录**不可删除**（审计要求）
- operationLog 记录**不可删除**
- 状态回退必须通过 `rejectableBeforeStatus` 提取 `beforeApprovalStatus`，不可硬编码
- 重点事项取消的主领导节点（`shouldEscalateCancelToPresident`）逻辑不可改变

### 外部引用分析

workflow.ts 仅被一个文件导入：
- `src/app/api/works/[id]/workflow/route.ts` - 导入 8 个函数 + 1 个类型

无其他文件直接依赖 workflow.ts。
