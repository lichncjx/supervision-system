'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface WorkFormShellProps {
  backHref: string;
  title: string;
  accentBar: string;
  icon: React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
}

export function WorkFormShell({
  backHref,
  title,
  accentBar,
  icon,
  sidebar,
  children,
  onSubmit,
}: WorkFormShellProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={backHref}>
          <Button variant="outline" size="sm" className="rounded-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回列表
          </Button>
        </Link>
        <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-800">
          <span className={`w-1 h-6 rounded-full ${accentBar}`} />
          {icon}
          {title}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={onSubmit} className="space-y-6">
            {children}
          </form>
        </div>

        <div className="space-y-6">
          {sidebar}
        </div>
      </div>
    </div>
  );
}
