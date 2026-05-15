'use client';

import React from 'react';
import { CheckCircle2, Circle, RotateCcw, ArrowRight } from 'lucide-react';
import { getWorkflowSteps } from '@/features/workflow/client/workflow-display.utils';
import type { Work } from '@/features/works/client/work-view.types';

export function WorkflowProgress({ work }: { work: Work }) {
  const steps = getWorkflowSteps(work);

  return (
    <div className="space-y-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">审批流程</div>

      <div className="flex flex-wrap items-center gap-2">
        {steps.map((step, index) => {
          const isDone = step.status === 'done';
          const isCurrent = step.status === 'current';
          const isReturned = step.status === 'returned';

          return (
            <React.Fragment key={`${step.label}-${index}`}>
              {index > 0 && (
                <ArrowRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
              )}
              <div
                className={[
                  'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all',
                  isDone ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : '',
                  isCurrent ? 'border-sky-200 bg-sky-50 text-sky-700 shadow-sm shadow-sky-100' : '',
                  isReturned ? 'border-rose-200 bg-rose-50 text-rose-700' : '',
                  step.status === 'pending' ? 'border-slate-200 bg-slate-50/80 text-slate-400' : '',
                ].join(' ')}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isReturned ? (
                  <RotateCcw className="h-4 w-4" />
                ) : isCurrent ? (
                  <span className="relative flex h-4 w-4 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-30" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" />
                  </span>
                ) : (
                  <Circle className="h-4 w-4" />
                )}

                <span>{step.label}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
