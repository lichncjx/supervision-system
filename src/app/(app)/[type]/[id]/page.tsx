'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, RotateCcw, XCircle, Upload, Download } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { departments, getCompanyLeaders } from '@/lib/auth';
import {
  getWorkById,
  submitComplete,
  submitAdjust,
  submitCancel,
  submitTodoDecomposition,
  updateWork,
  approveWork,
  rejectWork,
  canApproveWork,
  canHandleWork,
  resubmitRejectedWork,
  resubmitReturnedWork,
  deleteWork,
  type ProofFile,
  type WorkEditablePatch,
} from '@/lib/work-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/common/badges';
import { WorkflowProgress } from '@/components/common/workflow-progress';
import { ExpandableText } from '@/components/common/expandable-text';

export default function WorkDetailPage() {
  const params = useParams<{ type: string; id: string }>();
  const type = params?.type || 'todo';
  const id = params?.id || '';
  const { user } = useAuth();
  const companyLeaders = getCompanyLeaders();
  const router = useRouter();
  const [proof, setProof] = useState('');
  const [proofFiles, setProofFiles] = useState<ProofFile[]>([]);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustNewTime, setAdjustNewTime] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [approvalLeaderId, setApprovalLeaderId] = useState(
    companyLeaders.length > 0 ? String(companyLeaders[0].id) : ''
  );
  const [refresh, setRefresh] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [adjustMode, setAdjustMode] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [editReason, setEditReason] = useState('');

  const work = getWorkById(Number(id));

  // 初始化编辑表单
  React.useEffect(() => {
    if (work) {
      setEditForm({
        title: work.title || '',
        work_item: work.work_item || work.title || '',
        description: work.description || '',
        business_category: work.business_category || '',
        is_innovation: !!work.is_innovation,
        complete_time: work.complete_time || '',
        complete_form: work.complete_form || '',
        department_id: work.department_id,
        responsible_leader: work.responsible_leader || '',
        supervisor: work.supervisor || '',
        proposed_leader: work.proposed_leader || '',
        proposed_leader_id: work.proposed_leader_id ? String(work.proposed_leader_id) : '',
        proposed_leader_role: work.proposed_leader_role || '',
        proposed_scene: work.proposed_scene || '',
        formed_time: work.formed_time || '',
        responsible_person: work.responsible_person || '',
        cooperate_department: work.cooperate_department || '',
        cooperate_person: work.cooperate_person || '',
        work_plan: work.work_plan || '',
        plan_complete_time: work.plan_complete_time || '',
        progress: work.progress || '',
        nodes: work.nodes || [],
      });
    }
  }, [work?.id, refresh]);

  if (!work) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">事项不存在</p>
        <Link href={`/${type}`}>
          <Button variant="link">返回列表</Button>
        </Link>
      </div>
    );
  }

  const isCurrentUserRelatedDepartment = () => {
    if (!user?.department_id) return false;

    if (work.department_id === user.department_id) return true;

    if (Array.isArray(work.department_ids)) {
      return work.department_ids.includes(user.department_id);
    }

    if (Array.isArray(work.cooperate_department_ids)) {
      return work.cooperate_department_ids.includes(user.department_id);
    }

    return false;
  };

  const canDecomposeTodo =
    user &&
    work.type === '待办' &&
    work.status === 'todo_pending_decompose' &&
    (
      user.role === 'admin' ||
      (
        (user.role === 'department_manager' || user.role === 'department_leader') &&
        isCurrentUserRelatedDepartment()
      )
    );

  const canOperate =
    user &&
    (
      user.role === 'admin' ||
      (
        (user.role === 'department_manager' || user.role === 'department_leader') &&
        isCurrentUserRelatedDepartment()
      )
    ) &&
    ['active', 'material_returned', 'adjust_returned', 'cancel_returned'].includes(work.status);

  const canHandleReturnedCreate =
    user &&
    work.status === 'returned_for_edit' &&
    (
      user.role === 'admin' ||
      user.id === work.creator_id ||
      (
        (user.role === 'department_manager' || user.role === 'department_leader') &&
        isCurrentUserRelatedDepartment()
      )
    );

  const canApprove = user ? canApproveWork(user, work) : false;

  const handleProofFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    const readFile = (file: File): Promise<ProofFile> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          resolve({
            id: Date.now() + Math.random(),
            name: file.name,
            type: file.type,
            size: file.size,
            dataUrl: String(reader.result || ''),
            uploaded_at: new Date().toISOString(),
            uploaded_by: user?.name,
          });
        };

        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };

    const result = await Promise.all(files.map(readFile));
    setProofFiles((prev) => [...prev, ...result]);
  };

  const removeProofFile = (id: number) => {
    setProofFiles((prev) => prev.filter((file) => file.id !== id));
  };

  // 节点操作函数
  const updateNodeTitle = (nodeId: number, title: string) => {
    setEditForm(prev => ({
      ...prev,
      nodes: prev.nodes.map((node: any) =>
        node.id === nodeId ? { ...node, title } : node
      ),
    }));
  };

  const addNode = () => {
    setEditForm(prev => ({
      ...prev,
      nodes: [
        ...prev.nodes,
        {
          id: Date.now(),
          title: '',
          complete_time: '',
          children: [],
        },
      ],
    }));
  };

  const updateNodeCompleteTime = (nodeId: number, completeTime: string) => {
    setEditForm((prev: any) => ({
      ...prev,
      nodes: prev.nodes.map((node: any) =>
        node.id === nodeId ? { ...node, complete_time: completeTime } : node
      ),
    }));
  };

  const deleteNode = (nodeId: number) => {
    setEditForm(prev => ({
      ...prev,
      nodes: prev.nodes.filter((node: any) => node.id !== nodeId),
    }));
  };

  const addSubNode = (nodeId: number) => {
    setEditForm(prev => ({
      ...prev,
      nodes: prev.nodes.map((node: any) =>
        node.id === nodeId
          ? {
              ...node,
              children: [
                ...node.children,
                {
                  id: Date.now(),
                  title: '',
                  complete_time: '',
                },
              ],
            }
          : node
      ),
    }));
  };

  const updateSubNodeTitle = (nodeId: number, subNodeId: number, title: string) => {
    setEditForm(prev => ({
      ...prev,
      nodes: prev.nodes.map((node: any) =>
        node.id === nodeId
          ? {
              ...node,
              children: node.children.map((child: any) =>
                child.id === subNodeId ? { ...child, title } : child
              ),
            }
          : node
      ),
    }));
  };

  const updateSubNodeCompleteTime = (nodeId: number, subNodeId: number, completeTime: string) => {
    setEditForm(prev => ({
      ...prev,
      nodes: prev.nodes.map((node: any) =>
        node.id === nodeId
          ? {
              ...node,
              children: node.children.map((child: any) =>
                child.id === subNodeId ? { ...child, complete_time: completeTime } : child
              ),
            }
          : node
      ),
    }));
  };

  const deleteSubNode = (nodeId: number, subNodeId: number) => {
    setEditForm(prev => ({
      ...prev,
      nodes: prev.nodes.map((node: any) =>
        node.id === nodeId
          ? {
              ...node,
              children: node.children.filter((child: any) => child.id !== subNodeId),
            }
          : node
      ),
    }));
  };

  const handleComplete = () => {
    if (!user) return;
    if (!proof.trim() && proofFiles.length === 0) {
      alert('请填写见证材料说明或上传附件');
      return;
    }

    submitComplete(work, user, proof, proofFiles);
    setRefresh(refresh + 1);
    alert('已提交完成材料');
  };

  const handleAdjust = () => {
    if (!user) return;

    if (!adjustReason.trim()) {
      alert('请填写调整原因');
      return;
    }

    const pendingAdjustment: WorkEditablePatch = {
      ...editForm,
      title: editForm.work_item || editForm.title || work.title,
    };

    const selectedApprovalLeader = companyLeaders.find(
      (leader) => leader.id === Number(approvalLeaderId)
    );

    if (!selectedApprovalLeader) {
      alert('请选择公司审批领导');
      return;
    }

    submitAdjust(work, user, adjustReason, pendingAdjustment, selectedApprovalLeader);
    setRefresh((v) => v + 1);
    alert('已提交调整申请，等待审批');
  };

  const handleResubmit = () => {
    if (!user) return;

    if (!editReason.trim()) {
      alert('请填写修改说明或重新提交原因');
      return;
    }

    const selectedProposedLeader =
      work.type === '待办'
        ? companyLeaders.find((leader) => leader.id === Number(editForm.proposed_leader_id))
        : null;

    if (work.type === '待办' && !selectedProposedLeader) {
      alert('请选择事项提出领导');
      return;
    }

    const patch: WorkEditablePatch = {
      ...editForm,
      title: editForm.work_item || editForm.title || work.title,
    };

    if (work.type === '待办' && selectedProposedLeader) {
      patch.proposed_leader = selectedProposedLeader.name;
      patch.proposed_leader_id = selectedProposedLeader.id;
      patch.proposed_leader_role = selectedProposedLeader.role;
    }

    resubmitRejectedWork(work, user, patch);
    setEditMode(false);
    setRefresh((v) => v + 1);
    alert('已修改并重新提交审批');
  };

  const handleAdjustSubmit = () => {
    if (!user) return;

    if (!adjustReason.trim()) {
      alert('请填写调整原因');
      return;
    }

    const pendingAdjustment: WorkEditablePatch = {
      ...editForm,
      title: editForm.work_item || editForm.title || work.title,
    };

    const selectedApprovalLeader = companyLeaders.find(
      (leader) => leader.id === Number(approvalLeaderId)
    );

    if (!selectedApprovalLeader) {
      alert('请选择公司审批领导');
      return;
    }

    submitAdjust(work, user, adjustReason, pendingAdjustment, selectedApprovalLeader);

    setAdjustMode(false);
    setRefresh((v) => v + 1);
    alert('已提交调整申请，等待审批');
  };

  const handleCancel = () => {
    if (!user) return;

    if (!cancelReason.trim()) {
      alert('请填写取消原因');
      return;
    }

    const selectedApprovalLeader = companyLeaders.find(
      (leader) => leader.id === Number(approvalLeaderId)
    );

    if (!selectedApprovalLeader) {
      alert('请选择公司审批领导');
      return;
    }

    submitCancel(work, user, cancelReason, selectedApprovalLeader);
    setRefresh((v) => v + 1);
    alert('已提交取消申请');
  };

  const handleApprove = () => {
    if (!user) return;
    approveWork(user, work);
    setRefresh((v) => v + 1);
    alert('审批已通过');
  };

  const handleReject = () => {
    const reason = prompt('请输入退回原因：');
    if (reason === null) return;
    if (!user) return;

    try {
      rejectWork(work, user, reason || '审批退回');
      setRefresh((v) => v + 1);
      alert('已退回');
    } catch (error) {
      console.error(error);
      alert('退回失败，请查看控制台错误');
    }
  };

  const getDepartmentName = (id: number) => {
    return departments.find((d) => d.id === id)?.name || '-';
  };

  const isPriorityOrMain = work.type === '重点' || work.type === '主要';
  const isTodo = work.type === '待办';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${type}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回列表
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">事项详情</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{work.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPriorityOrMain && (
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">业务类别：</span>
                  <span>{work.business_category || '-'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">工作事项：</span>
                  <span>{work.work_item || '-'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">工作节点：</span>
                  <span>{work.work_node || '-'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">完成时间：</span>
                  <span>{work.complete_time || '-'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">完成形式：</span>
                  <span>{work.complete_form || '-'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">责任部门：</span>
                  <span>{getDepartmentName(work.department_id)}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">责任领导：</span>
                  <span>{work.responsible_leader || '-'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">主管人员：</span>
                  <span>{work.supervisor || '-'}</span>
                </div>
                {work.type === '重点' && (
                  <div>
                    <span className="text-sm text-gray-500">是否为创新工作：</span>
                    <span>{work.is_innovation ? '是' : '否'}</span>
                  </div>
                )}
                <div>
                  <span className="text-sm text-gray-500">当前状态：</span>
                  <StatusBadge status={work.status} />
                </div>
              </div>

              {work.reject_reason && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 break-words whitespace-pre-wrap">
                  <div>退回人：{work.rejected_by || '-'}</div>
                  <div>退回原因：{work.reject_reason}</div>
                  {work.rejected_at && (
                    <div>退回时间：{new Date(work.rejected_at).toLocaleString()}</div>
                  )}
                </div>
              )}
              
              <div>
                <p className="font-medium mb-2">工作节点：</p>
                {work.nodes && work.nodes.length > 0 ? (
                  <div className="space-y-3">
                    {work.nodes.map((node: any, index: number) => (
                      <div key={node.id} className="border rounded p-3 bg-gray-50">
                        <div className="font-medium break-words">
                          {index + 1}. {node.title}
                          {node.complete_time ? `（节点完成时间：${node.complete_time}）` : ''}
                        </div>
                        {node.children && node.children.length > 0 && (
                          <div className="pl-5 mt-2 space-y-1 text-sm text-gray-600">
                            {node.children.map((child: any, childIndex: number) => (
                              <div key={child.id} className="break-words">
                                {index + 1}.{childIndex + 1} {child.title}
                                {child.complete_time ? `（完成日期：${child.complete_time}）` : ''}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">暂无工作节点</p>
                )}
              </div>
              
              {work.proof && (
                <div>
                  <span className="text-sm text-gray-500">见证材料：</span>
                  <p className="mt-1 p-2 bg-gray-50 rounded break-words whitespace-pre-wrap overflow-hidden">{work.proof}</p>
                </div>
              )}
              {work.proof_files && work.proof_files.length > 0 && (
                <div>
                  <span className="text-sm text-gray-500">见证材料附件：</span>
                  <div className="mt-2 space-y-2">
                    {work.proof_files.map((file) => (
                      <div key={file.id} className="flex items-center justify-between rounded border p-2 text-sm">
                        <div className="min-w-0">
                          <div className="font-medium break-words">{file.name}</div>
                          <div className="text-xs text-gray-500">
                            上传人：{file.uploaded_by || '-'}　
                            上传时间：{file.uploaded_at ? new Date(file.uploaded_at).toLocaleString() : '-'}
                          </div>
                        </div>
                        <a href={file.dataUrl} download={file.name}>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            下载
                          </Button>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {work.adjust_reason && (
                <div>
                  <p className="break-words whitespace-pre-wrap overflow-hidden">
                    调整原因：{work.adjust_reason}
                  </p>
                </div>
              )}
              {work.adjust_new_time && (
                <p>
                  调整后时间：{work.adjust_new_time}
                </p>
              )}
              {work.adjust_history && work.adjust_history.length > 0 && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded text-sm text-purple-800 space-y-2">
                  <div className="font-medium">调整记录</div>
                  {work.adjust_history.map((item) => (
                    <div key={item.id} className="border-t border-purple-100 pt-2 first:border-t-0 first:pt-0">
                      <div>调整原因：{item.reason || '-'}</div>
                      <div>原计划完成时间：{item.from_time || '-'}</div>
                      <div>现计划完成时间：{item.to_time || '-'}</div>
                      <div>审批人：{item.approved_by || '-'}</div>
                      <div>审批时间：{item.approved_at ? new Date(item.approved_at).toLocaleString() : '-'}</div>
                    </div>
                  ))}
                </div>
              )}
              {work.cancel_reason && (
                <div>
                  <span className="text-sm text-gray-500">取消原因：</span>
                  <p className="mt-1 p-2 bg-gray-50 rounded break-words whitespace-pre-wrap overflow-hidden">{work.cancel_reason}</p>
                </div>
              )}
            </div>
          )}

          {isTodo && (
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">事项提出领导：</span>
                  <span>{work.proposed_leader || '-'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">事项提出场景：</span>
                  <span>{work.proposed_scene || '-'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">待办事项：</span>
                  <span>{work.work_item || '-'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">形成时间：</span>
                  <span>{work.formed_time || '-'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">责任部门：</span>
                  <span>
                    {work.department_ids && work.department_ids.length > 0
                      ? work.department_ids.map((id: number) => getDepartmentName(id)).join('、')
                      : getDepartmentName(work.department_id)}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">责任部门责任人：</span>
                  <span>
                    {work.responsible_persons && work.responsible_persons.length > 0
                      ? work.responsible_persons.join('、')
                      : work.responsible_person || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">配合部门：</span>
                  <span>
                    {work.cooperate_departments && work.cooperate_departments.length > 0
                      ? work.cooperate_departments.join('、')
                      : work.cooperate_department || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">配合部门责任人：</span>
                  <span>
                    {work.cooperate_persons && work.cooperate_persons.length > 0
                      ? work.cooperate_persons.join('、')
                      : work.cooperate_person || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">工作计划：</span>
                  <span>{work.work_plan || '-'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">计划完成时间：</span>
                  <span>{work.plan_complete_time || '-'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">进展情况：</span>
                  <ExpandableText text={work.progress} />
                </div>
                <div>
                  <span className="text-sm text-gray-500">当前状态：</span>
                  <StatusBadge status={work.status} />
                </div>
              </div>

              {work.nodes && work.nodes.length > 0 && (
                <div>
                  <p className="font-medium mb-2">任务分解节点：</p>
                  <div className="space-y-3">
                    {work.nodes.map((node: any, index: number) => (
                      <div key={node.id} className="border rounded p-3 bg-gray-50">
                        <div className="font-medium break-words">
                          {index + 1}. {node.title}
                          {node.complete_time ? `（节点完成时间：${node.complete_time}）` : ''}
                        </div>
                        {node.children && node.children.length > 0 && (
                          <div className="pl-5 mt-2 space-y-1 text-sm text-gray-600">
                            {node.children.map((child: any, childIndex: number) => (
                              <div key={child.id} className="break-words">
                                {index + 1}.{childIndex + 1} {child.title}
                                {child.complete_time ? `（完成日期：${child.complete_time}）` : ''}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {work.reject_reason && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 break-words whitespace-pre-wrap">
                  <div>退回人：{work.rejected_by || '-'}</div>
                  <div>退回原因：{work.reject_reason}</div>
                  {work.rejected_at && (
                    <div>退回时间：{new Date(work.rejected_at).toLocaleString()}</div>
                  )}
                </div>
              )}

              {work.proof && (
                <div>
                  <span className="text-sm text-gray-500">见证材料：</span>
                  <p className="mt-1 p-2 bg-gray-50 rounded break-words whitespace-pre-wrap overflow-hidden">{work.proof}</p>
                </div>
              )}
              {work.proof_files && work.proof_files.length > 0 && (
                <div>
                  <span className="text-sm text-gray-500">见证材料附件：</span>
                  <div className="mt-2 space-y-2">
                    {work.proof_files.map((file) => (
                      <div key={file.id} className="flex items-center justify-between rounded border p-2 text-sm">
                        <div className="min-w-0">
                          <div className="font-medium break-words">{file.name}</div>
                          <div className="text-xs text-gray-500">
                            上传人：{file.uploaded_by || '-'}　
                            上传时间：{file.uploaded_at ? new Date(file.uploaded_at).toLocaleString() : '-'}
                          </div>
                        </div>
                        <a href={file.dataUrl} download={file.name}>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            下载
                          </Button>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {work.adjust_reason && (
                <div>
                  <p className="break-words whitespace-pre-wrap overflow-hidden">
                    调整原因：{work.adjust_reason}
                  </p>
                </div>
              )}
              {work.adjust_new_time && (
                <p>
                  调整后时间：{work.adjust_new_time}
                </p>
              )}
              {work.cancel_reason && (
                <div>
                  <span className="text-sm text-gray-500">取消原因：</span>
                  <p className="mt-1 p-2 bg-gray-50 rounded break-words whitespace-pre-wrap overflow-hidden">{work.cancel_reason}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <WorkflowProgress work={work} />
        </CardContent>
      </Card>

      {/* 待审批调整内容 */}
      {work.pending_adjustment && (
        <Card>
          <CardHeader>
            <CardTitle>待审批调整内容</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="text-purple-600 break-words whitespace-pre-wrap">
              调整原因：{work.pending_adjustment_reason || '-'}
            </div>
            <div>
              原计划完成时间：{work.pending_adjustment_from_time || '-'}
            </div>
            <div>
              现计划完成时间：{work.pending_adjustment_to_time || '-'}
            </div>
            <div>
              公司审批领导：{work.approval_leader || '-'}
            </div>
            <div className="break-words whitespace-pre-wrap">
              调整后事项：{work.pending_adjustment.work_item || work.pending_adjustment.title || '-'}
            </div>
            <div>
              调整后完成时间：{work.pending_adjustment.complete_time || work.pending_adjustment.plan_complete_time || '-'}
            </div>
            <div>
              调整后完成形式：{work.pending_adjustment.complete_form || '-'}
            </div>
            {work.pending_adjustment.nodes && work.pending_adjustment.nodes.length > 0 && (
              <div>
                <p className="font-medium mt-2">调整后节点：</p>
                <div className="space-y-2">
                  {work.pending_adjustment.nodes.map((node: any, index: number) => (
                    <div key={node.id} className="border rounded p-2 bg-gray-50">
                      <div className="font-medium break-words">
                        {index + 1}. {node.title}
                      </div>
                      {node.children && node.children.length > 0 && (
                        <div className="pl-4 mt-1 space-y-1 text-sm text-gray-600">
                          {node.children.map((child: any, childIndex: number) => (
                            <div key={child.id} className="break-words">
                              {index + 1}.{childIndex + 1} {child.title}
                              {child.complete_time ? `（完成日期：${child.complete_time}）` : ''}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {canApprove && (
        <Card>
          <CardHeader>
            <CardTitle>审批操作</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button onClick={handleApprove}>
              审批通过
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              退回
            </Button>
          </CardContent>
        </Card>
      )}

    {canHandleReturnedCreate && (
  <Card>
    <CardHeader>
      <CardTitle>退回事项处理</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {work.reject_reason && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded break-words whitespace-pre-wrap">
          退回原因：{work.reject_reason}
        </div>
      )}

      {!editMode ? (
        <div className="flex gap-3">
          <Button onClick={() => setEditMode(true)}>
            修改后重新提交
          </Button>

          <Button
            variant="destructive"
            onClick={() => {
              if (!confirm('确认删除该退回事项？')) return;
              deleteWork(work.id);
              router.push(`/${type}`);
            }}
          >
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
                  value={editForm.work_item || ''}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, work_item: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium">业务类别</label>
                <Input
                  value={editForm.business_category || ''}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, business_category: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium">完成时间</label>
                <Input
                  type="date"
                  value={editForm.complete_time || ''}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, complete_time: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium">完成形式</label>
                <Input
                  value={editForm.complete_form || ''}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, complete_form: e.target.value }))}
                />
              </div>
            </div>
          )}

          {isTodo && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">事项提出领导</label>
                <select
                  value={editForm.proposed_leader_id || ''}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, proposed_leader_id: e.target.value }))}
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
                  value={editForm.work_item || ''}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, work_item: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium">事项提出场景</label>
                <Input
                  value={editForm.proposed_scene || ''}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, proposed_scene: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium">形成时间</label>
                <Input
                  type="date"
                  value={editForm.formed_time || ''}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, formed_time: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium">责任部门</label>
                <select
                  value={editForm.department_id || ''}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, department_id: Number(e.target.value) }))}
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
                  value={editForm.responsible_person || ''}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, responsible_person: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium">配合部门</label>
                <Input
                  value={editForm.cooperate_department || ''}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, cooperate_department: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium">配合部门责任人</label>
                <Input
                  value={editForm.cooperate_person || ''}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, cooperate_person: e.target.value }))}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium">工作计划</label>
                <Textarea
                  value={editForm.work_plan || ''}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, work_plan: e.target.value }))}
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium">计划完成时间</label>
                <Input
                  type="date"
                  value={editForm.plan_complete_time || ''}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, plan_complete_time: e.target.value }))}
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
            <Button onClick={handleResubmit}>
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
)}

      {canDecomposeTodo && (
        <Card>
          <CardHeader>
            <CardTitle>待办事项分解</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              该事项由公司领导提出，请责任部门进行任务分解，补充工作计划、节点、子节点和计划完成时间后提交审批。
            </div>

            <div>
              <label className="text-sm font-medium">工作计划</label>
              <Textarea
                value={editForm.work_plan || ''}
                onChange={(e) => setEditForm((prev: any) => ({ ...prev, work_plan: e.target.value }))}
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium">计划完成时间</label>
              <Input
                type="date"
                value={editForm.plan_complete_time || ''}
                onChange={(e) => setEditForm((prev: any) => ({ ...prev, plan_complete_time: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">任务节点</label>
              <div className="space-y-3">
                {(editForm.nodes || []).map((node: any, index: number) => (
                  <div key={node.id} className="border rounded p-3 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Input
                        value={node.title}
                        onChange={(e) => updateNodeTitle(node.id, e.target.value)}
                        placeholder={`节点${index + 1}`}
                        className="flex-1"
                      />
                      <Input
                        type="date"
                        value={node.complete_time || ''}
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
                            value={child.complete_time || ''}
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

            <Button
              onClick={() => {
                if (!user) return;
                if (!editForm.work_plan?.trim()) {
                  alert('请填写工作计划');
                  return;
                }
                if (!editForm.plan_complete_time) {
                  alert('请填写计划完成时间');
                  return;
                }

                const validNodes = (editForm.nodes || []).filter((node: any) => node.title?.trim());

                if (validNodes.length === 0) {
                  alert('请至少填写一个任务节点');
                  return;
                }

                if (validNodes.some((node: any) => !node.complete_time)) {
                  alert('请填写每个任务节点的完成时间');
                  return;
                }

                submitTodoDecomposition(work, user, {
                  ...editForm,
                  title: editForm.work_item || work.title,
                });

                setRefresh((v) => v + 1);
                alert('已提交待办事项分解，等待审批');
              }}
            >
              提交分解结果
            </Button>
          </CardContent>
        </Card>
      )}

      {canOperate && (
        <Card>
          <CardHeader>
            <CardTitle>事项操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">完成见证材料说明</label>
              <Textarea value={proof} onChange={(e) => setProof(e.target.value)} rows={3} />
              
              <div className="mt-3 space-y-2">
                <label className="text-sm font-medium">上传见证材料附件</label>
                <Input
                  type="file"
                  multiple
                  onChange={handleProofFileChange}
                />

                {proofFiles.length > 0 && (
                  <div className="space-y-2">
                    {proofFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between rounded border p-2 text-sm">
                        <span className="break-words">{file.name}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeProofFile(file.id)}
                        >
                          删除
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <Button className="mt-2" onClick={handleComplete}>
                <CheckCircle className="h-4 w-4 mr-2" />
                提交完成材料
              </Button>
            </div>

            {work.status === 'rejected' ? (
              <Card>
                <CardHeader>
                  <CardTitle>退回修改</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {work.reject_reason && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded break-words whitespace-pre-wrap">
                      退回原因：{work.reject_reason}
                    </div>
                  )}

                  {!editMode ? (
                    <Button onClick={() => setEditMode(true)}>
                      编辑并重新提交
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      {/* 重点工作/主要工作编辑表单 */}
                      {isPriorityOrMain && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium">工作事项</label>
                              <Input
                                value={editForm.work_item || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, work_item: e.target.value }))}
                                placeholder="请输入工作事项"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">业务类别</label>
                              <Input
                                value={editForm.business_category || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, business_category: e.target.value }))}
                                placeholder="请输入业务类别"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">完成时间</label>
                              <Input
                                type="date"
                                value={editForm.complete_time || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, complete_time: e.target.value }))}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">完成形式</label>
                              <Input
                                value={editForm.complete_form || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, complete_form: e.target.value }))}
                                placeholder="请输入完成形式"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">责任部门</label>
                              <select
                                value={editForm.department_id || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, department_id: Number(e.target.value) }))}
                                className="w-full border rounded-md p-2"
                              >
                                {departments.map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {d.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-sm font-medium">责任领导</label>
                              <Input
                                value={editForm.responsible_leader || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, responsible_leader: e.target.value }))}
                                placeholder="请输入责任领导"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">主管人员</label>
                              <Input
                                value={editForm.supervisor || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, supervisor: e.target.value }))}
                                placeholder="请输入主管人员"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={editForm.is_innovation || false}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, is_innovation: e.target.checked }))}
                                  className="h-4 w-4"
                                />
                                <span>是否为创新工作</span>
                              </label>
                            </div>
                          </div>

                          {/* 工作节点编辑 */}
                          <div>
                            <label className="text-sm font-medium block mb-2">工作节点</label>
                            <div className="space-y-3">
                              {editForm.nodes.map((node: any, index: number) => (
                                <div key={node.id} className="border rounded p-3 bg-gray-50">
                                  <div className="flex items-center gap-2">
                                    <Input
                                      value={node.title}
                                      onChange={(e) => updateNodeTitle(node.id, e.target.value)}
                                      placeholder="节点名称"
                                      className="flex-1"
                                    />
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => addSubNode(node.id)}
                                    >
                                      添加子节点
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => deleteNode(node.id)}
                                    >
                                      删除
                                    </Button>
                                  </div>
                                  {node.children && node.children.length > 0 && (
                                    <div className="pl-5 mt-2 space-y-2">
                                      {node.children.map((child: any, childIndex: number) => (
                                        <div key={child.id} className="flex items-center gap-2">
                                          <Input
                                            value={child.title}
                                            onChange={(e) => updateSubNodeTitle(node.id, child.id, e.target.value)}
                                            placeholder="子节点名称"
                                            className="flex-1"
                                          />
                                          <Input
                                            type="date"
                                            value={child.complete_time || ''}
                                            onChange={(e) => updateSubNodeCompleteTime(node.id, child.id, e.target.value)}
                                            className="w-40"
                                          />
                                          <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => deleteSubNode(node.id, child.id)}
                                          >
                                            删除
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                              <Button variant="outline" onClick={addNode}>
                                添加工作节点
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 待办事项编辑表单 */}
                      {isTodo && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium">待办事项</label>
                              <Input
                                value={editForm.work_item || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, work_item: e.target.value }))}
                                placeholder="请输入待办事项"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">事项提出领导</label>
                              <select
                                value={editForm.proposed_leader_id || ''}
                                onChange={(e) => {
                                  const selected = companyLeaders.find((leader) => leader.id === Number(e.target.value));
                                  setEditForm(prev => ({
                                    ...prev,
                                    proposed_leader_id: e.target.value,
                                    proposed_leader: selected?.name || '',
                                    proposed_leader_role: selected?.role || '',
                                  }));
                                }}
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
                              <label className="text-sm font-medium">事项提出场景</label>
                              <Input
                                value={editForm.proposed_scene || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, proposed_scene: e.target.value }))}
                                placeholder="请输入事项提出场景"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">形成时间</label>
                              <Input
                                type="date"
                                value={editForm.formed_time || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, formed_time: e.target.value }))}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">责任部门</label>
                              <select
                                value={editForm.department_id || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, department_id: Number(e.target.value) }))}
                                className="w-full border rounded-md p-2"
                              >
                                {departments.map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {d.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-sm font-medium">责任部门责任人</label>
                              <Input
                                value={editForm.responsible_person || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, responsible_person: e.target.value }))}
                                placeholder="请输入责任部门责任人"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">配合部门</label>
                              <Input
                                value={editForm.cooperate_department || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, cooperate_department: e.target.value }))}
                                placeholder="请输入配合部门"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">配合部门责任人</label>
                              <Input
                                value={editForm.cooperate_person || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, cooperate_person: e.target.value }))}
                                placeholder="请输入配合部门责任人"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">工作计划</label>
                              <Input
                                value={editForm.work_plan || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, work_plan: e.target.value }))}
                                placeholder="请输入工作计划"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">计划完成时间</label>
                              <Input
                                type="date"
                                value={editForm.plan_complete_time || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, plan_complete_time: e.target.value }))}
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-sm font-medium">进展情况</label>
                              <Textarea
                                value={editForm.progress || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, progress: e.target.value }))}
                                rows={3}
                                placeholder="请输入进展情况"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="text-sm font-medium">重新提交原因</label>
                        <Textarea
                          value={editReason}
                          onChange={(e) => setEditReason(e.target.value)}
                          rows={3}
                          placeholder="请填写重新提交原因"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={handleResubmit}>
                          重新提交
                        </Button>
                        <Button variant="outline" onClick={() => setEditMode(false)}>
                          取消
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>申请调整</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!adjustMode ? (
                      <Button onClick={() => setAdjustMode(true)}>
                        申请调整
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        {/* 重点工作/主要工作调整表单 */}
                        {isPriorityOrMain && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">工作事项</label>
                                <Input
                                  value={editForm.work_item || ''}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, work_item: e.target.value }))}
                                  placeholder="请输入工作事项"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">业务类别</label>
                                <Input
                                  value={editForm.business_category || ''}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, business_category: e.target.value }))}
                                  placeholder="请输入业务类别"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">完成时间</label>
                                <Input
                                  type="date"
                                  value={editForm.complete_time || ''}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, complete_time: e.target.value }))}
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">完成形式</label>
                                <Input
                                  value={editForm.complete_form || ''}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, complete_form: e.target.value }))}
                                  placeholder="请输入完成形式"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">责任部门</label>
                                <select
                                  value={editForm.department_id || ''}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, department_id: Number(e.target.value) }))}
                                  className="w-full border rounded-md p-2"
                                >
                                  {departments.map((d) => (
                                    <option key={d.id} value={d.id}>
                                      {d.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-sm font-medium">责任领导</label>
                                <Input
                                  value={editForm.responsible_leader || ''}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, responsible_leader: e.target.value }))}
                                  placeholder="请输入责任领导"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">主管人员</label>
                                <Input
                                  value={editForm.supervisor || ''}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, supervisor: e.target.value }))}
                                  placeholder="请输入主管人员"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={editForm.is_innovation || false}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, is_innovation: e.target.checked }))}
                                    className="h-4 w-4"
                                  />
                                  <span>是否为创新工作</span>
                                </label>
                              </div>
                            </div>

                            {/* 工作节点编辑 */}
                            <div>
                              <label className="text-sm font-medium block mb-2">工作节点</label>
                              <div className="space-y-3">
                                {editForm.nodes.map((node: any, index: number) => (
                                  <div key={node.id} className="border rounded p-3 bg-gray-50">
                                    <div className="flex items-center gap-2">
                                      <Input
                                        value={node.title}
                                        onChange={(e) => updateNodeTitle(node.id, e.target.value)}
                                        placeholder="节点名称"
                                        className="flex-1"
                                      />
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => addSubNode(node.id)}
                                      >
                                        添加子节点
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => deleteNode(node.id)}
                                      >
                                        删除
                                      </Button>
                                    </div>
                                    {node.children && node.children.length > 0 && (
                                      <div className="pl-5 mt-2 space-y-2">
                                        {node.children.map((child: any, childIndex: number) => (
                                          <div key={child.id} className="flex items-center gap-2">
                                            <Input
                                              value={child.title}
                                              onChange={(e) => updateSubNodeTitle(node.id, child.id, e.target.value)}
                                              placeholder="子节点名称"
                                              className="flex-1"
                                            />
                                            <Input
                                              type="date"
                                              value={child.complete_time || ''}
                                              onChange={(e) => updateSubNodeCompleteTime(node.id, child.id, e.target.value)}
                                              className="w-40"
                                            />
                                            <Button
                                              variant="destructive"
                                              size="sm"
                                              onClick={() => deleteSubNode(node.id, child.id)}
                                            >
                                              删除
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                                <Button variant="outline" onClick={addNode}>
                                  添加工作节点
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 待办事项调整表单 */}
                        {isTodo && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">待办事项</label>
                                <Input
                                  value={editForm.work_item || ''}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, work_item: e.target.value }))}
                                  placeholder="请输入待办事项"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">事项提出领导</label>
                                <select
                                  value={editForm.proposed_leader_id || ''}
                                  onChange={(e) => {
                                    const selected = companyLeaders.find((leader) => leader.id === Number(e.target.value));
                                    setEditForm(prev => ({
                                      ...prev,
                                      proposed_leader_id: e.target.value,
                                      proposed_leader: selected?.name || '',
                                      proposed_leader_role: selected?.role || '',
                                    }));
                                  }}
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
                                <label className="text-sm font-medium">事项提出场景</label>
                                <Input
                                  value={editForm.proposed_scene || ''}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, proposed_scene: e.target.value }))}
                                  placeholder="请输入事项提出场景"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">形成时间</label>
                                <Input
                                  type="date"
                                  value={editForm.formed_time || ''}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, formed_time: e.target.value }))}
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">责任部门</label>
                                <select
                                  value={editForm.department_id || ''}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, department_id: Number(e.target.value) }))}
                                  className="w-full border rounded-md p-2"
                                >
                                  {departments.map((d) => (
                                    <option key={d.id} value={d.id}>
                                      {d.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-sm font-medium">责任部门责任人</label>
                                <Input
                                  value={editForm.responsible_person || ''}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, responsible_person: e.target.value }))}
                                  placeholder="请输入责任部门责任人"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">配合部门</label>
                                <Input
                                  value={editForm.cooperate_department || ''}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, cooperate_department: e.target.value }))}
                                  placeholder="请输入配合部门"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">配合部门责任人</label>
                                <Input
                                  value={editForm.cooperate_person || ''}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, cooperate_person: e.target.value }))}
                                  placeholder="请输入配合部门责任人"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">工作计划</label>
                                <Input
                                  value={editForm.work_plan || ''}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, work_plan: e.target.value }))}
                                  placeholder="请输入工作计划"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">计划完成时间</label>
                                <Input
                                  type="date"
                                  value={editForm.plan_complete_time || ''}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, plan_complete_time: e.target.value }))}
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="text-sm font-medium">进展情况</label>
                                <Textarea
                                  value={editForm.progress || ''}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, progress: e.target.value }))}
                                  rows={3}
                                  placeholder="请输入进展情况"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="text-sm font-medium">公司审批领导</label>
                          <select
                            value={approvalLeaderId}
                            onChange={(e) => setApprovalLeaderId(e.target.value)}
                            className="w-full border rounded-md p-2"
                          >
                            <option value="">请选择公司审批领导</option>
                            {companyLeaders.map((leader) => (
                              <option key={leader.id} value={leader.id}>
                                {leader.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-sm font-medium">调整原因</label>
                          <Textarea
                            value={adjustReason}
                            onChange={(e) => setAdjustReason(e.target.value)}
                            rows={3}
                            placeholder="请填写调整原因"
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button onClick={handleAdjustSubmit}>
                            提交调整申请
                          </Button>
                          <Button variant="outline" onClick={() => setAdjustMode(false)}>
                            取消
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div>
                  <label className="text-sm font-medium">公司审批领导</label>
                  <select
                    value={approvalLeaderId}
                    onChange={(e) => setApprovalLeaderId(e.target.value)}
                    className="w-full border rounded-md p-2"
                  >
                    <option value="">请选择公司审批领导</option>
                    {companyLeaders.map((leader) => (
                      <option key={leader.id} value={leader.id}>
                        {leader.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">取消原因</label>
                  <Textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={3}
                    placeholder="请填写取消原因"
                  />

                  <Button variant="destructive" className="mt-2" onClick={handleCancel}>
                    申请取消
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
