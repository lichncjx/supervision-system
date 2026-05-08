'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface WorkDecomposePanelProps {
  visible: boolean;
  editForm: any;
  setEditForm: (form: any) => void;
  updateNodeTitle: (nodeId: number, title: string) => void;
  updateNodeCompleteTime: (nodeId: number, completeTime: string) => void;
  deleteNode: (nodeId: number) => void;
  addNode: () => void;
  addSubNode: (nodeId: number) => void;
  updateSubNodeTitle: (nodeId: number, subNodeId: number, title: string) => void;
  updateSubNodeCompleteTime: (nodeId: number, subNodeId: number, completeTime: string) => void;
  deleteSubNode: (nodeId: number, subNodeId: number) => void;
  onSubmitDecomposition: () => void;
}

export function WorkDecomposePanel({
  visible,
  editForm,
  setEditForm,
  updateNodeTitle,
  updateNodeCompleteTime,
  deleteNode,
  addNode,
  addSubNode,
  updateSubNodeTitle,
  updateSubNodeCompleteTime,
  deleteSubNode,
  onSubmitDecomposition,
}: WorkDecomposePanelProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 p-5">
      <h3 className="font-semibold text-slate-800 mb-4">待办事项分解</h3>
      <div className="space-y-4">
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          该事项由公司领导提出，请责任部门进行任务分解，补充工作计划、节点、子节点和计划完成时间后提交审批。
        </div>

        <div>
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

        <div>
          <label className="text-sm font-medium block mb-2">任务节点</label>
          <div className="space-y-3">
            {(editForm.nodes || []).map((node: any, index: number) => (
              <div key={node.id} className="border rounded p-3 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Input
                    value={node.title}
                    onChange={(e) => updateNodeTitle(node.id, e.target.value)}
                    placeholder={`节点${index + 1}`}
                    className="flex-1"
                  />
                  <Input
                    type="date"
                    value={node.completeTime || ''}
                    onChange={(e) => updateNodeCompleteTime(node.id, e.target.value)}
                    className="w-40"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => addSubNode(node.id)}>
                    添加子节点
                  </Button>
                  <Button type="button" variant="destructive" size="sm" onClick={() => deleteNode(node.id)}>
                    删除
                  </Button>
                </div>

                <div className="pl-5 mt-2 space-y-2">
                  {(node.children || []).map((child: any, childIndex: number) => (
                    <div key={child.id} className="flex items-center gap-2">
                      <Input
                        value={child.title}
                        onChange={(e) => updateSubNodeTitle(node.id, child.id, e.target.value)}
                        placeholder={`子节点${childIndex + 1}`}
                        className="flex-1"
                      />
                      <Input
                        type="date"
                        value={child.completeTime || ''}
                        onChange={(e) => updateSubNodeCompleteTime(node.id, child.id, e.target.value)}
                        className="w-40"
                      />
                      <Button type="button" variant="destructive" size="sm" onClick={() => deleteSubNode(node.id, child.id)}>
                        删除
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addNode}>
              添加节点
            </Button>
          </div>
        </div>

        <Button onClick={onSubmitDecomposition}>
          提交分解结果
        </Button>
      </div>
    </div>
  );
}