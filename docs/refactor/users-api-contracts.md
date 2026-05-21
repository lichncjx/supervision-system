# Users API Contracts — Phase 0 Baseline

> 迁移前的接口契约文档。重构后行为必须与本文档完全一致。

## 通用约定

- **Auth**：cookie `token`。多数管理接口会 `verifyToken` + 查 DB 获取当前用户，但部分查询接口仅 `verifyToken` 或用 `getUserFromToken`，具体以各接口 Auth 方式为准
- **错误格式**：`{ error: string }`
- **Auth 通用错误**：
  - 无 token → 401 `"未登录"`
  - token 过期/无效 → 401 `"登录已过期"`
- **PROTECTED_USERNAMES**：`['admin', 'supervisor', 'president', 'vice_president', 'dept_leader', 'dept_manager']`

---

## 1. `GET /api/users` — 用户列表

| 项目 | 内容 |
|------|------|
| 权限 | ADMIN only |
| 入参 | 无 |
| 响应 200 | `Array<UserListItem>` |
| 错误 | 401 / 403 `"权限不足"` / 500 `"获取用户列表失败"` |

**UserListItem 字段**：
```typescript
{
  id: number
  username: string
  name: string
  role: Role
  departmentId: number | null
  departmentName: string          // department?.name || ''
  isActive: boolean
  email: string | null
  phone: string | null
  createdAt: Date
  isProtected: boolean            // PROTECTED_USERNAMES.includes(username)
}
```

---

## 2. `POST /api/users` — 创建用户

| 项目 | 内容 |
|------|------|
| 权限 | ADMIN only |
| 入参 | `{ username, password, name, role, departmentId, email?, phone? }` |
| 响应 201 | `UserListItem`（isProtected 固定为 false） |
| 错误 | 400 / 401 / 403 / 500 `"创建用户失败"` |

**校验规则**：
1. 必填：`username, password, name, role, departmentId` — 缺一返回 400 `"必填字段不能为空"`
2. `username` ∈ PROTECTED_USERNAMES → 400 `"用户名已存在"`
3. `username` 已存在 DB → 400 `"用户名已存在"`
4. `departmentId` 不存在 → 400 `"部门不存在"`
5. `role` 不是合法 Role 枚举 → 400 `"无效的角色"`
6. password 需 hash

---

## 3. `PUT /api/users/[id]` — 更新用户

| 项目 | 内容 |
|------|------|
| 权限 | ADMIN only |
| 路径参数 | `id` (number) |
| 入参 | `{ name?, role?, departmentId?, email?, phone?, isActive? }` — 全部可选 |
| 响应 200 | `UserListItem` |
| 错误 | 400 / 401 / 403 / 404 / 500 `"更新用户失败"` |

**校验规则**：
1. `id` 非数字 → 400 `"无效的用户ID"`
2. 用户不存在 → 404 `"用户不存在"`
3. `role` 提交但非法 → 400 `"无效的角色"`
4. `departmentId` 提交但部门不存在 → 400 `"部门不存在"`
5. 不校验 PROTECTED_USERNAMES（允许修改内置账号的非敏感字段）

---

## 4. `DELETE /api/users/[id]` — 删除用户

| 项目 | 内容 |
|------|------|
| 权限 | ADMIN only |
| 路径参数 | `id` (number) |
| 入参 | 无 |
| 响应 200 | `{ success: true }` |
| 错误 | 400 / 401 / 403 / 404 / 500 `"删除用户失败"` |

**校验规则**：
1. `id` 非数字 → 400 `"无效的用户ID"`
2. 用户不存在 → 404 `"用户不存在"`
3. username ∈ PROTECTED_USERNAMES → 403 `"内置账号不允许删除"`

---

## 5. `PUT /api/users/[id]/status` — 启用/停用用户

| 项目 | 内容 |
|------|------|
| 权限 | ADMIN only |
| 路径参数 | `id` (number) |
| 入参 | `{ isActive: boolean }` — 必填 |
| 响应 200 | `{ id, username, isActive }` |
| 错误 | 400 / 401 / 403 / 404 / 500 `"更新用户状态失败"` |

**校验规则**：
1. `id` 非数字 → 400 `"无效的用户ID"`
2. 目标用户是当前登录用户自己 → 403 `"不允许停用当前登录的管理员账号"`
3. 用户不存在 → 404 `"用户不存在"`
4. username ∈ PROTECTED_USERNAMES → 403 `"内置账号不允许停用"`
5. `isActive` 未传 → 400 `"请指定启用状态"`

---

## 6. `PUT /api/users/[id]/password` — 管理员重置密码

| 项目 | 内容 |
|------|------|
| 权限 | ADMIN only |
| 路径参数 | `id` (number) |
| 入参 | `{ password: string }` |
| 响应 200 | `{ success: true }` |
| 错误 | 400 / 401 / 403 / 404 / 500 `"重置密码失败"` |

**校验规则**：
1. `id` 非数字 → 400 `"无效的用户ID"`
2. 用户不存在 → 404 `"用户不存在"`
3. password 为空或 < 6 字符 → 400 `"密码长度不能少于6位"`
4. password 需 hash

---

## 7. `POST /api/auth/change-password` — 修改自己的密码

| 项目 | 内容 |
|------|------|
| 权限 | 已登录用户 |
| Auth 方式 | `verifyToken`（不查 role，不查 ADMIN） |
| 入参 | `{ oldPassword, newPassword }` |
| 响应 200 | `{ success: true }` |
| 错误 | 400 / 401 / 404 / 500 `"修改密码失败"` |

**校验规则**：
1. oldPassword 或 newPassword 为空 → 400 `"旧密码和新密码不能为空"`
2. newPassword < 6 字符 → 400 `"新密码长度不能少于6位"`
3. token 对应用户不存在 → 404 `"用户不存在"`
4. oldPassword 验证失败 → 400 `"旧密码不正确"`
5. newPassword 需 hash

---

## 8. `GET /api/users/company-leaders` — 公司领导列表

| 项目 | 内容 |
|------|------|
| 权限 | 已登录用户（任何角色） |
| Auth 方式 | `verifyToken` |
| 入参 | 无 |
| 响应 200 | `Array<LeaderItem>` |
| 错误 | 401 / 500 `"获取公司领导失败"` |

**查询条件**：`role IN [PRESIDENT, VICE_PRESIDENT] AND isActive = true`，排序 `role ASC, id ASC`

**LeaderItem 字段**：
```typescript
{
  id: number
  name: string
  role: Role
  departmentId: number | null
  departmentName: string          // department?.name || ''
}
```

---

## 9. `GET /api/users/department-leaders?departmentId=X` — 部门领导列表

| 项目 | 内容 |
|------|------|
| 权限 | 已登录用户；globalView/companyLevel 可查任意部门，否则仅本部门 |
| Auth 方式 | `getUserFromToken` |
| 查询参数 | `departmentId` (必填) |
| 响应 200 | `Array<LeaderItem>`（同 LeaderItem 结构） |
| 错误 | 400 / 401 / 403 / 500 `"获取部门领导失败"` |

**校验规则**：
1. `departmentId` 未传 → 400 `"请提供部门ID"`
2. 非 globalView 且非 companyLevel 且 `currentUser.departmentId !== targetDeptId` → 403 `"无权限查询其他部门领导"`

**查询条件**：`departmentId = targetDeptId AND role = DEPARTMENT_LEADER AND isActive = true`，排序 `name ASC`

---

## 10. `GET /api/users/department-managers?departmentId=X` — 部门主管列表

| 项目 | 内容 |
|------|------|
| 权限 | 同 department-leaders |
| Auth 方式 | `getUserFromToken` |
| 查询参数 | `departmentId` (必填) |
| 响应 200 | `Array<LeaderItem>`（同 LeaderItem 结构） |
| 错误 | 400 / 401 / 403 / 500 `"获取部门主管失败"` |

**校验规则**：同 department-leaders，仅 role 改为 `DEPARTMENT_MANAGER`，错误消息前缀为 `"无权限查询其他部门主管"` / `"获取部门主管失败"`

> **注意**：`GET /api/users/by-department` 已在 dead code cleanup 中标记为 unused 并移除，不纳入本次迁移范围。

---

## Auth 方式汇总

| Route | Auth 方式 | 需要的 user 字段 |
|-------|----------|----------------|
| GET/POST /api/users | `verifyToken` + `prisma.user.findUnique` | role (ADMIN check) |
| PUT/DELETE /api/users/[id] | 同上 | role (ADMIN check) |
| PUT /api/users/[id]/status | 同上 | role (ADMIN check), id (self-check) |
| PUT /api/users/[id]/password | 同上 | role (ADMIN check) |
| POST /api/auth/change-password | `verifyToken` + `prisma.user.findUnique` | 无 role 检查，仅需 id |
| GET /api/users/company-leaders | `verifyToken` | 无 role 检查 |
| GET /api/users/department-leaders | `getUserFromToken` | role, departmentId |
| GET /api/users/department-managers | `getUserFromToken` | role, departmentId |
