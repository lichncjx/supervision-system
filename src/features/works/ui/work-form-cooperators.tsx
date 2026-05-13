'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Cooperator } from '@/features/works/domain/work-client.types';

export interface WorkFormCooperatorsProps {
  cooperators: Cooperator[];
  onChange: (cooperators: Cooperator[]) => void;
  departments: Array<{ id: number; name: string; code: string; isBusiness: boolean }>;
}

export function WorkFormCooperators({
  cooperators,
  onChange,
  departments,
}: WorkFormCooperatorsProps) {
  const handleAdd = () => {
    onChange([...cooperators, { departmentId: 0, departmentName: '', leader: '', person: '' }]);
  };

  const handleDepartmentChange = (idx: number, newId: number) => {
    if (cooperators.some((item, i) => i !== idx && item.departmentId === newId)) {
      alert('该配合部门已存在，请勿重复添加');
      return;
    }
    const dept = departments.find((d) => d.id === newId);
    const list = [...cooperators];
    list[idx] = { ...list[idx], departmentId: newId, departmentName: dept?.name || '' };
    onChange(list);
  };

  const handleFieldChange = (idx: number, field: 'leader' | 'person', value: string) => {
    const list = [...cooperators];
    list[idx] = { ...list[idx], [field]: value };
    onChange(list);
  };

  const handleDelete = (idx: number) => {
    onChange(cooperators.filter((_, i) => i !== idx));
  };

  return (
    <div className="border-t pt-4">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium">配合方</label>
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          添加配合方
        </Button>
      </div>
      {cooperators.length === 0 && (
        <p className="text-xs text-gray-400">暂无配合方</p>
      )}
      {cooperators.map((c, idx) => (
        <div key={idx} className="flex items-center gap-2 mb-2">
          <select
            value={c.departmentId || ''}
            onChange={(e) => handleDepartmentChange(idx, Number(e.target.value))}
            className="flex-1 border rounded-md p-2 text-sm"
          >
            <option value="">选择配合部门</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <Input
            value={c.leader || ''}
            onChange={(e) => handleFieldChange(idx, 'leader', e.target.value)}
            placeholder="配合责任领导（可选）"
          />
          <Input
            value={c.person || ''}
            onChange={(e) => handleFieldChange(idx, 'person', e.target.value)}
            placeholder="配合责任人（可选）"
          />
          <Button type="button" variant="destructive" size="sm" onClick={() => handleDelete(idx)}>
            删除
          </Button>
        </div>
      ))}
    </div>
  );
}
