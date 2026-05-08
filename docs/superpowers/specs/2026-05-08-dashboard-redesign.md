# Dashboard 视觉升级设计

## 目标

对公司督办管理系统 Dashboard 进行中等程度的视觉重构：保持功能和布局不变，增强视觉层次、数据展示和现代感。

## 设计方向

**现代清爽** — Linear / Vercel 风格，浅色主调、卡片式、大留白、微动效、微妙渐变。

---

## 一、色彩体系 & CSS 变量

在 `globals.css` 中引入 Dashboard 专用语义色变量，统一管理强调色。

- 页面背景：`bg-gray-50` → `bg-slate-50`
- 卡片背景：白色 + 极淡渐变叠加
- 统计数字色：定义语义色变量
  - 审批 `--stat-approving: oklch(0.75 0.15 85)` (amber)
  - 办理 `--stat-handling: oklch(0.60 0.18 300)` (violet)
  - 进行中 `--stat-inprogress: oklch(0.60 0.12 230)` (sky)
  - 完成 `--stat-completed: oklch(0.60 0.16 150)` (emerald)
  - 临期 `--stat-expiring: oklch(0.70 0.16 60)` (orange)
  - 超期 `--stat-overdue: oklch(0.55 0.20 20)` (rose)
- 边框：`border-slate-200/80`
- 阴影：弥散阴影替代默认 `shadow-md`
- 主强调色：`--dashboard-accent` 蓝紫

**文件影响：** `src/app/globals.css`

---

## 二、顶部状态条（紧凑指标）

原来的 6 个等大统计卡片改为一行紧凑胶囊形指标条，5 个可点击的状态指示器：

```
  ◉ 待审批 5    ◉ 待办理 12    进行中 34    临期 7    超期 3
```

- 每个指标为圆角胶囊形（`rounded-full`），浅色背景 + 同色系文字 + 左侧小圆点
- 右侧数字加粗，给轻微 hover 上浮效果
- 保持 `<Link>` 跳转到对应 `/status/[filter]`
- 不显示"已完成"——完成数据融入下方的分类仪表

**文件影响：** `src/app/(app)/page.tsx`

---

## 三、分类仪表区（3 列）

取代原来的"类别区"三张独立卡片和统计区的"已完成"卡片。三列等宽，每列包含：

```
┌─────────────────┬─────────────────┬─────────────────┐
│   ★ 重点工作     │   ● 主要工作     │   ✓ 待办事项     │
│     45          │      62         │      21         │
│  完成率 77%      │  完成率 69%      │  完成率 55%      │
│  ████████░░     │  ██████░░░░     │  █████░░░░░     │
│  已完成 35/45    │  已完成 43/62    │  已完成 12/21    │
└─────────────────┴─────────────────┴─────────────────┘
```

1. 每列一张卡片，整卡可点击跳转对应列表路由
2. **大数字** — `text-4xl font-extrabold`，颜色对应类型：重点=rose、主要=sky、待办=emerald
3. **完成率** — 百分比数字 + `<Progress />` 组件（已有 shadcn progress）
4. **底部细文** — "已完成 X / Y"
5. **渐变背景** — 重点 `from-red-50 to-rose-50/30`、主要 `from-blue-50 to-sky-50/30`、待办 `from-emerald-50 to-teal-50/30`
6. hover 时卡片略微上浮 + 阴影加深

**数据要求：** `/api/dashboard/summary` 需新增 `priorityCompleted`、`mainCompleted`、`todoCompleted` 三个字段。

**文件影响：** `src/app/(app)/page.tsx` + `src/app/api/dashboard/summary/route.ts`

---

## 四、列表区（待处理 & 临超期，不变）

1. 每行左侧加 2px 状态色竖线（border-left）
2. 卡片标题旁加数字角标（Badge 组件）
3. hover 时背景微变 + `translateX(2px)` 右移

**文件影响：** `src/app/(app)/page.tsx`（列表项部分）

---

## 五、公告栏 & 全局动效

1. 公告栏从 `bg-blue-50` 方框改为毛玻璃卡片 `bg-white/70 backdrop-blur`
2. 欢迎语字号和间距微调
3. 页面加载 stagger 依次渐入：CSS `@keyframes fadeInUp` + `animation-delay`

```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.stagger-item { animation: fadeInUp 0.4s ease-out both; }
.stagger-item:nth-child(1) { animation-delay: 0.05s; }
.stagger-item:nth-child(2) { animation-delay: 0.10s; }
/* ... */
```

**文件影响：** `src/app/(app)/page.tsx` + `src/app/globals.css`

---

## 不变范围

- 整体页面骨架、路由、权限控制不变
- 所有 `<Link>` 跳转目标不变
- 列表区内容逻辑不变（仅视觉微调）
- 不新增 npm 依赖

## 实现清单

1. `src/app/globals.css` — 语义色变量、渐入动画 keyframes、stagger 工具类
2. `src/app/api/dashboard/summary/route.ts` — 新增 priorityCompleted / mainCompleted / todoCompleted 字段
3. `src/app/(app)/page.tsx` — 按板块重构：
   - 顶部：6 统计卡片 → 5 胶囊指标条
   - 中部：3 卡片 + 已完成 → 3 列分类仪表
   - 下部：列表区微调 + 公告栏毛玻璃
4. 验证：`pnpm typecheck && pnpm build`
