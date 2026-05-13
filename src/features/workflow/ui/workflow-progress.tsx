'use client';

import React from 'react';
import { CheckCircle2, Circle, RotateCcw } from 'lucide-react';
import { getWorkflowSteps, type Work } from '@/lib/work-store';

export function WorkflowProgress({ work }: { work: Work }) {
  const steps = getWorkflowSteps(work);

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-slate-500 tracking-wide">审批流程</div>

      <div className="flex flex-wrap gap-3">
        {steps.map((step, index) => {
          const isDone = step.status === 'done';
          const isCurrent = step.status === 'current';
          const isReturned = step.status === 'returned';

          return (
            <div
              key={`${step.label}-${index}`}
              className={[
                'flex items-center gap-2 rounded-full border px-3 py-1 text-sm',
                isDone ? 'bg-green-50 border-green-200 text-green-700' : '',
                isCurrent ? 'bg-blue-50 border-blue-200 text-blue-700' : '',
                isReturned ? 'bg-red-50 border-red-200 text-red-700' : '',
                step.status === 'pending' ? 'bg-slate-50 border-slate-200 text-slate-400' : '',
              ].join(' ')}
            >
              {isDone ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : isReturned ? (
                <RotateCcw className="h-4 w-4" />
              ) : (
                <Circle className="h-4 w-4" />
              )}

              <span>{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}