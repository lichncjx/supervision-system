'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FIELD_LABEL, ERROR_TEXT } from './visual-tokens';
import { Plus, Trash2 } from 'lucide-react';
import type { WorkNode } from '@/features/works/domain/work-client.types';

export interface WorkFormNodesProps {
  nodes: WorkNode[];
  onChange: (nodes: WorkNode[]) => void;
  nodeLabel?: string;
  nodePlaceholderPrefix?: string;
  error?: string;
  onTouched?: () => void;
  fieldId?: string;
}

export function WorkFormNodes({
  nodes,
  onChange,
  nodeLabel = '工作节点',
  nodePlaceholderPrefix = '工作节点',
  error,
  onTouched,
  fieldId,
}: WorkFormNodesProps) {
  const addNode = () => {
    onChange([
      ...nodes,
      {
        id: Date.now(),
        title: '',
        completeTime: '',
        children: [],
      },
    ]);
  };

  const updateNodeTitle = (nodeId: number, title: string) => {
    onChange(nodes.map((node) =>
      node.id === nodeId ? { ...node, title } : node
    ));
  };

  const updateNodeCompleteTime = (nodeId: number, completeTime: string) => {
    onChange(nodes.map((node) =>
      node.id === nodeId ? { ...node, completeTime } : node
    ));
  };

  const deleteNode = (nodeId: number) => {
    onChange(nodes.filter((node) => node.id !== nodeId));
  };

  const addSubNode = (nodeId: number) => {
    onChange(nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            children: [
              ...node.children,
              {
                id: Date.now(),
                title: '',
                completeTime: '',
              },
            ],
          }
        : node
    ));
  };

  const updateSubNodeTitle = (nodeId: number, subNodeId: number, title: string) => {
    onChange(nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            children: node.children.map((child) =>
              child.id === subNodeId ? { ...child, title } : child
            ),
          }
        : node
    ));
  };

  const updateSubNodeCompleteTime = (nodeId: number, subNodeId: number, completeTime: string) => {
    onChange(nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            children: node.children.map((child) =>
              child.id === subNodeId ? { ...child, completeTime } : child
            ),
          }
        : node
    ));
  };

  const deleteSubNode = (nodeId: number, subNodeId: number) => {
    onChange(nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            children: node.children.filter((child) => child.id !== subNodeId),
          }
        : node
    ));
  };

  return (
    <div className="space-y-2.5" id={fieldId}>
      <div className="flex items-center justify-between">
        <label className={FIELD_LABEL}>{nodeLabel}</label>
        <Button type="button" variant="ghost" size="icon-sm" className="rounded-full text-slate-400 hover:text-slate-600" onClick={() => { addNode(); onTouched?.(); }}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {nodes.map((node, nodeIndex) => (
          <div key={node.id || `node-${nodeIndex}`} className="rounded-lg bg-slate-50 p-3 space-y-2">
            <div className="space-y-2">
              <Input
                value={node.title}
                onChange={(e) => { updateNodeTitle(node.id, e.target.value); onTouched?.(); }}
                placeholder={`${nodePlaceholderPrefix}${nodeIndex + 1}`}
              />
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={node.completeTime || ''}
                  onChange={(e) => { updateNodeCompleteTime(node.id, e.target.value); onTouched?.(); }}
                  placeholder="完成时间"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full text-slate-400 hover:text-rose-500"
                  onClick={() => { deleteNode(node.id); onTouched?.(); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="pl-4 space-y-1.5 border-l-2 border-slate-200">
              {node.children.map((child, childIndex) => (
                <div key={child.id || `sub-${nodeIndex}-${childIndex}`} className="flex gap-1.5 items-center">
                  <Input
                    value={child.title}
                    onChange={(e) => {
                      updateSubNodeTitle(node.id, child.id, e.target.value);
                      onTouched?.();
                    }}
                    placeholder={`子节点${childIndex + 1}`}
                    className="flex-1"
                  />
                  <Input
                    type="date"
                    value={child.completeTime || ''}
                    onChange={(e) => {
                      updateSubNodeCompleteTime(node.id, child.id, e.target.value);
                      onTouched?.();
                    }}
                    className="w-[130px] shrink-0"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-full text-slate-400 hover:text-rose-500 shrink-0"
                    onClick={() => { deleteSubNode(node.id, child.id); onTouched?.(); }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full text-xs text-slate-400 hover:text-slate-600"
                onClick={() => { addSubNode(node.id); onTouched?.(); }}
              >
                <Plus className="h-3 w-3 mr-1" />
                子节点
              </Button>
            </div>
          </div>
        ))}
      </div>

      {error && <p className={ERROR_TEXT}>{error}</p>}
    </div>
  );
}
