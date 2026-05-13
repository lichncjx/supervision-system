'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WorkNode } from '@/features/works/domain/work-client.types';

export interface WorkFormNodesProps {
  nodes: WorkNode[];
  onChange: (nodes: WorkNode[]) => void;
  nodeLabel?: string;
  addButtonLabel?: string;
  nodePlaceholderPrefix?: string;
  error?: string;
  onTouched?: () => void;
  fieldId?: string;
}

export function WorkFormNodes({
  nodes,
  onChange,
  nodeLabel = '工作节点',
  addButtonLabel = '新增工作节点',
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
    <div className="space-y-3" id={fieldId}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{nodeLabel}</label>
        <Button type="button" variant="outline" size="sm" onClick={() => { addNode(); onTouched?.(); }}>
          {addButtonLabel}
        </Button>
      </div>

      <div className="space-y-4">
        {nodes.map((node, nodeIndex) => (
          <div key={node.id} className="border rounded-lg p-4 space-y-3 bg-gray-50">
            <div className="flex gap-2 items-center">
              <Input
                value={node.title}
                onChange={(e) => { updateNodeTitle(node.id, e.target.value); onTouched?.(); }}
                placeholder={`${nodePlaceholderPrefix}${nodeIndex + 1}`}
                className="flex-1"
              />
              <span className="text-sm text-gray-500">节点完成时间</span>
              <Input
                type="date"
                value={node.completeTime || ''}
                onChange={(e) => { updateNodeCompleteTime(node.id, e.target.value); onTouched?.(); }}
                className="w-40"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => { deleteNode(node.id); onTouched?.(); }}
              >
                删除节点
              </Button>
            </div>

            <div className="pl-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">子节点</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { addSubNode(node.id); onTouched?.(); }}
                >
                  新增子节点
                </Button>
              </div>

              {node.children.length === 0 && (
                <div className="text-sm text-gray-400">暂无子节点</div>
              )}

              {node.children.map((child, childIndex) => (
                <div key={child.id} className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-2 items-center">
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
                    placeholder="完成日期"
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { deleteSubNode(node.id, child.id); onTouched?.(); }}
                  >
                    删除
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  );
}
