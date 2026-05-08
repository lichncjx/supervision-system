export const statusColors = {
  approving: {
    pill: 'bg-purple-50 text-purple-700 border-purple-100',
    dot: 'bg-purple-500',
    left: 'border-l-2 border-l-purple-400 bg-purple-50/30',
    text: 'text-purple-600',
  },
  handling: {
    pill: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    dot: 'bg-indigo-500',
    left: 'border-l-2 border-l-indigo-400 bg-indigo-50/20',
    text: 'text-indigo-600',
  },
  inProgress: {
    pill: 'bg-sky-50 text-sky-700 border-sky-100',
    dot: 'bg-sky-500',
    left: 'border-l-2 border-l-sky-400 bg-sky-50/20',
    text: 'text-sky-600',
  },
  completed: {
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    dot: 'bg-emerald-500',
    left: 'border-l-2 border-l-emerald-400 bg-emerald-50/20',
    text: 'text-emerald-600',
  },
  expiring: {
    pill: 'bg-orange-50 text-orange-700 border-orange-100',
    dot: 'bg-orange-500',
    left: 'border-l-2 border-l-orange-400 bg-orange-50/20',
    text: 'text-orange-600',
  },
  overdue: {
    pill: 'bg-rose-50 text-rose-700 border-rose-100',
    dot: 'bg-rose-500',
    left: 'border-l-2 border-l-rose-400 bg-rose-50/30',
    text: 'text-rose-600',
  },
  rejected: {
    pill: 'bg-red-50 text-red-700 border-red-100',
    dot: 'bg-red-500',
    left: 'border-l-2 border-l-red-400 bg-red-50/20',
    text: 'text-red-600',
  },
  cancelled: {
    pill: 'bg-slate-50 text-slate-500 border-slate-200',
    dot: 'bg-slate-400',
    left: 'border-l-2 border-l-slate-400 bg-slate-50/30',
    text: 'text-slate-500',
  },
} as const;

export const workTypeColors = {
  priority: {
    text: 'text-rose-600',
    gradient: 'from-red-50 to-rose-50/30',
    progress: 'bg-rose-500',
    button: 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100',
    icon: '★',
  },
  main: {
    text: 'text-sky-600',
    gradient: 'from-blue-50 to-sky-50/30',
    progress: 'bg-sky-500',
    button: 'bg-sky-50 text-sky-600 border-sky-200 hover:bg-sky-100',
    icon: '●',
  },
  todo: {
    text: 'text-emerald-600',
    gradient: 'from-emerald-50 to-teal-50/30',
    progress: 'bg-emerald-500',
    button: 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100',
    icon: '✓',
  },
} as const;

export type StatusColorKey = keyof typeof statusColors;
export type WorkTypeColorKey = keyof typeof workTypeColors;
