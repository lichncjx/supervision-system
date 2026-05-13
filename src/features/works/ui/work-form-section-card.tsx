'use client';

import React from 'react';
import { PANEL_PADDED, SECTION_TITLE } from './visual-tokens';

export interface WorkFormSectionCardProps {
  title: string;
  children: React.ReactNode;
}

export function WorkFormSectionCard({ title, children }: WorkFormSectionCardProps) {
  return (
    <div className={`${PANEL_PADDED} space-y-4`}>
      <h3 className={SECTION_TITLE}>{title}</h3>
      {children}
    </div>
  );
}
