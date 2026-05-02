'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface WorkReturnedPanelProps {
  visible: boolean;
  rejectReason: string;
  editMode: boolean;
  setEditMode: (value: boolean) => void;
  editForm: any;
  setEditForm: (form: any) => void;
  editReason: string;
  setEditReason: (reason: string) => void;
  isPriorityOrMain: boolean;
  isTodo: boolean;
  departments: Array<{ id: number; name: string; code: string; isBusiness: boolean }>;
  companyLeaders: Array<{ id: number; name: string; role: string }>;
  onResubmit: () => void;
  onDelete: () => void;
}

export function WorkReturnedPanel({
  visible,
  rejectReason,
  editMode,
  setEditMode,
  editForm,
  setEditForm,
  editReason,
  setEditReason,
  isPriorityOrMain,
  isTodo,
  departments,
  companyLeaders,
  onResubmit,
  onDelete,
}: WorkReturnedPanelProps) {
  if (!visible) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>退回事项处理</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rejectReason && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded break-words whitespace-pre-wrap">
            退回原因：{rejectReason}
          </div>
        )}

        {!editMode ? (
          <div className="flex gap-3">
            <Button onClick={() => setEditMode(true)}>
              修改后重新提交
            </Button>
            <Button variant="destructive" onClick={onDelete}>
              删除退回事项
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {isPriorityOrMain && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">工作事项</label>
                  <Input
                    value={editForm.workItem || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, workItem: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">业务类别</label>
                  <Input
                    value={editForm.businessCategory || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, businessCategory: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">完成时间</label>
                  <Input
                    type="date"
                    value={editForm.completeTime || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, completeTime: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">完成形式</label>
                  <Input
                    value={editForm.completeForm || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, completeForm: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {isTodo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">事项提出领导</label>
                  <select
                    value={editForm.proposedLeaderId || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, proposedLeaderId: e.target.value }))}
                    className="w-full border rounded-md p-2"
                  >
                    <option value="">请选择事项提出领导</option>
                    {companyLeaders.map((leader) => (
                      <option key={leader.id} value={leader.id}>
                        {leader.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">待办事项</label>
                  <Input
                    value={editForm.workItem || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, workItem: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">事项提出场景</label>
                  <Input
                    value={editForm.proposedScene || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, proposedScene: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">形成时间</label>
                  <Input
                    type="date"
                    value={editForm.formedTime || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, formedTime: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">责任部门</label>
                  <select
                    value={editForm.departmentId || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, departmentId: Number(e.target.value) }))}
                    className="w-full border rounded-md p-2"
                  >
                    {departments.filter((d) => d.id !== 1).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">责任部门责任人</label>
                  <Input
                    value={editForm.responsiblePerson || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, responsiblePerson: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">配合部门</label>
                  <Input
                    value={editForm.cooperateDepartment || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, cooperateDepartment: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">配合部门责任人</label>
                  <Input
                    value={editForm.cooperatePerson || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, cooperatePerson: e.target.value }))}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium">工作计划</label>
                  <Textarea
                    value={editForm.workPlan || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, workPlan: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">计划完成时间</label>
                  <Input
                    type="date"
                    value={editForm.planCompleteTime || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, planCompleteTime: e.target.value }))}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium">进展情况</label>
                  <Textarea
                    value={editForm.progress || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, progress: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">修改说明 / 重新提交原因</label>
              <Textarea
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                rows={3}
                placeholder="请说明修改内容或重新提交原因"
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={onResubmit}>
                保存修改并重新提交
              </Button>
              <Button variant="outline" onClick={() => setEditMode(false)}>
                取消
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}