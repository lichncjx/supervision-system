# Phase 9A：src/lib 剩余文件审计与收口地图

审计日期：2026-05-11

---

## 1. src/lib 当前文件清单和行数

| 文件 | 行数 | 状态 |
|------|------|------|
| `work-store.ts` | 1202 | 仍含大量业务逻辑 |
| `auth.ts` | 276 | 仍含大量业务逻辑 |
| `server-permissions.ts` | 112 | 部分重导出 + 部分逻辑 |
| `status-colors.ts` | 102 | 纯前端 UI 常量/函数 |
| `permissions.ts` | 108 | 纯前端权限判断 |
| `server-auth.ts` | 57 | 部分重导出 + 角色判断 |
| `utils.ts` | 49 | 混合（cn + 日期 + work 处理） |
| `middleware.ts` | 44 | 独立中间件 |
| `work-status.ts` | 32 | 纯重导出层 |
| `workflow.ts` | 35 | 纯重导出层 |
| `attachment-permissions.ts` | 10 | 纯重导出层 |
| `prisma.ts` | 1 | 纯重导出层 |
| `dashboard-data.ts` | 9 | 纯重导出层 |
| `excel-utils.ts` | 7 | 纯重导出层 |
| **合计** | **2044** | |

---

## 2. 各文件归档状态

### 已归零（纯重导出层）— 6 个文件

| 文件 | 行数 | 重导出到 | 可删除？ |
|------|------|----------|----------|
| `prisma.ts` | 1 | `shared/db/prisma.ts` | 否（12 处引用） |
| `work-status.ts` | 32 | `features/works/domain/` | 否（5 处引用） |
| `workflow.ts` | 35 | `features/workflow/` | 否（1 处引用但需保留） |
| `attachment-permissions.ts` | 10 | `features/attachments/domain/` | 否（3 处引用） |
| `dashboard-data.ts` | 9 | `features/dashboard/` | 否（2 处引用） |
| `excel-utils.ts` | 7 | `features/excel/` | 否（前端引用） |

### 仍含业务逻辑 — 8 个文件

| 文件 | 行数 | 层级 |
|------|------|------|
| `work-store.ts` | 1202 | 前端 client |
| `auth.ts` | 276 | 前端 client |
| `permissions.ts` | 108 | 前端 client |
| `server-permissions.ts` | 112 | 后端 server |
| `server-auth.ts` | 57 | 后端 server |
| `status-colors.ts` | 102 | 前端 ui |
| `utils.ts` | 49 | 混合 shared/ui |
| `middleware.ts` | 44 | 后端 shared/http |

---

## 3. 逐文件详细审计

### `src/lib/prisma.ts`（1 行）
- **状态**：纯重导出
- **内容**：`export { prisma as default } from '@/shared/db/prisma'`
- **引用**：12 个文件（后端 API route）
- **建议**：保留兼容，不要删除

### `src/lib/work-status.ts`（32 行）
- **状态**：纯重导出
- **内容**：重导出 `features/works/domain/work-status.ts` + `work-status.rules.ts` 的全部导出
- **引用**：5 个文件（`badges.tsx`, `page.tsx`, `dashboard-data.ts`, `status-colors.ts`, `work-store.ts`）
- **建议**：保留兼容

### `src/lib/workflow.ts`（35 行）
- **状态**：纯重导出
- **内容**：重导出 `features/workflow/` 全部 usecase
- **引用**：1 个文件（`workflow/route.ts`）
- **建议**：保留兼容；后续 Phase 可改为 route 直接从 `features/workflow/` 导入

### `src/lib/excel-utils.ts`（7 行）
- **状态**：纯重导出 + 类型定义
- **内容**：重导出 `features/excel/client/*` + `infrastructure/excel-template-generator` + `ExcelRouteType` 类型
- **引用**：前端页面 + template API route
- **建议**：保留兼容

### `src/lib/dashboard-data.ts`（9 行）
- **状态**：纯重导出
- **内容**：`getDashboardData` / `getDashboardSummary` + 类型
- **引用**：dashboard route（已改用 usecase 直接导入）
- **建议**：保留兼容（仍有旧引用可能）

### `src/lib/attachment-permissions.ts`（10 行）
- **状态**：纯重导出
- **内容**：重导出 `features/attachments/domain/attachment.permissions.ts` + `attachment.types.ts`
- **引用**：3 个 API route
- **建议**：保留兼容

---

### `src/lib/auth.ts`（276 行）⚠️ 前端 client

- **状态**：仍含完整业务逻辑
- **职责**：前端用户认证 client
  - `Role`、`User`、`Department` 类型定义
  - `login`/`logout`/`getCurrentUser`/`changePassword` — fetch API 调用
  - `getRoleName`/`isCompanyLevel`/`isCompanyApprovalLeader`/`isPresident`/`isDepartmentApprover`/`isAdmin`/`isSupervisionAdmin`/`canImportExport` — 角色判断
  - `getDepartments`/`getDepartmentName`/`getCompanyLeaders`/`getUsersByDepartment`/`getDepartmentLeaders`/`getDepartmentManagers` — fetch 封装
- **引用**：15 个文件（11 个前端页面/组件 + `permissions.ts`、`work-store.ts`、`excel-import-client.ts`）
- **建议迁移**：`features/users/client/auth-api.ts`
  - 类型 → `features/users/domain/` 或 `features/auth/domain/`
  - 角色判断函数 → 本文件同已有 `server-auth.ts` 角色函数重复，统一到 `features/users/domain/`
  - `login`/`logout`/`getCurrentUser` → `features/users/client/auth-api.ts`
  - 部门/领导人查询 → `features/users/client/user-api.ts`

### `src/lib/server-auth.ts`（57 行）⚠️ 后端 server + 角色判断重复

- **状态**：部分重导出 + 9 个角色判断函数
- **内容**：
  - 重导出：`hashPassword`/`verifyPassword`/`generateToken`/`verifyToken`/`getUserFromToken`（→ `shared/auth/`）
  - 角色判断：`isCompanyLevelRole`/`isDepartmentLevelRole`/`canApproveDepartmentLevel`/`canApproveCompanyLevel`/`canApproveMainLeaderCancel`/`canImportExport`/`isSupervisionAdmin`/`canCreateWorkItem`/`canAccessAllData`（9 个函数，基于 Prisma Role 枚举）
- **引用**：14 个 API route
- **重复问题**：`auth.ts`（前端）中也有 `isSupervisionAdmin`/`isCompanyLevel`/`canImportExport` 等函数
- **建议迁移**：
  - JWT/密码重导出 → 保持
  - 角色判断函数 → `features/users/domain/role.rules.ts`
  - 消除前端 `auth.ts` 中的重复角色判断

### `src/lib/server-permissions.ts`（112 行）⚠️ 后端 server

- **状态**：部分重导出 + 残留函数
- **内容**：
  - 重导出：Work 权限函数 → `features/works/domain/work.permissions.ts`
  - 残留：`isGlobalViewRole`/`isCompanyLevelRole`/`isDepartmentLevelRole`（3 个角色判断）
  - 残留：`canUploadAttachment`/`canViewAttachment`/`canDeleteAttachment`（3 个附件权限 — Phase 7 已有 domain 版本）
  - 残留：`getDepartmentIdsForUser`（含 Prisma 查询）
  - 残留：`canImportData`/`canExportData`（角色权限）
- **引用**：6 个文件（Excel export usecase、dashboard completion-rate、workflow、dashboard-data、等）
- **重复问题**：附件权限已有 `features/attachments/domain/` 版本；角色判断与 `server-auth.ts` 重复
- **建议迁移**：
  - 附件权限 → `features/attachments/domain/`（已完成）
  - 角色判断 → `features/users/domain/role.rules.ts`
  - `getDepartmentIdsForUser` → `features/users/infrastructure/` 或 `features/departments/infrastructure/`
  - `canImportData`/`canExportData` → `features/users/domain/`

### `src/lib/permissions.ts`（108 行）⚠️ 前端 client

- **状态**：仍含完整业务逻辑
- **职责**：前端权限判断
  - `ROLES` 常量
  - `hasPermission`/`canAccessDepartment`/`canApprove`/`canPerformAction` — 前端按钮/菜单显示判断
  - `getAvailableMenus` — 导航菜单生成
- **引用**：0（可能通过 barrel export）
- **建议迁移**：`features/users/client/user-permissions.ts` + `features/users/client/menu-config.ts`
- **注意**：前端权限只用于 UI 展示，真正权限由后端二次判断

### `src/lib/status-colors.ts`（102 行）⚠️ 前端 ui

- **状态**：纯 UI 常量/函数
- **内容**：
  - `statusColors` — 状态颜色映射（12 种状态）
  - `expiryColors` — 临期/超期颜色
  - `workTypeColors` — 事项类型颜色
  - `getWorkTypeAccent`/`getWorkTypeText`/`getStatusAccent` — 颜色获取函数
- **引用**：6 个文件（前端页面/组件）
- **建议迁移**：`features/works/ui/status-colors.ts`
- **风险**：低（纯展示，无后端依赖）

### `src/lib/utils.ts`（49 行）⚠️ 混合 shared/ui

- **状态**：混合职责
- **内容**：
  - `cn` — Tailwind 类名合并（L4-6）
  - `convertToDateTime` — 日期转换（L11-14）
  - `formatDate` — 日期格式化（L19-23）
  - `processNodesForDisplay` — Work 节点展示处理（L28-37）
  - `processAdjustHistory` — 调整历史展示处理（L42-49）
- **引用**：6 个文件（4 个 UI 组件 + `work.presenter.ts`）
- **建议拆分**：
  - `cn` → `shared/ui/cn.ts`（或保留在 `utils.ts`）
  - `formatDate`/`convertToDateTime` → `shared/utils/date.ts`
  - `processNodesForDisplay`/`processAdjustHistory` → `features/works/presentation/` 或 `features/works/ui/`

### `src/lib/middleware.ts`（44 行）⚠️ 后端

- **状态**：独立文件
- **内容**：`authMiddleware` + `checkPermission`
- **引用**：0（可能是 barrel export 或未被使用）
- **建议**：`shared/http/middleware.ts` 或 `shared/auth/middleware.ts`
- **风险**：如未被使用，可标记 deprecated

### `src/lib/work-store.ts`（1202 行）⚠️ 前端 client（最大文件）

- **状态**：仍含完整业务逻辑
- **职责**：前端数据管理 / API client
  - `Work`/`WorkNode`/`WorkSubNode`/`Attachment`/`AdjustHistory`/`Cooperator` 等类型
  - `transformWorkFromAPI`/`getWorks`/`getVisibleWorks`/`getWorkById`/`queryWorks` — fetch 封装
  - `addWork`/`updateWork`/`deleteWork` — 增删改 API 调用
  - `resubmitRejectedWork`/`getStats` — 业务 API 调用
  - `getStatusName`/`getActionName`/`getWorkDueDate`/`isOverdueWork`/`isPendingApprovalStatus`/`isExpiringWork` — 状态/日期工具
  - `sortWorksByDueDate`/`isReturnedDraft`/`canHandleWork`/`canProcessWork`/`canApproveWork` — 排序/权限
  - `approveWork`/`rejectWork`/`submitComplete`/`submitAdjust`/`submitCancel`/`submitWork`/`submitTodoDecomposition` — workflow API 调用
  - `getWorkflowSteps`/`getWorkflowRecords` — 审批流展示
  - `getFilteredWorks`/`WorkFilter` — 筛选逻辑
- **引用**：17 个文件（大量前端页面/组件）
- **建议**：**不迁移**。影响面太大（17 处引用），Phase 9 审计阶段只标注不拆分。后续 Phase 10 再规划拆分。

---

## 4-13. 分类汇总

### 可立即保留为兼容层（6 个）
`prisma.ts`、`work-status.ts`、`workflow.ts`、`attachment-permissions.ts`、`dashboard-data.ts`、`excel-utils.ts`

### 可安全迁移到 shared（2 个）
- `utils.ts` → `shared/ui/cn.ts` + `shared/utils/date.ts`
- `middleware.ts` → `shared/auth/middleware.ts`（如仍使用）

### 可安全迁移到 features（4 个）
- `status-colors.ts` → `features/works/ui/status-colors.ts`
- `permissions.ts` → `features/users/client/user-permissions.ts`
- `auth.ts` → `features/users/client/auth-api.ts` + `features/users/domain/role.rules.ts`（前端角色函数）
- `server-auth.ts` 角色函数 → `features/users/domain/role.rules.ts`
- `server-permissions.ts` 残留函数 → 同上 + `features/users/infrastructure/`

### 暂时不建议动（1 个）
- `work-store.ts` — 1202 行，17 处引用，影响面巨大

---

## 14-16. 重复审计

### 角色判断重复（3 处）
| 函数 | `auth.ts`（前端） | `server-auth.ts`（后端） | `server-permissions.ts`（后端） |
|------|-------------------|------------------------|-------------------------------|
| `isSupervisionAdmin` | L183 | L47 | - |
| `isCompanyLevel` | L152 | `isCompanyLevelRole` L23 | `isCompanyLevelRole` L48 |
| `isDepartmentLevel` | - | `isDepartmentLevelRole` L27 | `isDepartmentLevelRole` L57 |
| `canImportExport` | L188 | L43 | L106/L110 |

**建议统一**：全部移入 `features/users/domain/role.rules.ts`，前后端各自导入。

### 状态判断重复（2 处）
- `work-status.ts`（domain，已迁移）vs `work-store.ts`（client，仍有 `isOverdueWork`、`isPendingApprovalStatus`、`isExpiringWork`、`isReturnedDraft`、`isInProgressStatus`）

### 前端直接依赖后端业务函数
- `excel-import-client.ts` 引用 `auth.ts`（前端）→ 合理
- `work-store.ts` 引用 `auth.ts`、`work-status.ts` → 合理
- **无前端直接 import Prisma 或 server-only 函数**

---

## 17. 建议 Phase 9B/9C/9D 拆分顺序

| Phase | 内容 | 风险 |
|-------|------|------|
| **9B** | `status-colors.ts` → `features/works/ui/` + 兼容重导出 | **低**（纯 UI） |
| **9C** | `utils.ts` 拆分：`cn` → `shared/ui/`、`formatDate`/`convertToDateTime` → `shared/utils/`、`processNodesForDisplay`/`processAdjustHistory` → `features/works/presentation/` | **低** |
| **9D** | 角色函数统一：`auth.ts` + `server-auth.ts` + `server-permissions.ts` 的角色判断 → `features/users/domain/role.rules.ts` | **中**（消除 3 处重复） |
| **9E** | `permissions.ts` → `features/users/client/` | **低** |
| **9F** | `auth.ts` API client 部分 → `features/users/client/` | **中** |
| **9G** | `middleware.ts` → `shared/auth/` 或标记 deprecated | **低** |
| **9H** | `server-permissions.ts` 清理：附件权限引用指向 `features/attachments/domain/`，移除重复 | **低** |

### Phase 10 展望
- `work-store.ts` 拆分：类型 → `features/works/client/work.types.ts`、API → `features/works/client/work-api.ts`、权限 → `features/works/client/work-client-permissions.ts`、VM → `features/works/client/work-view-model.ts`
- 影响面大，建议独立开 Phase 10A/10B/10C

---

## 18. 风险点和必须保持不变的兼容导出

### 不可删除的兼容层
- `prisma.ts` — 12 处引用
- `work-status.ts` — 5 处引用
- `auth.ts` — 15 处引用
- `work-store.ts` — 17 处引用

### 角色函数迁移风险
- `auth.ts` 和 `server-auth.ts` 中的角色函数虽然重复，但参数类型不同（`auth.ts` 用 `string`，`server-auth.ts` 用 `Role` enum）
- 统一时需要保持两套重导出

### 禁止事项
- 不要删除 `src/lib` 文件（先保留兼容层）
- 不要批量替换全项目 import
- Phase 10 之前不动 `work-store.ts`
