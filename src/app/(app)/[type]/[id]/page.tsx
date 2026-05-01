'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, RotateCcw, XCircle, Upload, Download } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { departments, companyLeadersStatic } from '@/lib/auth';
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
  getWorkflowRecords,
  type ProofFile,
  type WorkEditablePatch,
  type Work,
  type WorkflowRecord,
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
  const router = useRouter();
  const [companyLeaders, setCompanyLeaders] = useState<Array<{ id: number; name: string; role: string }>>([]);
  const [proof, setProof] = useState('');
  const [proofFiles, setProofFiles] = useState<ProofFile[]>([]);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustNewTime, setAdjustNewTime] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [approvalLeaderId, setApprovalLeaderId] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [adjustMode, setAdjustMode] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [editReason, setEditReason] = useState('');

  const [work, setWork] = useState<Work | undefined>();
  const [workflowRecords, setWorkflowRecords] = useState<WorkflowRecord[]>([]);

  useEffect(() => {
    const fetchCompanyLeaders = () => {
      const leaders = companyLeadersStatic;
      setCompanyLeaders(leaders);
      if (leaders.length > 0 && !approvalLeaderId) {
        setApprovalLeaderId(String(leaders[0].id));
      }
    };
    fetchCompanyLeaders();
  }, []);

  useEffect(() => {
    const fetchWork = async () => {
      const data = await getWorkById(Number(id));
      setWork(data);
    };
    fetchWork();
  }, [id, refresh]);

  useEffect(() => {
    const fetchWorkflowRecords = async () => {
      if (work) {
        const records = await getWorkflowRecords(work.id);
        setWorkflowRecords(records);
      }
    };
    fetchWorkflowRecords();
  }, [work, refresh]);

  // 初始化编辑表单
  React.useEffect(() => {
    if (work) {
      setEditForm({
        title: work.title || '',
        workItem: work.workItem || work.title || '',
        description: work.description || '',
        businessCategory: work.businessCategory || '',
        isInnovation: !!work.isInnovation,
        completeTime: work.completeTime || '',
        completeForm: work.completeForm || '',
        departmentId: work.departmentId,
        responsibleLeader: work.responsibleLeader || '',
        supervisor: work.supervisor || '',
        proposedLeader: work.proposedLeader || '',
        proposedLeaderId: work.proposedLeaderId ? String(work.proposedLeaderId) : '',
        proposedLeaderRole: work.proposedLeaderRole || '',
        proposedScene: work.proposedScene || '',
        formedTime: work.formedTime || '',
        responsiblePerson: work.responsiblePerson || '',
        cooperateDepartment: work.cooperateDepartment || '',
        cooperatePerson: work.cooperatePerson || '',
        workPlan: work.workPlan || '',
        planCompleteTime: work.planCompleteTime || '',
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
    if (!user?.departmentId) return false;

    if (work.departmentId === user.departmentId) return true;

    if (Array.isArray(work.departmentIds)) {
      return work.departmentIds.includes(user.departmentId);
    }

    if (Array.isArray(work.cooperateDepartmentIds)) {
      return work.cooperateDepartmentIds.includes(user.departmentId);
    }

    return false;
  };

  const canDecomposeTodo =
    user &&
    work.type === '待办' &&
    work.status === 'pending_decompose' &&
    (
      user.role === 'ADMIN' ||
      (
        (user.role === 'DEPARTMENT_MANAGER' || user.role === 'DEPARTMENT_LEADER') &&
        isCurrentUserRelatedDepartment()
      )
    );

  const canOperate =
    user &&
    (
      user.role === 'ADMIN' ||
      (
        (user.role === 'DEPARTMENT_MANAGER' || user.role === 'DEPARTMENT_LEADER') &&
        isCurrentUserRelatedDepartment()
      )
    ) &&
    ['in_progress', 'rejected'].includes(work.status);

  const canHandleReturnedCreate =
    user &&
    work.status === 'rejected' &&
    (
      user.role === 'ADMIN' ||
      user.id === work.creatorId ||
      (
        (user.role === 'DEPARTMENT_MANAGER' || user.role === 'DEPARTMENT_LEADER') &&
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
            uploadedAt: new Date().toISOString(),
            uploadedBy: user?.name,
          });
        };

        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };

    const result = await Promise.all(files.map(readFile));
    setProofFiles((prev: any) => [...prev, ...result]);
  };

  const removeProofFile = (id: number) => {
    setProofFiles((prev: any) => prev.filter((file: any) => file.id !== id));
  };

  // 节点操作函数
  const updateNodeTitle = (nodeId: number, title: string) => {
    setEditForm((prev: any) => ({
      ...prev,
      nodes: prev.nodes.map((node: any) =>
        node.id === nodeId ? { ...node, title } : node
      ),
    }));
  };

  const addNode = () => {
    setEditForm((prev: any) => ({
      ...prev,
      nodes: [
        ...prev.nodes,
        {
          id: Date.now(),
          title: '',
          completeTime: '',
          children: [],
        },
      ],
    }));
  };

  const updateNodeCompleteTime = (nodeId: number, completeTime: string) => {
    setEditForm((prev: any) => ({
      ...prev,
      nodes: prev.nodes.map((node: any) =>
        node.id === nodeId ? { ...node, completeTime: completeTime } : node
      ),
    }));
  };

  const deleteNode = (nodeId: number) => {
    setEditForm((prev: any) => ({
      ...prev,
      nodes: prev.nodes.filter((node: any) => node.id !== nodeId),
    }));
  };

  const addSubNode = (nodeId: number) => {
    setEditForm((prev: any) => ({
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
                  completeTime: '',
                },
              ],
            }
          : node
      ),
    }));
  };

  const updateSubNodeTitle = (nodeId: number, subNodeId: number, title: string) => {
    setEditForm((prev: any) => ({
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
    setEditForm((prev: any) => ({
      ...prev,
      nodes: prev.nodes.map((node: any) =>
        node.id === nodeId
          ? {
              ...node,
              children: node.children.map((child: any) =>
                child.id === subNodeId ? { ...child, completeTime: completeTime } : child
              ),
            }
          : node
      ),
    }));
  };

  const deleteSubNode = (nodeId: number, subNodeId: number) => {
    setEditForm((prev: any) => ({
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
      title: editForm.workItem || editForm.title || work.title,
    };

    const selectedApprovalLeader = companyLeaders.find(
      (leader) => leader.id === Number(approvalLeaderId)
    );

    if (!selectedApprovalLeader) {
      alert('请选择公司审批领导');
      return;
    }

    submitAdjust(work, user, adjustReason, pendingAdjustment);
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
        ? companyLeaders.find((leader) => leader.id === Number(editForm.proposedLeaderId))
        : null;

    if (work.type === '待办' && !selectedProposedLeader) {
      alert('请选择事项提出领导');
      return;
    }

    const patch: WorkEditablePatch = {
      ...editForm,
      title: editForm.workItem || editForm.title || work.title,
    };

    if (work.type === '待办' && selectedProposedLeader) {
      patch.proposedLeader = selectedProposedLeader.name;
      patch.proposedLeaderId = selectedProposedLeader.id;
      patch.proposedLeaderRole = selectedProposedLeader.role;
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
      title: editForm.workItem || editForm.title || work.title,
    };

    const selectedApprovalLeader = companyLeaders.find(
      (leader) => leader.id === Number(approvalLeaderId)
    );

    if (!selectedApprovalLeader) {
      alert('请选择公司审批领导');
      return;
    }

    submitAdjust(work, user, adjustReason, pendingAdjustment);

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

    submitCancel(work, user, cancelReason);
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
                  <span>{work.businessCategory || '-'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">工作事项：</span>
                  <span>{work.workItem || '-'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">工作节点：</span>
                  <span>{work.workNode || '-'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">完成时间：</span>
                  <span>{work.completeTime || '-'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">完成形式：</span>
                  <span>{work.completeForm || '-'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">责任部门：</span>
                  <span>{getDepartmentName(work.departmentId ?? 0)}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">责任领导：</span>
                  <span>{work.responsibleLeader || '-'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">主管人员：</span>
                  <span>{work.supervisor || '-'}</span>
                </div>
                {work.type === '重点' && (
                  <div>
                    <span className="text-sm text-gray-500">是否为创新工作：</span>
                    <span>{work.isInnovation ? '是' : '否'}</span>
                  </div>
                )}
                <div>
                  <span className="text-sm text-gray-500">当前状态：</span>
                  <StatusBadge status={work.status} />
                </div>
              </div>

              {work.rejectReason && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 break-words whitespace-pre-wrap">
                  <div>退回人：{work.rejectedBy || '-'}</div>
                  <div>退回原因：{work.rejectReason}</div>
                  {work.rejectedAt && (
                    <div>退回时间：{new Date(work.rejectedAt).toLocaleString()}</div>
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
                          {node.completeTime ? `（节点完成时间：${node.completeTime}）` : ''}
                        </div>
                        {node.children && node.children.length > 0 && (
                          <div className="pl-5 mt-2 space-y-1 text-sm text-gray-600">
                            {node.children.map((child: any, childIndex: number) => (
                              <div key={child.id} className="break-words">
                                {index + 1}.{childIndex + 1} {child.title}
                                {child.completeTime ? `（完成日期：${child.completeTime}）` : ''}
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
              {work.proofFiles && work.proofFiles.length > 0 && (
                <div>
                  <span className="text-sm text-gray-500">见证材料附件：</span>
                  <div className="mt-2 space-y-2">
                    {work.proofFiles.map((file: any) => (
                      <div key={file.id} className="flex items-center justify-between rounded border p-2 text-sm">
                        <div className="min-w-0">
                          <div className="font-medium break-words">{file.name}</div>
                          <div className="text-xs text-gray-500">
                            上传人：{file.uploadedBy || '-'}　
                            上传时间：{file.uploadedAt ? new Date(file.uploadedAt).toLocaleString() : '-'}
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
              {work.adjustReason && (
                <div>
                  <p className="break-words whitespace-pre-wrap overflow-hidden">
                    调整原因：{work.adjustReason}
                  </p>
                </div>
              )}
              {work.adjustNewTime && (
                <p>
                  调整后时间：{work.adjustNewTime}
                </p>
              )}
              {work.adjustHistory && work.adjustHistory.length > 0 && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded text-sm text-purple-800 space-y-2">
                  <div className="font-medium">调整记录</div>
                  {work.adjustHistory.map((item) => (
                    <div key={item.id} className="border-t border-purple-100 pt-2 first:border-t-0 first:pt-0">
                      <div>调整原因：{item.reason || '-'}</div>
                      <div>原计划完成时间：{item.fromTime || '-'}</div>
                      <div>现计划完成时间：{item.toTime || '-'}</div>
                      <div>审批人：{item.approvedBy || '-'}</div>
                      <div>审批时间：{item.approvedAt ? new Date(item.approvedAt).toLocaleString() : '-'}</div>
                    </div>
                  ))}
                </div>
              )}
              {work.cancelReason && (
                <div>
                  <span className="text-sm text-gray-500">取消原因：</span>
                  <p className="mt-1 p-2 bg-gray-50 rounded break-words whitespace-pre-wrap overflow-hidden">{work.cancelReason}</p>
                </div>
              )}
            </div>
          )}

          {isTodo && (
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">事项提出领导：</span>
                  <span>{work.proposedLeader || '-'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">事项提出场景：</span>
                  <span>{work.proposedScene || '-'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">待办事项：</span>
                  <span>{work.workItem || '-'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">形成时间：</span>
                  <span>{work.formedTime || '-'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">责任部门：</span>
                  <span>
                    {work.departmentIds && work.departmentIds.length > 0
                      ? work.departmentIds.map((id: number) => getDepartmentName(id)).join('、')
                      : getDepartmentName(work.departmentId ?? 0)}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">责任部门责任人：</span>
                  <span>
                    {work.responsiblePersons && work.responsiblePersons.length > 0
                      ? work.responsiblePersons.join('、')
                      : work.responsiblePerson || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">配合部门：</span>
                  <span>
                    {work.cooperateDepartments && work.cooperateDepartments.length > 0
                      ? work.cooperateDepartments.join('、')
                      : work.cooperateDepartment || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">配合部门责任人：</span>
                  <span>
                    {work.cooperatePersons && work.cooperatePersons.length > 0
                      ? work.cooperatePersons.join('、')
                      : work.cooperatePerson || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">工作计划：</span>
                  <span>{work.workPlan || '-'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">计划完成时间：</span>
                  <span>{work.planCompleteTime || '-'}</span>
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
                          {node.completeTime ? `（节点完成时间：${node.completeTime}）` : ''}
                        </div>
                        {node.children && node.children.length > 0 && (
                          <div className="pl-5 mt-2 space-y-1 text-sm text-gray-600">
                            {node.children.map((child: any, childIndex: number) => (
                              <div key={child.id} className="break-words">
                                {index + 1}.{childIndex + 1} {child.title}
                                {child.completeTime ? `（完成日期：${child.completeTime}）` : ''}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {work.rejectReason && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 break-words whitespace-pre-wrap">
                  <div>退回人：{work.rejectedBy || '-'}</div>
                  <div>退回原因：{work.rejectReason}</div>
                  {work.rejectedAt && (
                    <div>退回时间：{new Date(work.rejectedAt).toLocaleString()}</div>
                  )}
                </div>
              )}

              {work.proof && (
                <div>
                  <span className="text-sm text-gray-500">见证材料：</span>
                  <p className="mt-1 p-2 bg-gray-50 rounded break-words whitespace-pre-wrap overflow-hidden">{work.proof}</p>
                </div>
              )}
              {work.proofFiles && work.proofFiles.length > 0 && (
                <div>
                  <span className="text-sm text-gray-500">见证材料附件：</span>
                  <div className="mt-2 space-y-2">
                    {work.proofFiles.map((file: any) => (
                      <div key={file.id} className="flex items-center justify-between rounded border p-2 text-sm">
                        <div className="min-w-0">
                          <div className="font-medium break-words">{file.name}</div>
                          <div className="text-xs text-gray-500">
                            上传人：{file.uploadedBy || '-'}　
                            上传时间：{file.uploadedAt ? new Date(file.uploadedAt).toLocaleString() : '-'}
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
              {work.adjustReason && (
                <div>
                  <p className="break-words whitespace-pre-wrap overflow-hidden">
                    调整原因：{work.adjustReason}
                  </p>
                </div>
              )}
              {work.adjustNewTime && (
                <p>
                  调整后时间：{work.adjustNewTime}
                </p>
              )}
              {work.cancelReason && (
                <div>
                  <span className="text-sm text-gray-500">取消原因：</span>
                  <p className="mt-1 p-2 bg-gray-50 rounded break-words whitespace-pre-wrap overflow-hidden">{work.cancelReason}</p>
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

      {/* 审批记录 */}
      {workflowRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>审批记录</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workflowRecords.map((record) => (
                <div key={record.id} className="border rounded p-3 bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium">{record.initiatorName}</span>
                      <span className="text-gray-500 text-sm ml-2">({record.initiatorRole})</span>
                    </div>
                    <span className="text-sm text-gray-400">{new Date(record.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="mt-1">
                    <span className="text-blue-600">{record.action}</span>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    状态变更：{record.previousStatus} → {record.newStatus}
                  </div>
                  {record.comment && (
                    <div className="mt-2 text-sm bg-white p-2 rounded">
                      意见：{record.comment}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 待审批调整内容 */}
      {work.pendingAdjustment && (
        <Card>
          <CardHeader>
            <CardTitle>待审批调整内容</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="text-purple-600 break-words whitespace-pre-wrap">
              调整原因：{work.pendingAdjustmentReason || '-'}
            </div>
            <div>
              原计划完成时间：{work.pendingAdjustmentFromTime || '-'}
            </div>
            <div>
              现计划完成时间：{work.pendingAdjustmentToTime || '-'}
            </div>
            <div>
              公司审批领导：{work.approvalLeader || '-'}
            </div>
            <div className="break-words whitespace-pre-wrap">
              调整后事项：{work.pendingAdjustment.workItem || work.pendingAdjustment.title || '-'}
            </div>
            <div>
              调整后完成时间：{work.pendingAdjustment.completeTime || work.pendingAdjustment.planCompleteTime || '-'}
            </div>
            <div>
              调整后完成形式：{work.pendingAdjustment.completeForm || '-'}
            </div>
            {work.pendingAdjustment.nodes && work.pendingAdjustment.nodes.length > 0 && (
              <div>
                <p className="font-medium mt-2">调整后节点：</p>
                <div className="space-y-2">
                  {work.pendingAdjustment.nodes.map((node: any, index: number) => (
                    <div key={node.id} className="border rounded p-2 bg-gray-50">
                      <div className="font-medium break-words">
                        {index + 1}. {node.title}
                      </div>
                      {node.children && node.children.length > 0 && (
                        <div className="pl-4 mt-1 space-y-1 text-sm text-gray-600">
                          {node.children.map((child: any, childIndex: number) => (
                            <div key={child.id} className="break-words">
                              {index + 1}.{childIndex + 1} {child.title}
                              {child.completeTime ? `（完成日期：${child.completeTime}）` : ''}
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
      {work.rejectReason && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded break-words whitespace-pre-wrap">
          退回原因：{work.rejectReason}
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

            <Button
              onClick={() => {
                if (!user) return;
                if (!editForm.workPlan?.trim()) {
                  alert('请填写工作计划');
                  return;
                }
                if (!editForm.planCompleteTime) {
                  alert('请填写计划完成时间');
                  return;
                }

                const validNodes = (editForm.nodes || []).filter((node: any) => node.title?.trim());

                if (validNodes.length === 0) {
                  alert('请至少填写一个任务节点');
                  return;
                }

                if (validNodes.some((node: any) => !node.completeTime)) {
                  alert('请填写每个任务节点的完成时间');
                  return;
                }

                submitTodoDecomposition(work, user, {
                  ...editForm,
                  title: editForm.workItem || work.title,
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
                    {proofFiles.map((file: any) => (
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
                  {work.rejectReason && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded break-words whitespace-pre-wrap">
                      退回原因：{work.rejectReason}
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
                                value={editForm.workItem || ''}
                                onChange={(e) => setEditForm((prev: any) => ({ ...prev, workItem: e.target.value }))}
                                placeholder="请输入工作事项"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">业务类别</label>
                              <Input
                                value={editForm.businessCategory || ''}
                                onChange={(e) => setEditForm((prev: any) => ({ ...prev, businessCategory: e.target.value }))}
                                placeholder="请输入业务类别"
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
                                placeholder="请输入完成形式"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">责任部门</label>
                              <select
                                value={editForm.departmentId || ''}
                                onChange={(e) => setEditForm((prev: any) => ({ ...prev, departmentId: Number(e.target.value) }))}
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
                                value={editForm.responsibleLeader || ''}
                                onChange={(e) => setEditForm((prev: any) => ({ ...prev, responsibleLeader: e.target.value }))}
                                placeholder="请输入责任领导"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">主管人员</label>
                              <Input
                                value={editForm.supervisor || ''}
                                onChange={(e) => setEditForm((prev: any) => ({ ...prev, supervisor: e.target.value }))}
                                placeholder="请输入主管人员"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={editForm.isInnovation || false}
                                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, isInnovation: e.target.checked }))}
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
                                            value={child.completeTime || ''}
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
                                value={editForm.workItem || ''}
                                onChange={(e) => setEditForm((prev: any) => ({ ...prev, workItem: e.target.value }))}
                                placeholder="请输入待办事项"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">事项提出领导</label>
                              <select
                                value={editForm.proposedLeaderId || ''}
                                onChange={(e) => {
                                  const selected = companyLeaders.find((leader) => leader.id === Number(e.target.value));
                                  setEditForm((prev: any) => ({
                                    ...prev,
                                    proposedLeaderId: e.target.value,
                                    proposedLeader: selected?.name || '',
                                    proposedLeaderRole: selected?.role || '',
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
                                value={editForm.proposedScene || ''}
                                onChange={(e) => setEditForm((prev: any) => ({ ...prev, proposedScene: e.target.value }))}
                                placeholder="请输入事项提出场景"
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
                                value={editForm.responsiblePerson || ''}
                                onChange={(e) => setEditForm((prev: any) => ({ ...prev, responsiblePerson: e.target.value }))}
                                placeholder="请输入责任部门责任人"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">配合部门</label>
                              <Input
                                value={editForm.cooperateDepartment || ''}
                                onChange={(e) => setEditForm((prev: any) => ({ ...prev, cooperateDepartment: e.target.value }))}
                                placeholder="请输入配合部门"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">配合部门责任人</label>
                              <Input
                                value={editForm.cooperatePerson || ''}
                                onChange={(e) => setEditForm((prev: any) => ({ ...prev, cooperatePerson: e.target.value }))}
                                placeholder="请输入配合部门责任人"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">工作计划</label>
                              <Input
                                value={editForm.workPlan || ''}
                                onChange={(e) => setEditForm((prev: any) => ({ ...prev, workPlan: e.target.value }))}
                                placeholder="请输入工作计划"
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
                                  value={editForm.workItem || ''}
                                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, workItem: e.target.value }))}
                                  placeholder="请输入工作事项"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">业务类别</label>
                                <Input
                                  value={editForm.businessCategory || ''}
                                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, businessCategory: e.target.value }))}
                                  placeholder="请输入业务类别"
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
                                  placeholder="请输入完成形式"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">责任部门</label>
                                <select
                                  value={editForm.departmentId || ''}
                                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, departmentId: Number(e.target.value) }))}
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
                                  value={editForm.responsibleLeader || ''}
                                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, responsibleLeader: e.target.value }))}
                                  placeholder="请输入责任领导"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">主管人员</label>
                                <Input
                                  value={editForm.supervisor || ''}
                                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, supervisor: e.target.value }))}
                                  placeholder="请输入主管人员"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={editForm.isInnovation || false}
                                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, isInnovation: e.target.checked }))}
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
                                              value={child.completeTime || ''}
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
                                  value={editForm.workItem || ''}
                                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, workItem: e.target.value }))}
                                  placeholder="请输入待办事项"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">事项提出领导</label>
                                <select
                                  value={editForm.proposedLeaderId || ''}
                                  onChange={(e) => {
                                    const selected = companyLeaders.find((leader) => leader.id === Number(e.target.value));
                                    setEditForm((prev: any) => ({
                                      ...prev,
                                      proposedLeaderId: e.target.value,
                                      proposedLeader: selected?.name || '',
                                      proposedLeaderRole: selected?.role || '',
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
                                  value={editForm.proposedScene || ''}
                                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, proposedScene: e.target.value }))}
                                  placeholder="请输入事项提出场景"
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
                                  value={editForm.responsiblePerson || ''}
                                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, responsiblePerson: e.target.value }))}
                                  placeholder="请输入责任部门责任人"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">配合部门</label>
                                <Input
                                  value={editForm.cooperateDepartment || ''}
                                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, cooperateDepartment: e.target.value }))}
                                  placeholder="请输入配合部门"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">配合部门责任人</label>
                                <Input
                                  value={editForm.cooperatePerson || ''}
                                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, cooperatePerson: e.target.value }))}
                                  placeholder="请输入配合部门责任人"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">工作计划</label>
                                <Input
                                  value={editForm.workPlan || ''}
                                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, workPlan: e.target.value }))}
                                  placeholder="请输入工作计划"
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
