'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FIELD_LABEL, MUTED_TEXT, SELECT_CONTROL } from './visual-tokens';
import { MemberSelect } from '@/features/members/client/member-select';
import { Plus, Trash2 } from 'lucide-react';
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
    // Clear memberId and name snapshot when department switches.
    list[idx] = {
      departmentId: newId,
      departmentName: dept?.name || '',
      leaderMemberId: undefined,
      leader: '',
      personMemberId: undefined,
      person: '',
    };
    onChange(list);
  };

  const handleDelete = (idx: number) => {
    onChange(cooperators.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className={FIELD_LABEL}>配合方</label>
        <Button type="button" variant="ghost" size="icon-sm" className="rounded-full text-slate-400 hover:text-slate-600" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {cooperators.length === 0 && (
        <p className={MUTED_TEXT}>暂无配合方</p>
      )}
      {cooperators.map((c, idx) => (
        <div key={idx} className="rounded-lg bg-slate-50 p-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <Select
              value={c.departmentId ? String(c.departmentId) : ''}
              onValueChange={(v) => handleDepartmentChange(idx, Number(v))}
            >
              <SelectTrigger className={`flex-1 min-w-0 ${SELECT_CONTROL}`}>
                <SelectValue placeholder="选择配合部门" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-full text-slate-400 hover:text-rose-500 shrink-0"
              onClick={() => handleDelete(idx)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex gap-1.5">
            <div className="flex-1">
              <MemberSelect
                departmentId={c.departmentId || undefined}
                value={c.leaderMemberId}
                onChange={(id, name) => {
                  const list = [...cooperators];
                  list[idx] = { ...list[idx], leaderMemberId: id, leader: name };
                  onChange(list);
                }}
                filterLeaders
                placeholder="选择配合领导"
              />
            </div>
            <div className="flex-1">
              <MemberSelect
                departmentId={c.departmentId || undefined}
                value={c.personMemberId}
                onChange={(id, name) => {
                  const list = [...cooperators];
                  list[idx] = { ...list[idx], personMemberId: id, person: name };
                  onChange(list);
                }}
                excludeLeaders
                placeholder="选择配合责任人"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
