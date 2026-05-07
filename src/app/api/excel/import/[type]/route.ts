import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import prisma from '@/lib/prisma';
import { getUserFromToken } from '@/lib/server-auth';
import { Role, WorkItemStatus, WorkItemType } from '@prisma/client';

interface ValidationError {
  row: number;
  field: string;
  value: string;
  reason: string;
}

interface ImportRow {
  row: number;
  data: any;
}

function isCompanyLevelRole(role: string): boolean {
  const companyRoles: string[] = ['ADMIN', 'SUPERVISOR', 'VICE_PRESIDENT', 'PRESIDENT'];
  return companyRoles.includes(role);
}

function parseExcelDate(value: any): string | null {
  if (!value) return null;

  if (typeof value === 'number' && value > 25000 && value < 60000) {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }

  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const [, year, month, day] = match;
      const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(d.getTime())) {
        return `${year}-${month}-${day}`;
      }
    }
  }

  if (value instanceof Date) {
    if (!isNaN(value.getTime())) {
      return value.toISOString().split('T')[0];
    }
  }

  return null;
}

async function validateAndParseExcel(
  file: Buffer,
  type: string,
  _currentUser: { id: number; name: string; role: string; departmentId: number }
): Promise<{ rows: ImportRow[]; errors: ValidationError[] }> {
  const errors: ValidationError[] = [];
  const rows: ImportRow[] = [];

  const workbook = XLSX.read(file, { type: 'buffer' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (!jsonData || jsonData.length === 0) {
    errors.push({
      row: 0,
      field: 'file',
      value: '',
      reason: 'Excel 文件为空或格式不正确',
    });
    return { rows, errors };
  }

  const headerRow = jsonData[0] as any;
  const headerMap: Record<string, string> = {};

  for (const key of Object.keys(headerRow)) {
    headerMap[key.trim()] = key;
  }

  const departments = await prisma.department.findMany({
    where: { isBusiness: true },
    select: { id: true, name: true, code: true },
  });
  const deptNameToId = new Map(departments.map((d) => [d.name, d.id]));
  const deptCodeToId = new Map(departments.filter((d) => d.code).map((d) => [d.code!, d.id]));
  const resolveDeptId = (input: string) =>
    deptNameToId.get(input) ?? deptCodeToId.get(input.toUpperCase()) ?? null;

  const companyLeaders = await prisma.user.findMany({
    where: {
      role: { in: [Role.PRESIDENT, Role.VICE_PRESIDENT] },
      isActive: true,
    },
    select: { id: true, name: true },
  });
  const leaderNameToId = new Map(companyLeaders.map((u) => [u.name, u.id]));

  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any;
    const rowNum = i + 1;

    const getCell = (field: string): string => {
      const key = headerMap[field];
      if (!key) return '';
      const val = row[key];
      return val !== undefined && val !== null ? String(val).trim() : '';
    };

    if (type === 'priority' || type === 'PRIORITY') {
      const businessCategory = getCell('业务类别');
      const workItem = getCell('工作事项');
      const isInnovationStr = getCell('是否为创新工作');
      const workNode = getCell('工作节点');
      const completeTimeStr = getCell('完成时间');
      const completeForm = getCell('完成形式');
      const departmentName = getCell('责任部门');
      // responsibleLeader: 部门领导姓名（legacy，未来迁移为 deptLeaderName）
      const responsibleLeader = getCell('责任领导');
      // supervisor: 主管人员姓名（legacy，未来迁移为 deptManagerName）
      const supervisor = getCell('主管人员');

      if (!workItem) {
        errors.push({ row: rowNum, field: '工作事项', value: workItem, reason: '必填字段不能为空' });
      }
      if (!isInnovationStr || !['是', '否'].includes(isInnovationStr)) {
        errors.push({ row: rowNum, field: '是否为创新工作', value: isInnovationStr, reason: '只能填写"是"或"否"' });
      }
      if (!completeTimeStr || !parseExcelDate(completeTimeStr)) {
        errors.push({ row: rowNum, field: '完成时间', value: completeTimeStr, reason: '必填字段，格式为 YYYY-MM-DD' });
      }
      const resolvedDeptId = departmentName ? resolveDeptId(departmentName) : null;
      if (!departmentName) {
        errors.push({ row: rowNum, field: '责任部门', value: departmentName, reason: '必填字段不能为空' });
      } else if (!resolvedDeptId) {
        errors.push({ row: rowNum, field: '责任部门', value: departmentName, reason: `部门"${departmentName}"不存在或不是业务部门，请填写部门全名或缩写代码` });
      }
      if (!responsibleLeader) {
        errors.push({ row: rowNum, field: '责任领导', value: responsibleLeader, reason: '必填字段不能为空' });
      }

      if (errors.filter((e) => e.row === rowNum).length === 0) {
        const deptId = resolvedDeptId!;
        const deptLeaders = await prisma.user.findMany({
          where: { departmentId: deptId, role: Role.DEPARTMENT_LEADER, isActive: true },
          select: { id: true, name: true },
        });
        const deptLeaderNames = deptLeaders.map((u) => u.name);
        if (responsibleLeader && !deptLeaderNames.includes(responsibleLeader)) {
          errors.push({ row: rowNum, field: '责任领导', value: responsibleLeader, reason: `不是${departmentName}的部门领导` });
        }
        // Phase 2: 从姓名解析 deptLeaderId（唯一匹配前提）
        const matchedDeptLeaders = deptLeaders.filter(u => u.name === responsibleLeader);
        const deptLeaderId = matchedDeptLeaders.length === 1 ? matchedDeptLeaders[0].id : null;
        // supervisor 可解析但无硬校验
        const deptManagers = supervisor
          ? await prisma.user.findMany({
              where: { departmentId: deptId, role: Role.DEPARTMENT_MANAGER, isActive: true },
              select: { id: true, name: true },
            })
          : [];
        const matchedDeptManagers = supervisor ? deptManagers.filter(u => u.name === supervisor) : [];
        const deptManagerId = matchedDeptManagers.length === 1 ? matchedDeptManagers[0].id : null;

        rows.push({
          row: rowNum,
          data: {
            type: 'PRIORITY',
            businessCategory,
            workItem,
            isInnovation: isInnovationStr === '是',
            workNode,
            completeTime: parseExcelDate(completeTimeStr),
            completeForm,
            departmentName,
            departmentId: resolvedDeptId,
            // 双写：保留用户原始输入（可能是全名或代码），用于后续回显
            departmentCode: departments.find(d => d.id === resolvedDeptId)?.code || departmentName,
            responsibleLeader,
            supervisor,
            deptLeaderId,
            deptLeaderName: responsibleLeader || null,
            deptManagerId,
            deptManagerName: supervisor || null,
          },
        });
      }
    } else if (type === 'main' || type === 'MAIN') {
      const businessCategory = getCell('业务类别');
      const workItem = getCell('工作事项');
      const workNode = getCell('工作节点');
      const completeTimeStr = getCell('完成时间');
      const completeForm = getCell('完成形式');
      const departmentName = getCell('责任部门');
      // responsibleLeader: 部门领导姓名（legacy，未来迁移为 deptLeaderName）
      const responsibleLeader = getCell('责任领导');
      // supervisor: 主管人员姓名（legacy，未来迁移为 deptManagerName）
      const supervisor = getCell('主管人员');

      if (!workItem) {
        errors.push({ row: rowNum, field: '工作事项', value: workItem, reason: '必填字段不能为空' });
      }
      if (!completeTimeStr || !parseExcelDate(completeTimeStr)) {
        errors.push({ row: rowNum, field: '完成时间', value: completeTimeStr, reason: '必填字段，格式为 YYYY-MM-DD' });
      }
      const resolvedDeptId = departmentName ? resolveDeptId(departmentName) : null;
      if (!departmentName) {
        errors.push({ row: rowNum, field: '责任部门', value: departmentName, reason: '必填字段不能为空' });
      } else if (!resolvedDeptId) {
        errors.push({ row: rowNum, field: '责任部门', value: departmentName, reason: `部门"${departmentName}"不存在或不是业务部门，请填写部门全名或缩写代码` });
      }
      if (!responsibleLeader) {
        errors.push({ row: rowNum, field: '责任领导', value: responsibleLeader, reason: '必填字段不能为空' });
      }

      if (errors.filter((e) => e.row === rowNum).length === 0) {
        const deptId = resolvedDeptId!;
        const deptLeaders = await prisma.user.findMany({
          where: { departmentId: deptId, role: Role.DEPARTMENT_LEADER, isActive: true },
          select: { id: true, name: true },
        });
        const deptLeaderNames = deptLeaders.map((u) => u.name);
        if (responsibleLeader && !deptLeaderNames.includes(responsibleLeader)) {
          errors.push({ row: rowNum, field: '责任领导', value: responsibleLeader, reason: `不是${departmentName}的部门领导` });
        }
        // Phase 2: 从姓名解析 deptLeaderId（唯一匹配前提）
        const matchedDeptLeaders = deptLeaders.filter(u => u.name === responsibleLeader);
        const deptLeaderId = matchedDeptLeaders.length === 1 ? matchedDeptLeaders[0].id : null;
        // supervisor 可解析但无硬校验
        const deptManagers = supervisor
          ? await prisma.user.findMany({
              where: { departmentId: deptId, role: Role.DEPARTMENT_MANAGER, isActive: true },
              select: { id: true, name: true },
            })
          : [];
        const matchedDeptManagers = supervisor ? deptManagers.filter(u => u.name === supervisor) : [];
        const deptManagerId = matchedDeptManagers.length === 1 ? matchedDeptManagers[0].id : null;

        rows.push({
          row: rowNum,
          data: {
            type: 'MAIN',
            businessCategory,
            workItem,
            workNode,
            completeTime: parseExcelDate(completeTimeStr),
            completeForm,
            departmentName,
            departmentId: resolvedDeptId,
            departmentCode: departments.find(d => d.id === resolvedDeptId)?.code || departmentName,
            responsibleLeader,
            supervisor,
            deptLeaderId,
            deptLeaderName: responsibleLeader || null,
            deptManagerId,
            deptManagerName: supervisor || null,
          },
        });
      }
    } else if (type === 'todo' || type === 'TODO') {
      // 事项提出领导：提出该待办事项的公司领导（PRESIDENT 或 VICE_PRESIDENT）
      const proposedLeaderName = getCell('事项提出领导');
      // 指定审批领导：负责后续调整、取消、完成审批的公司领导（默认等于提出领导）
      const approvalLeaderName = getCell('指定审批领导');
      const proposedScene = getCell('事项提出场景');
      const workItem = getCell('待办事项');
      const formedTimeStr = getCell('形成时间');
      // 责任部门：主责部门，斜杠分隔多个部门名称
      const departmentNames = getCell('责任部门');
      // 部门责任人：主责人员姓名留底（legacy，未来迁移为 responsiblePersonNames）
      const responsiblePersons = getCell('主责责任人');
      const cooperateDepartmentNames = getCell('配合部门');
      // 配合部门责任人：协助人员姓名留底（legacy，未来迁移为 cooperatePersonNames）
      const cooperatePersons = getCell('配合责任人');
      const workPlan = getCell('工作计划');
      const planCompleteTimeStr = getCell('计划完成时间');
      const progress = getCell('进展情况');

      if (!workItem) {
        errors.push({ row: rowNum, field: '待办事项', value: workItem, reason: '必填字段不能为空' });
      }
      if (!departmentNames) {
        errors.push({ row: rowNum, field: '责任部门', value: departmentNames, reason: '必填字段不能为空' });
      }
      if (!workPlan) {
        errors.push({ row: rowNum, field: '工作计划', value: workPlan, reason: '必填字段不能为空' });
      }
      if (!planCompleteTimeStr || !parseExcelDate(planCompleteTimeStr)) {
        errors.push({ row: rowNum, field: '计划完成时间', value: planCompleteTimeStr, reason: '必填字段，格式为 YYYY-MM-DD' });
      }

      const hasProposedLeader = proposedLeaderName && leaderNameToId.has(proposedLeaderName);
      const hasApprovalLeader = approvalLeaderName && leaderNameToId.has(approvalLeaderName);
      if (!hasProposedLeader && !hasApprovalLeader) {
        errors.push({
          row: rowNum,
          field: '事项提出领导/指定审批领导',
          value: `${proposedLeaderName}/${approvalLeaderName}`,
          reason: '事项提出领导或指定审批领导至少需要填写一个，且必须是公司领导（董事长/总经理/副总经理）',
        });
      }

      if (errors.filter((e) => e.row === rowNum).length === 0) {
        const deptIds: number[] = [];
        const deptNames = departmentNames.split('/').map((s: string) => s.trim()).filter(Boolean);
        for (const dn of deptNames) {
          const resolved = resolveDeptId(dn);
          if (!resolved) {
            errors.push({ row: rowNum, field: '责任部门', value: dn, reason: `部门"${dn}"不存在或不是业务部门，请填写部门全名或缩写代码，多个用 / 分隔` });
          } else {
            deptIds.push(resolved);
          }
        }

        // 配合部门名称 → ID 转换（Phase 4A：修复之前 cooperateDepartmentIds 硬编码为 [] 的 bug）
        const cooperateDeptIds: number[] = [];
        const cooperateDeptNameList = cooperateDepartmentNames
          ? cooperateDepartmentNames.split('/').map((s: string) => s.trim()).filter(Boolean)
          : [];
        for (const cn of cooperateDeptNameList) {
          const resolved = resolveDeptId(cn);
          if (!resolved) {
            errors.push({ row: rowNum, field: '配合部门', value: cn, reason: `配合部门"${cn}"不存在或不是业务部门，请填写部门全名或缩写代码，多个用 / 分隔` });
          } else {
            cooperateDeptIds.push(resolved);
          }
        }

        if (errors.filter((e) => e.row === rowNum).length === 0) {
          rows.push({
            row: rowNum,
            data: {
              type: 'TODO',
              proposedLeaderId: hasProposedLeader ? leaderNameToId.get(proposedLeaderName) : null,
              proposedLeaderName: proposedLeaderName,
              approvalLeaderId: hasApprovalLeader ? leaderNameToId.get(approvalLeaderName) : null,
              approvalLeaderName: approvalLeaderName,
              proposedScene,
              workItem,
              formedTime: parseExcelDate(formedTimeStr),
              departmentNames: deptNames,
              departmentIds: deptIds,
              responsiblePersons: responsiblePersons.split('/').map((s: string) => s.trim()).filter(Boolean),
              cooperateDepartmentIds: cooperateDeptIds,
              cooperatePersons: cooperatePersons.split('/').map((s: string) => s.trim()).filter(Boolean),
              workPlan,
              planCompleteTime: parseExcelDate(planCompleteTimeStr),
              progress,
            },
          });
        }
      }
    }
  }

  return { rows, errors };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const currentUser = await getUserFromToken(token);
    if (!currentUser) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }

    const { type } = await params;
    const validTypes = ['priority', 'main', 'todo', 'PRIORITY', 'MAIN', 'TODO'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: '无效的导入类型' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: '请选择要导入的文件' }, { status: 400 });
    }

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json({ error: '只支持 .xlsx 或 .xls 格式' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const { rows, errors } = await validateAndParseExcel(buffer, type, currentUser);

    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: '导入失败，请修正以下错误',
          details: errors,
        },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '导入失败',
          details: [{ row: 0, field: 'file', value: '', reason: 'Excel 文件中没有有效数据行' }],
        },
        { status: 400 }
      );
    }

    for (const row of rows) {
      if (type === 'priority' || type === 'PRIORITY' || type === 'main' || type === 'MAIN') {
        if (!isCompanyLevelRole(currentUser.role)) {
          if (row.data.departmentId !== currentUser.departmentId) {
            return NextResponse.json(
              {
                success: false,
                error: '导入失败',
                details: [
                  {
                    row: row.row,
                    field: '责任部门',
                    value: row.data.departmentName,
                    reason: `您无权向${row.data.departmentName}导入事项，部门用户只能导入本部门事项`,
                  },
                ],
              },
              { status: 403 }
            );
          }
        }
      }
    }

    const now = new Date();
    const workItems = rows.map((row): any => {
      const data = row.data;
      if (data.type === 'PRIORITY' || data.type === 'MAIN') {
        return {
          type: data.type as WorkItemType,
          title: data.workItem,
          status: WorkItemStatus.DRAFT,
          creatorId: currentUser.id,
          departmentId: data.departmentId,
          businessCategory: data.businessCategory || null,
          workItem: data.workItem,
          isInnovation: data.isInnovation || false,
          workNode: data.workNode || null,
          completeTime: data.completeTime ? new Date(data.completeTime) : null,
          completeForm: data.completeForm || null,
          responsibleLeader: data.responsibleLeader || null,
          supervisor: data.supervisor || null,
          deptLeaderId: data.deptLeaderId || null,
          deptLeaderName: data.deptLeaderName || null,
          deptManagerId: data.deptManagerId || null,
          deptManagerName: data.deptManagerName || null,
          createdAt: now,
          updatedAt: now,
        };
      } else {
        // 默认 approvalLeaderId = proposedLeaderId（提出领导也负责后续审批）
        // 仅当明确指定了不同的审批领导时才使用不同的值
        const finalProposedLeaderId = data.proposedLeaderId || data.approvalLeaderId;
        const finalApprovalLeaderId = data.approvalLeaderId || finalProposedLeaderId;

        return {
          type: 'TODO' as WorkItemType,
          title: data.workItem,
          status: WorkItemStatus.DRAFT,
          creatorId: currentUser.id,
          departmentId: data.departmentIds[0] || currentUser.departmentId,
          proposedLeaderId: finalProposedLeaderId,
          approvalLeaderId: finalApprovalLeaderId,
          proposedScene: data.proposedScene || null,
          workItem: data.workItem,
          formedTime: data.formedTime ? new Date(data.formedTime) : null,
          departmentIds: data.departmentIds,
          cooperateDepartmentIds: data.cooperateDepartmentIds || [],
          responsiblePersons: data.responsiblePersons,
          cooperatePersons: data.cooperatePersons,
          workPlan: data.workPlan,
          planCompleteTime: data.planCompleteTime ? new Date(data.planCompleteTime) : null,
          progress: data.progress || null,
          createdAt: now,
          updatedAt: now,
        };
      }
    });

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.workItem.createMany({ data: workItems });

      await tx.operationLog.create({
        data: {
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'import',
          module: 'excel',
          targetType: 'workItem',
          targetId: 0,
          description: `导入${rows.length}条${type.toUpperCase()}事项`,
        },
      });

      return created;
    });

    return NextResponse.json({
      success: true,
      imported: result.count,
      message: `成功导入 ${result.count} 条事项，导入后状态为草稿，请确认后手动提交审批`,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: '导入失败：' + (error as Error).message }, { status: 500 });
  }
}