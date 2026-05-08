# Dashboard 视觉升级 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Dashboard 从传统 6 卡片网格升级为方案 5 布局（胶囊指标条 + 三列分类仪表），引入语义色变量和微动效。

**Architecture:** 仅修改 3 个文件 — `globals.css`（CSS 变量 + 动画）、`/api/dashboard/summary`（新增按类型完成数）、`page.tsx`（页面重组）。不改路由、不改布局骨架、不增依赖。

**Tech Stack:** Next.js App Router, Tailwind CSS v4, shadcn/ui, Prisma

---

### Task 0: 创建功能分支

- [ ] **Step 1: 从 main 创建分支**

```bash
git checkout main
git checkout -b feature/dashboard-redesign
```

预期：切换到新分支 `feature/dashboard-redesign`。

---

### Task 1: 全局 CSS 变量和动画

**Files:**
- Modify: `src/app/globals.css` — 在 `:root` 块后追加

- [ ] **Step 1: 在 `:root { }` 块内追加语义色变量，在其后追加动画 keyframes**

在 `:root` 块的 `}` 之后（约第 60 行之后）追加以下内容：

```css
:root {
  --stat-approving: oklch(0.75 0.15 85);
  --stat-handling: oklch(0.60 0.18 300);
  --stat-inprogress: oklch(0.60 0.12 230);
  --stat-completed: oklch(0.60 0.16 150);
  --stat-expiring: oklch(0.70 0.16 60);
  --stat-overdue: oklch(0.55 0.20 20);
  --dashboard-accent: oklch(0.55 0.2 250);
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.stagger-1 { animation: fadeInUp 0.4s ease-out both; animation-delay: 0.05s; }
.stagger-2 { animation: fadeInUp 0.4s ease-out both; animation-delay: 0.10s; }
.stagger-3 { animation: fadeInUp 0.4s ease-out both; animation-delay: 0.15s; }
.stagger-4 { animation: fadeInUp 0.4s ease-out both; animation-delay: 0.20s; }
.stagger-5 { animation: fadeInUp 0.4s ease-out both; animation-delay: 0.25s; }
.stagger-6 { animation: fadeInUp 0.4s ease-out both; animation-delay: 0.30s; }
```

- [ ] **Step 2: 提交**

```bash
git add src/app/globals.css
git commit -m "style: add dashboard semantic color variables and stagger animations"
```

---

### Task 2: API — 新增按类型完成数

**Files:**
- Modify: `src/app/api/dashboard/summary/route.ts`

- [ ] **Step 1: 在 Promise.all 中追加 3 个按类型完成数查询**

在 `route.ts` 第 199-269 行的 `Promise.all` 数组末尾（`thisMonthList` 查询之后）追加三个查询：

```typescript
prisma.workItem.count({
  where: { ...whereClause, type: 'PRIORITY', status: WorkItemStatus.COMPLETED },
}),
prisma.workItem.count({
  where: { ...whereClause, type: 'MAIN', status: WorkItemStatus.COMPLETED },
}),
prisma.workItem.count({
  where: { ...whereClause, type: 'TODO', status: WorkItemStatus.COMPLETED },
}),
```

- [ ] **Step 2: 在解构中追加对应变量名**

在 `route.ts` 第 199-209 行的解构数组中追加三个变量名，放在 `thisMonthList` 之后：

```typescript
priorityCompleted,
mainCompleted,
todoCompleted,
```

完整的解构变为：

```typescript
const [
  priorityTotal,
  mainTotal,
  todoTotal,
  inProgressList,
  completedList,
  cancelledList,
  overdueList,
  thisMonthList,
  priorityCompleted,
  mainCompleted,
  todoCompleted,
] = await Promise.all([
  // ... existing queries ...
])
```

- [ ] **Step 3: 在返回 JSON 中加入新字段**

在 `return NextResponse.json({...})` 对象中追加：

```typescript
priorityCompleted,
mainCompleted,
todoCompleted,
```

- [ ] **Step 4: 提交**

```bash
git add src/app/api/dashboard/summary/route.ts
git commit -m "feat: add per-type completion counts to dashboard summary API"
```

---

### Task 3: Dashboard 页面 — 状态和数据结构更新

**Files:**
- Modify: `src/app/(app)/page.tsx`

- [ ] **Step 1: 更新 stats state 类型和接口**

将 stats 的 `useState` 初始化追加 `priorityCompleted`、`mainCompleted`、`todoCompleted` 三个字段：

```typescript
const [stats, setStats] = useState({
  total: 0,
  approving: 0,
  handling: 0,
  inProgress: 0,
  completed: 0,
  overdue: 0,
  expiring: 0,
  priority: 0,
  main: 0,
  todo: 0,
  priorityCompleted: 0,
  mainCompleted: 0,
  todoCompleted: 0,
});
```

- [ ] **Step 2: 更新 API 响应映射**

在 `loadData` 函数中，`setStats` 调用里追加三个新字段：

```typescript
setStats({
  total: data.priorityTotal + data.mainTotal + data.todoTotal,
  approving: data.approving,
  handling: data.handling,
  inProgress: data.inProgress,
  completed: data.completed,
  overdue,
  expiring,
  priority: data.priorityTotal,
  main: data.mainTotal,
  todo: data.todoTotal,
  priorityCompleted: data.priorityCompleted ?? 0,
  mainCompleted: data.mainCompleted ?? 0,
  todoCompleted: data.todoCompleted ?? 0,
});
```

- [ ] **Step 3: 提交**

```bash
git add src/app/(app)/page.tsx
git commit -m "feat: wire up per-type completion stats in dashboard page"
```

---

### Task 4: 顶部胶囊指标条（替换 6 卡片网格）

**Files:**
- Modify: `src/app/(app)/page.tsx`

- [ ] **Step 1: 删除原 6 卡片网格代码块，替换为胶囊指标条**

将现有第 222-294 行的 `<div className="grid grid-cols-2 md:grid-cols-6 gap-4">` 整块替换为：

```tsx
<div className="stagger-2 flex flex-wrap items-center gap-2">
  <Link href="/status/approving" className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3.5 py-1.5 text-sm font-medium text-amber-700 border border-amber-100 hover:-translate-y-0.5 transition">
    <span className="w-2 h-2 rounded-full bg-amber-500" />
    待审批 <span className="tabular-nums font-bold">{stats.approving}</span>
  </Link>
  <Link href="/status/handling" className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3.5 py-1.5 text-sm font-medium text-purple-700 border border-purple-100 hover:-translate-y-0.5 transition">
    <span className="w-2 h-2 rounded-full bg-purple-500" />
    待办理 <span className="tabular-nums font-bold">{stats.handling}</span>
  </Link>
  <Link href="/status/inProgress" className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3.5 py-1.5 text-sm font-medium text-sky-700 border border-sky-100 hover:-translate-y-0.5 transition">
    <span className="w-2 h-2 rounded-full bg-sky-500" />
    进行中 <span className="tabular-nums font-bold">{stats.inProgress}</span>
  </Link>
  <Link href="/status/expiring" className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3.5 py-1.5 text-sm font-medium text-orange-700 border border-orange-100 hover:-translate-y-0.5 transition">
    <span className="w-2 h-2 rounded-full bg-orange-500" />
    临期 <span className="tabular-nums font-bold">{stats.expiring}</span>
  </Link>
  <Link href="/status/overdue" className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3.5 py-1.5 text-sm font-medium text-rose-700 border border-rose-100 hover:-translate-y-0.5 transition">
    <span className="w-2 h-2 rounded-full bg-rose-500" />
    超期 <span className="tabular-nums font-bold">{stats.overdue}</span>
  </Link>
</div>
```

- [ ] **Step 2: 删除不再需要的 import**

如果 `Clock`、`CheckCircle2` 不再用于统计卡片区（列表区仍需要 `Clock`、`AlertCircle`），可保留 import——列表区和第 9 行 import 中 `Clock`、`AlertCircle` 仍有用。

- [ ] **Step 3: 提交**

```bash
git add src/app/(app)/page.tsx
git commit -m "feat: replace 6 stat cards with compact pill indicator bar"
```

---

### Task 5: 三列分类仪表（替换原类别区 + 已完成卡片）

**Files:**
- Modify: `src/app/(app)/page.tsx`

- [ ] **Step 1: 替换原类别区 3 卡片（第 323-353 行）为三列仪表**

删掉原来的 `<div className="grid grid-cols-1 md:grid-cols-3 gap-4">` 整块，替换为：

```tsx
<div className="stagger-4 grid grid-cols-1 md:grid-cols-3 gap-4">
  {[
    {
      href: '/priority',
      label: '重点工作',
      total: stats.priority,
      completed: stats.priorityCompleted,
      color: 'rose' as const,
      gradient: 'from-red-50 to-rose-50/30',
      icon: '★',
    },
    {
      href: '/main',
      label: '主要工作',
      total: stats.main,
      completed: stats.mainCompleted,
      color: 'sky' as const,
      gradient: 'from-blue-50 to-sky-50/30',
      icon: '●',
    },
    {
      href: '/todo',
      label: '待办事项',
      total: stats.todo,
      completed: stats.todoCompleted,
      color: 'emerald' as const,
      gradient: 'from-emerald-50 to-teal-50/30',
      icon: '✓',
    },
  ].map(({ href, label, total, completed, color, gradient, icon }) => {
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0
    const colorMap = {
      rose: { text: 'text-rose-600', progress: 'bg-rose-500', dot: 'bg-rose-500' },
      sky: { text: 'text-sky-600', progress: 'bg-sky-500', dot: 'bg-sky-500' },
      emerald: { text: 'text-emerald-600', progress: 'bg-emerald-500', dot: 'bg-emerald-500' },
    }
    const c = colorMap[color]

    return (
      <Link key={href} href={href} className="block group">
        <div className={`rounded-xl border border-slate-200/80 bg-gradient-to-br ${gradient} p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-200`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-600">{label}</span>
            <span className={`text-lg ${c.text}`}>{icon}</span>
          </div>
          <p className={`text-4xl font-extrabold ${c.text} tabular-nums`}>{total}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700 tabular-nums">{rate}%</span>
            <div className="h-2 flex-1 rounded-full bg-slate-200 overflow-hidden">
              <div className={`h-full rounded-full ${c.progress} transition-all`} style={{ width: `${rate}%` }} />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            已完成 {completed}/{total}
          </p>
        </div>
      </Link>
    )
  })}
</div>
```

- [ ] **Step 2: 提交**

```bash
git add src/app/(app)/page.tsx
git commit -m "feat: replace category cards with 3-column仪表盘 with progress bars"
```

---

### Task 6: 公告栏毛玻璃 + 欢迎语微调 + stagger 类应用

**Files:**
- Modify: `src/app/(app)/page.tsx`

- [ ] **Step 1: 公告栏改为毛玻璃卡片**

将现有第 177-220 行公告栏 `<Card>` 整块改为：

```tsx
<div className="stagger-1 rounded-xl border border-slate-200/80 bg-white/70 backdrop-blur-sm p-4">
  <div className="flex items-center justify-between gap-3">
    <div>
      <div className="font-bold text-slate-900">督办提示</div>
      <div className="text-sm text-slate-500">由督办管理员维护，所有用户可见</div>
    </div>

    {canEditNotice && !noticeEditing && (
      <Button size="sm" variant="outline" onClick={() => setNoticeEditing(true)}>
        编辑
      </Button>
    )}
  </div>

  {noticeEditing && canEditNotice ? (
    <div className="mt-3 space-y-3">
      <Textarea
        value={noticeDraft}
        onChange={(e) => setNoticeDraft(e.target.value)}
        rows={3}
        placeholder="请输入督办提示、工作要求或注意事项"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={saveNotice}>保存</Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setNoticeDraft(adminNotice)
            setNoticeEditing(false)
          }}
        >
          取消
        </Button>
      </div>
    </div>
  ) : (
    <div className="mt-3 rounded-lg bg-slate-50/80 p-3 text-sm text-slate-700 whitespace-pre-wrap break-words">
      {adminNotice || '暂无督办提示'}
    </div>
  )}
</div>
```

- [ ] **Step 2: 欢迎语区域微调，body 背景改为 slate-50**

将第 141-147 行的欢迎区域样式微调：

```tsx
<div className="flex items-center justify-between stagger-1">
  <div>
    <h2 className="text-2xl font-bold text-slate-900">
      {user ? `欢迎回来，${user.name}` : '欢迎使用公司督办管理系统'}
    </h2>
    <p className="text-slate-500 mt-1 text-sm">实时跟踪和管理公司督办事项</p>
  </div>
  {/* 按钮区保持不变 */}
</div>
```

- [ ] **Step 3: 综合查询卡片添加 stagger 类**

在第 297 行的 `{isSupervisionAdmin(user?.role) && (` 之前，给包裹的 `<Card>` 添加 className `stagger-3`。

- [ ] **Step 4: 列表区微调 — 左侧色条 + 标题角标 + hover 右移**

将待处理列表（第 356-390 行）和临超期列表（第 392-424 行）的卡片包裹分别添加 `className="stagger-5"` 和 `className="stagger-6"`。

列表项链接的 `<div className="border rounded-lg p-3 hover:bg-gray-50 min-w-0">` 改为：

```tsx
<div className="border-l-2 border-l-slate-300 rounded-lg p-3 hover:bg-slate-50 hover:translate-x-0.5 transition min-w-0">
```

保持其他内容不变。

- [ ] **Step 5: body 背景色更新**

`main-layout.tsx` 的 `<div className="min-h-screen bg-gray-50">` 改为 `<div className="min-h-screen bg-slate-50">`（第 138 行）。

- [ ] **Step 6: 提交**

```bash
git add src/app/(app)/page.tsx src/components/layout/main-layout.tsx
git commit -m "style: frosted notice board, slate background, stagger animations, list micro-adjustments"
```

---

### Task 7: 类型检查 + 构建验证

- [ ] **Step 1: 运行 typecheck**

```bash
pnpm typecheck
```

预期：无错误。

- [ ] **Step 2: 运行 build**

```bash
pnpm build
```

预期：成功构建，无 warning。

---

## 文件变更汇总

| 文件 | 操作 | 内容 |
|------|------|------|
| `src/app/globals.css` | 修改 | 追加 CSS 变量、keyframes、stagger 类 |
| `src/app/api/dashboard/summary/route.ts` | 修改 | Promise.all 加 3 个按类型完成数查询 + 响应字段 |
| `src/app/(app)/page.tsx` | 重构 | 6 卡片 → 胶囊条，3 卡片 → 三列仪表，公告栏毛玻璃，动画类 |
| `src/components/layout/main-layout.tsx` | 修改 | 背景色 `gray-50` → `slate-50` |
