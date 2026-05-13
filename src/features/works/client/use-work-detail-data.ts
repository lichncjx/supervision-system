'use client';

import { useState, useEffect } from 'react';
import { getCompanyLeaders, getDepartments, getDepartmentLeaders, getDepartmentManagers } from '@/lib/auth';
import { getWorkById, getWorkflowRecords, type Work, type WorkflowRecord } from '@/lib/work-store';

export function useWorkDetailData(id: string) {
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
    };
    fetchData();
  }, []);

  useEffect(() => {
    getWorkById(Number(id)).then(setWork);
  }, [id, refresh]);

  useEffect(() => {
    if (work) {
      getWorkflowRecords(work.id).then(setWorkflowRecords);
    }
  }, [work, refresh]);

  useEffect(() => {
    if (work && (work.type === '重点' || work.type === '主要') && work.departmentId) {
      Promise.all([
        getDepartmentLeaders(work.departmentId!),
        getDepartmentManagers(work.departmentId!),
      ]).then(([leaders, managers]) => {
        setDepartmentLeaders(leaders);
        setDepartmentManagers(managers);
      });
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
