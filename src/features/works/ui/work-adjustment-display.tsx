import type { ReactNode } from 'react';
export { getChangedAdjustmentFields } from '@/features/works/domain/work-adjustment-diff';

export const ADJUSTMENT_FIELD_LABELS: Record<string, string> = {
  title: '标题',
  workItem: '事项内容',
  businessCategory: '业务类别',
  completeForm: '完成形式',
  isInnovation: '是否创新工作',
  departmentId: '责任部门',
  responsibleLeader: '责任领导',
  responsiblePerson: '责任人',
  responsibleLeaderMemberId: '责任领导人员',
  responsiblePersonMemberId: '责任人人员',
  cooperators: '配合方',
  workPlan: '工作计划',
  planCompleteTime: '计划完成时间',
  progress: '进展情况',
  nodes: '工作节点',
  proposedScene: '事项提出场景',
  formedTime: '形成时间',
};

export function normalizeAdjustmentValue(value: unknown) {
  if (value === undefined) return null;
  return value;
}

function renderCooperators(
  value: unknown,
  departments?: Array<{ id: number; name: string }>,
) {
  if (!Array.isArray(value) || value.length === 0) return '-';

  return (
    <div className="space-y-1">
      {value.map((item: any, index) => {
        const departmentName =
          departments?.find((d) => d.id === Number(item?.departmentId))?.name ||
          item?.departmentName ||
          '-';
        const people = [item?.leader, item?.person].filter(Boolean).join(' · ') || '-';

        return (
          <div key={`${departmentName}-${index}`} className="break-words">
            <span className="font-medium text-slate-800">{departmentName}</span>
            <span className="text-slate-400"> · </span>
            <span>{people}</span>
          </div>
        );
      })}
    </div>
  );
}

function renderNodes(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return '-';

  return (
    <div className="space-y-2">
      {value.map((node: any, index) => (
        <div key={node?.id ?? index}>
          <div className="font-medium text-slate-800 break-words">
            {index + 1}. {node?.title || '-'}
            {node?.completeTime ? (
              <span className="font-normal text-slate-500">（{node.completeTime}）</span>
            ) : null}
          </div>
          {Array.isArray(node?.children) && node.children.length > 0 && (
            <div className="mt-1 space-y-1 pl-4 text-xs text-slate-500">
              {node.children.map((child: any, childIndex: number) => (
                <div key={child?.id ?? `${index}-${childIndex}`} className="break-words">
                  {index + 1}.{childIndex + 1} {child?.title || '-'}
                  {child?.completeTime ? `（${child.completeTime}）` : ''}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function adjustmentValueToDisplay(
  field: string,
  value: unknown,
  departments?: Array<{ id: number; name: string }>,
): ReactNode {
  const normalized = normalizeAdjustmentValue(value);
  if (field === 'departmentId') {
    const department = departments?.find((d) => d.id === Number(normalized));
    return department?.name || (normalized == null ? '-' : String(normalized));
  }
  if (field === 'cooperators') return renderCooperators(normalized, departments);
  if (field === 'nodes') return renderNodes(normalized);
  if (typeof normalized === 'boolean') return normalized ? '是' : '否';
  if (normalized == null || normalized === '') return '-';
  if (Array.isArray(normalized)) {
    if (normalized.length === 0) return '-';
    return (
      <pre className="whitespace-pre-wrap break-words rounded bg-slate-50 p-2 text-xs">
        {JSON.stringify(normalized, null, 2)}
      </pre>
    );
  }
  if (typeof normalized === 'object') {
    return (
      <pre className="whitespace-pre-wrap break-words rounded bg-slate-50 p-2 text-xs">
        {JSON.stringify(normalized, null, 2)}
      </pre>
    );
  }
  return String(normalized);
}
