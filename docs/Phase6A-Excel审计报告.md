# Phase 6A：Excel 模块现状审计与拆分地图

审计日期：2026-05-11

---

## 1. 当前 Excel 相关文件清单和行数

| 文件 | 行数 | 类型 |
|------|------|------|
| `src/lib/excel-utils.ts` | 457 | 混合（前端 client + infrastructure） |
| `src/app/api/excel/import/[type]/route.ts` | 569 | 后端 API Route |
| `src/app/api/excel/export/route.ts` | 297 | 后端 API Route |
| `src/app/api/excel/completion-rate/route.ts` | 195 | 后端 API Route |
| `src/app/api/excel/template/[type]/route.ts` | 42 | 后端 API Route |
| **合计** | **1560** | |

---

## 2. 每个文件当前职责说明

### `src/lib/excel-utils.ts`（457 行）

双重身份：**既是前端 client，又是非 HTTP 的 infrastructure**。

- **前端 client 职责**：
  - `getExcelTemplate`（L42-139）：生成模板 xlsx 并返回 Uint8Array，被 template API route 调用
  - `exportWorksToExcel`（L141-229）：浏览器端 xlsx 生成 + `XLSX.writeFile` 下载
  - `importWorksFromExcel`（L232-362）：浏览器端 `FileReader` 读取 xlsx + 解析为 `ImportedWork[]`
  - `exportCompanyCompletionRate`（L376-456）：浏览器端 xlsx 生成 + `XLSX.writeFile` 下载
  - `parseDepartmentIdWithDepts`（L364-374）：部门名/ID → ID解析
  - `getDepartmentsForExcel` / `getCompanyLeadersForExcel` / `getDepartmentNameForExcel`（L12-40）：前端 API 调用 + 缓存

- **问题**：`exportWorksToExcel` 和 `exportCompanyCompletionRate` 是**浏览器端直接调用**的函数（使用 `XLSX.writeFile` 下载），但它们在 `src/lib/` 中与后端 Prisma/server-auth 代码混放。

### `src/app/api/excel/import/[type]/route.ts`（569 行）

后端 POST — 服务端批量导入 Excel 到数据库：

- **presentation/validation**（L7-81）：`ValidationError`、`ImportRow` 接口，`validateImportScope`、`isAllowedImportedStatus`
- **domain/rules**（L83-117）：`parseExcelDate`、`isCompanyLevelRole`、`isDepartmentImportRole`
- **infrastructure**（L119-417）：`validateAndParseExcel` — 用 `xlsx` 库解析 buffer，按 type 分别解析 priority/main/todo 字段
- **application**（L419-568）：`POST` handler — 参数校验、文件校验、解析、权限校验、事务写入 `createMany` + operationLog

### `src/app/api/excel/export/route.ts`（297 行）

后端 GET — 服务端导出 xlsx：

- **domain/rules**（L15-127）：`APPROVING_STATUSES`、`TERMINAL_STATUSES`、`getDueDate`、`isOverdueWork`、`isExpiringWork`、`getTypeText`、`normalizeTypeFilter`、`normalizeStatusFilter`、`isValidStatusFilter`、`formatDate`、`joinCooperators`、`keywordMatches`
- **application**（L129-296）：`GET` handler — 查询、权限过滤、状态过滤、xlsx 生成、operationLog

### `src/app/api/excel/completion-rate/route.ts`（195 行）

后端 GET — 服务端导出公司完成率统计 xlsx：

- **infrastructure**（L7-84）：`getDepartmentStatsForExcel` — 按部门计算完成率、超期、取消统计
- **application**（L86-194）：`GET` handler — 权限校验（仅 ADMIN/SUPERVISOR）、查询部门、逐部门统计、xlsx 生成、operationLog

### `src/app/api/excel/template/[type]/route.ts`（42 行）

后端 GET — 下载 Excel 导入模板：

- **application**：`GET` handler — 鉴权、类型校验、调用 `getExcelTemplate`

### 前端页面引用

| 页面文件 | Excel 相关功能 |
|----------|---------------|
| `src/app/(app)/page.tsx` | 首页仪表板（可能含完成率导出入口） |
| `src/app/(app)/[type]/page.tsx` | 列表页（导出/导入按钮） |
| `src/app/(app)/logs/page.tsx` | 操作日志页（Excel 相关日志展示） |

---

## 3. 前端 client 逻辑（应迁到 `features/excel/client/`）

| 原位置 | 逻辑 | 建议文件 |
|--------|------|----------|
| `excel-utils.ts` L12-22 | `getDepartmentsForExcel` | `client/excel-api.ts`（fetch 封装） |
| `excel-utils.ts` L24-34 | `getCompanyLeadersForExcel` | `client/excel-api.ts` |
| `excel-utils.ts` L36-41 | `getDepartmentNameForExcel` | `client/excel-api.ts` |
| `excel-utils.ts` L141-229 | `exportWorksToExcel`（浏览器端 xlsx 生成+下载） | `client/excel-export-client.ts` |
| `excel-utils.ts` L232-362 | `importWorksFromExcel`（FileReader 解析） | `client/excel-import-client.ts` |
| `excel-utils.ts` L376-456 | `exportCompanyCompletionRate`（浏览器端下载） | `client/completion-rate-client.ts` |
| `excel-utils.ts` L364-374 | `parseDepartmentIdWithDepts` | `client/excel-import-client.ts` |

---

## 4. 后端 application（应迁到 `features/excel/application/`）

| 原位置 | 逻辑 | 建议文件 |
|--------|------|----------|
| `import/[type]/route.ts` L419-568 | POST handler 编排 | `application/import-works-from-excel.usecase.ts` |
| `export/route.ts` L129-296 | GET handler 编排 | `application/export-works-to-excel.usecase.ts` |
| `completion-rate/route.ts` L86-194 | GET handler 编排 | `application/export-completion-rate.usecase.ts` |

---

## 5. infrastructure（应迁到 `features/excel/infrastructure/`）

| 原位置 | 逻辑 | 建议文件 |
|--------|------|----------|
| `import/[type]/route.ts` L119-417 | `validateAndParseExcel`（xlsx buffer 解析） | `infrastructure/work-import-parser.ts` |
| `import/[type]/route.ts` L83-111 | `parseExcelDate`（日期解析器） | `infrastructure/xlsx-reader.ts` |
| `export/route.ts` L206-266 | xlsx worksheet 生成逻辑 | `infrastructure/work-exporter.ts` |
| `completion-rate/route.ts` L122-163 | xlsx workbook 生成逻辑 | `infrastructure/completion-rate-exporter.ts` |
| `excel-utils.ts` L42-139 | `getExcelTemplate`（模板生成） | `infrastructure/xlsx-writer.ts` |
| `template/[type]/route.ts` | 模板下载 route | 保持 route 薄，调用 infrastructure |

> **注意**：`XLSX.writeFile`（浏览器端）vs `XLSX.write`（服务端 buffer）需明确区分。

---

## 6. domain（应迁到 `features/excel/domain/`）

| 原位置 | 逻辑 | 建议文件 |
|--------|------|----------|
| `import/[type]/route.ts` L7-18 | `ValidationError`、`ImportRow` 接口 | `domain/excel.types.ts` |
| `import/[type]/route.ts` L19-21 | `isCompanyLevelRole` | 复用 `works/domain/work.permissions` 或 users domain |
| `import/[type]/route.ts` L23-25 | `isDepartmentImportRole` | 同上 |
| `import/[type]/route.ts` L27-29 | `getImportResponsibleDepartmentIds` | `domain/excel-import.rules.ts` |
| `import/[type]/route.ts` L31-81 | `validateImportScope`（导入权限范围校验） | `domain/excel-import.rules.ts` |
| `import/[type]/route.ts` L113-117 | `isAllowedImportedStatus`（状态白名单） | `domain/excel-import.rules.ts` |
| `import/[type]/route.ts` L187-413 | 字段映射 + 必填校验规则 | `domain/excel-import.rules.ts` 或 `presentation/excel.validators.ts` |
| `export/route.ts` L15-127 | 导出相关的常量、类型映射、日期/状态/关键字过滤 | `domain/excel-export.rules.ts` |
| `completion-rate/route.ts` L41-57 | `getDepartmentStatsForExcel` 内部计算口径 | `domain/completion-rate.rules.ts` |

> `completion-rate` 的数据获取（Prisma 查询）应进 infrastructure，计算口径进 domain。

---

## 7. presentation（应迁到 `features/excel/presentation/`）

| 原位置 | 逻辑 | 建议文件 |
|--------|------|----------|
| `import/[type]/route.ts` L7-18 | `ValidationError`、`ImportRow` 类型 | `presentation/excel.dto.ts` |
| `import/[type]/route.ts` L432-468 | 错误响应格式 | `presentation/excel.presenter.ts` |
| `import/[type]/route.ts` L559-562 | 成功响应格式 | `presentation/excel.presenter.ts` |
| `export/route.ts` L206-228 | 导出表头定义 | `presentation/excel.dto.ts` |
| `completion-rate/route.ts` L122-140 | 完成率表头定义 | `presentation/excel.dto.ts` |
| `excel-utils.ts` L43-128 | 模板字段定义（3 种 type） | `presentation/excel.dto.ts` |

---

## 8. 当前 Excel 导入支持的字段

### priority 类型
| 字段 | 必填 | 校验 |
|------|------|------|
| 业务类别 | 否 | - |
| 工作事项 | **是** | 非空 |
| 是否为创新工作 | **是** | 必须 '是' 或 '否' |
| 工作节点 | 否 | - |
| 完成时间 | **是** | YYYY-MM-DD 或 Excel 数字日期 |
| 完成形式 | 否 | - |
| 责任部门 | **是** | 必须存在于业务部门 |
| 责任领导 | **是** | 非空 |
| 责任人 | 否 | - |
| 配合方 | 否 | `部门\|领导\|人员；部门\|领导\|人员` 格式 |
| 当前状态 | 否 | 只允许空/草稿/DRAFT |

### main 类型
| 字段 | 必填 | 校验 |
|------|------|------|
| 业务类别 | 否 | - |
| 工作事项 | **是** | 非空 |
| 工作节点 | 否 | - |
| 完成时间 | **是** | YYYY-MM-DD 或 Excel 数字日期 |
| 完成形式 | 否 | - |
| 责任部门 | **是** | 必须存在于业务部门 |
| 责任领导 | **是** | 非空 |
| 责任人 | 否 | - |
| 配合方 | 否 | 同上 |
| 当前状态 | 否 | 只允许空/草稿/DRAFT |

### todo 类型
| 字段 | 必填 | 校验 |
|------|------|------|
| 事项提出领导 | 否 | 与指定审批领导至少一 |
| 指定审批领导 | 否 | 与事项提出领导至少一，必须是公司领导 |
| 事项提出场景 | 否 | - |
| 待办事项 | **是** | 非空 |
| 形成时间 | 否 | YYYY-MM-DD |
| 主责部门 | **是** | 必须存在于业务部门 |
| 责任领导 | 否 | - |
| 责任人 | 否 | - |
| 配合方 | 否 | 同上 |
| 工作计划 | **是** | 非空 |
| 计划完成时间 | **是** | YYYY-MM-DD |
| 进展情况 | 否 | - |
| 当前状态 | 否 | 只允许空/草稿/DRAFT |

---

## 9. 当前 Excel 导入校验规则

| 校验层级 | 校验内容 |
|----------|----------|
| **文件格式** | 只允许 `.xlsx` / `.xls` |
| **文件非空** | Excel 至少有一行数据 |
| **状态白名单** | 导入行的"当前状态"只允许空、'草稿'、'DRAFT'；审批中/进行中/终态一律拒绝 |
| **必填字段** | 按 type 不同：priority/main 的"工作事项""完成时间""责任部门""责任领导"；todo 的"待办事项""主责部门""工作计划""计划完成时间" |
| **日期格式** | `parseExcelDate` — 支持 Excel 数字日期（25000-60000）、字符串 YYYY-MM-DD、Date 对象 |
| **创新工作** | priority 必须 '是' 或 '否' |
| **部门存在** | 责任部门名/代码必须匹配 `prisma.department` 中 `isBusiness: true` 的部门 |
| **领导存在** | todo 的事项提出领导/审批领导必须匹配公司领导（PRESIDENT/VICE_PRESIDENT） |
| **配合方格式** | `部门|领导|人员；部门|领导|人员`，每个配合部门需存在 |
| **权限范围** | 部门用户只能导入主责部门=本部门的行；公司领导只能导入本人提出/审批的 TODO |
| **全局权限** | 非 ADMIN/SUPERVISOR/部门/公司领导 → 拒绝导入 |

---

## 10. 当前 Excel 导入是否写 operationLog

**是。** 导入成功后在事务内写入一条 operationLog：

```ts
prisma.operationLog.create({
  data: {
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'import',
    module: 'excel',
    targetType: 'workItem',
    targetId: 0,
    description: `导入${rows.length}条${type.toUpperCase()}事项`,
  },
})
```

导出和完成率导出也各写一条（`action: 'export'`）。

---

## 11. 当前 Excel 导出返回结构

### 普通导出（`GET /api/excel/export`）

| 属性 | 值 |
|------|-----|
| **返回格式** | `NextResponse(Uint8Array)` — 二进制 xlsx |
| **Content-Type** | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| **文件名** | `{类型}事项导出_{日期}.xlsx` 或 `督办事项导出_{日期}.xlsx` |
| **Sheet 名** | `数据` |
| **表头（22 列）** | 序号、事项类型、当前状态、业务类别、工作事项、是否为创新工作、工作节点、完成时间、完成形式、主责部门、责任领导、责任人、配合方、进展情况、创建人、创建时间、更新时间、取消原因、退回原因、事项提出领导、指定审批领导 |
| **列宽** | 默认（`aoa_to_sheet` 自动） |
| **日期格式** | `YYYY-MM-DD`（`getWorkStatusLabel` 对状态，`formatDate` 对日期） |
| **查询参数** | `type`（PRIORITY/MAIN/TODO）、`status`（含 draft/returneddraft/approving/handling/overdue/expiring 等衍生值）、`departmentId`、`keyword` |
| **权限** | 复用 `buildWorkVisibilityWhere` + `canViewWorkItem` post-filter |

### 完成率导出（`GET /api/excel/completion-rate`）

| 属性 | 值 |
|------|-----|
| **返回格式** | `NextResponse(Uint8Array)` |
| **文件名** | `完成率统计_{日期}.xlsx` |
| **Sheet 名** | `完成率统计` |
| **表头（17 列）** | 序号、部门、重点工作总数、重点工作已完成、重点工作完成率、主要工作总数、主要工作已完成、主要工作完成率、待办事项总数、待办已完成、待办完成率、总事项数、总完成数、总完成率、超期数、取消数 |
| **权限** | 仅 ADMIN / SUPERVISOR |

---

## 12. completion-rate 统计口径对比

| 口径 | Excel `completion-rate` | Dashboard `completion-rate` | 一致？ |
|------|------------------------|---------------------------|--------|
| 部门过滤 | `prisma.workItem.findMany({ departmentId })` — 无可见性过滤 | 含 `buildWorkVisibilityWhere` | **不一致** |
| 主责判定 | `getResponsibleDepartmentIds(work).includes(departmentId)` | 同 | ✅ |
| 完成判定 | `work.status === 'COMPLETED'` | 同 | ✅ |
| 取消判定 | `work.status === 'CANCELLED'` | 同 | ✅ |
| 超期判定 | TODO 看 `planCompleteTime`，其他看 `completeTime` | 同 | ✅ |
| 完成率公式 | `(completed / (total - cancelled)) * 100` | `Math.round((completed/(total-cancelled))*10000)/100` | 算法相同，精度不同 |
| 超期判定日期 | `due < new Date()` | 同 | ✅ |
| 角色可见性 | 仅 ADMIN/SUPERVISOR | 所有角色按 visibilityWhere | **不一致** |

**结论**：计算口径逻辑相同但**存在两处独立实现**（`completion-rate/route.ts` 的 `getDepartmentStatsForExcel` 和 `dashboard/completion-rate/route.ts` 的 `getDepartmentStats`），应统一到一个 shared module 或 feature 内。

---

## 13. 建议迁移到 features/excel 下的文件结构

```
features/excel/
  domain/
    excel.types.ts                  ← ValidationError, ImportRow, ExportHeader 等
    excel-import.rules.ts           ← validateImportScope, isAllowedImportedStatus, 字段映射
    excel-export.rules.ts           ← normalizeTypeFilter, normalizeStatusFilter, isValidStatusFilter
    completion-rate.rules.ts        ← isCompleted, isCancelled, isOverdue, calculateRate

  application/
    import-works-from-excel.usecase.ts   ← 编排导入流程
    export-works-to-excel.usecase.ts     ← 编排导出流程
    export-completion-rate.usecase.ts    ← 编排完成率导出流程

  infrastructure/
    xlsx-reader.ts                 ← parseExcelDate, parse buffer
    xlsx-writer.ts                 ← getExcelTemplate（服务端模板生成）
    work-import-parser.ts          ← validateAndParseExcel
    work-exporter.ts               ← 服务端 xlsx 生成（替换 route 内联生成）
    completion-rate-exporter.ts   ← 服务端完成率 xlsx 生成
    excel.repository.ts            ← Prisma 查询（departments, leaders, workItems）

  presentation/
    excel.dto.ts                   ← ImportResponseDto, ExportQueryParams, CompletionRateRow
    excel.validators.ts            ← 参数校验
    excel.presenter.ts             ← 错误/成功响应格式化

  client/
    excel-api.ts                   ← fetch wrapper（/api/excel/import, /api/excel/export 等）
    excel-import-client.ts         ← importWorksFromExcel（浏览器端 FileReader）
    excel-export-client.ts         ← exportWorksToExcel（浏览器端 xlsx 生成+下载）
    completion-rate-client.ts     ← exportCompanyCompletionRate（浏览器端）
    excel-template-client.ts      ← getExcelTemplate（浏览器端调用 API）

  ui/
    excel-import-dialog.tsx        ← 导入弹窗组件
    excel-export-button.tsx        ← 导出按钮组件
```

---

## 14. 建议 Phase 6B/6C/6D/6E 拆分顺序

| Phase | 内容 | 风险 |
|-------|------|------|
| **6B** | 类型 + 常量 + 纯规则 → `domain/`：<br>- `excel.types.ts`（ValidationError, ImportRow, ExcelRouteType 等）<br>- `excel-import.rules.ts`（validateImportScope, isAllowedImportedStatus, 字段映射）<br>- `excel-export.rules.ts`（normalizeTypeFilter, isValidStatusFilter 等纯函数）<br>- 保留 `excel-utils.ts` 兼容重导出 | **低** |
| **6C** | Infrastructure 迁移：<br>- `xlsx-reader.ts`（parseExcelDate, buffer 解析）<br>- `xlsx-writer.ts`（模板生成）<br>- `work-import-parser.ts`（validateAndParseExcel）<br>- `work-exporter.ts`（导出 xlsx 生成）<br>- `completion-rate-exporter.ts`<br>- `excel.repository.ts`（Prisma 查询统一） | **中** |
| **6D** | Application 迁移：<br>- `import-works-from-excel.usecase.ts`<br>- `export-works-to-excel.usecase.ts`<br>- `export-completion-rate.usecase.ts`<br>- import/export/completion-rate/template 四个 route 变薄 | **中** |
| **6E** | 前端 client/ui 迁移：<br>- 浏览器端 xlsx 函数 → `client/`<br>- import/export 组件 → `ui/`<br>- `excel-utils.ts` 转为纯重导出或删除 | **中** |

---

## 15. 风险点和必须保持不变的接口契约

### 不可改变的接口契约

| 契约 | 说明 |
|------|------|
| `POST /api/excel/import/[type]` | FormData file + 权限校验 + 错误 details 数组格式 |
| `GET /api/excel/export` | 查询参数 type/status/departmentId/keyword + 二进制 xlsx 响应 |
| `GET /api/excel/completion-rate` | 查询参数 startDate/endDate + 二进制 xlsx 响应 |
| `GET /api/excel/template/[type]` | 二进制 xlsx + 文件名 |
| 错误响应 | `{ success: false, error: string, details: ValidationError[] }`（导入） |
| 成功响应 | `{ success: true, imported: number, message: string }`（导入） |

### 高耦合点

| 耦合 | 处理策略 |
|------|----------|
| `excel-utils.ts` 同时被前端和后端引用 | Phase 6E 拆分 client/server |
| `validateAndParseExcel` 内联大量 Prisma 查询 | Phase 6C 抽到 repository |
| `completion-rate` 与 dashboard 重复 | Phase 6C/6D 统一统计口径函数 |
| `parseExcelDate` 被 import route 使用 | Phase 6C 迁到 infrastructure |
| 导入权限 `validateImportScope` 与 work.permissions 耦合 | 可保持引用或提取独立规则 |

### 安全红线

- 导入只允许 DRAFT 状态（防止绕过审批流程）
- 导入权限必须服务端再次校验（不可信任前端）
- operationLog 不可丢失
- 模板字段与导入解析字段必须一致
- 完成率统计口径不可改变
