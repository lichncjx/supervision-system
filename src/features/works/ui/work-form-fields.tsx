'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FIELD_LABEL, ERROR_TEXT } from './visual-tokens';

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
      <label className={FIELD_LABEL + ' mb-1'}>{label}</label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
      />
      {error && <p className={ERROR_TEXT}>{error}</p>}
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
      <label className={FIELD_LABEL + ' mb-1'}>是否为创新工作</label>
      <Select value={isInnovation ? '是' : '否'} onValueChange={(v) => onChange(v === '是')}>
        <SelectTrigger className="w-full rounded-lg">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="否">否</SelectItem>
          <SelectItem value="是">是</SelectItem>
        </SelectContent>
      </Select>
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
      <label className={FIELD_LABEL + ' mb-1'}>
        事项提出领导
        <span className="text-xs text-gray-400 ml-1">（提出该待办事项的公司领导，默认也是审批领导）</span>
      </label>
      <Select value={value} onValueChange={(v) => onChange(v)} disabled={disabled}>
        <SelectTrigger onBlur={onBlur} className="w-full rounded-lg">
          <SelectValue placeholder="请选择事项提出领导" />
        </SelectTrigger>
        <SelectContent>
          {leaders.map((leader) => (
            <SelectItem key={leader.id} value={String(leader.id)}>{leader.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className={ERROR_TEXT}>{error}</p>}
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
      <label className={FIELD_LABEL + ' mb-1'}>{label}</label>
      <Select value={value} onValueChange={(v) => onChange(v)}>
        <SelectTrigger onBlur={onBlur} className="w-full rounded-lg">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {departments.map((d) => (
            <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className={ERROR_TEXT}>{error}</p>}
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
        <label className={FIELD_LABEL + ' mb-1'}>
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
        <label className={FIELD_LABEL + ' mb-1'}>
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
      <label className={FIELD_LABEL + ' mb-1'}>{label}</label>
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
        <label className={FIELD_LABEL + ' mb-1'}>事项提出场景</label>
        <Input
          value={proposedScene}
          onChange={(e) => onProposedSceneChange(e.target.value)}
          placeholder="请输入事项提出场景"
        />
      </div>

      <div>
        <label className={FIELD_LABEL + ' mb-1'}>形成时间</label>
        <Input
          type="date"
          value={formedTime}
          onChange={(e) => onFormedTimeChange(e.target.value)}
        />
      </div>

      <div>
        <label className={FIELD_LABEL + ' mb-1'}>工作计划</label>
        <Textarea
          value={workPlan}
          onChange={(e) => onWorkPlanChange(e.target.value)}
          placeholder="请输入工作计划"
          rows={3}
        />
      </div>

      <div>
        <label className={FIELD_LABEL + ' mb-1'}>进展情况</label>
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
