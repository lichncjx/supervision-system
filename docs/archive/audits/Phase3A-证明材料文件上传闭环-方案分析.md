# Phase 3A 证明材料文件上传闭环实现 — 方案分析

> 生成日期：2026-05-07
> 状态：待确认
> 前置：Phase 3 方案分析（deptManagerId 附件权限接入，已暂缓）

## 问题发现

Phase 3 分析过程中发现一个更基础的问题：当前系统只有"通用附件"上传是真持久化的，而 WorkOperationPanel 中的 **proofFiles 完全是前端内存状态，从未写入数据库**。证据如下：

---

## 一、当前 proofFiles 链路现状

### 1.1 前端 — 文件选择与存储

`src/app/(app)/[type]/[id]/page.tsx:227-258`

```typescript
// 选择文件后使用 FileReader 读取为 base64 dataUrl
reader.onload = () => {
  resolve({
    id: Date.now() + Math.random(),   // 临时 ID
    name: file.name,
    type: file.type,
    size: file.size,
    dataUrl: String(reader.result),   // base64 数据
    uploadedAt: new Date().toISOString(),
    uploadedBy: user?.name,
  });
};
// 存入 React useState<ProofFile[]>
setProofFiles((prev) => [...prev, ...result]);
```

**结论：proofFiles 存储于组件 state，页面刷新即丢失。**

### 1.2 前端 — 提交调用

`src/lib/work-store.ts:1139-1156`

```typescript
export async function submitComplete(work: Work, user: User, proof: string, _proofFiles?: ProofFile[]) {
  //                                                参数名前缀 _ 表示未使用  ↑
  const response = await fetch(`/api/works/${work.id}/workflow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'evidence', proof, comment: '提交完成' }),
    //                                                   ↑ 只有 proof 文本，没有文件
  });
}
```

**结论：`_proofFiles` 参数接收了但从未发送到后端。**

### 1.3 后端 — workflow 路由

`src/app/api/works/[id]/workflow/route.ts:71-76`

```typescript
case 'evidence':
  if (!proof) {
    return NextResponse.json({ error: '请提供见证材料说明' }, { status: 400 });
  }
  result = await submitEvidence(workItemId, user, proof, comment);
  break;
```

**结论：路由只从 body 解构了 `proof`，不理解任何文件数据。**

### 1.4 后端 — submitEvidence 业务函数

`src/lib/workflow.ts:464-578`

- 接收参数：`(workItemId, user, proof, comment?)`
- 没有文件处理逻辑
- 只写入 `work_items.proof` 文本字段
- 不操作 `attachments` 表

### 1.5 数据库 — proof 字段

`prisma/schema.prisma` WorkItem 模型：

```prisma
proof  String?  @db.Text
```

- `proof` 是 `TEXT` 类型，仅存文字说明
- 没有任何字段存储证明材料的文件引用

### 1.6 展示 — 详情页 proofFiles 渲染

`page.tsx:667-689`

```tsx
{work.proofFiles && work.proofFiles.length > 0 && (
  <div>
    <span>见证材料附件：</span>
    {work.proofFiles.map((file) => (...))}  {/* 用 dataUrl 做下载链接 */}
  </div>
)}
```

`transformWorkFromAPI` 不映射 proofFiles（只映射 `attachments`）。
API `GET /api/works/[id]` 不返回 proofFiles（只返回 `attachments`）。

**结论：这段渲染代码永不会执行（`work.proofFiles` 始终 undefined），属于死代码。**

---

## 二、当前缺失点总结

| # | 缺失点 | 严重程度 |
|---|--------|---------|
| 1 | proofFiles 从未调用 `/api/upload` 上传文件 | **阻断** |
| 2 | submitComplete 丢弃了 proofFiles 参数 | **阻断** |
| 3 | submitEvidence 无文件处理逻辑 | **阻断** |
| 4 | attachments 表无 category 字段区分类型 | **功能缺失** |
| 5 | 证明材料附件在详情页无法展示（API 不返回 proofFiles） | **功能缺失** |
| 6 | 证明材料附件无法下载（无服务端文件记录） | **阻断** |
| 7 | 证明材料附件无法删除（无 DB 记录） | **阻断** |

---

## 三、推荐实现方案

### 3.1 核心思路

**复用现有 `attachments` 表 + `/api/upload` 机制，增加 `category` 字段区分附件类型。**

```
证明材料上传流程：
  WorkOperationPanel 选择文件
    ↓ POST /api/upload  (category=evidence)
    ↓ 文件写入磁盘 + attachments 表记录
    ↓ 返回 attachment 对象 {id, fileName, ...}
    ↓ 前端收集 attachmentId[]
    ↓ 随 workflow action=evidence 传入 attachmentIds
    ↓ submitEvidence 不处理文件（已在上一步落库）
    ↓ 仅将 proof 文本写入 work_items.proof

证明材料和普通附件统一存储在 attachments 表，
通过 category 字段在前端过滤显示。
```

### 3.2 设计决策

| 决策 | 理由 |
|------|------|
| 证明材料文件在调用 workflow 之前上传 | 与现有通用附件上传流程一致，降低耦合 |
| workflow 不处理文件上传 | Phase 3A 不改审批流/状态机 |
| 复用 `/api/upload` | 不新建上传端点，复用权限校验 |
| 复用 `attachments` 表 | 不新建独立表，附件统一管理 |
| 不通过 workflow body 传文件 | 避免 base64 传输大文件（当前 design 的另一个问题：dataURL 可能超过 JSON body 限制） |
| proof 文本仍写 `work_items.proof` | 文字说明和文件分离，各司其职 |

---

## 四、数据库 Schema 变更

### 4.1 新增字段

```prisma
model Attachment {
  id              Int             @id @default(autoincrement())
  workItemId      Int?
  userId          Int
  fileName        String          @db.VarChar(200)
  filePath        String          @db.VarChar(500)
  fileSize        Int
  fileType        String          @db.VarChar(50)
  uploadedAt      DateTime        @default(now())
  category        String          @default("general") @db.VarChar(30)  // [新增]

  workItem        WorkItem?       @relation(fields: [workItemId], references: [id], onDelete: Cascade)
  user            User            @relation(fields: [userId], references: [id])

  @@map("attachments")
}
```

**category 取值：**
- `"general"` — 普通附件（默认值，兼容历史数据）
- `"evidence"` — 完成证明材料 / 见证材料

### 4.2 Migration SQL

```sql
ALTER TABLE "attachments" ADD COLUMN "category" VARCHAR(30) NOT NULL DEFAULT 'general';
```

- 无需回填脚本（DEFAULT 自动覆盖存量行）
- 一行 SQL，零风险

---

## 五、接口变更

### 5.1 `POST /api/upload` — 增加 category 参数

**请求变更：**
```
FormData:
  workItemId: number       // 不变
  file: File               // 不变
  category: string         // [新增] 可选，默认 "general"
```

**实现变更（upload/route.ts）：**
```typescript
const category = (formData.get('category') as string) || 'general';
// 校验：仅允许 "general" 或 "evidence"
if (!['general', 'evidence'].includes(category)) {
  return NextResponse.json({ error: '无效的附件类型' }, { status: 400 });
}
// 写入时传递 category
const attachment = await prisma.attachment.create({
  data: {
    workItemId,
    userId: currentUser.id,
    fileName: file.name,
    filePath: relativePath,
    fileSize: file.size,
    fileType: ext,
    category,          // [新增]
    uploadedAt: now,
  },
});
```

**响应变更：**
```json
{
  "success": true,
  "attachment": {
    "id": 1,
    "fileName": "evidence.pdf",
    "fileSize": 102400,
    "fileType": ".pdf",
    "category": "evidence",     // [新增]
    "uploadedAt": "2026-05-07T..."
  }
}
```

### 5.2 `GET /api/works/[id]` — 返回附件时带 category

```typescript
attachments: work.attachments.map((a) => ({
  id: a.id,
  fileName: a.fileName,
  fileSize: a.fileSize,
  fileType: a.fileType,
  uploadedAt: a.uploadedAt.toISOString(),
  userId: a.userId,
  userName: a.user.name,
  category: a.category,    // [新增]
})),
```

### 5.3 `GET /api/works` (列表) — 不需要变更

列表接口不返回 attachments，无需修改。

### 5.4 workflow `action=evidence` — 不需要变更

文件在上一步已通过 `/api/upload` 入库。workflow 只处理 `proof` 文本和状态流转。

### 5.5 删除附件 `DELETE /api/attachments/[id]` — 不需要变更

category 不影响删除逻辑。

### 5.6 下载附件 `GET /api/attachments/[id]/download` — 不需要变更

category 不影响下载逻辑。

---

## 六、前端变更

### 6.1 数据模型变更

**work-store.ts — Attachment 接口增加 category：**
```typescript
export interface Attachment {
  id: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  userId: number;
  userName?: string;
  category: string;   // [新增] "general" | "evidence"
}
```

**transformWorkFromAPI 映射 attachments 时保留 category。**

### 6.2 WorkOperationPanel — 上传 evidence 文件

**改造 `handleProofFileChange`：**

当前：读取文件为 base64 dataUrl → 存组件 state（不持久化）

改造后：调用 `/api/upload` → 得到真实 attachment → 收集 attachmentId 列表

```typescript
// 新流程（page.tsx）
const [evidenceAttachmentIds, setEvidenceAttachmentIds] = useState<number[]>([]);
const [uploading, setUploading] = useState(false);

const handleProofFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files) return;
  setUploading(true);
  for (const file of Array.from(files)) {
    const formData = new FormData();
    formData.append('workItemId', String(work.id));
    formData.append('file', file);
    formData.append('category', 'evidence');  // [新增]
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    const data = await res.json();
    if (res.ok && data.success) {
      setEvidenceAttachmentIds(prev => [...prev, data.attachment.id]);
    }
  }
  setUploading(false);
  setRefresh(v => v + 1);  // 刷新 work 数据以显示新附件
};
```

**改造 `handleComplete`：不再传 proofFiles，传 attachmentIds：**

```typescript
const handleComplete = async () => {
  if (!user) return;
  if (!proof.trim() && evidenceAttachmentIds.length === 0) {
    alert('请填写见证材料说明或上传附件');
    return;
  }
  try {
    await submitComplete(work, user, proof);  // 文件已通过 /api/upload 入库
    setRefresh(v => v + 1);
    alert('已提交完成材料');
  } catch (error) {
    console.error(error);
    alert('提交失败');
  }
};
```

**WorkOperationPanel 移除 proofFiles 相关 props：**

```typescript
// 删除的 props：
//   proofFiles: ProofFile[]
//   onProofFileChange
//   onRemoveProofFile

// 新增的 props：
//   onUploadEvidence: (e: React.ChangeEvent<HTMLInputElement>) => void
//   uploading: boolean
```

### 6.3 WorkOperationPanel — UI 变更

- 文件列表改为显示真实 attachment 记录（从 `work.attachments.filter(a => a.category === 'evidence')` 读取）
- 移除按钮改为调用 `DELETE /api/attachments/[id]`
- 下载按钮改为 `<a href="/api/attachments/[id]/download">`
- 不再使用 dataUrl 做下载链接

```tsx
{evidenceAttachments.map((att) => (
  <div key={att.id} className="flex items-center justify-between rounded border p-2 text-sm">
    <div>
      <div className="font-medium break-words">{att.fileName}</div>
      <div className="text-xs text-gray-500">
        上传人：{att.userName || '-'}　
        上传时间：{new Date(att.uploadedAt).toLocaleString()}　
        {formatFileSize(att.fileSize)}
      </div>
    </div>
    <Button variant="outline" size="sm" onClick={() => onRemoveEvidence(att.id)}>
      删除
    </Button>
  </div>
))}
```

### 6.4 WorkAttachmentPanel — 仅显示 general 附件

```typescript
// 组件内部过滤
const generalAttachments = attachments.filter(a => a.category !== 'evidence');
// 或由父组件传入时已过滤
```

**更简洁的方案：父组件传 filtered attachments：**

```tsx
// page.tsx
<WorkAttachmentPanel
  attachments={(work.attachments || []).filter(a => a.category !== 'evidence')}
  canUpload={!!canEdit}
  ...
/>
```

### 6.5 详情页 — 证明材料区域显示 evidence 附件

将现有的 "见证材料附件" 渲染（`page.tsx:667-689`，当前为死代码）替换为：

```tsx
{/* 见证材料文字 */}
{work.proof && (
  <div>
    <span className="text-sm text-gray-500">见证材料说明：</span>
    <p className="mt-1 p-2 bg-gray-50 rounded">{work.proof}</p>
  </div>
)}

{/* 见证材料附件 — 从 attachments 中筛选 evidence 类型 */}
{(() => {
  const evidenceAttachments = (work.attachments || []).filter(a => a.category === 'evidence');
  if (evidenceAttachments.length === 0) return null;
  return (
    <div>
      <span className="text-sm text-gray-500">见证材料附件：</span>
      <div className="mt-2 space-y-2">
        {evidenceAttachments.map((att) => (
          <div key={att.id} className="flex items-center justify-between rounded border p-2 text-sm">
            <div>
              <div className="font-medium break-words">{att.fileName}</div>
              <div className="text-xs text-gray-500">
                上传人：{att.userName || '-'}　
                上传时间：{new Date(att.uploadedAt).toLocaleString()}
              </div>
            </div>
            <a href={`/api/attachments/${att.id}/download`}>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />下载
              </Button>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
})()}
```

### 6.6 删除证明材料附件

```typescript
const handleRemoveEvidenceAttachment = async (attachmentId: number) => {
  try {
    const res = await fetch(`/api/attachments/${attachmentId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      alert(data.error || '删除失败');
      return;
    }
    setRefresh(v => v + 1);
  } catch (err) {
    console.error(err);
    alert('删除失败');
  }
};
```

### 6.7 兼容历史数据

- `category` 字段有 `@default("general")`，所有存量附件自动归类为 `general`
- 不需要数据回填脚本
- 旧版 API 调用（不传 category）默认写入 `"general"`，行为不变

---

## 七、需要修改的文件清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `prisma/schema.prisma` | 新增字段 | `Attachment.category` 字段定义 |
| `prisma/migrations/..._add_attachment_category/migration.sql` | 新增 | Migration SQL |
| `src/app/api/upload/route.ts` | 修改 | 接收 category 参数，写入 attachments |
| `src/app/api/works/[id]/route.ts` | 修改 | attachments 响应增加 category |
| `src/app/api/works/route.ts` | 修改 | 如果列表返回 attachments，也需加 category（当前不返回，可不改） |
| `src/lib/work-store.ts` | 修改 | `Attachment` 接口增加 category；`submitComplete` 移除 _proofFiles 参数 |
| `src/components/work/work-operation-panel.tsx` | 重写 | proofFiles → evidence attachments 真实上传 |
| `src/app/(app)/[type]/[id]/page.tsx` | 重写 | 证明材料区域渲染 evidence 附件，附件面板仅显示 general |
| `src/lib/workflow.ts` | **不改** | submitEvidence 继续只处理 proof 文本 |
| `src/components/work/work-attachment-panel.tsx` | **不改** | 由父组件过滤传入 |

---

## 八、前端交互流程

```
[用户在事项详情页]
  │
  ├─ 通用附件区 (WorkAttachmentPanel)
  │   ├─ 选择文件 → POST /api/upload (category=general) → 附件列表刷新
  │   ├─ 下载 → GET /api/attachments/[id]/download
  │   └─ 删除 → DELETE /api/attachments/[id]
  │
  └─ 证明材料区 (WorkOperationPanel)
      ├─ 填写文字说明 → proof state
      ├─ 选择证明材料文件 → POST /api/upload (category=evidence) → 附件列表刷新
      ├─ 删除已选文件 → DELETE /api/attachments/[id]
      ├─ 点击"提交完成材料"
      │   └─ POST /api/works/[id]/workflow { action: 'evidence', proof }
      └─ 查看已提交的证明材料
          ├─ 文字 → work.proof
          └─ 附件 → work.attachments.filter(a => a.category === 'evidence')
              ├─ 下载 → GET /api/attachments/[id]/download
              └─ 删除 → DELETE /api/attachments/[id]
```

---

## 九、后端接口流程

```
POST /api/upload (category=evidence)
  ├─ auth
  ├─ canViewWork / canEditWork
  ├─ 文件校验
  ├─ 写磁盘
  ├─ prisma.attachment.create({ ..., category: 'evidence' })
  ├─ prisma.operationLog.create(...)
  └─ 返回 { success, attachment: { id, fileName, category, ... } }

POST /api/works/[id]/workflow { action: 'evidence', proof }
  ├─ auth
  ├─ submitEvidence(workItemId, user, proof, comment)
  │   ├─ 权限校验
  │   ├─ 状态校验
  │   ├─ workItem.update({ proof, status, ... })
  │   ├─ createWorkflowRecord(...)
  │   └─ logOperation(...)
  └─ 返回 { success: true }

GET /api/works/[id]
  └─ attachments 数组每项含 category

GET /api/attachments/[id]/download
  └─ 不变（category 不影响下载）

DELETE /api/attachments/[id]
  └─ 不变（category 不影响删除权限逻辑）
```

---

## 十、测试清单

### 10.1 数据库迁移

| 测试项 | 描述 | 预期 |
|--------|------|------|
| DM1 | 执行 migration 后 attachments 表新增 category 列 | 所有存量行 category = 'general' |
| DM2 | 新建 attachment 时不传 category | 默认写入 'general' |

### 10.2 上传接口

| 测试项 | 描述 | 预期 |
|--------|------|------|
| UP1 | 上传文件不传 category | category = 'general' |
| UP2 | 上传文件传 category='evidence' | category = 'evidence' |
| UP3 | 上传文件传非法 category='xxx' | 返回 400 错误 |

### 10.3 证明材料上传

| 测试项 | 角色 | 状态 | 操作 | 预期 |
|--------|------|------|------|------|
| EV1 | DEPT_MANAGER | approved | 在证明材料区选择文件 | 上传成功，category='evidence' |
| EV2 | DEPT_MANAGER | approved | 删除刚上传的证据文件 | 删除成功 |
| EV3 | DEPT_MANAGER | approved | 填写 proof + 上传文件，点提交 | 状态流转成功，proof 文本写入 |
| EV4 | — | — | 提交后刷新页面 | 证明材料文字+附件完整保留 |

### 10.4 列表展示

| 测试项 | 描述 | 预期 |
|--------|------|------|
| DS1 | 通用附件面板 | 只显示 category='general' 的附件 |
| DS2 | 证明材料区域 | 只显示 category='evidence' 的附件 |
| DS3 | 证明材料附件下载 | 可正常下载 |
| DS4 | 证明材料附件删除 | 上传者可删除 |
| DS5 | 历史附件（category='general'） | 在通用附件面板正常显示 |

### 10.5 回归测试

| 测试项 | 描述 | 预期 |
|--------|------|------|
| RG1 | 普通附件上传/下载/删除 | 不受影响 |
| RG2 | workflow evidence 审批流 | 不受影响（只处理 proof 文本） |
| RG3 | 退回后重新提交 | 不受影响 |
| RG4 | 待办事项 evidence 提交 | 不受影响 |
| RG5 | Excel 导出 | 不受影响（附件不参与导出） |

---

## 十一、影响范围总结

| 维度 | 是否影响 | 说明 |
|------|---------|------|
| 数据库结构 | **是（轻量）** | `attachments` 表新增 `category VARCHAR(30)` 列 |
| 通用附件功能 | **否** | 默认 category='general'，前端过滤逻辑隔离 |
| 审批流/状态机 | **否** | workflow 不改 |
| 附件存储方式 | **否** | 仍使用 `uploads/attachments/` 目录 |
| 待办事项 responsible/cooperate | **否** | 不涉及 |
| 退回逻辑 firstSubmitterId | **否** | 不涉及 |
| 操作日志 | **否** | 上传/删除已记录 |
| deptManagerId 权限 | **否** | Phase 3A 暂不改权限 |
| ProofFile 接口 | **是（删除）** | 可用 `Attachment` 替代 |

## 十二、与后续 Phase 的关系

| Phase | 描述 | 依赖 |
|-------|------|------|
| Phase 3A（本条） | 证明材料文件真实落库 + category 区分 | 无 |
| Phase 3B（后续） | deptManagerId 附件权限接入 | Phase 3A 完成后，基于 category 实现更精细的权限 |

---

## 附录：关键代码位置索引

| 文件 | 行号 | 内容 |
|------|------|------|
| `src/lib/work-store.ts` | 68-76 | `ProofFile` 接口（当前仅 base64 内存态） |
| `src/lib/work-store.ts` | 78-85 | `Attachment` 接口（无 category） |
| `src/lib/work-store.ts` | 1139-1156 | `submitComplete`（丢弃 _proofFiles） |
| `src/lib/workflow.ts` | 464-578 | `submitEvidence`（只处理 proof 文本） |
| `src/app/api/works/[id]/workflow/route.ts` | 71-76 | workflow evidence 分支（只读 proof） |
| `src/app/api/upload/route.ts` | 61-181 | upload 接口（无 category） |
| `src/app/api/works/[id]/route.ts` | 107-115 | GET detail 返回 attachments（无 category） |
| `src/app/(app)/[type]/[id]/page.tsx` | 227-258 | `handleProofFileChange`（base64 读取） |
| `src/app/(app)/[type]/[id]/page.tsx` | 369-384 | `handleComplete`（传 proofFiles 但未使用） |
| `src/app/(app)/[type]/[id]/page.tsx` | 667-689 | 见证材料附件渲染（死代码，永远不执行） |
| `src/components/work/work-operation-panel.tsx` | 41-48 | proofFiles props 定义 |
| `src/components/work/work-operation-panel.tsx` | 122-146 | proofFiles 文件选择和列表渲染 |
| `prisma/schema.prisma` | 221-235 | `Attachment` 模型（无 category） |
