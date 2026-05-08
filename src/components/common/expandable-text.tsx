'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

export function ExpandableText({
  text,
  empty = '-',
  lines = 3,
}: {
  text?: string;
  empty?: string;
  lines?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!text) {
    return <span className="text-slate-400">{empty}</span>;
  }

  const lineHeight = 1.6;
  const maxHeight = lines * lineHeight * 16;

  return (
    <div className="relative">
      <div
        className={`overflow-hidden transition-all duration-200 ${
          expanded ? 'max-h-none' : ''
        }`}
        style={expanded ? {} : { maxHeight: `${maxHeight}px` }}
      >
        <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
          {text}
        </p>
      </div>
      {text.length > 100 && (
        <div className="mt-2 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-7 px-2 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
          >
            {expanded ? '收起' : '展开全文'}
          </Button>
        </div>
      )}
    </div>
  );
}