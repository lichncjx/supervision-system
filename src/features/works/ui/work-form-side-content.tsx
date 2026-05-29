'use client';

import React from 'react';
import { WorkFormNodes } from '@/features/works/ui/work-form-nodes';
import { WorkFormCooperators } from '@/features/works/ui/work-form-cooperators';
import type { Cooperator, WorkNode } from '@/features/works/client/work-client.types';
import type { Department } from '@/features/departments/client/department-api';

interface WorkFormSideContentProps {
  isTodo: boolean;
  showNodes?: boolean;
  nodes: WorkNode[];
  onNodesChange: (nodes: WorkNode[]) => void;
  nodesError?: string;
  onNodesTouched?: () => void;
  nodesFieldId?: string;
  showNodeHint?: boolean;
  cooperators?: Cooperator[];
  onCooperatorsChange?: (cooperators: Cooperator[]) => void;
  cooperatorDepartments?: Department[];
  footer?: React.ReactNode;
}

export function WorkFormSideContent({
  isTodo,
  showNodes = true,
  nodes,
  onNodesChange,
  nodesError,
  onNodesTouched,
  nodesFieldId,
  showNodeHint = false,
  cooperators = [],
  onCooperatorsChange,
  cooperatorDepartments = [],
  footer,
}: WorkFormSideContentProps) {
  return (
    <>
      {showNodes && (
        <>
          <WorkFormNodes
            nodes={nodes}
            onChange={onNodesChange}
            nodeLabel={isTodo ? '任务节点（可选）' : '工作节点（可选）'}
            nodePlaceholderPrefix={isTodo ? '任务节点' : '工作节点'}
            error={nodesError}
            onTouched={onNodesTouched}
            fieldId={nodesFieldId}
          />
          {showNodeHint && (
            <p className="text-xs text-gray-400">
              如需拆解阶段任务，可添加节点；未添加节点不影响提交。
            </p>
          )}
        </>
      )}
      {isTodo && onCooperatorsChange && (
        <WorkFormCooperators
          cooperators={cooperators}
          onChange={onCooperatorsChange}
          departments={cooperatorDepartments}
        />
      )}
      {footer}
    </>
  );
}
