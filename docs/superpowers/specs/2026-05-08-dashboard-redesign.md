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

## 二、统计卡片区（6 卡片）

保持 6 列网格布局和 `<Link>` 跳转。每张卡片升级为：

1. **彩色顶部强调条** — 2px 高的 `border-t`，颜色对应各卡片语义色（审批=amber、办理=violet 等），作为每张卡片的主视觉标识
2. **数字放大 + 底部百分比** — 数字用 `text-3xl font-extrabold`，「已完成」和「进行中」卡片底部显示 `已完成 / 总计 = X%`；其余卡片底部显示描述文字
3. **图标水印** — 40px 图标 `opacity-15` 置于卡片右下角
4. **hover** — `-translate-y-1` + 阴影加深，transition 200ms

**文件影响：** `src/app/(app)/page.tsx`（Dashboard 组件内重构统计卡片部分）

---

## 三、类别区（3 卡片）

重点/主要/待办的三个入口卡片：

1. 数字放大 + 底部描述文字（同现有结构，升级字体和间距）
2. 每种卡片独特的微妙渐变背景：重点 `from-red-50 to-rose-50`、主要 `from-blue-50 to-sky-50`、待办 `from-emerald-50 to-teal-50`
3. 右侧加一个装饰性圆形色块，增强层次

**文件影响：** `src/app/(app)/page.tsx`（类别卡片部分）

---

## 四、列表区（待处理 & 临超期）

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

- 布局骨架、路由、API 调用逻辑均不变
- 所有 `<Link>` 跳转和权限控制保持不变
- 不新增 npm 依赖
- 不新增 API 端点

## 实现清单

1. `globals.css` — 引入语义色变量、幻灯片动画 keyframes、stagger 工具类
2. `page.tsx` — 逐板块重构：统计卡片 → 类别卡片 → 列表区 → 公告栏
3. 验证：`pnpm typecheck && pnpm build`
