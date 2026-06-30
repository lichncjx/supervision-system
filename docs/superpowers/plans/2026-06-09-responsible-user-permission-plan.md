# 责任人/责任领导切换为系统用户 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将事项责任领导、责任人从 `Member` 间接链路切换为真实系统用户 `User`，`PROPOSE` 审批通过后操作权从 `creator/firstSubmitter` 移交到 `responsiblePersonUserId`。

**Architecture:** 基于现有 Modular Monolith + Feature-based Layered Architecture。Prisma schema 新增两个 FK 字段 + relation + 索引；权限层只改 `canOperateWorkItem`（可见性不改）；表单从 Member 选择器切换为 User 选择器；workflow 新增 `responsiblePersonUserId` 存在性校验和审批通过兜底。

**Tech Stack:** Next.js App Router, TypeScript, Prisma, PostgreSQL, shadcn/ui, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-06-09-responsible-user-permission-design.md`

---

## File Map

| # | File | Phase | Responsibility |
|---|------|-------|----------------|
| 1 | `prisma/schema.prisma` | 2 | New FK fields, relations, indexes |
| 2 | `src/features/works/domain/work.permissions.ts` | 5 | Core: `canOperateWorkItem` restructure |
| 3 | `src/features/works/application/create-work.usecase.ts` | 4 | Accept userId, drop MemberId, validate User |
| 4 | `src/features/works/application/update-work.usecase.ts` | 4 | Same; block IN_PROGRESS direct changes |
| 5 | `src/features/works/application/work.dto.ts` | 4 | Add userId, drop MemberId |
| 6 | `src/features/works/application/work.mapper.ts` | 4 | Map new fields from Prisma result |
| 7 | `src/features/works/client/work-client.types.ts` | 4 | Add userId, drop MemberId |
| 8 | `src/features/works/client/work-client.mapper.ts` | 4 | Transform userId in API → client |
| 9 | `src/features/works/client/build-create-work-payload.ts` | 4 | Pass userId, drop MemberId |
| 10 | `src/features/works/ui/work-form-fields.tsx` | 4 | Rewrite `ResponsibleFields` props + render |
| 11 | `src/features/users/client/user-select.tsx` | 4 | **NEW** User selector component |
| 12 | `src/features/users/application/list-department-users.usecase.ts` | 4 | Add general list all users usecase |
| 13 | `src/app/api/users/by-department/route.ts` | 4 | **NEW** API endpoint |
| 14 | `src/features/users/client/user-api.ts` | 4 | Add `getDepartmentUsers()` |
| 15 | `src/app/(app)/[type]/new/page.tsx` | 4 | Form state: add userId, drop MemberId |
| 16 | `src/app/(app)/[type]/[id]/edit/page.tsx` | 4 | Form init: add userId, drop MemberId |
| 17 | `src/features/works/ui/work-decompose-panel.tsx` | 4 | Add ResponsibleFields |
| 18 | `src/features/workflow/application/decompose-todo-work.usecase.ts` | 4+6 | Accept + validate userId |
| 19 | `src/features/workflow/application/submit-proposal.usecase.ts` | 6 | Validate responsiblePersonUserId exists |
| 20 | `src/features/workflow/application/submit-adjustment.usecase.ts` | 6 | Check responsiblePersonUserId === user.id |
| 21 | `src/features/workflow/application/submit-cancellation.usecase.ts` | 6 | Same |
| 22 | `src/features/workflow/application/submit-completion.usecase.ts` | 6 | Same |
| 23 | `src/features/workflow/application/approve-workflow-action.usecase.ts` | 6 | Guard: PROPOSE→IN_PROGRESS needs responsiblePersonUserId |
| 24 | `src/features/excel/infrastructure/work-import-parser.ts` | 7 | Match name→userId on import |
| 25 | `src/features/excel/application/import-works-from-excel.usecase.ts` | 7 | Write userId on import |
| 26 | `src/features/excel/infrastructure/work-exporter.ts` | 7 | Export userId column (optional) |
| 27 | `src/app/(app)/[type]/[id]/page.tsx` | 4 | Display User name in detail |
| 28 | `docs/core/业务规则.md` | 1 | Document new fields |
| 29 | `docs/rules/权限规则.md` | 1 | Document new permission rules |
| 30 | `docs/rules/业务人员与附件权限规则.md` | 1 | Document field naming |
| 31 | `docs/design/数据库设计.md` | 1 | Document schema changes |

---

## Phase 0: 准备工作 (Supervised)

### Task 0.1: 创建分支并保护现有改动

- [ ] **Step 1: 检查当前状态**

```bash
cd c:/Users/sslc/Desktop/projects/supervision
git branch --show-current
git status --short
```

Expected: 在 `main`，有 `create-work.usecase.ts` 和 `work-attachment-panel.tsx` 未提交改动。

- [ ] **Step 2: 从 main 创建分支（不 stash，工作区改动跟随新分支）**

```bash
git checkout main
git pull origin main
git switch -c logic/responsible-user-permission
```

Expected: 成功创建并切换到 `logic/responsible-user-permission`，之前 `main` 上的工作区改动（`create-work.usecase.ts`、`work-attachment-panel.tsx` 及新增的 spec/plan 文件）均带到新分支。

- [ ] **Step 3: 验证**

```bash
git branch --show-current
```

Expected: `logic/responsible-user-permission`

---

## Phase 1: 文档修改 (Locked)

> **Locked mode**: 此阶段只输出分析报告和精确的文档修改方案，不直接写入代码。用户确认后再进入 Phase 2。

### Task 1.1: 分析 `docs/core/业务规则.md` 需要修改的位置

**Files:** Read: `docs/core/业务规则.md`

- [ ] **Step 1: 定位 §一-2 "系统用户与业务责任人" 段**

Read `docs/core/业务规则.md` 并找到 §一-2 的位置。

- [ ] **Step 2: 输出插入内容**

在 §一-2 末尾（"业务责任人姓名不参与权限判断" 之后）插入：

```markdown
### 关键系统用户字段补充

| 字段 | 权限语义 |
|------|----------|
| `responsibleLeaderUserId` | 责任领导系统用户，FK → users。可查看但不默认办理 |
| `responsiblePersonUserId` | 责任人系统用户，FK → users。IN_PROGRESS 后为唯一办理人 |
```

- [ ] **Step 3: 定位 §一-6 "审批与办理口径" 的"待办理"段**

找到 "-- 进行中事项的调整、取消、完成提交均由事项办理人操作" 附近。

- [ ] **Step 4: 输出修改内容**

将该行修改为：

```markdown
- 进行中事项的调整、取消、完成提交由 `responsiblePersonUserId` 操作；
  `creatorId` / `firstSubmitterId` 在审批通过后不再产生办理权。
```

### Task 1.2: 分析 `docs/rules/权限规则.md` 需要修改的位置

**Files:** Read: `docs/rules/权限规则.md`

- [ ] **Step 1: 定位 §三 "关键系统字段" 表格**

找到 `| currentApproverRole | ... |` 行。

- [ ] **Step 2: 输出新增行**

在 `currentApproverRole` 之后插入：

```markdown
| `responsibleLeaderUserId` | 责任领导系统用户，查看/监督，不默认办理 |
| `responsiblePersonUserId` | 责任人系统用户，IN_PROGRESS 后唯一办理人 |
```

- [ ] **Step 3: 定位 §四 "查看权限"**

找到最后一条规则之后。

- [ ] **Step 4: 输出新增说明**

```markdown
6. 本次不新增 `responsiblePersonUserId` / `responsibleLeaderUserId` 本人可见条件；
   责任人继续使用部门角色，沿用部门可见范围。
   如果后续出现"责任人只看自己负责事项"的需求，再单独调整可见性。
```

- [ ] **Step 5: 定位 §五 "办理权限"**

找到 `firstSubmitterId ?? creatorId` 相关描述。

- [ ] **Step 6: 输出修改内容**

修改 §五-2 为：

```markdown
2. `DRAFT`、退回后修改属于事项办理人动作，审批通过前按 `firstSubmitterId ?? creatorId` 判断。
   `PROPOSE` 审批通过进入 `IN_PROGRESS` 后，`responsiblePersonUserId` 成为唯一办理人。
   同部门其他人员可见但不因同部门获得操作权。
```

新增 §五-7：

```markdown
7. `IN_PROGRESS` 后责任人调整必须走 `ADJUSTING` 审批，普通更新接口不得直接修改
   `responsiblePersonUserId`。
```

### Task 1.3: 分析 `docs/rules/业务人员与附件权限规则.md` 需要修改的位置

**Files:** Read: `docs/rules/业务人员与附件权限规则.md`

- [ ] **Step 1: 定位 §一 "业务人员字段命名规则" 的"当前字段"表格**

找到 `| responsiblePerson | ... |` 行。

- [ ] **Step 2: 输出新增行**

在表格末尾新增：

```markdown
| `responsibleLeaderUserId` | `Int?` | 责任领导系统用户，FK → users，权限判断 |
| `responsiblePersonUserId` | `Int?` | 责任人系统用户，FK → users，权限判断 |
```

- [ ] **Step 3: 定位 §二 "重点工作人员体系"**

更新描述，说明责任领导、责任人选择已从 Member 切换为系统用户。

### Task 1.4: 分析 `docs/design/数据库设计.md` 需要修改的位置

**Files:** Read: `docs/design/数据库设计.md`

- [ ] **Step 1: 定位 §五 "系统用户字段" 表格**

找到 `| approvalLeaderId | ... |` 行。

- [ ] **Step 2: 输出新增行**

在 `approvalLeaderId` 之后插入：

```markdown
| `responsibleLeaderUserId` | 责任领导系统用户，FK → users |
| `responsiblePersonUserId` | 责任人系统用户，FK → users |
```

---

## Phase 2: 数据库 Schema (Supervised)

> **Supervised mode**: 修改 Prisma schema 属于高风险操作。Phase 2 完成后需运行 `prisma migrate`。

### Task 2.1: 修改 `prisma/schema.prisma` — WorkItem 新增字段

**Files:** Modify: `prisma/schema.prisma:149-153` (在 responsiblePersonMemberId 之后)

- [ ] **Step 1: 在 WorkItem 模型新增字段和 relation**

在 `responsiblePersonMemberId` 行之后、`proposedScene` 之前插入：

```prisma
  // Direct User references for permission checks (Issue #XXX).
  // Populated alongside name snapshots; responsiblePersonUserId drives
  // operation permission after PROPOSE approval completes.
  responsibleLeaderUserId   Int?
  responsiblePersonUserId   Int?

  responsibleLeaderUser     User?  @relation("ResponsibleLeaderUserWorkItems", fields: [responsibleLeaderUserId], references: [id])
  responsiblePersonUser     User?  @relation("ResponsiblePersonUserWorkItems", fields: [responsiblePersonUserId], references: [id])
```

- [ ] **Step 2: 在 WorkItem 模型新增索引**

在 `responsiblePersonMember` relation 行之后插入：

```prisma
  @@index([responsibleLeaderUserId])
  @@index([responsiblePersonUserId])
```

### Task 2.2: 修改 `prisma/schema.prisma` — User 新增反向 relation

**Files:** Modify: `prisma/schema.prisma:116-118` (在 `member` 行附近)

- [ ] **Step 1: 在 User 模型新增反向 relation**

在 `member Member?` 行之前插入：

```prisma
  responsibleLeaderWorkItems WorkItem[] @relation("ResponsibleLeaderUserWorkItems")
  responsiblePersonWorkItems WorkItem[] @relation("ResponsiblePersonUserWorkItems")
```

### Task 2.3: 生成 migration

- [ ] **Step 1: 运行 prisma migrate**

```bash
cd c:/Users/sslc/Desktop/projects/supervision && pnpm prisma:generate
```

Expected: 成功，无类型错误。

```bash
pnpm exec prisma migrate dev --name add_responsible_user_fks
```

Expected: 生成 migration SQL，DDL 只包含 ADD COLUMN + CREATE INDEX。

- [ ] **Step 2: 验证类型**

```bash
pnpm typecheck
```

Expected: PASS（或仅有预存错误，无新增类型错误）。

### Task 2.4: Commit

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): add responsibleLeaderUserId and responsiblePersonUserId to WorkItem"
```

---

## Phase 4: 表单与 UI 改造 (Supervised)

### Task 4.1: 新增 API — `GET /api/users/by-department`

**Files:** Modify: `src/features/users/application/list-department-users.usecase.ts`
Create: `src/app/api/users/by-department/route.ts`
Modify: `src/features/users/client/user-api.ts`

- [ ] **Step 1: 新增 usecase**

在 `src/features/users/application/list-department-users.usecase.ts` 末尾新增：

```typescript
export async function listDepartmentUsersUseCase(
  currentUser: { id: number; role: string; departmentId: number },
  departmentId: number,
): Promise<Result<UserDto[]>> {
  if (isNaN(departmentId)) {
    return err(400, '请提供部门ID')
  }

  if (
    !isGlobalView(currentUser.role) &&
    !isCompanyLevel(currentUser.role) &&
    currentUser.departmentId !== departmentId
  ) {
    return err(403, '无权限查询其他部门用户')
  }

  const users = await findUsersByDepartment(departmentId)
  return ok(users.map(toUserDto))
}
```

- [ ] **Step 2: 创建路由**

创建 `src/app/api/users/by-department/route.ts`：

```typescript
import { NextRequest } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { ok } from '@/shared/http/api-response'
import { listDepartmentUsersUseCase } from '@/features/users/application/list-department-users.usecase'

export const GET = withApiHandler(async (request: NextRequest) => {
  const currentUser = await requireCurrentUser(request)
  const { searchParams } = new URL(request.url)
  const departmentId = Number(searchParams.get('departmentId'))

  const result = await listDepartmentUsersUseCase(currentUser, departmentId)
  if (!result.success) {
    return Response.json({ error: result.error }, { status: result.status })
  }
  return ok(result.data)
})
```

- [ ] **Step 3: 新增客户端 API 函数**

在 `src/features/users/client/user-api.ts` 末尾新增：

```typescript
export async function getDepartmentUsers(departmentId: number): Promise<User[]> {
  try {
    const response = await fetch(
      `/api/users/by-department?departmentId=${departmentId}`,
      { method: 'GET', credentials: 'include' },
    )
    if (!response.ok) return []
    const data = (await response.json()) as UserDto[]
    return data.map(toClientUser)
  } catch {
    return []
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/users/application/list-department-users.usecase.ts src/app/api/users/by-department/ src/features/users/client/user-api.ts
git commit -m "feat(users): add GET /api/users/by-department endpoint"
```

### Task 4.2: 新建 `UserSelect` 组件

**Files:** Create: `src/features/users/client/user-select.tsx`

- [ ] **Step 1: 编写组件**

```typescript
'use client'

import React, { useEffect, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SELECT_CONTROL } from '@/features/works/ui/visual-tokens'
import { getDepartmentUsers } from '@/features/users/client/user-api'
import type { User } from '@/features/users/client/user-client.types'

export interface UserSelectProps {
  departmentId: number | undefined
  value: number | undefined
  onChange: (userId: number | undefined, name: string) => void
  filterLeaders?: boolean
  excludeLeaders?: boolean
  placeholder?: string
  disabled?: boolean
}

export function UserSelect({
  departmentId,
  value,
  onChange,
  filterLeaders,
  excludeLeaders,
  placeholder,
  disabled,
}: UserSelectProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!departmentId) {
      setUsers([])
      return
    }

    let cancelled = false
    setLoading(true)

    getDepartmentUsers(departmentId)
      .then((data) => {
        if (cancelled) return
        let filtered = data
        if (filterLeaders) {
          filtered = data.filter((u) => u.role === 'DEPARTMENT_LEADER')
        } else if (excludeLeaders) {
          filtered = data.filter((u) => u.role !== 'DEPARTMENT_LEADER')
        }
        setUsers(filtered)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [departmentId, filterLeaders, excludeLeaders])

  const selectedUser = users.find((u) => u.id === value)

  return (
    <Select
      value={value ? String(value) : ''}
      onValueChange={(val) => {
        const user = users.find((u) => String(u.id) === val)
        if (user) {
          onChange(user.id, user.name)
        }
      }}
      disabled={disabled || !departmentId || loading}
    >
      <SelectTrigger className={SELECT_CONTROL}>
        <SelectValue placeholder={loading ? '加载中...' : (placeholder || '请选择用户')}>
          {selectedUser?.name}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {users.map((user) => (
          <SelectItem key={user.id} value={String(user.id)}>
            {user.name}
            <span className="text-muted-foreground ml-2 text-xs">
              {user.role === 'DEPARTMENT_LEADER' ? '(领导)' : user.role === 'DEPARTMENT_MANAGER' ? '(主管)' : ''}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/users/client/user-select.tsx
git commit -m "feat(ui): add UserSelect component for department user selection"
```

### Task 4.3: 改造 `ResponsibleFields` 组件

**Files:** Modify: `src/features/works/ui/work-form-fields.tsx:148-226`

- [ ] **Step 1: 修改 Props 接口**

将 `ResponsibleFieldsProps` (line 149-160) 替换为：

```typescript
export interface ResponsibleFieldsProps {
  leaderValue: string
  onLeaderChange: (value: string) => void
  personValue: string
  onPersonChange: (value: string) => void
  departmentId?: number
  leaderUserId?: number
  onLeaderUserIdChange?: (id: number | undefined) => void
  personUserId?: number
  onPersonUserIdChange?: (id: number | undefined) => void
}
```

- [ ] **Step 2: 修改组件实现**

将 `ResponsibleFields` 函数体 (line 162-226) 替换为：

```typescript
export function ResponsibleFields({
  leaderValue,
  onLeaderChange,
  personValue,
  onPersonChange,
  departmentId,
  leaderUserId,
  onLeaderUserIdChange,
  personUserId,
  onPersonUserIdChange,
}: ResponsibleFieldsProps) {
  const hasDepartment = Boolean(departmentId)

  return (
    <>
      <div>
        <label className={FIELD_LABEL + ' mb-1'}>
          责任领导
        </label>
        {hasDepartment ? (
          <UserSelect
            departmentId={departmentId}
            value={leaderUserId}
            onChange={(id, name) => {
              onLeaderUserIdChange?.(id)
              onLeaderChange(name)
            }}
            filterLeaders
            placeholder="请选择责任领导"
          />
        ) : (
          <Input
            value={leaderValue}
            onChange={(e) => onLeaderChange(e.target.value)}
            placeholder="请输入责任领导姓名"
          />
        )}
      </div>

      <div>
        <label className={FIELD_LABEL + ' mb-1'}>
          责任人
        </label>
        {hasDepartment ? (
          <UserSelect
            departmentId={departmentId}
            value={personUserId}
            onChange={(id, name) => {
              onPersonUserIdChange?.(id)
              onPersonChange(name)
            }}
            excludeLeaders
            placeholder="请选择责任人"
          />
        ) : (
          <Input
            value={personValue}
            onChange={(e) => onPersonChange(e.target.value)}
            placeholder="请输入责任人姓名"
          />
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 3: 更新 import**

在文件顶部新增 import：

```typescript
import { UserSelect } from '@/features/users/client/user-select'
```

移除 `MemberSelect` import（如果不再被其他地方使用则删除；如果有其他地方使用则保留）。

- [ ] **Step 4: Commit**

```bash
git add src/features/works/ui/work-form-fields.tsx
git commit -m "refactor(ui): switch ResponsibleFields from MemberSelect to UserSelect"
```

### Task 4.4: 改造 DTO / Mapper / Client Types

**Files:** Modify:
- `src/features/works/application/work.dto.ts`
- `src/features/works/application/work.mapper.ts`
- `src/features/works/client/work-client.types.ts`
- `src/features/works/client/work-client.mapper.ts`

- [ ] **Step 1: 修改 WorkDto**

在 `src/features/works/application/work.dto.ts`：

删除 line 28-29：
```typescript
// 删除:
responsibleLeaderMemberId?: number | null
responsiblePersonMemberId?: number | null
```

在 `responsiblePerson` 行之后新增：
```typescript
responsibleLeaderUserId?: number | null
responsiblePersonUserId?: number | null
```

- [ ] **Step 2: 修改 WorkSource 和 toWorkDto**

在 `src/features/works/application/work.mapper.ts`：

删除 `WorkSource` 接口中的 (line 35-36)：
```typescript
responsibleLeaderMemberId?: number | null
responsiblePersonMemberId?: number | null
```

新增：
```typescript
responsibleLeaderUserId?: number | null
responsiblePersonUserId?: number | null
```

在 `toWorkDto` 函数中，删除 (line 145-146)：
```typescript
responsibleLeaderMemberId: work.responsibleLeaderMemberId,
responsiblePersonMemberId: work.responsiblePersonMemberId,
```

替换为：
```typescript
responsibleLeaderUserId: work.responsibleLeaderUserId,
responsiblePersonUserId: work.responsiblePersonUserId,
```

- [ ] **Step 3: 修改 Work client type**

在 `src/features/works/client/work-client.types.ts`：

删除 line 95-96：
```typescript
responsibleLeaderMemberId?: number
responsiblePersonMemberId?: number
```

新增：
```typescript
responsibleLeaderUserId?: number | null
responsiblePersonUserId?: number | null
```

同时修改 `WorkEditablePatchBase` (line 138-165)：删除 `responsibleLeaderMemberId` 和 `responsiblePersonMemberId`；在对应位置新增 `responsibleLeaderUserId` 和 `responsiblePersonUserId`。

同时修改 `NullableWorkNumberField` (line 185-190)：删除 MemberId，新增 userId。

- [ ] **Step 4: 修改 client mapper**

在 `src/features/works/client/work-client.mapper.ts`：

`transformWorkFromAPI` 中删除 (line 96-97)：
```typescript
responsibleLeaderMemberId: work.responsibleLeaderMemberId ?? undefined,
responsiblePersonMemberId: work.responsiblePersonMemberId ?? undefined,
```

替换为：
```typescript
responsibleLeaderUserId: work.responsibleLeaderUserId ?? undefined,
responsiblePersonUserId: work.responsiblePersonUserId ?? undefined,
```

`buildCreateWorkBody` 中删除 (line 144-145)：
```typescript
responsibleLeaderMemberId: work.responsibleLeaderMemberId ?? null,
responsiblePersonMemberId: work.responsiblePersonMemberId ?? null,
```

替换为：
```typescript
responsibleLeaderUserId: work.responsibleLeaderUserId ?? null,
responsiblePersonUserId: work.responsiblePersonUserId ?? null,
```

`buildUpdateWorkBody` 中删除 (line 171-174)，替换为：
```typescript
if ('responsibleLeaderUserId' in patch)
  data.responsibleLeaderUserId = patch.responsibleLeaderUserId ?? null
if ('responsiblePersonUserId' in patch)
  data.responsiblePersonUserId = patch.responsiblePersonUserId ?? null
```

- [ ] **Step 5: 更新 WorkSource 接口以匹配新的 include**

在 `src/features/works/application/work.mapper.ts` 的 `WorkSource` 接口中新增：

```typescript
responsibleLeaderUserId?: number | null
responsiblePersonUserId?: number | null
responsibleLeaderUser?: { id: number; name: string } | null
responsiblePersonUser?: { id: number; name: string } | null
```

在 `toWorkDto` 中新增映射：

```typescript
responsibleLeaderUserId: work.responsibleLeaderUserId,
responsiblePersonUserId: work.responsiblePersonUserId,
```

- [ ] **Step 6: Commit**

```bash
git add src/features/works/application/work.dto.ts src/features/works/application/work.mapper.ts src/features/works/client/work-client.types.ts src/features/works/client/work-client.mapper.ts
git commit -m "refactor: replace MemberId with UserId in DTO, mapper, and client types"
```

### Task 4.5: 改造 `build-create-work-payload.ts`

**Files:** Modify: `src/features/works/client/build-create-work-payload.ts`

- [ ] **Step 1: 修改 priorityMain 分支**

删除 `responsibleLeaderMemberId` / `responsiblePersonMemberId`，新增：
```typescript
responsibleLeaderUserId: priorityMainForm.responsibleLeaderUserId,
responsiblePersonUserId: priorityMainForm.responsiblePersonUserId,
```

- [ ] **Step 2: 修改 todo 分支**

同样删除 MemberId，新增 userId。

- [ ] **Step 3: Commit**

```bash
git add src/features/works/client/build-create-work-payload.ts
git commit -m "refactor: pass responsibleXxxUserId instead of MemberId in create payload"
```

### Task 4.6: 改造 `create-work.usecase.ts`

**Files:** Modify: `src/features/works/application/create-work.usecase.ts`

- [ ] **Step 1: 修改 CreateWorkBody**

删除：
```typescript
responsibleLeaderMemberId?: number | null
responsiblePersonMemberId?: number | null
```

新增：
```typescript
responsibleLeaderUserId?: number | null
responsiblePersonUserId?: number | null
```

- [ ] **Step 2: 移除 Member 校验逻辑**

删除 `validateMemberAssignments` 相关的整个校验块（line 107-119）。

改为 User 校验：在 department 校验之后，新增：

```typescript
// Validate responsibleLeaderUserId
if (body.responsibleLeaderUserId != null) {
  const leaderUser = await findUserById(body.responsibleLeaderUserId)
  if (!leaderUser || !leaderUser.isActive) {
    return err(400, '责任领导用户不存在或已禁用')
  }
}

// Validate responsiblePersonUserId
if (body.responsiblePersonUserId != null) {
  const personUser = await findUserById(body.responsiblePersonUserId)
  if (!personUser || !personUser.isActive) {
    return err(400, '责任人用户不存在或已禁用')
  }
}
```

Add import: `import { findUserById } from '@/features/users/infrastructure/user.repository'`

- [ ] **Step 3: 修改 workData 写入**

删除 `responsibleLeaderMemberId` / `responsiblePersonMemberId`，新增 userId：
```typescript
responsibleLeaderUserId: body.responsibleLeaderUserId,
responsiblePersonUserId: body.responsiblePersonUserId,
```

- [ ] **Step 4: Commit**

```bash
git add src/features/works/application/create-work.usecase.ts
git commit -m "feat(create-work): accept responsibleXxxUserId, validate User active, drop MemberId"
```

### Task 4.7: 改造 `update-work.usecase.ts`

**Files:** Modify: `src/features/works/application/update-work.usecase.ts`

- [ ] **Step 1: 修改 UpdateWorkBody**

删除 MemberId 字段，新增 userId 字段（同 Task 4.6 Step 1）。

- [ ] **Step 2: 移除 Member 校验，改为 User 校验**

同 Task 4.6 Step 2。

- [ ] **Step 3: 新增 IN_PROGRESS 不可改责任人的 guard**

在 `canEditWorkItem` 检查之后、Member→User 校验之前，新增：

```typescript
// Guard: IN_PROGRESS 及审批态下，普通更新接口不允许修改责任人
// 责任人调整必须走 ADJUSTING 审批
const terminalOrApproving =
  work.status === WorkItemStatus.IN_PROGRESS ||
  work.status === WorkItemStatus.PROPOSING ||
  work.status === WorkItemStatus.ADJUSTING ||
  work.status === WorkItemStatus.CANCELLING ||
  work.status === WorkItemStatus.COMPLETING ||
  work.status === WorkItemStatus.COMPLETED ||
  work.status === WorkItemStatus.CANCELLED

if (
  terminalOrApproving &&
  (body.responsibleLeaderUserId !== undefined ||
   body.responsiblePersonUserId !== undefined)
) {
  return err(403, '进行中或审批中的事项不能通过编辑接口修改责任人，请使用调整审批')
}
```

Add import: `import { WorkItemStatus } from '@prisma/client'`

- [ ] **Step 4: 修改 updateData 写入**

删除 MemberId 的 `if (body.responsibleLeaderMemberId !== undefined)` 块，新增：
```typescript
if (body.responsibleLeaderUserId !== undefined)
  updateData.responsibleLeaderUserId = body.responsibleLeaderUserId
if (body.responsiblePersonUserId !== undefined)
  updateData.responsiblePersonUserId = body.responsiblePersonUserId
```

- [ ] **Step 5: Commit**

```bash
git add src/features/works/application/update-work.usecase.ts
git commit -m "feat(update-work): accept responsibleXxxUserId, drop MemberId, guard IN_PROGRESS changes"
```

### Task 4.8: 改造新建页

**Files:** Modify: `src/app/(app)/[type]/new/page.tsx`

- [ ] **Step 1: 修改 priorityMainForm state**

删除 `responsibleLeaderMemberId` / `responsiblePersonMemberId`，新增：
```typescript
responsibleLeaderUserId: undefined as number | undefined,
responsiblePersonUserId: undefined as number | undefined,
```

切换部门时同步清空 userId（已有清空 name 的逻辑，加上 userId 清空）。

- [ ] **Step 2: 修改 todoForm state**

同上。

- [ ] **Step 3: 修改 ResponsibleFields 调用**

移除 MemberId props，新增 userId props（参见 spec §6.4.1 的调用示例）。

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/\[type\]/new/page.tsx
git commit -m "refactor(new-page): switch to responsibleXxxUserId in form state"
```

### Task 4.9: 改造编辑页

**Files:** Modify: `src/app/(app)/[type]/[id]/edit/page.tsx`

- [ ] **Step 1: 修改 buildInitialPriorityMainForm**

新增 `responsibleLeaderUserId` / `responsiblePersonUserId`，删除 MemberId。

- [ ] **Step 2: 修改 buildInitialTodoForm**

同上。

- [ ] **Step 3: 修改 ResponsibleFields 调用**

同上 Task 4.8。

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/\[type\]/\[id\]/edit/page.tsx
git commit -m "refactor(edit-page): switch to responsibleXxxUserId in form state"
```

### Task 4.10: 改造分解面板

**Files:** Modify: `src/features/works/ui/work-decompose-panel.tsx`

- [ ] **Step 1: 新增 state 和 props**

`WorkDecomposePanelProps` 新增：
```typescript
departmentId?: number
responsibleLeaderUserId?: number
onLeaderUserIdChange?: (id: number | undefined) => void
responsiblePersonUserId?: number
onPersonUserIdChange?: (id: number | undefined) => void
leaderValue?: string
onLeaderChange?: (v: string) => void
personValue?: string
onPersonChange?: (v: string) => void
```

- [ ] **Step 2: 新增 ResponsibleFields**

在"完成时间"字段之后、"WorkFormNodes"之前插入：
```tsx
{Boolean(departmentId) && (
  <div className="flex gap-4 [&>div]:flex-1">
    <ResponsibleFields
      leaderValue={leaderValue || ''}
      onLeaderChange={onLeaderChange || (() => {})}
      personValue={personValue || ''}
      onPersonChange={onPersonChange || (() => {})}
      departmentId={departmentId}
      leaderUserId={responsibleLeaderUserId}
      onLeaderUserIdChange={onLeaderUserIdChange}
      personUserId={responsiblePersonUserId}
      onPersonUserIdChange={onPersonUserIdChange}
    />
  </div>
)}
```

Add import: `import { ResponsibleFields } from '@/features/works/ui/work-form-fields'`

- [ ] **Step 3: Commit**

```bash
git add src/features/works/ui/work-decompose-panel.tsx
git commit -m "feat(decompose): add ResponsibleFields with UserSelect to decompose panel"
```

### Task 4.11: 修复 work.repository.ts — 补全 include

**Files:** Modify: `src/features/works/infrastructure/work.repository.ts:4-14,30-47`

> **重要**: 详情页需要 `responsibleLeaderUser?.name` / `responsiblePersonUser?.name`，但 `WORK_DETAIL_INCLUDE` 和 `WORK_LIST_INCLUDE` 未 include 这两个 relation。不补的话 Prisma 不会 join，详情页拿不到 User name。

- [ ] **Step 1: 修改 WORK_LIST_INCLUDE**

在 `WORK_LIST_INCLUDE`（line 4-14）中新增：

```typescript
responsibleLeaderUser: { select: { id: true, name: true } },
responsiblePersonUser: { select: { id: true, name: true } },
```

- [ ] **Step 2: 修改 WORK_DETAIL_INCLUDE**

在 `WORK_DETAIL_INCLUDE`（line 30-47）中，`firstSubmitter` 之后新增：

```typescript
responsibleLeaderUser: { select: { id: true, name: true } },
responsiblePersonUser: { select: { id: true, name: true } },
```

- [ ] **Step 3: 修改 WorkCreateRow 类型**

`WORK_CREATE_INCLUDE`（line 62-65）也需要包含这两个 relation，创建后返回的 DTO 才能映射 userId。在 include 中新增：

```typescript
responsibleLeaderUser: { select: { id: true, name: true } },
responsiblePersonUser: { select: { id: true, name: true } },
```

- [ ] **Step 4: Commit**

```bash
git add src/features/works/infrastructure/work.repository.ts
git commit -m "fix(repository): include responsibleLeaderUser/responsiblePersonUser in work queries"
```

### Task 4.12: 改造详情页展示

**Files:** Modify: `src/app/(app)/[type]/[id]/page.tsx`

- [ ] **Step 1: 查找详情页责任领导/责任人展示位置**

Grep for `responsibleLeader` or `responsiblePerson` in the detail page.

- [ ] **Step 2: 更新展示为 User name 优先**

当 `work.responsibleLeaderUserId` 有值时展示 User 姓名（通过 Prisma include 的 relation），回退到 `responsibleLeader` 姓名快照。不展示 Member 信息。

类似地处理 `responsiblePerson`。

---

## Phase 5: 权限改造 — 核心 (Supervised)

### Task 5.1: 修改 `canOperateWorkItem`

**Files:** Modify: `src/features/works/domain/work.permissions.ts:138-160`

- [ ] **Step 1: 更新 PermissionWorkItem 接口**

在 `PermissionWorkItem` 接口 (line 13-29) 新增：
```typescript
responsiblePersonUserId?: number | null
responsibleLeaderUserId?: number | null
```

- [ ] **Step 2: 重写 canOperateWorkItem**

将现有函数替换为：

```typescript
export function canOperateWorkItem(
  user: PermissionUser,
  workItem: PermissionWorkItem,
): boolean {
  // ADMIN/SUPERVISOR do not initiate workflow state changes.
  if (isGlobalView(user.role)) return false

  const status = normalizeStatus(workItem.status)

  // Only allows DRAFT/IN_PROGRESS/PENDING_DECOMPOSE, excluding terminal states and approving states.
  if (!isHandling(status)) return false

  // Pre-approval (DRAFT / PENDING_DECOMPOSE): maintain existing owner logic
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

  // Post-approval (IN_PROGRESS): responsiblePersonUserId is the only handler
  return workItem.responsiblePersonUserId === user.id
}
```

- [ ] **Step 2: 验证类型检查**

```bash
pnpm typecheck
```

Expected: PASS 或仅有预存错误。

- [ ] **Step 3: Commit**

```bash
git add src/features/works/domain/work.permissions.ts
git commit -m "feat(permissions): switch canOperateWorkItem to responsiblePersonUserId after PROPOSE approval"
```

---

## Phase 6: Workflow 调整 (Supervised)

### Task 6.1: 改造 `submit-proposal.usecase.ts` — 新增校验

**Files:** Modify: `src/features/workflow/application/submit-proposal.usecase.ts`

- [ ] **Step 1: 在提交 PROPOSE 前校验 responsiblePersonUserId**

在 `getProposalFirstApprover` 调用之前（line 76 附近），新增：

```typescript
// Guard: must have a valid responsible person before entering PROPOSING
if (workItem.type === WorkItemType.PRIORITY || workItem.type === WorkItemType.MAIN) {
  if (!workItem.responsiblePersonUserId) {
    return err(400, '请先指定责任人后再提交审批')
  }
}
```

> 注意：TODO 类型的 `responsiblePersonUserId` 在分解阶段指定，不在 submit-proposal 时校验。

- [ ] **Step 2: Commit**

```bash
git add src/features/workflow/application/submit-proposal.usecase.ts
git commit -m "feat(submit-proposal): validate responsiblePersonUserId exists before PROPOSE"
```

### Task 6.2: 改造分解全链路 — route → usecase → 写入

**Files:** Modify:
- `src/app/api/works/[id]/workflow/route.ts` (line 74-78)
- `src/features/workflow/application/decompose-todo-work.usecase.ts` (line 16-21 signature + line 50-61 update)
- `src/features/workflow/client/workflow-api.ts` (line 100-113)

- [ ] **Step 1: 修改 workflow-api.ts — 传递 userId/name**

将 `submitTodoDecomposition` 改为：

```typescript
export async function submitTodoDecomposition(
  work: Work,
  patch: WorkEditablePatch,
) {
  const nodes = patch.nodes || []
  const body: Record<string, unknown> = {
    action: 'decompose',
    nodes,
    comment: '待办分解',
  }
  // Pass new responsible user fields if present in patch
  if (patch.responsibleLeaderUserId !== undefined) {
    body.responsibleLeaderUserId = patch.responsibleLeaderUserId
    body.responsibleLeader = patch.responsibleLeader
  }
  if (patch.responsiblePersonUserId !== undefined) {
    body.responsiblePersonUserId = patch.responsiblePersonUserId
    body.responsiblePerson = patch.responsiblePerson
  }
  const response = await fetch(`/api/works/${work.id}/workflow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  await throwOnError(response)
  return getWorkById(work.id)
}
```

- [ ] **Step 2: 修改 route.ts — 解构新字段并传入 usecase**

将 decompose case（line 74-78）改为：

```typescript
case 'decompose':
  if (!body.nodes || !Array.isArray(body.nodes)) {
    return fail('请提供分解节点', 400)
  }
  result = await decomposeTodoWork(
    workItemId,
    currentUser,
    body.nodes,
    body.comment,
    body.responsibleLeaderUserId ?? null,
    body.responsiblePersonUserId ?? null,
    body.responsibleLeader ?? null,
    body.responsiblePerson ?? null,
  )
  break
```

- [ ] **Step 3: 修改 decompose-todo-work.usecase.ts — 签名 + 校验 + 写入**

修改函数签名为：

```typescript
export async function decomposeTodoWork(
  workItemId: number,
  user: BaseCurrentUser,
  nodes: unknown[],
  comment?: string,
  responsibleLeaderUserId?: number | null,
  responsiblePersonUserId?: number | null,
  responsibleLeader?: string | null,
  responsiblePerson?: string | null,
): Promise<Result> {
```

在 `ensureMainResponsibleDepartment` 之后、`getProposalFirstApprover` 之前新增校验：

```typescript
if (!responsiblePersonUserId) {
  return err(400, '请先指定责任人后再提交分解方案')
}
```

在 `updateWorkItem` 调用中新增写入字段：

```typescript
await updateWorkItem(workItemId, {
  nodes,
  status: WorkItemStatus.PROPOSING,
  action: ActionType.TODO_DECOMPOSE,
  beforeApprovalStatus: oldStatus,
  approvalType: ApprovalType.PROPOSE,
  currentApproverId: approver.currentApproverId,
  currentApproverRole: approver.currentApproverRole,
  firstSubmitterId: workItem.firstSubmitterId ?? user.id,
  rejectReason: null,
  rejectedFromStatus: null,
  // New fields
  responsibleLeaderUserId: responsibleLeaderUserId ?? null,
  responsiblePersonUserId: responsiblePersonUserId ?? null,
  responsibleLeader: responsibleLeader ?? null,
  responsiblePerson: responsiblePerson ?? null,
})
```

- [ ] **Step 4: Commit**

```bash
git add src/features/workflow/client/workflow-api.ts src/app/api/works/\[id\]/workflow/route.ts src/features/workflow/application/decompose-todo-work.usecase.ts
git commit -m "feat(decompose): wire responsiblePersonUserId through decompose chain"
```

### Task 6.3: 改造 `submit-adjustment.usecase.ts` — 操作权限校验

**Files:** Modify: `src/features/workflow/application/submit-adjustment.usecase.ts`

- [ ] **Step 1: 新增 responsiblePersonUserId 操作权校验**

在现有的 `canOperateWorkItem` 检查之后，新增 IN_PROGRESS 专属校验：

```typescript
// IN_PROGRESS: only responsiblePersonUserId can submit adjustment
if (workItem.status === WorkItemStatus.IN_PROGRESS) {
  if (workItem.responsiblePersonUserId !== user.id) {
    return err(403, '只有责任人可以提交调整申请')
  }
}
```

> 注意事项: `canOperateWorkItem` 已经在新逻辑中做了这个判断（审批通过后只有 responsiblePersonUserId 可以操作），但 usecase 层的显式校验可以给出更清晰的错误信息。

- [ ] **Step 2: Commit**

```bash
git add src/features/workflow/application/submit-adjustment.usecase.ts
git commit -m "feat(submit-adjustment): enforce responsiblePersonUserId check"
```

### Task 6.4: 改造 `submit-cancellation.usecase.ts` — 操作权限校验

**Files:** Modify: `src/features/workflow/application/submit-cancellation.usecase.ts`

- [ ] **Step 1: 同 Task 6.3 的 IN_PROGRESS 专属校验**

- [ ] **Step 2: Commit**

```bash
git add src/features/workflow/application/submit-cancellation.usecase.ts
git commit -m "feat(submit-cancellation): enforce responsiblePersonUserId check"
```

### Task 6.5: 改造 `submit-completion.usecase.ts` — 操作权限校验

**Files:** Modify: `src/features/workflow/application/submit-completion.usecase.ts`

- [ ] **Step 1: 同 Task 6.3 的 IN_PROGRESS 专属校验**

- [ ] **Step 2: Commit**

```bash
git add src/features/workflow/application/submit-completion.usecase.ts
git commit -m "feat(submit-completion): enforce responsiblePersonUserId check"
```

### Task 6.6: 改造 `approve-workflow-action.usecase.ts` — PROPOSE 审批通过兜底

**Files:** Modify: `src/features/workflow/application/approve-workflow-action.usecase.ts`

- [ ] **Step 1: 新增兜底校验**

在 `nextAssignment.kind === 'complete'` 分支中，PROPOSE 审批通过进入 IN_PROGRESS 前，新增校验（line 104 `const targetStatus = getTargetStatus(...)` 之后）：

```typescript
// Guard: prevent entering IN_PROGRESS without a responsible person
if (
  workItem.approvalType === ApprovalType.PROPOSE &&
  targetStatus === WorkItemStatus.IN_PROGRESS &&
  !workItem.responsiblePersonUserId
) {
  return err(400, '事项缺少责任人，无法审批通过。请先补充责任人信息。')
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/workflow/application/approve-workflow-action.usecase.ts
git commit -m "feat(approve): guard against entering IN_PROGRESS without responsiblePersonUserId"
```

---

## Phase 7: 统计/导入导出同步 (Supervised)

### Task 7.0: 修复 dashboard select — 补全 responsiblePersonUserId

**Files:** Modify: `src/features/dashboard/infrastructure/dashboard.repository.ts:5-25`

> **重要**: `findDashboardWorks` 使用 `select` 而非 `include`，不显式 select 的字段在运行时为 `undefined`。`shouldHandleWorkItem` 依赖 `responsiblePersonUserId`，漏字段会导致责任人的待处理列表统计错误。

- [ ] **Step 1: 在 dashboardWorkSelect 中新增字段**

在 `responsiblePerson` 行之后（line 16）新增：

```typescript
responsibleLeaderUserId: true,
responsiblePersonUserId: true,
```

`beforeApprovalStatus` / `approvalType` / `rejectReason` / `rejectedFromStatus` 也需要检查是否存在——这些字段 `shouldHandleWorkItem` / `canApproveWorkItem` 也依赖。如果当前 select 未包含，一并补全。

- [ ] **Step 2: 确认 shouldHandleWorkItem 依赖的所有字段均已 select**

`shouldHandleWorkItem` → `canOperateWorkItem` → `normalizeStatus(status)` + `isHandling(status)` + `isReturnedInProgressWork(workItem)`

`isReturnedInProgressWork` 依赖：`status`, `rejectReason`, `rejectedFromStatus`, `workflowRecords`

检查 `dashboardWorkSelect` 是否已包含 `rejectReason` / `rejectedFromStatus`。如果未包含，补充：

```typescript
rejectReason: true,
rejectedFromStatus: true,
beforeApprovalStatus: true,
approvalType: true,
```

- [ ] **Step 3: Commit**

```bash
git add src/features/dashboard/infrastructure/dashboard.repository.ts
git commit -m "fix(dashboard): add responsiblePersonUserId and missing fields to dashboard select"
```

### Task 7.1: 改造 Excel 导入 — parser 新增姓名匹配

**Files:** Modify: `src/features/excel/infrastructure/work-import-parser.ts`

- [ ] **Step 1: 在 parser 中新增 User 姓名→ID 匹配**

在 `validateAndParseExcel` 函数中，`companyLeaders` 参数旁新增一个 `allUsers` 参数：

```typescript
interface DepartmentUserInfo {
  id: number; name: string; departmentId: number
}
```

函数签名新增：`allUsers: DepartmentUserInfo[]`

- [ ] **Step 2: 按姓名分组构建映射（避免重名吞数据）**

在 `leaderNameToId` 之后新增：

```typescript
// Group users by name to detect duplicates
const nameToUsers = new Map<string, DepartmentUserInfo[]>()
for (const u of allUsers) {
  const existing = nameToUsers.get(u.name)
  if (existing) {
    existing.push(u)
  } else {
    nameToUsers.set(u.name, [u])
  }
}

// Only names with exactly one active user can be auto-matched
const uniqueNameToUserId = new Map<string, number>()
for (const [name, users] of nameToUsers) {
  if (users.length === 1) {
    uniqueNameToUserId.set(name, users[0].id)
  }
}
```

- [ ] **Step 3: 匹配 responsibleLeader / responsiblePerson（先分组再匹配）**

在负责领导/责任人解析处，新增匹配逻辑。例如 PRIORITY 类型：

```typescript
// Match responsiblePerson to User (only when name is unique)
let responsiblePersonUserId: number | null = null
if (responsiblePerson) {
  const matches = nameToUsers.get(responsiblePerson)
  if (matches && matches.length === 1) {
    responsiblePersonUserId = matches[0].id
  } else if (matches && matches.length > 1) {
    errors.push({
      row: rowNum,
      field: '责任人',
      value: responsiblePerson,
      reason: `姓名"${responsiblePerson}"匹配到 ${matches.length} 个系统用户，无法自动关联，请在系统中手动指定`,
    })
  }
  // If no match found (matches is undefined): skip silently, userId stays null
}

// Match responsibleLeader to User (same pattern)
let responsibleLeaderUserId: number | null = null
if (responsibleLeader) {
  const matches = nameToUsers.get(responsibleLeader)
  if (matches && matches.length === 1) {
    responsibleLeaderUserId = matches[0].id
  } else if (matches && matches.length > 1) {
    errors.push({
      row: rowNum,
      field: '责任领导',
      value: responsibleLeader,
      reason: `姓名"${responsibleLeader}"匹配到 ${matches.length} 个系统用户，无法自动关联，请在系统中手动指定`,
    })
  }
}
```

MAIN 和 TODO 类型同理。

- [ ] **Step 4: 在 ImportRow data 中新增 userId 字段**

在 PRIORITY、MAIN、TODO 三个类型的 `data` 对象中各新增：
```typescript
responsibleLeaderUserId,
responsiblePersonUserId,
```

- [ ] **Step 5: Commit**

### Task 7.2: 改造 Excel 导入 — usecase 写入 userId

**Files:** Modify: `src/features/excel/application/import-works-from-excel.usecase.ts`

- [ ] **Step 1: 在 create 数据中写入 userId**

在 PRIORITY/MAIN 分支的 `workItems` 构建中，`responsibleLeader` / `responsiblePerson` 行后新增：
```typescript
responsibleLeaderUserId: data.responsibleLeaderUserId ?? null,
responsiblePersonUserId: data.responsiblePersonUserId ?? null,
```

TODO 分支同理。

- [ ] **Step 2: Commit**

---

## Phase 8: 构建验证 (Supervised)

### Task 8.1: 全量类型检查和构建

- [ ] **Step 1: prisma generate**

```bash
pnpm prisma:generate
```

Expected: PASS

- [ ] **Step 2: typecheck**

```bash
pnpm typecheck
```

Expected: PASS（或仅有预存错误，无新增错误）

- [ ] **Step 3: lint**

```bash
pnpm lint
```

Expected: PASS（或仅有预存错误）

- [ ] **Step 4: build**

```bash
pnpm build
```

Expected: PASS

---

## 自检清单

- [ ] Spec §3 (文档修改): Task 1.1-1.4 覆盖所有 4 个文档
- [ ] Spec §4 (Schema): Task 2.1-2.4 覆盖字段、relation、索引、migration
- [ ] Spec §5 (迁移): Task 3.1 覆盖独立迁移脚本 + 报告输出
- [ ] Spec §6.1-6.3 (后端 usecase): Task 4.6-4.7 + 6.1-6.2 覆盖
- [ ] Spec §6.4.1-6.4.10 (前端 UI): Task 4.2-4.11 覆盖全部文件
- [ ] Spec §7 (权限): Task 5.1 覆盖 canOperateWorkItem
- [ ] Spec §8 (Workflow): Task 6.1-6.6 覆盖全部 usecase + 兜底校验
- [ ] Spec §9 (导入导出): Task 7.1-7.2 覆盖 parser + usecase
- [ ] 无 TODO/TBD 占位符
- [ ] 类型签名在前后 task 中一致
