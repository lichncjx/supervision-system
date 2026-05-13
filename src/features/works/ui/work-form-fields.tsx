'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// WorkItemField
export interface WorkItemFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error?: string;
  onBlur?: () => void;
  fieldId?: string;
}

export function WorkItemField({
  label,
  value,
  onChange,
  placeholder,
  error,
  onBlur,
  fieldId,
}: WorkItemFieldProps) {
  return (
    <div id={fieldId}>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
      />
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  );
}

// IsInnovationField
export interface IsInnovationFieldProps {
  isInnovation: boolean;
  onChange: (isInnovation: boolean) => void;
}

export function IsInnovationField({ isInnovation, onChange }: IsInnovationFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">是否为创新工作</label>
      <select
        value={isInnovation ? '是' : '否'}
        onChange={(e) => onChange(e.target.value === '是')}
        className="w-full border rounded-md p-2"
      >
        <option value="否">否</option>
        <option value="是">是</option>
      </select>
    </div>
  );
}

// ProposedLeaderField
export interface ProposedLeaderFieldProps {
  value: string;
  onChange: (value: string) => void;
  leaders: Array<{ id: number; name: string; role: string }>;
  disabled: boolean;
  error?: string;
  onBlur?: () => void;
  fieldId?: string;
}

export function ProposedLeaderField({
  value,
  onChange,
  leaders,
  disabled,
  error,
  onBlur,
  fieldId,
}: ProposedLeaderFieldProps) {
  return (
    <div id={fieldId}>
      <label className="block text-sm font-medium mb-1">
        事项提出领导
        <span className="text-xs text-gray-400 ml-1">（提出该待办事项的公司领导，默认也是审批领导）</span>
      </label>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="w-full border rounded-md p-2"
      >
        <option value="">请选择事项提出领导</option>
        {leaders.map((leader) => (
          <option key={leader.id} value={leader.id}>
            {leader.name}
          </option>
        ))}
      </select>
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  );
}

// DepartmentField
export interface DepartmentFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  departments: Array<{ id: number; name: string }>;
  placeholder?: string;
  error?: string;
  onBlur?: () => void;
  fieldId?: string;
}

export function DepartmentField({
  label,
  value,
  onChange,
  departments,
  placeholder,
  error,
  onBlur,
  fieldId,
}: DepartmentFieldProps) {
  return (
    <div id={fieldId}>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="w-full border rounded-md p-2"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  );
}

// ResponsibleFields
export interface ResponsibleFieldsProps {
  leaderValue: string;
  onLeaderChange: (value: string) => void;
  personValue: string;
  onPersonChange: (value: string) => void;
}

export function ResponsibleFields({
  leaderValue,
  onLeaderChange,
  personValue,
  onPersonChange,
}: ResponsibleFieldsProps) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium mb-1">
          责任领导
          <span className="text-xs text-gray-400 ml-1">（用于业务留痕）</span>
        </label>
        <Input
          value={leaderValue}
          onChange={(e) => onLeaderChange(e.target.value)}
          placeholder="请输入责任领导姓名"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          责任人
          <span className="text-xs text-gray-400 ml-1">（用于业务留痕）</span>
        </label>
        <Input
          value={personValue}
          onChange={(e) => onPersonChange(e.target.value)}
          placeholder="请输入责任人姓名"
        />
      </div>
    </>
  );
}

// PlanCompleteTimeField
export interface PlanCompleteTimeFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function PlanCompleteTimeField({ label, value, onChange }: PlanCompleteTimeFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// TodoSpecificFields — 待办事项特有字段（不包含 workItem / planCompleteTime / departmentId / cooperators）
export interface TodoSpecificFieldsProps {
  proposedScene: string;
  onProposedSceneChange: (value: string) => void;
  formedTime: string;
  onFormedTimeChange: (value: string) => void;
  workPlan: string;
  onWorkPlanChange: (value: string) => void;
  progress: string;
  onProgressChange: (value: string) => void;
}

export function TodoSpecificFields({
  proposedScene,
  onProposedSceneChange,
  formedTime,
  onFormedTimeChange,
  workPlan,
  onWorkPlanChange,
  progress,
  onProgressChange,
}: TodoSpecificFieldsProps) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium mb-1">事项提出场景</label>
        <Input
          value={proposedScene}
          onChange={(e) => onProposedSceneChange(e.target.value)}
          placeholder="请输入事项提出场景"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">形成时间</label>
        <Input
          type="date"
          value={formedTime}
          onChange={(e) => onFormedTimeChange(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">工作计划</label>
        <Textarea
          value={workPlan}
          onChange={(e) => onWorkPlanChange(e.target.value)}
          placeholder="请输入工作计划"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">进展情况</label>
        <Textarea
          value={progress}
          onChange={(e) => onProgressChange(e.target.value)}
          placeholder="请输入进展情况"
          rows={3}
        />
      </div>
    </>
  );
}
