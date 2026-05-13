'use client';

import React from 'react';
import { PANEL_PADDED, SECTION_HEADER, SECTION_TITLE } from './visual-tokens';

export interface WorkFormSectionCardProps {
  title: string;
  children: React.ReactNode;
}

export function WorkFormSectionCard({ title, children }: WorkFormSectionCardProps) {
  return (
    <div className={`${PANEL_PADDED} group overflow-hidden transition-all duration-200 hover:border-teal-200/80 hover:shadow-[0_22px_65px_rgba(15,23,42,0.10)]`}>
      <div className={SECTION_HEADER}>
        <div className="flex items-center gap-3">
          <span className="h-5 w-[3px] rounded-full bg-teal-400" />
          <h3 className={SECTION_TITLE}>{title}</h3>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {children}
      </div>
    </div>
  );
}
