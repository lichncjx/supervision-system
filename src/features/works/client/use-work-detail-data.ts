'use client';

import { useState, useEffect } from 'react';
import { getCompanyLeaders, getDepartmentLeaders, getDepartmentManagers } from '@/features/users/client/user-api';
import { getDepartments } from '@/features/departments/client/department-api';
import { getWorkById } from '@/features/works/client/work-api';
import { getWorkflowRecords } from '@/features/workflow/client/workflow-api';
import type { Work } from '@/features/works/client/work-client.types';
import type { WorkflowRecordDto as WorkflowRecord } from "@/features/workflow/application/get-workflow-records.usecase";
import type { User } from '@/features/users/client/user-client.types';
import type { Department } from '@/features/departments/client/department-api';

export type WorkflowRecordsStatus = 'idle' | 'loading' | 'loaded' | 'error';

export function useWorkDetailData(id: string) {
  const [refresh, setRefresh] = useState(0);
  const [work, setWork] = useState<Work | undefined>();
  const [workflowRecords, setWorkflowRecords] = useState<WorkflowRecord[]>([]);
  const [workflowRecordsStatus, setWorkflowRecordsStatus] = useState<WorkflowRecordsStatus>('idle');
  const [companyLeaders, setCompanyLeaders] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentLeaders, setDepartmentLeaders] = useState<User[]>([]);
  const [departmentManagers, setDepartmentManagers] = useState<User[]>([]);

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
    if (!work) {
      setWorkflowRecords([]);
      setWorkflowRecordsStatus('idle');
      return;
    }

    let cancelled = false;
    setWorkflowRecords([]);
    setWorkflowRecordsStatus('loading');

    getWorkflowRecords(work.id)
      .then((records) => {
        if (cancelled) return;
        setWorkflowRecords(records);
        setWorkflowRecordsStatus('loaded');
      })
      .catch(() => {
        if (cancelled) return;
        setWorkflowRecords([]);
        setWorkflowRecordsStatus('error');
      });

    return () => {
      cancelled = true;
    };
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
    workflowRecordsStatus,
    companyLeaders,
    departments,
    departmentLeaders,
    departmentManagers,
    refresh,
    onRefresh,
  };
}
