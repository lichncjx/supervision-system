'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/providers/auth-provider';
import { isCompanyLevel, departments } from '@/lib/auth';
import { getVisibleWorks, queryWorks, type Work, type WorkType, type WorkStatusFilter } from '@/lib/work-store';
import { Eye, Plus, Search, RefreshCw } from 'lucide-react';
import { StatusBadge } from '@/components/common/badges';
import { ExpandableText } from '@/components/common/expandable-text';

export default function ItemListPage() {
  const params = useParams<{ type: string }>();
  const routeType = params?.type || 'todo';
  const { user } = useAuth();
  const [items, setItems] = useState<Work[]>([]);
  const [keyword, setKeyword] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<number | '全部'>('全部');
  const [statusFilter, setStatusFilter] = useState<WorkStatusFilter>('all');
  const [monthFilter, setMonthFilter] = useState('');
  const companyLevel = isCompanyLevel(user?.role, user?.department_id);

  const typeMap: Record<string, WorkType> = {
    priority: '重点',
    main: '主要',
    todo: '待办',
  };

  const type = typeMap[routeType] || '待办';
  const isPriorityOrMain = type === '重点' || type === '主要';
  const isTodo = type === '待办';

  const load = () => {
    setItems(getVisibleWorks(user, type));
  };

  useEffect(() => {
    load();
  }, [user, type]);

  const titleMap: Record<WorkType, string> = {
    重点: '重点工作',
    主要: '主要工作',
    待办: '待办事项',
  };

  const colorMap: Record<WorkType, string> = {
    重点: 'text-red-600',
    主要: 'text-blue-600',
    待办: 'text-green-600',
  };

  const canCreate =
    type === '待办'
      ? (
          user?.role === 'admin' ||
          user?.role === 'department_manager' ||
          user?.role === 'department_leader' ||
          user?.role === 'vice_president' ||
          user?.role === 'president'
        )
      : (
          user?.role === 'admin' ||
          user?.role === 'department_manager' ||
          user?.role === 'department_leader'
        );

  const getWorkMonth = (work: any) => {
    const date = work.complete_time || work.plan_complete_time || work.due_date || '';
    if (!date) return '';
    return String(date).slice(0, 7);
  };

  const getMonthLabel = (month: string) => {
    if (!month) return '';
    const [year, m] = month.split('-');
    return `${year}年${Number(m)}月`;
  };

  const monthOptions = Array.from(
    new Set(
      items
        .map((work) => getWorkMonth(work))
        .filter(Boolean)
    )
  ).sort();

  let list = queryWorks(user, {
    type,
    departmentId: companyLevel ? departmentFilter : user?.department_id,
    status: statusFilter,
    keyword,
  });

  if (monthFilter) {
    list = list.filter((work) => getWorkMonth(work) === monthFilter);
  }

  const getDepartmentName = (id: number) => {
    return departments.find((d) => d.id === id)?.name || '-';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={`text-2xl font-bold ${colorMap[type]}`}>{titleMap[type]}</h1>

        {canCreate && (
          <Link href={`/${routeType}/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新建{titleMap[type]}
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索事项名称..." className="pl-10" />
          </div>
          
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="border rounded-md h-10 px-3"
          >
            <option value="">全部月份</option>
            {monthOptions.map((month) => (
              <option key={month} value={month}>
                {getMonthLabel(month)}
              </option>
            ))}
          </select>

          {companyLevel && (
            <select
              value={departmentFilter}
              onChange={(e) =>
                setDepartmentFilter(e.target.value === '全部' ? '全部' : Number(e.target.value))
              }
              className="border rounded-md h-10 px-3"
            >
              <option value="全部">全部部门</option>
              {departments
                .filter((d) => d.id !== 1)
                .map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
            </select>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as WorkStatusFilter)}
            className="border rounded-md h-10 px-3"
          >
            <option value="all">全部状态</option>
            <option value="pending">待审批</option>
            <option value="inProgress">进行中</option>
            <option value="completed">已完成</option>
            <option value="rejected">已退回</option>
            <option value="cancelled">已取消</option>
            <option value="overdue">超期</option>
          </select>

          <Button
            variant="outline"
            onClick={() => {
              setKeyword('');
              setMonthFilter('');
              setDepartmentFilter('全部');
              setStatusFilter('all');
              load();
            }}
          >
            重置
          </Button>
          <Button variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
        </CardContent>
      </Card>

      <div className="text-sm text-gray-500">
        当前共筛选出 {list.length} 项{titleMap[type]}
      </div>

      <Card>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <div className="py-16 text-center text-gray-500">暂无{titleMap[type]}</div>
          ) : (
            <div className="divide-y">
              {list.map((item) => (
                <div key={item.id} className="p-4 hover:bg-gray-50">
                  {isPriorityOrMain ? (
                    <div className="space-y-2">
                      <div className="font-medium text-gray-900 break-words whitespace-pre-wrap overflow-hidden">
                        {item.work_item || item.title}
                        {item.type === '重点' && item.is_innovation && (
                          <span className="ml-2 inline-flex items-center rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                            创新工作
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                        <div className="break-words whitespace-pre-wrap overflow-hidden">
                          <span className="text-gray-500">工作节点：</span>
                          {item.work_node || '-'}
                        </div>
                        <div>
                          <span className="text-gray-500">完成时间：</span>
                          {item.complete_time || '-'}
                        </div>
                        <div>
                          <span className="text-gray-500">完成形式：</span>
                          {item.complete_form || '-'}
                        </div>
                        <div>
                          <span className="text-gray-500">责任部门：</span>
                          {getDepartmentName(item.department_id)}
                        </div>
                        <div>
                          <span className="text-gray-500">责任领导：</span>
                          {item.responsible_leader || '-'}
                        </div>
                        <div>
                          <span className="text-gray-500">主管人员：</span>
                          {item.supervisor || '-'}
                        </div>
                        <div>
                          <span className="text-gray-500">状态：</span>
                          <StatusBadge status={item.status} />
                        </div>
                        {item.adjust_history && item.adjust_history.length > 0 && (
                          <div className="text-sm text-purple-600 break-words">
                            原计划完成时间：{item.adjust_history[item.adjust_history.length - 1].from_time || '-'}；
                            现计划完成时间：{item.adjust_history[item.adjust_history.length - 1].to_time || '-'}
                          </div>
                        )}
                      </div>
                      {item.nodes && item.nodes.length > 0 && (
                        <div className="mt-2 text-sm text-gray-600 space-y-1">
                          {item.nodes.map((node: any) => (
                            <div key={node.id} className="break-words">
                              <div>节点：{node.title}{node.complete_time ? `（节点完成时间：${node.complete_time}）` : ''}</div>
                              {node.children && node.children.length > 0 && (
                                <div className="pl-4 text-gray-500">
                                  {node.children.map((child: any) => (
                                    <div key={child.id} className="break-words">
                                      - {child.title}
                                      {child.complete_time ? `（完成日期：${child.complete_time}）` : ''}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 flex justify-end">
                        <Link href={`/${routeType}/${item.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            查看
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="font-medium text-gray-900 break-words whitespace-pre-wrap overflow-hidden">{item.work_item || item.title}</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                        <div className="break-words whitespace-pre-wrap overflow-hidden">
                          <span className="text-gray-500">事项提出领导：</span>
                          {item.proposed_leader || '-'}
                        </div>
                        <div className="break-words whitespace-pre-wrap overflow-hidden">
                          <span className="text-gray-500">事项提出场景：</span>
                          {item.proposed_scene || '-'}
                        </div>
                        <div>
                          <span className="text-gray-500">责任部门：</span>
                          {item.department_ids && item.department_ids.length > 0
                            ? item.department_ids.map((id: number) => getDepartmentName(id)).join('、')
                            : getDepartmentName(item.department_id)}
                        </div>
                        <div>
                          <span className="text-gray-500">责任部门责任人：</span>
                          {item.responsible_persons && item.responsible_persons.length > 0
                            ? item.responsible_persons.join('、')
                            : item.responsible_person || '-'}
                        </div>
                        <div>
                          <span className="text-gray-500">计划完成时间：</span>
                          {item.plan_complete_time || '-'}
                        </div>
                        <div className="break-words whitespace-pre-wrap overflow-hidden text-sm text-gray-600 max-w-full">
                          <span className="text-gray-500">进展情况：</span>
                          <ExpandableText text={item.progress} />
                        </div>
                        <div>
                          <span className="text-gray-500">状态：</span>
                          <StatusBadge status={item.status} />
                        </div>
                        {item.adjust_history && item.adjust_history.length > 0 && (
                          <div className="text-sm text-purple-600 break-words">
                            原计划完成时间：{item.adjust_history[item.adjust_history.length - 1].from_time || '-'}；
                            现计划完成时间：{item.adjust_history[item.adjust_history.length - 1].to_time || '-'}
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex justify-end">
                        <Link href={`/${routeType}/${item.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            查看
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
