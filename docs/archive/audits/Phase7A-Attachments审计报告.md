# Phase 7A：Attachments 模块现状审计与拆分地图

审计日期：2026-05-11

---

## 1. 当前附件相关文件清单和行数

| 文件 | 行数 | 类型 |
|------|------|------|
| `src/lib/attachment-permissions.ts` | 51 | 权限规则（domain） |
| `src/app/api/upload/route.ts` | 178 | 后端 API Route（上传） |
| `src/app/api/attachments/[id]/route.ts` | 118 | 后端 API Route（删除） |
| `src/app/api/attachments/[id]/download/route.ts` | 112 | 后端 API Route（下载） |
| `src/lib/server-permissions.ts` | L61-90 | 底层附件权限函数 |
| **合计** | **455** | |

### 前端引用

| 页面文件 | 附件相关功能 |
|----------|-------------|
| `src/app/(app)/[type]/[id]/page.tsx` | 工作详情页（附件列表+上传+删除） |
| `src/app/(app)/[type]/new/page.tsx` | 新建事项页（可能含附件上传） |
| `src/app/(app)/[type]/page.tsx` | 列表页（附件数量展示） |
| `src/app/(app)/logs/page.tsx` | 操作日志页（附件相关日志） |
| `src/app/(app)/admin/page.tsx` | 管理页 |

---

## 2. 每个文件当前职责说明

### `src/lib/attachment-permissions.ts`（51 行）

**附件专属权限包装层**：定义 `AttPermUser`、`AttPermWorkItem`、`AttPermAttachment` 三个类型接口，包装 `server-permissions.ts` 中的底层权限函数。

导出：
- `AttPermUser`（L10-14）— 权限判断所需最简用户信息
- `AttPermWorkItem`（L17-23）— 权限判断所需最简事项信息
- `AttPermAttachment`（L26-28）— 权限判断所需最简附件信息
- `canViewAttachment(user, workItem)`（L30-35）
- `canUploadAttachment(user, workItem)`（L37-42）
- `canDeleteAttachment(user, workItem, attachment)`（L44-50）

### `src/lib/server-permissions.ts` L61-90（底层附件权限）

三个原始附件权限函数：
- `canUploadAttachment(user, workItem)`（L61-74）— ADMIN/SUPERVISOR 可上传任何；终态禁止；其他需 `canHandleWorkItem`
- `canViewAttachment(user, workItem)`（L76-81）— = `canViewWorkItem`
- `canDeleteAttachment(user, workItem, attachment)`（L83-90）— ADMIN/SUPERVISOR 可删任何；其他仅能删自己的

### `src/app/api/upload/route.ts`（178 行）

**POST /api/upload** — 附件上传：

1. Auth
2. formData 解析：`workItemId`、`file`、`category`
3. 文件校验：扩展名黑白名单（`.pdf/.doc/.docx/.xls/.xlsx/.jpg/.jpeg/.png/.gif/.zip/.rar/.7z`）、大小限制（50MB）
4. 事项查询 + 权限校验（`canViewAttachment` + `canUploadAttachment`）
5. 文件落盘：`uploads/attachments/{year}/{month}/{uuid}/{safeFileName}`
6. 数据库 attachment 记录创建
7. operationLog 写入
8. 返回成功 response

### `src/app/api/attachments/[id]/download/route.ts`（112 行）

**GET /api/attachments/[id]/download** — 附件下载：

1. Auth
2. 附件查询（include workItem）
3. 权限校验（`canViewAttachment`）
4. 文件读取：`process.cwd() + attachment.filePath`
5. Content-Type 映射（12 种扩展名 → MIME 类型）
6. 返回 `NextResponse(fileBuffer)` 二进制流

### `src/app/api/attachments/[id]/route.ts`（118 行）

**DELETE /api/attachments/[id]** — 附件删除：

1. Auth
2. 附件查询（include workItem）
3. 权限校验（`canDeleteAttachment`；孤立附件仅 ADMIN 可删）
4. 数据库 `attachment.delete`
5. 物理文件删除（`fs.unlink`，失败仅 warn）
6. operationLog 写入
7. 返回 `{ success: true }`

---

## 3. 上传接口完整流程

```
POST /api/upload (FormData: workItemId, file, category?)
  → Auth (token → verify → getUserFromToken)
  → 验证 workItemId 有效性
  → 验证 category ∈ {general, evidence}
  → 验证 file 非空
  → 验证扩展名不在 FORBIDDEN_EXTENSIONS（.exe/.bat/.cmd/.sh/.js/.ps1/.dll）
  → 验证扩展名在 ALLOWED_EXTENSIONS（12 种）
  → 验证 file.size ≤ 50MB
  → prisma.workItem.findUnique（查事项 10 字段）
  → canViewAttachment 权限判断
  → canUploadAttachment 权限判断
  → 生成路径：uploads/attachments/{year}/{month}/{uuid}/
  → mkdir -p 创建目录
  → file.arrayBuffer → Buffer → writeFile
  → 安全文件名：/[^a-zA-Z0-9一-龥._-]/g → '_'
  → prisma.attachment.create（workItemId, userId, fileName, filePath, fileSize, fileType, category, uploadedAt）
  → prisma.operationLog.create（action: 'upload', module: 'attachment'）
  → return { success: true, attachment: { id, fileName, fileSize, fileType, category, uploadedAt } }
```

---

## 4. 下载接口完整流程

```
GET /api/attachments/[id]/download
  → Auth
  → prisma.attachment.findUnique（include workItem 10 字段）
  → 附件不存在 → 404
  → canViewAttachment 权限判断
  → 构造完整路径：process.cwd() + attachment.filePath
  → 文件不存在 → 404
  → fs.readFile
  → 根据 fileType 查 Content-Type 映射表（12 种）
  → return NextResponse(fileBuffer, Content-Type, Content-Disposition: attachment, Content-Length)
```

---

## 5. 删除接口完整流程

```
DELETE /api/attachments/[id]
  → Auth
  → prisma.attachment.findUnique（include workItem 10 字段）
  → 附件不存在 → 404
  → 有 workItem? → canDeleteAttachment 权限判断
  → 孤立附件? → 仅 ADMIN
  → 无权限 → 403
  → prisma.attachment.delete
  → fs.unlink 物理文件（失败仅 warn，不阻塞）
  → prisma.operationLog.create（action: 'delete', module: 'attachment'）
  → return { success: true }
```

---

## 6. 当前附件权限规则

### 查看（上传前检查 + 下载时检查）
- ADMIN / SUPERVISOR → 可查看任何附件
- 其他角色 → `canViewWorkItem`（可见性规则与事项相同）

### 上传
- ADMIN / SUPERVISOR → 可上传任何
- 终态事项（COMPLETED / CANCELLED）→ 禁止
- 其他角色 → 须 `canHandleWorkItem`（办理权限）成立

### 删除
- ADMIN / SUPERVISOR → 可删除任何附件
- 其他角色 → 仅能删除自己上传的（`attachment.userId === user.id`）
- 孤立附件（workItem 已删除）→ 仅 ADMIN

---

## 7. 文件保存路径、命名规则、大小限制、扩展名限制

| 项目 | 值 |
|------|-----|
| 根目录 | `process.cwd()/uploads/attachments/` |
| 路径模板 | `{year}/{month}/{uuid}/{safeFileName}` |
| 安全文件名 | `file.name.replace(/[^a-zA-Z0-9一-龥._-]/g, '_')` |
| 最大文件大小 | 50MB（`50 * 1024 * 1024`） |
| 允许扩展名 | `.pdf .doc .docx .xls .xlsx .jpg .jpeg .png .gif .zip .rar .7z` |
| 禁止扩展名 | `.exe .bat .cmd .sh .js .ps1 .dll` |
| 存储方式 | 本地文件系统（`writeFile`/`unlink`） |

---

## 8. 当前数据库 Attachment 字段写入规则

| 字段 | 来源 | 说明 |
|------|------|------|
| `workItemId` | formData `workItemId` | 关联事项 ID |
| `userId` | `currentUser.id` | 上传者 |
| `fileName` | `file.name` | 原始文件名（非安全化） |
| `filePath` | `path.relative(process.cwd(), filePath)` | 相对路径 |
| `fileSize` | `file.size` | 字节数 |
| `fileType` | `path.extname(file.name).toLowerCase()` | 含 `.` 前缀 |
| `category` | formData `category` 或 `'general'` | `general`/`evidence` |
| `uploadedAt` | `new Date()` | 上传时间 |

---

## 9. 当前 operationLog 写入规则

| 接口 | action | module | targetType | targetId | description |
|------|--------|--------|------------|----------|-------------|
| 上传 | `upload` | `attachment` | `attachment` | attachment.id | `上传附件：{fileName}` |
| 删除 | `delete` | `attachment` | `attachment` | attachmentId | `删除附件：{attachment.fileName}` |

下载不写 operationLog。

---

## 10. 建议迁移到 `features/attachments/domain/`

| 原位置 | 逻辑 | 建议文件 |
|--------|------|----------|
| `attachment-permissions.ts` L10-14 | `AttPermUser` 类型 | `domain/attachment.types.ts` |
| `attachment-permissions.ts` L17-23 | `AttPermWorkItem` 类型 | `domain/attachment.types.ts` |
| `attachment-permissions.ts` L26-28 | `AttPermAttachment` 类型 | `domain/attachment.types.ts` |
| `attachment-permissions.ts` L30-50 | 三个权限函数 | `domain/attachment.permissions.ts` |
| `server-permissions.ts` L61-90 | 三个底层权限函数 | `domain/attachment.permissions.ts` |
| `upload/route.ts` L14-23 | `ALLOWED_EXTENSIONS`/`FORBIDDEN_EXTENSIONS`/`MAX_FILE_SIZE` | `domain/attachment.rules.ts` |
| `upload/route.ts` L59-70 | 扩展名验证逻辑 | `domain/attachment.rules.ts` |
| `download/route.ts` L82-95 | Content-Type 映射表 | `domain/attachment.rules.ts` 或 infrastructure |

---

## 11. 建议迁移到 `features/attachments/application/`

| 原位置 | 逻辑 | 建议文件 |
|--------|------|----------|
| `upload/route.ts` L25-177 | POST handler 整体编排 | `application/upload-attachment.usecase.ts` |
| `attachments/[id]/route.ts` L12-117 | DELETE handler 整体编排 | `application/delete-attachment.usecase.ts` |
| `attachments/[id]/download/route.ts` L11-111 | GET handler 整体编排 | `application/download-attachment.usecase.ts` |

---

## 12. 建议迁移到 `features/attachments/infrastructure/`

| 原位置 | 逻辑 | 建议文件 |
|--------|------|----------|
| `upload/route.ts` L73-88 | `prisma.workItem.findUnique` + 附件 create | `infrastructure/attachment.repository.ts` |
| `attachments/[id]/route.ts` L34-52 | `prisma.attachment.findUnique` + delete | `infrastructure/attachment.repository.ts` |
| `attachments/[id]/download/route.ts` L33-50 | `prisma.attachment.findUnique` | `infrastructure/attachment.repository.ts` |
| 三个 route 中所有 `prisma.operationLog.create` | operationLog 写入 | `infrastructure/attachment.repository.ts` |
| `upload/route.ts` L119-132 | 文件落盘逻辑（mkdir + writeFile） | `infrastructure/local-file-storage.ts` |
| `attachments/[id]/route.ts` L90-97 | 物理文件删除（unlink） | `infrastructure/local-file-storage.ts` |
| `attachments/[id]/download/route.ts` L76-80 | 物理文件读取（readFile） | `infrastructure/local-file-storage.ts` |
| `upload/route.ts` L129 | 安全文件名生成 | `infrastructure/local-file-storage.ts` |

---

## 13. 建议迁移到 `features/attachments/presentation/`

| 原位置 | 逻辑 | 建议文件 |
|--------|------|----------|
| `upload/route.ts` 返回结构 | attachment 响应字段 | `presentation/attachment.dto.ts` |
| 三个 route 的错误响应格式 | 错误消息定义 | `presentation/attachment.presenter.ts` |
| `upload/route.ts` L37-53 | formData 参数解析+验证 | `presentation/attachment.validators.ts` |

---

## 14. 建议迁移到 `features/attachments/client/`

前端 fetch 调用封装：

| 功能 | 文件 |
|------|------|
| 上传附件 API 调用 | `client/attachment-api.ts` |
| 下载附件 URL 构造 | `client/attachment-api.ts` |
| 删除附件 API 调用 | `client/attachment-api.ts` |

---

## 15. 建议迁移到 `features/attachments/ui/`

| 组件 | 来源页面 |
|------|----------|
| 附件上传组件（拖拽/点击上传） | `[type]/[id]/page.tsx` |
| 附件列表展示组件 | `[type]/[id]/page.tsx` |
| 附件删除确认弹窗 | `[type]/[id]/page.tsx` |

---

## 16. 建议 Phase 7B/7C/7D 拆分顺序

| Phase | 内容 | 风险 |
|-------|------|------|
| **7B** | 类型 + 权限规则 → `domain/`：<br>- `attachment.types.ts`（AttPermUser/WorkItem/Attachment）<br>- `attachment.permissions.ts`（三个权限函数）<br>- `attachment.rules.ts`（ALLOWED/FORBIDDEN_EXTENSIONS、MAX_FILE_SIZE、Content-Type map）<br>- `attachment-permissions.ts` 保留兼容重导出<br>- `server-permissions.ts` 附件函数保留（Phase 2 已标记待迁移） | **低** |
| **7C** | Infrastructure 迁移：<br>- `attachment.repository.ts`（Prisma 查询/创建/删除/日志）<br>- `local-file-storage.ts`（mkdir/writeFile/unlink/readFile/safeFileName）<br>- 三个 route 的 Prisma + fs 操作抽取 | **中** |
| **7D** | Application 迁移 + route 瘦身：<br>- `upload-attachment.usecase.ts`<br>- `download-attachment.usecase.ts`<br>- `delete-attachment.usecase.ts`<br>- 三个 route 变薄（auth + usecase call） | **中** |

前端 client/ui 迁移可延后（附件功能相对稳定，页面改动风险较高）。

---

## 17. 风险点和必须保持不变的接口契约

### 不可改变的接口契约

| 接口 | 入参 | 返回 |
|------|------|------|
| `POST /api/upload` | FormData: `workItemId`, `file`, `category?` | `{ success: true, attachment: { id, fileName, fileSize, fileType, category, uploadedAt } }` |
| `GET /api/attachments/[id]/download` | path param id | 二进制流 + Content-Type + Content-Disposition |
| `DELETE /api/attachments/[id]` | path param id | `{ success: true }` |

### 不可改变的权限规则

- 上传：`canViewAttachment` + `canUploadAttachment`（= `canHandleWorkItem` if not admin）
- 下载：`canViewAttachment`（= `canViewWorkItem`）
- 删除：`canDeleteAttachment`（admin/supervisor 或本人上传）

### 不可改变的基础设施

- 文件存储路径格式：`uploads/attachments/{year}/{month}/{uuid}/{safeFileName}`
- 安全文件名规则：`/[^a-zA-Z0-9一-龥._-]/g → '_'`
- 大小限制：50MB
- 扩展名黑白名单
- Content-Type 映射表（12 种 → MIME）

### 安全红线

- 文件上传必须校验扩展名（防止 webshell）
- 文件大小必须限制（防止 DDoS）
- 权限必须在服务端二次校验（不可信任前端）
- 删除时物理文件 + 数据库记录都清（允许物理删除失败）
- operationLog 不可丢失（上传和删除各写一条）
