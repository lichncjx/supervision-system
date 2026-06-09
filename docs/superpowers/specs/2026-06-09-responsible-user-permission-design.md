# 责任人/责任领导切换为系统用户 — 设计文档

> 日期：2026-06-09 | 执行模式：Locked → Supervised | 分支：`logic/responsible-user-permission`

## 一、目标

将事项责任领导、责任人从 `Member` 间接链路切换为真实系统用户 `User`：

```text
responsibleLeaderUserId -> User   （新增，直接 FK）
responsiblePersonUserId -> User   （新增，直接 FK）
```

保留字段：

```text
responsibleLeader       // 姓名快照，仅展示/导出/留痕
responsiblePerson       // 姓名快照，仅展示/导出/留痕
responsibleLeaderMemberId / responsiblePersonMemberId // 历史兼容，不参与权限
```

核心权限口径：

```text
PROPOSE 审批通过前：creatorId / firstSubmitterId / 部门分解人推进
PROPOSE 审批通过后：responsiblePersonUserId 成为唯一办理人
responsibleLeaderUserId：默认可查看/监督，不默认办理
```

前置业务假设：

```text
责任人继续使用现有部门角色登录系统。
本次不收紧部门角色可见范围，不要求责任人只能看到自己负责的项目。
本次只做"操作权从 creator/firstSubmitter 移交到 responsiblePersonUserId"。
```

## 二、影响范围

### 涉及文件（按阶段）

| 阶段 | 文件 | 操作 |
|------|------|------|
| 1 | `docs/core/业务规则.md` | 更新 |
| 1 | `docs/rules/权限规则.md` | 更新 |
| 1 | `docs/rules/业务人员与附件权限规则.md` | 更新 |
| 1 | `docs/design/数据库设计.md` | 更新 |
| 2 | `prisma/schema.prisma` | 新增字段+relation+索引 |
| 3 | migration SQL | 新增 |
| 4 | `src/features/works/application/create-work.usecase.ts` | 改造 |
| 4 | `src/features/works/application/update-work.usecase.ts` | 改造 |
| 4 | `src/features/workflow/application/decompose-todo-work.usecase.ts` | 改造 |
| 4 | 创建/编辑/分解表单 UI | 改造 |
| 5 | `src/features/works/domain/work.permissions.ts` | 核心改造（仅 canOperateWorkItem） |
| 5 | `src/features/attachments/domain/attachment.permissions.ts` | 默认不改；可选收紧见 §7.3 |
| 6 | `src/features/workflow/domain/workflow.rules.ts` | 校验改造 |
| 6 | `src/features/workflow/application/submit-proposal.usecase.ts` | 校验 |
| 6 | `src/features/workflow/application/submit-adjustment.usecase.ts` | 操作权校验 |
| 6 | `src/features/workflow/application/submit-cancellation.usecase.ts` | 操作权校验 |
| 6 | `src/features/workflow/application/submit-completion.usecase.ts` | 操作权校验 |
| 6 | `src/features/workflow/application/decompose-todo-work.usecase.ts` | 校验 |
| 7 | `src/features/dashboard/domain/dashboard.rules.ts` | 统计（自动适配） |
| 7 | `src/features/dashboard/application/get-dashboard-data.usecase.ts` | 列表（自动适配） |
| 7 | 事项列表/审批中心/处理中心查询 | 口径同步 |
| 7 | Excel 导入/导出 | 口径同步 |

### 不变的部分

- `Member` 表结构不删除、不修改
- `responsibleLeaderMemberId` / `responsiblePersonMemberId` **DB 列保留**（历史数据），但**不再写入、不再传递、不再展示**
- `Role`、`WorkItemStatus`、`WorkItemType`、`ApprovalType` 枚举不变
- 审批流结构不变
- 状态机不变
- `firstSubmitterId` 保留为审计字段 + 审批通过前的 owner 回退
- `canViewWorkItem` / `buildWorkVisibilityWhere` 不变（责任人仍使用部门角色，可见性沿用部门范围）

## 三、阶段 1：文档修改

### 3.1 `docs/core/业务规则.md`

在 §一-2 "系统用户与业务责任人" 新增：

```markdown
### 关键系统用户字段补充

| 字段 | 权限语义 |
|------|----------|
| `responsibleLeaderUserId` | 责任领导系统用户，FK → users。可查看但不默认办理 |
| `responsiblePersonUserId` | 责任人系统用户，FK → users。IN_PROGRESS 后为唯一办理人 |
```

在 §一-6 "审批与办理口径" 的"待办理"段：

```markdown
- 进行中事项的调整、取消、完成提交由 `responsiblePersonUserId` 操作；
  `creatorId` / `firstSubmitterId` 在审批通过后不再产生办理权。
```

### 3.2 `docs/rules/权限规则.md`

- §三 "关键系统字段" 表格新增 `responsiblePersonUserId` / `responsibleLeaderUserId`
- §五 "办理权限"：新增 `PROPOSE 审批通过后的 IN_PROGRESS 由 responsiblePersonUserId 办理`；`firstSubmitterId` 限定为审批通过前的 owner 回退
- §四 "查看权限"：明确本次不新增 `responsiblePersonUserId` / `responsibleLeaderUserId` 本人可见条件；责任人继续使用部门角色，沿用部门可见范围

### 3.3 `docs/rules/业务人员与附件权限规则.md`

- §一 "业务人员字段命名规则" 新增 `responsibleLeaderUserId` / `responsiblePersonUserId` 为 `xxxId` 类字段
- §二 "重点工作人员体系" 更新：责任领导、责任人选择切换为系统用户

### 3.4 `docs/design/数据库设计.md`

- §五 "系统用户字段" 表格新增：

```markdown
| `responsibleLeaderUserId` | 责任领导系统用户，FK → users |
| `responsiblePersonUserId` | 责任人系统用户，FK → users |
```

## 四、阶段 2：数据库 Schema

在 `WorkItem` 新增：

```prisma
responsibleLeaderUserId Int?
responsiblePersonUserId Int?

responsibleLeaderUser User? @relation("ResponsibleLeaderUserWorkItems", fields: [responsibleLeaderUserId], references: [id])
responsiblePersonUser User? @relation("ResponsiblePersonUserWorkItems", fields: [responsiblePersonUserId], references: [id])
```

在 `User` 新增反向 relation：

```prisma
responsibleLeaderWorkItems WorkItem[] @relation("ResponsibleLeaderUserWorkItems")
responsiblePersonWorkItems WorkItem[] @relation("ResponsiblePersonUserWorkItems")
```

新增索引：

```prisma
@@index([responsibleLeaderUserId])
@@index([responsiblePersonUserId])
```

不删除 `Member`、`responsibleLeaderMemberId`、`responsiblePersonMemberId`。

## 五、阶段 3：历史数据回填

按优先级执行独立回填脚本。Prisma migration 只负责新增字段和索引；回填脚本负责匹配、写入、输出待人工确认清单。

```
1. responsibleLeaderMemberId -> Member.userId -> responsibleLeaderUserId
2. responsiblePersonMemberId -> Member.userId -> responsiblePersonUserId
3. 如果 Member.userId 为空，用 responsibleLeader 姓名匹配 User.name
4. 如果 Member.userId 为空，用 responsiblePerson 姓名匹配 User.name
5. 仅匹配到唯一 isActive=true 的 User 时自动回填
6. 重名、未匹配、非 active 用户输出清单，不自动处理
7. 回填成功后同步姓名快照：responsibleLeader = User.name, responsiblePerson = User.name
```

此阶段必须在阶段 5 权限改造前完成，确保权限判断有数据基础。

脚本输出要求：

```text
1. 自动回填成功数量
2. responsibleLeaderUserId 未回填清单
3. responsiblePersonUserId 未回填清单
4. 重名/多匹配清单
5. inactive user 匹配清单
```

## 六、阶段 4：创建/编辑/分解表单

### 6.1 create-work.usecase.ts

- `CreateWorkBody` 新增 `responsibleLeaderUserId?: number | null`、`responsiblePersonUserId?: number | null`
- `CreateWorkBody` **删除** `responsibleLeaderMemberId` / `responsiblePersonMemberId` — 不再接收，不再写入
- 移除 Member 校验逻辑（`validateMemberAssignments`），替换为 User 存在性+active 校验
- `responsibleLeader` / `responsiblePerson` 从 User.name 同步写入

### 6.2 update-work.usecase.ts

- `UpdateWorkBody` 新增 `responsibleLeaderUserId` / `responsiblePersonUserId`
- `UpdateWorkBody` **删除** `responsibleLeaderMemberId` / `responsiblePersonMemberId`
- 同步更新姓名快照
- 仅允许在 `DRAFT` / 审批通过前编辑阶段通过普通更新接口改责任人；`IN_PROGRESS` 后责任人调整必须走 `ADJUSTING` 审批（或后续单独设计改派动作，本次不做）

### 6.3 decompose-todo-work.usecase.ts

- 分解 body **删除** `responsibleLeaderMemberId` / `responsiblePersonMemberId`
- 分解时校验 `responsiblePersonUserId` 存在
- 同步写入 `responsibleLeaderUserId` / `responsiblePersonUserId`

### 6.4 前端表单与 UI

#### 6.4.1 新建页 `src/app/(app)/[type]/new/page.tsx`

**表单 state 改造**：`priorityMainForm` 和 `todoForm` 中：

- **新增** `responsibleLeaderUserId` / `responsiblePersonUserId`
- **删除** `responsibleLeaderMemberId` / `responsiblePersonMemberId`

切换部门时同步清空四个字段（两个 userId + 两个 name 快照）。

**`ResponsibleFields` 组件调用改造**：移除 Member 相关 props，只传 User props：

```tsx
<ResponsibleFields
  leaderValue={...}
  onLeaderChange={...}
  personValue={...}
  onPersonChange={...}
  departmentId={...}
  leaderUserId={responsibleLeaderUserId}
  onLeaderUserIdChange={(id) => setForm(prev => ({ ...prev, responsibleLeaderUserId: id }))}
  personUserId={responsiblePersonUserId}
  onPersonUserIdChange={(id) => setForm(prev => ({ ...prev, responsiblePersonUserId: id }))}
/>
```

#### 6.4.2 编辑页 `src/app/(app)/[type]/[id]/edit/page.tsx`

`buildInitialPriorityMainForm` 和 `buildInitialTodoForm`：

- **新增** `responsibleLeaderUserId: work.responsibleLeaderUserId`、`responsiblePersonUserId: work.responsiblePersonUserId`
- **删除** `responsibleLeaderMemberId` / `responsiblePersonMemberId`

表单提交时只传 userId，不传 MemberId。

#### 6.4.3 分解面板 `src/features/works/ui/work-decompose-panel.tsx`

当前分解面板只展示了工作计划、完成时间、节点，需新增责任分工区域：

- 新增 `ResponsibleFields` 组件调用，传入部门 ID + userId props
- 提交分解时写入 `responsibleLeaderUserId` / `responsiblePersonUserId`，不写 MemberId

#### 6.4.4 `ResponsibleFields` 组件 `src/features/works/ui/work-form-fields.tsx`

**Props 改造**：Member 相关 props 全部删除，替换为 User props：

```typescript
export interface ResponsibleFieldsProps {
  leaderValue: string
  onLeaderChange: (value: string) => void
  personValue: string
  onPersonChange: (value: string) => void
  departmentId?: number
  // 替换 MemberId props
  leaderUserId?: number
  onLeaderUserIdChange?: (id: number | undefined) => void
  personUserId?: number
  onPersonUserIdChange?: (id: number | undefined) => void
}
```

**渲染逻辑**：当 `departmentId` 存在时渲染 `UserSelect`（按部门筛选用户），不再渲染 `MemberSelect`。选中后回调 `userId` 和 `name`（name 写入姓名快照）。当 `departmentId` 不存在时回退到纯文本 `Input`。

#### 6.4.5 新建 `UserSelect` 组件 `src/features/users/client/user-select.tsx`

```typescript
// Props 设计
interface UserSelectProps {
  departmentId: number | undefined
  value: number | undefined
  onChange: (userId: number | undefined, name: string) => void
  filterLeaders?: boolean     // 仅展示领导角色
  excludeLeaders?: boolean    // 排除领导角色
  placeholder?: string
  disabled?: boolean
}
```

通过 `GET /api/users?departmentId=X&role=...` 查询部门下用户列表，渲染为 shadcn Select 组件。

#### 6.4.6 构建 payload `src/features/works/client/build-create-work-payload.ts`

两个分支（priorityMain / todo）：

- **新增** `responsibleLeaderUserId` / `responsiblePersonUserId`
- **删除** `responsibleLeaderMemberId` / `responsiblePersonMemberId`

#### 6.4.7 详情页展示 `src/app/(app)/[type]/[id]/page.tsx`

详情页责任领导/责任人展示区域：展示 User 姓名（通过 `work.responsibleLeaderUser?.name` / `work.responsiblePersonUser?.name`，Prisma include 后可用）。姓名快照 `responsibleLeader` / `responsiblePerson` 保留为副文本。当 userId 为空时回退到姓名快照展示。**不展示 Member 信息。**

#### 6.4.8 客户端类型 `src/features/works/client/work-client.types.ts`

`Work` 接口：

- **新增** `responsibleLeaderUserId?: number | null`、`responsiblePersonUserId?: number | null`
- **删除** `responsibleLeaderMemberId` / `responsiblePersonMemberId`

#### 6.4.9 DTO / Mapper / Client Mapper 同步

- `src/features/works/application/work.dto.ts` — `WorkDto` 新增 `responsibleLeaderUserId` / `responsiblePersonUserId`，删除 `responsibleLeaderMemberId` / `responsiblePersonMemberId`
- `src/features/works/application/work.mapper.ts` — `toWorkDto` 同步映射
- `src/features/works/client/work-client.mapper.ts` — 客户端 mapper 同步

#### 6.4.10 API 路由

`GET /api/users` — 如尚不存在，新增按部门筛选用户的查询端点（返回 id、name、role、departmentId）。

## 七、阶段 5：权限改造（核心）

### 设计原则

**可见性不改，只改操作权。** `responsiblePersonUserId` 和 `responsibleLeaderUserId` 对应的人员必然属于责任部门，部门范围内所有用户已通过 `departmentId` / `cooperators` 天然可见这些事项。部门可见范围 ≥ 自引用可见性，所以 `canViewWorkItem` 和 `buildWorkVisibilityWhere` 不需要任何改动。

如果后续出现"责任人调离原部门后仍需在列表中看到历史负责事项"或"责任人只看自己负责事项"的需求，再单独调整可见性。本次不处理。

附件查看（`canViewAttachment`）调用 `canViewWorkItem`，随可见性口径不变。普通附件上传默认保持现有主责部门口径，不纳入本次必改范围，避免扩大需求。

### 7.1 `PermissionWorkItem` 接口

新增字段：

```typescript
responsiblePersonUserId?: number | null
responsibleLeaderUserId?: number | null
```

### 7.2 `canOperateWorkItem`（唯一需要改动的权限函数）

```typescript
export function canOperateWorkItem(user, workItem): boolean {
  if (isGlobalView(user.role)) return false   // 保持最前

  const status = normalizeStatus(workItem.status)
  if (!isHandling(status)) return false

  // 审批通过前（DRAFT / PENDING_DECOMPOSE）：维持现有 owner 逻辑
  const isPreApproval =
    status === WorkItemStatus.DRAFT ||
    status === WorkItemStatus.PENDING_DECOMPOSE

  if (isPreApproval) {
    const ownerId = workItem.firstSubmitterId ?? workItem.creatorId
    const isOwner = ownerId === user.id

    if (isCompanyLevel(user.role))
      return isOwner && status === WorkItemStatus.DRAFT

    const pendingMainDepartmentDecompose =
      status === WorkItemStatus.PENDING_DECOMPOSE &&
      isWorkMainResponsibleDepartment(workItem, user.departmentId)
    return isOwner || pendingMainDepartmentDecompose
  }

  // 审批通过后（IN_PROGRESS）：责任人唯一办理
  return workItem.responsiblePersonUserId === user.id
}
```

### 7.3 `canUploadAttachment`（可选收紧项）

当前实现中 `canUploadAttachment` 额外允许主责部门用户上传：

```typescript
return canOperateWorkItem(user, workItem) || isWorkMainResponsibleDepartment(workItem, user.departmentId)
```

本次默认不修改普通附件上传权限。原因：

```text
本次核心目标是 workflow 操作权从 creator/firstSubmitter 移交给 responsiblePersonUserId。
普通附件上传是否也收紧，是独立业务口径；客户当前没有明确提出。
```

如果确认要顺手收紧，可作为小范围附加项改为：

```typescript
export function canUploadAttachment(user, workItem): boolean {
  if (isGlobalView(user.role)) return true
  if (isTerminal(workItem.status)) return false
  return canOperateWorkItem(user, workItem)
}
```

这样 `IN_PROGRESS` 后只有 `responsiblePersonUserId` 可上传普通附件；审批通过前仍沿用 `DRAFT` owner / `PENDING_DECOMPOSE` 部门分解人的操作权。

如果不收紧普通附件，则仍需确保"提交完成材料 / 提交证明材料"这类 workflow 动作只能由 `responsiblePersonUserId` 执行。

### 7.4 `shouldHandleWorkItem` / `canEditWorkItem` / `buildWorkVisibilityWhere`

均不需要修改：
- `shouldHandleWorkItem` 调用 `canOperateWorkItem`，自动适配新口径
- `canEditWorkItem` 仅 DRAFT 状态用 `firstSubmitterId ?? creatorId`，审批通过前不变
- `buildWorkVisibilityWhere` — 部门范围内已天然覆盖责任人/责任领导，可见性不需额外条件

待办理统计特别说明：

```text
普通 IN_PROGRESS 事项仍不默认计入"待办理"。
只有退回后的 IN_PROGRESS 按现有 isReturnedInProgressWork 口径进入待办理。
本次目标是移交操作权，不改变普通进行中事项的待办理统计口径。
```

## 八、阶段 6：Workflow 调整

### 8.1 各 usecase 操作权校验

| Usecase | 校验规则 |
|---------|----------|
| `submit-proposal` | DRAFT 提交人逻辑不变；但提交 PROPOSE 前必须校验 `responsiblePersonUserId` 存在且用户 active |
| `decompose-todo-work` | 新增校验 `responsiblePersonUserId` 存在 |
| `submit-adjustment` | IN_PROGRESS 后：`responsiblePersonUserId === user.id` |
| `submit-cancellation` | 同上 |
| `submit-completion` | 同上 |
| `submit-evidence` | 同上 |

### 8.2 `approve-workflow-action.usecase.ts`

审批通过进入 IN_PROGRESS 时，不写额外字段。`responsiblePersonUserId` 已在提交/分解时写入，审批通过后自然生效。

为防止历史数据或导入数据漏填，审批通过 `ApprovalType.PROPOSE` 前建议增加兜底校验：

```text
如果目标状态为 IN_PROGRESS 且 responsiblePersonUserId 为空，则阻止通过并提示补充责任人。
```

### 8.3 调整审批（ADJUSTING）

调整责任人审批通过后，更新 `responsiblePersonUserId` 为新值，同步更新姓名快照。

### 8.4 `firstSubmitterId`

保留写入逻辑不变，作为审计字段：
- `submit-proposal` 中 `firstSubmitterId = workItem.firstSubmitterId ?? user.id`
- 审批通过后不再作为办理权来源

## 九、阶段 7：统计、列表、导入导出

### 9.1 首页/列表

- `buildDashboardSummary` 的 `shouldHandleWorkItem` / `canApproveWorkItem` 自动适配新口径
- 事项列表查询 (`query-works.usecase.ts`) 使用 `buildWorkVisibilityWhere` + `canViewWorkItem`，自动适配

### 9.2 Excel 导入

导入规则：

```
责任领导 / 责任人优先匹配 User.name
唯一匹配 → 写 responsibleXxxUserId + 姓名快照
匹配失败 → 保留姓名快照，UserId 为空，输出错误行
```

### 9.3 Excel 导出

导出字段不变（姓名文本），新增可选的 User 关联信息列。

## 十、阶段 8：测试

### 测试角色

| 角色 | 简称 |
|------|------|
| SUPERVISOR | 督办管理员 |
| DEPARTMENT_LEADER | 部门领导 |
| DEPARTMENT_MANAGER | 部门管理岗 |
| responsiblePersonUser | 责任人（系统用户） |
| responsibleLeaderUser | 责任领导（系统用户） |
| 普通无关用户 | 既非责任人也非责任领导，不在相关部门 |

### 关键用例

1. 督办管理员创建重点/主要工作并指定责任人 → 责任人为系统用户
2. PROPOSE 审批通过前，责任人不应获得办理权
3. PROPOSE 审批通过后，责任人可查看、上传、申请调整/取消/完成
4. creator 在审批通过后不再因创建人身份获得办理权
5. 责任领导可查看但不能默认办理
6. 公司领导创建待办 → 部门分解指定责任人 → 审批通过后责任人接手
7. 调整责任人审批通过后，新责任人可办理，旧责任人失去办理权
8. 首页待办理数量和点击后列表一致
9. 普通附件上传保持现有主责部门口径；提交完成材料/证明材料的 workflow 动作由责任人执行
10. 导入历史姓名能唯一匹配用户时正确回填 UserId

### 本地检查

```bash
pnpm prisma:generate
pnpm lint
pnpm typecheck
pnpm build
```

## 十一、风险点

1. **历史数据回填覆盖率**：不是所有 Member 都有 userId，匹配可能不完整。不完整的保持 NULL，权限判断中 `responsiblePersonUserId === user.id` 自然为 false，不产生错误权限。
2. **Member 表暂不删除**：`responsibleLeaderMemberId` / `responsiblePersonMemberId` DB 列保留（历史数据可查），但应用层不再读写、不再展示。
3. **导入匹配准确性**：同名用户可能导致错误匹配，需输出警告清单供人工确认。
4. **`canOperateWorkItem` 改动影响面**：workflow 全部 POST 操作依赖此函数，测试需全覆盖。普通附件上传默认不收紧；如启用 §7.3 可选项，再补充附件上传回归。

## 十二、与原计划的差异说明

| 原计划 | 调整 | 原因 |
|--------|------|------|
| `src/lib/server-permissions.ts` | `src/features/works/domain/work.permissions.ts` | 实际代码位置 |
| `src/lib/attachment-permissions.ts` | `src/features/attachments/domain/attachment.permissions.ts` | 实际代码位置 |
| `canViewWorkItem` 新增自引用可见性 | 不修改 | 部门范围已天然覆盖责任人/责任领导，不需要额外自引用条件 |
| `buildWorkVisibilityWhere` 新增 responsible 条件 | 不修改 | 同上，部门范围 ≥ 自引用可见性 |
| `canOperateWorkItem` 中 `isGlobalView` 挪后 | 保持最前 | 用户指正 |
| 历史回填为建议 | 升级为前置必要条件 | 用户要求 |
| 前端变更未提及 | 补全 9 个前端文件的详细改造 | 用户指正 |
| 附件权限自动适配 | 改为可选收紧项 | 普通附件上传是否收紧属于独立业务口径，避免默认扩大范围 |
