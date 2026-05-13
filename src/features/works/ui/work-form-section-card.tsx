'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export interface WorkFormSectionCardProps {
  title: string;
  children: React.ReactNode;
}

export function WorkFormSectionCard({ title, children }: WorkFormSectionCardProps) {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <h3 className="text-base font-semibold text-slate-700">{title}</h3>
        {children}
      </CardContent>
    </Card>
  );
}
