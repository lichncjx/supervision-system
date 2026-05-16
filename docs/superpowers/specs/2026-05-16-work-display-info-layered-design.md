# WorkDisplayInfo 信息分层设计

> Issue: #63 · 日期: 2026-05-16 · 模式: Autopilot

## 1. 问题

当前 `PriorityMainWorkDisplayInfo`（重点工作、主要工作）采用字段平铺的 2 列网格，所有字段视觉权重相同，用户难以快速识别核心信息。待办事项虽已有一定分组，但与重点工作/主要工作风格不统一。

## 2. 设计原则

- 核心摘要优先，长文本整行，责任信息成组，辅助信息弱化
- 三类事项统一结构，各有配色
- 只改 `work-display-info.tsx`，不影响附件/审批/节点/操作按钮

## 3. 配色方案

每类事项定义三级色：deep（标题/内容区左边线）、mid（状态/责任区左边线）、light（辅助区背景）。

在 `visual-tokens.ts` 新增 `DETAIL_THEME` 对象：

```ts
export const DETAIL_THEME = {
  priority: {  // 重点工作 — 石墨/淡紫/暖粉
    deep:  '#4f4f4f',
    mid:   '#9a8c98',
    light: '#f2e9e4',
  },
  main: {  // 主要工作 — 橄榄/灰绿/暖杏
    deep:  '#6b705c',
    mid:   '#a5a58d',
    light: '#ddbea9',
  },
  todo: {  // 待办事项 — 森绿/苔绿/薄雾
    deep:  '#52796f',
    mid:   '#84a98c',
    light: '#cad2c5',
  },
} as const;
```

颜色使用规则：
- Hero 渐变：`linear-gradient(135deg, {light}22, {light}11, #f8f8f8)` — 极淡
- Hero 标题：deep 色
- 状态 badge：mid 色背景
- 内容区左边线：3px solid deep
- 责任区左边线：3px solid mid
- 辅助区：light 背景 + opacity-0.75
- section 标题：mid 色（责任/辅助）、deep 色（内容）

## 4. 布局结构

### 4.1 重点工作 / 主要工作

```
┌─ Hero ──────────────────────────────────────────┐
│  标题（work.workItem，大号加粗，deep 色）          │
│  [StatusBadge]  当前环节（mid 色加粗）             │
│  完成时间 · 主责部门 · 责任人员/起草人员            │
└──────────────────────────────────────────────────┘
┌─ 主要内容（deep 左边线）─────────────────────────┐
│  工作计划（整行白底卡片，whitespace-pre-wrap）      │
│  进展情况（整行白底卡片，whitespace-pre-wrap）      │
└──────────────────────────────────────────────────┘
┌─ 责任详情（mid 左边线）──────────────────────────┐
│  主责部门  │ 责任领导                             │
│  责任人员  │ 起草人员（firstSubmitterName || creatorName）│
└──────────────────────────────────────────────────┘
┌─ 辅助信息（light 背景，opacity-0.75）────────────┐
│  业务类别  │ 工作节点                             │
│  完成形式  │ 是否创新（仅重点工作）                 │
└──────────────────────────────────────────────────┘
```

### 4.2 待办事项

```
┌─ Hero ──────────────────────────────────────────┐
│  标题（work.workItem，大号加粗，deep 色）          │
│  [StatusBadge]  当前环节（mid 色加粗）             │
│  提出领导 · 提出场景 · 完成时间                    │
└──────────────────────────────────────────────────┘
┌─ 主要内容（deep 左边线）─────────────────────────┐
│  工作计划（整行白底卡片）                          │
│  进展情况（整行白底卡片）                          │
└──────────────────────────────────────────────────┘
┌─ 责任详情（mid 左边线）──────────────────────────┐
│  主责部门  │ 责任领导                             │
│  责任人员  │ 起草人员                             │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  配合部门  │ 配合责任人员（hideCooperators 时隐藏）│
└──────────────────────────────────────────────────┘
┌─ 辅助信息（light 背景，opacity-0.75）────────────┐
│  形成时间  │ 工作节点                             │
└──────────────────────────────────────────────────┘
```

### 4.3 不动的部分

以下区域保持现有结构和样式不变：
- 退回原因（rose 色卡片）
- 工作节点/子节点列表
- 见证材料说明 + 附件
- 调整原因 + 调整记录
- 取消原因

## 5. 轻量组件

从 `work-display-info.tsx` 内部提取，不对外导出：

| 组件 | Props | 职责 |
|------|-------|------|
| `DetailHero` | `title`, `badge`（slot）, `process`, `meta: string[]`, `accent: {deep,mid,light}` | 渲染顶部渐变卡片 |
| `DetailSection` | `title`, `accentColor`, `variant: 'default' \| 'muted'`, `children` | 渲染左边线 + 圆角卡片容器 |
| `DetailLongText` | `label`, `value`, `accentColor` | 渲染白底整行长文本卡片 |

不抽 `DetailField` — 直接用 `DISPLAY_LABEL` + 内联样式即可。

## 6. 设计规范（供后续面板迁移参照）

其他面板逐步同步此设计时遵循：

### 6.1 分层规则

```
详情面板统一结构：
  Hero（核心摘要）
  → 主要内容（长文本整行）
  → 责任详情（网格字段）
  → 辅助信息（弱化 / 可折叠）
```

### 6.2 颜色规则

- 通过 `work.type` 映射到 `DETAIL_THEME[type]`
- section 左边线：内容区用 deep，责任区用 mid
- 辅助区：light 背景 + `opacity-0.75`
- 不要在同一面板硬编码颜色值，统一从 token 取

### 6.3 组件复用

- 引入 `DetailHero` + `DetailSection` 替换原有的 `<div className="space-y-2">` + 网格
- 长文本字段一律用 `DetailLongText`
- 短字段直接用 `DISPLAY_LABEL` + `DISPLAY_VALUE` token

### 6.4 迁移检查清单

迁移其他面板时逐项确认：
- [ ] 通过 `work.type` 取色，无硬编码颜色
- [ ] Hero 区展示核心摘要（标题+状态+关键 meta）
- [ ] 长文本字段整行展示
- [ ] 责任信息成组
- [ ] 辅助信息弱化
- [ ] 不影响现有功能（附件/审批/节点/操作）

## 7. 验收标准

1. 重点工作、主要工作不再字段平铺，采用 Hero → 内容 → 责任 → 辅助四层结构
2. 待办事项单独设计，Hero 展示提出领导/场景，责任详情含配合部门
3. 工作计划、进展情况整行白底卡片展示，支持多行
4. 起草人员正常展示，`firstSubmitterName` 优先，fallback `creatorName`
5. 辅助信息弱化展示
6. 三类事项各有一套配色，通过 `DETAIL_THEME` token 配置
7. StatusBadge 和当前环节保持原逻辑
8. 不影响附件、审批、退回、完成、调整、取消、节点、流程记录
9. `pnpm lint`、`pnpm typecheck`、`pnpm build` 通过

## 8. 文件变更

| 文件 | 变更 |
|------|------|
| `src/features/works/ui/visual-tokens.ts` | 新增 `DETAIL_THEME` 常量 |
| `src/features/works/ui/work-display-info.tsx` | 重构布局，提取内部组件，使用 DETAIL_THEME 取色 |
