'use client';

import { useState, useEffect } from 'react';
import { getCompanyLeaders, getDepartments, getDepartmentLeaders, getDepartmentManagers } from '@/lib/auth';
import { getWorkById, getWorkflowRecords, type Work, type WorkflowRecord } from '@/lib/work-store';

interface UseWorkDetailDataParams {
  type: string;
  id: string;
  approvalLeaderId: string;
  setApprovalLeaderId: (v: string) => void;
}

export function useWorkDetailData({
  type: _type,
  id,
  approvalLeaderId,
  setApprovalLeaderId,
}: UseWorkDetailDataParams) {
  const [refresh, setRefresh] = useState(0);
  const [work, setWork] = useState<Work | undefined>();
  const [workflowRecords, setWorkflowRecords] = useState<WorkflowRecord[]>([]);
  const [companyLeaders, setCompanyLeaders] = useState<Array<{ id: number; name: string; role: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: number; name: string; code: string; isBusiness: boolean }>>([]);
  const [departmentLeaders, setDepartmentLeaders] = useState<Array<{ id: number; name: string; role: string; departmentId: number }>>([]);
  const [departmentManagers, setDepartmentManagers] = useState<Array<{ id: number; name: string; role: string; departmentId: number }>>([]);

  const onRefresh = () => setRefresh((v) => v + 1);

  useEffect(() => {
    const fetchData = async () => {
      const [leaders, depts] = await Promise.all([
        getCompanyLeaders(),
        getDepartments(),
      ]);
      setCompanyLeaders(leaders);
      setDepartments(depts);
      if (leaders.length > 0 && !approvalLeaderId) {
        setApprovalLeaderId(String(leaders[0].id));
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    if (work && (work.type === '重点' || work.type === '主要') && work.departmentId) {
      const fetchDeptUsers = async () => {
        const [leaders, managers] = await Promise.all([
          getDepartmentLeaders(work.departmentId!),
          getDepartmentManagers(work.departmentId!),
        ]);
        setDepartmentLeaders(leaders);
        setDepartmentManagers(managers);
      };
      fetchDeptUsers();
    }
  }, [work?.departmentId, work?.type, work]);

  return {
    work,
    workflowRecords,
    companyLeaders,
    departments,
    departmentLeaders,
    departmentManagers,
    refresh,
    onRefresh,
  };
}
