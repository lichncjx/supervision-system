// 视觉 token — Warm Luxury 设计体系
// 三基色：石板暖灰 (Slate) + 青碧 (Teal) + 琥珀金 (Amber)

// ── 毛玻璃面板 ──────────────────────────────────────────────

export const PANEL =
  'rounded-2xl border border-white/70 bg-white/78 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-xl';

export const PANEL_PADDED = `${PANEL} p-5`;

export const SURFACE_INSET =
  'rounded-xl border border-slate-200/70 bg-white/65 shadow-inner shadow-white/50';

// ── 区块头部 ──────────────────────────────────────────────

export const SECTION_HEADER =
  'mb-5 flex items-center justify-between gap-3 border-b border-slate-200/70 pb-3';

export const SECTION_TITLE = 'text-sm font-semibold text-slate-800 tracking-tight';

export const SECTION_EYEBROW = 'text-[11px] font-semibold uppercase tracking-wider text-slate-400';

// ── 表单控件 ──────────────────────────────────────────────

export const FIELD_LABEL = 'block text-xs font-semibold text-slate-500 tracking-wide';

export const FORM_CONTROL =
  'h-10 rounded-xl border-slate-200/80 bg-white/82 px-3 shadow-sm shadow-slate-200/40 transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-teal-500 focus-visible:ring-[3px] focus-visible:ring-teal-500/15';

export const SELECT_CONTROL =
  'h-10 w-full rounded-xl border border-slate-200/80 bg-white/82 px-3 text-sm shadow-sm shadow-slate-200/40 transition-all duration-200 outline-none hover:border-slate-300 focus:border-teal-500 focus:ring-[3px] focus:ring-teal-500/15 disabled:cursor-not-allowed disabled:opacity-50';

export const TEXTAREA_CONTROL =
  'rounded-xl border-slate-200/80 bg-white/82 shadow-sm shadow-slate-200/40 transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-teal-500 focus-visible:ring-[3px] focus-visible:ring-teal-500/15';

// ── 信息展示 ──────────────────────────────────────────────

export const DISPLAY_LABEL = 'text-[11px] font-semibold uppercase tracking-wider text-slate-400';

export const DISPLAY_VALUE = 'text-sm font-medium text-slate-800';

export const MUTED_TEXT = 'text-xs text-slate-400';

// ── 反馈信息 ──────────────────────────────────────────────

export const ERROR_TEXT = 'mt-1.5 text-xs font-medium text-rose-600';

export const ERROR_BOX =
  'rounded-2xl border border-rose-200/80 bg-rose-50/90 p-4 text-sm text-rose-700 shadow-sm shadow-rose-100/60';

export const HINT_BOX =
  'rounded-2xl border border-teal-200/70 bg-teal-50/70 p-4 text-sm text-slate-600 shadow-sm shadow-teal-100/60';

// ── 详情页 Hero（浅色大气版） ─────────────────────────────

export const DETAIL_HERO_BASE =
  'relative overflow-hidden rounded-3xl px-6 py-6 text-white shadow-2xl shadow-slate-900/15';

export const DETAIL_HERO_GLOW =
  'pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full blur-3xl';

export const DETAIL_HERO_LINE =
  'pointer-events-none absolute bottom-0 left-1/3 h-px w-2/3 bg-gradient-to-r from-transparent via-white/40 to-transparent';

// ── 浮动操作栏 ────────────────────────────────────────────

export const STICKY_ACTION_BAR =
  'sticky bottom-4 z-20 flex items-center justify-end gap-3 rounded-2xl border border-white/70 bg-white/82 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.12)] backdrop-blur-xl';

// ── 三色主题映射 ──────────────────────────────────────────

export const TYPE_THEME = {
  priority: {
    name: '重点工作',
    accent: 'bg-rose-500',
    accentHex: '#f43f5e',
    text: 'text-rose-600',
    ring: 'ring-rose-100',
    chip: 'border-rose-200/80 bg-rose-50/80 text-rose-700',
    hero:
      'from-slate-950 via-rose-950 to-orange-900 [--hero-glow:rgba(244,63,94,0.34)]',
    button:
      'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/20 hover:from-rose-600 hover:to-orange-600',
    lightGradient: 'from-rose-50/40 via-white to-orange-50/20',
    cardBorder: 'border-l-rose-400',
    panelBg: 'bg-rose-50/30',
    dot: 'bg-rose-500',
  },
  main: {
    name: '主要工作',
    accent: 'bg-sky-500',
    accentHex: '#0ea5e9',
    text: 'text-sky-600',
    ring: 'ring-sky-100',
    chip: 'border-sky-200/80 bg-sky-50/80 text-sky-700',
    hero:
      'from-slate-950 via-sky-950 to-teal-900 [--hero-glow:rgba(14,165,233,0.32)]',
    button:
      'bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-lg shadow-sky-500/20 hover:from-sky-600 hover:to-teal-600',
    lightGradient: 'from-sky-50/40 via-white to-teal-50/20',
    cardBorder: 'border-l-sky-400',
    panelBg: 'bg-sky-50/30',
    dot: 'bg-sky-500',
  },
  todo: {
    name: '待办事项',
    accent: 'bg-teal-500',
    accentHex: '#14b8a6',
    text: 'text-teal-600',
    ring: 'ring-teal-100',
    chip: 'border-teal-200/80 bg-teal-50/80 text-teal-700',
    hero:
      'from-slate-950 via-teal-950 to-emerald-900 [--hero-glow:rgba(20,184,166,0.34)]',
    button:
      'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/20 hover:from-teal-600 hover:to-emerald-600',
    lightGradient: 'from-teal-50/40 via-white to-emerald-50/20',
    cardBorder: 'border-l-teal-400',
    panelBg: 'bg-teal-50/30',
    dot: 'bg-teal-500',
  },
} as const;

// 详情面板三级色 — 从 TYPE_THEME.accentHex 派生
// deep: 加深 40%（标题/内容区边线）
// mid:  提亮 40%（分区标题/责任区边线）
// light: 提亮 82%（背景点缀）
function deriveDetailColors(accentHex: string) {
  const r = parseInt(accentHex.slice(1, 3), 16);
  const g = parseInt(accentHex.slice(3, 5), 16);
  const b = parseInt(accentHex.slice(5, 7), 16);
  const toHex = (v: number) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
  const hex = (cr: number, cg: number, cb: number) => `#${toHex(cr)}${toHex(cg)}${toHex(cb)}`;
  return {
    // deep: accent * 0.6 + black * 0.4（加深）
    deep: hex(Math.round(r * 0.6), Math.round(g * 0.6), Math.round(b * 0.6)),
    // mid: accent * 0.85 + white * 0.15（微提亮）
    mid: hex(Math.round(r * 0.85 + 38), Math.round(g * 0.85 + 38), Math.round(b * 0.85 + 38)),
    // light: accent * 0.3 + white * 0.7（浅底色）
    light: hex(Math.round(r * 0.3 + 178), Math.round(g * 0.3 + 178), Math.round(b * 0.3 + 178)),
  };
}

// 旧自定义配色（已改用 deriveDetailColors 派生）:
// priority: deep '#4f4f4f' mid '#9a8c98' light '#f2e9e4'
// main:     deep '#6b705c' mid '#a5a58d' light '#ddbea9'
// todo:     deep '#52796f' mid '#84a98c' light '#cad2c5'

export const DETAIL_THEME = {
  priority: deriveDetailColors(TYPE_THEME.priority.accentHex),
  main: deriveDetailColors(TYPE_THEME.main.accentHex),
  todo: deriveDetailColors(TYPE_THEME.todo.accentHex),
} as const;

export type DetailThemeKey = keyof typeof DETAIL_THEME;

export type WorkTypeThemeKey = keyof typeof TYPE_THEME;
