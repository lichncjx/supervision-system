'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  TYPE_THEME,
  type WorkTypeThemeKey,
} from './visual-tokens';

export interface WorkFormShellProps {
  backHref: string;
  title: string;
  accentBar: string;
  icon: React.ReactNode;
  themeKey?: WorkTypeThemeKey;
  sidebar: React.ReactNode;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
}

export function WorkFormShell({
  backHref,
  title,
  accentBar,
  icon,
  themeKey,
  sidebar,
  children,
  onSubmit,
}: WorkFormShellProps) {
  const theme = TYPE_THEME[themeKey || 'todo'];

  return (
    <div className="space-y-6">
      {/* Light Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white via-white to-white px-5 py-4">
        {/* Type-colored gradient wash */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br opacity-[0.07]" style={{ backgroundImage: `linear-gradient(135deg, ${theme.accentHex}33, transparent 60%)` }} />
        {/* Top accent strip */}
        <div className={`absolute inset-x-0 top-0 h-[3px] rounded-t-2xl ${theme.accent}`} />

        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-4">
            <Link href={backHref}>
              <Button variant="outline" size="sm" className="rounded-full">
                <ArrowLeft className="h-4 w-4" />
                返回列表
              </Button>
            </Link>

            <h1 className="flex items-center gap-3 text-2xl font-bold leading-tight text-slate-900">
                <span className={`h-8 w-1 rounded-full ${accentBar}`} />
                <span className={`grid h-10 w-10 place-items-center rounded-xl ${theme.panelBg} ${theme.text}`}>
                  {icon}
                </span>
                {title}
              </h1>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center md:min-w-64">
            {['信息', '责任', '节点'].map((item, index) => (
              <div key={item} className="rounded-xl border border-slate-200/60 bg-white/80 px-3 py-2">
                <div className="text-[11px] text-slate-400">步骤 {index + 1}</div>
                <div className="mt-0.5 text-sm font-semibold text-slate-700">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <form onSubmit={onSubmit} className="space-y-5">
            {children}
          </form>
        </div>

        <aside className="lg:col-span-2 space-y-4 lg:sticky lg:top-24 lg:self-start">
          {sidebar}
        </aside>
      </div>
    </div>
  );
}
