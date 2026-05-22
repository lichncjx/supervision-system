# API Route 鉴权与响应 Helper 审计报告

审计时间：2026-05-22
审计范围：`src/app/api/**/route.ts`（30 个接口）
审计目标：鉴权统一、响应 helper 统一、isActive 校验完整性

---

## 一、关键发现：`isActive` 校验缺失

### 风险等级：高

三个鉴权入口对 `isActive` 的处理不一致：

| 鉴权函数 | 检查 isActive | 查 department | 使用文件数 |
|----------|:---:|:---:|:---:|
| `requireCurrentUser` → `getCurrentUser` → `findUserById` | **是** | 是 | 15 |
| `getCurrentUserOrAuthError` → `getCurrentUser`（PR #86 修复） | **是** | 是 | 13 |
| `authenticateAdmin` → `findUserBasicAuthById`（PR #86 修复） | **是** | 否 | 4 |
| `getUserFromToken` → `findUserById` | **是** | 是 | 5 |
| `verifyToken` 直接调用 | — | — | 0（PR #87/#88 已全部修复） |

**`getCurrentUserOrAuthError` 缺 isActive 的影响范围最广（13 个 route）：**

- `attachments/[id]/route.ts`
- `attachments/[id]/download/route.ts`
- `dashboard/route.ts`
- `dashboard/summary/route.ts`
- `dashboard/completion-rate/route.ts`
- `excel/completion-rate/route.ts`
- `excel/export/route.ts`
- `excel/import/[type]/route.ts`
- `members/route.ts`
- `members/[id]/route.ts`
- `upload/route.ts`
- `works/route.ts`
- `works/[id]/route.ts`

**`authenticateAdmin` 缺 isActive 的影响范围（4 个 route）：**

- `users/route.ts`
- `users/[id]/route.ts`
- `users/[id]/status/route.ts`
- `users/[id]/password/route.ts`

**`verifyToken` 直接调用（2 个 route，最低级鉴权）：**

- ~~`users/company-leaders/route.ts`~~ — PR #87 已修复
- ~~`auth/me/route.ts`~~ — PR #88 已修复

**注意：** `getUserFromToken` 虽然是手动模式，但它内部走 `findUserById`，已有 `isActive` 校验。用它的接口主要是"写法不统一"，不是 isActive 缺失。

**建议：** 修复 `getCurrentUserOrAuthError` 和 `authenticateAdmin` 内部逻辑，统一走 `getCurrentUser` 或添加 `isActive` 检查。

---

## 二、按模块审计清单

### auth 模块（4 个接口）

| 文件 | 当前写法 | 风险 | 推荐改造 | 单独 PR |
|------|----------|:---:|----------|:---:|
| `auth/login/route.ts` | 无鉴权，raw NextResponse.json | 低 | **不改造**。登录接口特殊，需要返回 token cookie | - |
| `auth/me/route.ts` | getCurrentUser + withApiHandler + ok/fail | 无 | **已收口**（PR #88 修复） | - |
| `auth/logout/route.ts` | success() | 低 | **不改造**。已用 success()，cookie 操作需 NextResponse | - |
| `auth/change-password/route.ts` | requireCurrentUser + withApiHandler + success/fromError | 无 | **已收口**（PR #85 修复） | - |

### users 模块（7 个接口）

| 文件 | 当前写法 | 风险 | 推荐改造 | 单独 PR |
|------|----------|:---:|----------|:---:|
| `users/route.ts` | authenticateAdmin + raw NextResponse.json | 低 | isActive 已修复（PR #86）。响应标准化后续做 | 合并 |
| `users/[id]/route.ts` | authenticateAdmin + success/fail/fromError | 低 | isActive 已修复（PR #86） | 合并 |
| `users/[id]/status/route.ts` | authenticateAdmin + raw NextResponse.json | 低 | isActive 已修复（PR #86）。响应标准化后续做 | 合并 |
| `users/[id]/password/route.ts` | authenticateAdmin + success/fail/fromError | 低 | isActive 已修复（PR #86） | 合并 |
| `users/company-leaders/route.ts` | requireCurrentUser + withApiHandler + ok | 无 | **已收口**（PR #87 修复） | - |
| `users/department-leaders/route.ts` | getUserFromToken + raw NextResponse.json | 低 | 写法不统一，isActive 已有。后续标准化 | 是 |
| `users/department-managers/route.ts` | getUserFromToken + raw NextResponse | 低 | 同上 | 合并 |

### works 模块（3 个接口）

| 文件 | 当前写法 | 风险 | 推荐改造 | 单独 PR |
|------|----------|:---:|----------|:---:|
| `works/route.ts` | getCurrentUserOrAuthError + raw NextResponse.json | 低 | isActive 已修复（PR #86）。响应标准化后续做 | 合并 |
| `works/[id]/route.ts` | getCurrentUserOrAuthError + raw NextResponse.json | 低 | 同上 | 合并 |
| `works/[id]/workflow/route.ts` | getUserFromToken + raw NextResponse.json | 低 | 写法不统一，isActive 已有。后续标准化 | 合并 |

### dashboard 模块（3 个接口）

| 文件 | 当前写法 | 风险 | 推荐改造 | 单独 PR |
|------|----------|:---:|----------|:---:|
| `dashboard/route.ts` | requireCurrentUser + withApiHandler + ok | 无 | **已收口**（PR #92 修复） | - |
| `dashboard/summary/route.ts` | 同上 | 无 | **已收口**（PR #92 修复） | - |
| `dashboard/completion-rate/route.ts` | requireCurrentUser + withApiHandler + ok/fromError | 无 | **已收口**（PR #92 修复） | - |

### excel 模块（4 个接口）

| 文件 | 当前写法 | 风险 | 推荐改造 | 单独 PR |
|------|----------|:---:|----------|:---:|
| `excel/completion-rate/route.ts` | getCurrentUserOrAuthError + raw NextResponse.json | 低 | isActive 已修复（PR #86）。响应标准化后续做 | 合并 |
| `excel/export/route.ts` | getCurrentUserOrAuthError + raw NextResponse.json | 低 | 同上 | 合并 |
| `excel/import/[type]/route.ts` | getCurrentUserOrAuthError + raw NextResponse.json | 低 | 同上 | 合并 |
| `excel/template/[type]/route.ts` | getUserFromToken + raw NextResponse.json | 低 | 写法不统一，isActive 已有。后续标准化 | 合并 |

### members 模块（2 个接口）

| 文件 | 当前写法 | 风险 | 推荐改造 | 单独 PR |
|------|----------|:---:|----------|:---:|
| `members/route.ts` | requireCurrentUser + withApiHandler + ok/fail | 无 | **已收口**（PR #93 修复） | - |
| `members/[id]/route.ts` | requireCurrentUser + withApiHandler + fail/fromError | 无 | **已收口**（PR #93 修复） | - |

### attachments 模块（2 个接口）

| 文件 | 当前写法 | 风险 | 推荐改造 | 单独 PR |
|------|----------|:---:|----------|:---:|
| `attachments/[id]/route.ts` | getCurrentUserOrAuthError + success/fail/fromError | 低 | isActive 已修复（PR #86） | 合并 |
| `attachments/[id]/download/route.ts` | getCurrentUserOrAuthError + raw NextResponse.json | 低 | isActive 已修复（PR #86）。文件下载流式响应，响应格式不改 | 合并 |

### departments / roles 模块（2 个接口）

| 文件 | 当前写法 | 风险 | 推荐改造 | 单独 PR |
|------|----------|:---:|----------|:---:|
| `departments/route.ts` | requireCurrentUser + withApiHandler + ok | 无 | **已完全收口**，无问题 | - |
| `roles/route.ts` | requireCurrentUser + withApiHandler + ok | 无 | **已完全收口**，无问题 | - |

### upload 模块（1 个接口）

| 文件 | 当前写法 | 风险 | 推荐改造 | 单独 PR |
|------|----------|:---:|----------|:---:|
| `upload/route.ts` | getCurrentUserOrAuthError + raw NextResponse.json | 低 | isActive 已修复（PR #86）。响应标准化后续做 | 合并 |

### 其他（1 个接口）

| 文件 | 当前写法 | 风险 | 推荐改造 | 单独 PR |
|------|----------|:---:|----------|:---:|
| `operation-logs/route.ts` | getUserFromToken + raw NextResponse.json | 低 | 写法不统一，isActive 已有。后续标准化 | 合并 |
| `health/route.ts` | 无鉴权，raw NextResponse.json | 低 | **不改造**。健康检查接口 | - |

---

## 三、不建议机械改造的接口

| 接口 | 原因 |
|------|------|
| `auth/login/route.ts` | 登录接口需要返回 token cookie，不套通用鉴权 |
| `auth/logout/route.ts` | 需要清除 cookie，已用 success()，NextResponse 仅用于 cookie 操作 |
| `attachments/[id]/download/route.ts` | 文件下载返回 `new Response(blob)` 流式响应，不能用 ok/fail |
| `health/route.ts` | 公开健康检查，无鉴权合理 |

---

## 四、PR 拆分建议

### ~~PR 1（最小高价值修复）：修复鉴权函数 isActive 校验（`chore/fix-auth-isactive`）~~ — ✅ PR #86 已合并

**改动（2 个文件）：**

- `src/shared/auth/get-current-user-or-auth-error.ts` → 改为复用 `getCurrentUser(request)` ✅
- `src/features/users/infrastructure/user.repository.ts` → `findUserBasicAuthById` 加 `isActive: true` ✅

**收益：** 17 个 route 自动获得 isActive 校验。

### ~~PR 2：users/company-leaders 鉴权修复（`fix/company-leaders-auth`）~~ — ✅ PR #87 已合并

- `verifyToken` → `requireCurrentUser` + `withApiHandler` + `ok`

### ~~PR 3：auth/me 鉴权修复（`fix/auth-me-token-parsing`）~~ — ✅ PR #88 已合并

- `verifyToken` + `findUserById` → `getCurrentUser`
- clearTokenCookie 逻辑保留

### ~~PR 3.5：共享 usecase Result 类型 + 试点迁移~~ — ✅ PR #89 已合并

- 新增 `src/shared/result.ts` — `Result<T>`、`ok()`、`err()`
- 试点迁移 2 个 usecase：`change-password`、`reset-user-password`
- 架构文档更新 usecase Result 类型约定

### ~~PR 4：getUserFromToken route 标准化~~ — ✅ PR #91 已合并

- 5 个 route：department-leaders、department-managers、operation-logs、excel/template、works/[id]/workflow
- getUserFromToken → requireCurrentUser + withApiHandler + ok/fail/fromError

### PR 5（后续）：剩余 requireCurrentUser route 响应收口

- works、dashboard、excel、members、attachments 等仍有 raw NextResponse.json 的 route
- 加 `withApiHandler`，错误用 `fail/fromError`，成功用 `ok/success`
- 低风险，可 Supervised-Batch 执行

---

## 五、统计汇总

| 状态 | 文件数 | 占比 |
|------|:---:|:---:|
| 已完全收口（withApiHandler + api-response helpers + isActive） | 13 | 43% |
| 用 getCurrentUserOrAuthError（PR #86 已修复 isActive） | 8 | 27% |
| 用 authenticateAdmin（PR #86 已修复 isActive） | 4 | 13% |
| 用 getUserFromToken（isActive 已有，写法不统一） | 5 | 17% |
| 用 verifyToken（已全部修复） | 0 | 0% |
| 公开接口（无需改造） | 1 | 3% |
| **总计** | **30** | **100%** |

### isActive 校验覆盖情况

- **全部 30 个 route 的 isActive 校验已覆盖，无遗漏**

### getCurrentUserOrAuthError 迁移进度

- PR #94：works（2）、excel/completion-rate、excel/import、attachments/[id] = 5 个 route ✅
- PR #95：upload、excel/export、attachments/download = 3 个 route ✅（待合并）
- **route 层零残留**，仅 `get-current-user-or-auth-error.ts` 文件本身待删除

### 今日完成（2026-05-22）

| PR | 内容 | 状态 |
|----|------|:---:|
| #86 | 修复 getCurrentUserOrAuthError + authenticateAdmin 缺 isActive | ✅ 已合并 |
| #87 | users/company-leaders 鉴权修复 | ✅ 已合并 |
| #88 | auth/me 鉴权修复 | ✅ 已合并 |
| #89 | 共享 Result<T> 类型 + 试点迁移 | ✅ 已合并 |
| #91 | 5 个 getUserFromToken route 标准化 | ✅ 已合并 |
| #92 | dashboard 模块 3 个 route 迁移 | ✅ 已合并 |
| #93 | members 模块 2 个 route 迁移 | ✅ 已合并 |
| #94 | works/excel/attachments 5 个 route + withApiHandler 泛型 + 架构文档 | ✅ 已合并 |
| #95 | members Result<T> + workflow contract + upload/export/download auth + isExpiringWork 去重 | 🟡 待合并 |

### 待办（明天）

1. **合并 PR #95**
2. **删除 `src/shared/auth/get-current-user-or-auth-error.ts`** — route 层已无消费者，验证后删除
3. **Users 模块 4 个 route 迁移** — `users/route.ts`、`users/[id]/route.ts`、`users/[id]/status/route.ts`、`users/[id]/password/route.ts`，从 `authenticateAdmin` 迁移到 `requireCurrentUser + withApiHandler`，需要单独 PR
4. **验证 `src/shared/auth/current-user.ts` 的 `CurrentUser` 类型** — 确认是否还有其他消费者，考虑合并到 shared auth 模块
