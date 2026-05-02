# 公司督办管理系统 - 项目文档

## 项目概览

公司督办管理系统是一个用于跟踪和管理公司重点工作、主要工作、待办事项的企业级应用。

### 版本技术栈

- **Framework**: Next.js 15 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **数据库**: PostgreSQL (使用 Prisma ORM)

### 目录结构

```
├── public/                     # 静态资源
├── scripts/                     # 构建与启动脚本
├── prisma/                      # Prisma 数据库模型和种子数据
├── src/
│   ├── app/                     # 页面路由 (App Router)
│   │   ├── (app)/              # 已认证的应用页面
│   │   │   ├── [type]/         # 事项列表页（动态路由: priority/main/todo）
│   │   │   │   ├── new/        # 新建事项页
│   │   │   │   └── [id]/       # 事项详情页
│   │   │   ├── approval/       # 审批中心
│   │   │   ├── status/         # 状态筛选页面
│   │   │   └── page.tsx        # 首页/Dashboard
│   │   ├── login/              # 登录页
│   │   └── api/                # API 接口
│   │       ├── auth/           # 认证 API
│   │       ├── departments/    # 部门管理 API
│   │       ├── users/          # 用户管理 API
│   │       ├── works/          # 事项管理 API
│   │       ├── attachments/    # 附件管理 API
│   │       ├── dashboard/      # 仪表盘统计 API
│   │       ├── excel/          # Excel 导入导出 API
│   │       ├── upload/         # 文件上传 API
│   │       └── operation-logs/ # 操作日志 API
│   ├── components/
│   │   ├── ui/                 # Shadcn UI 组件库
│   │   ├── layout/             # 布局组件
│   │   ├── common/             # 通用组件
│   │   ├── providers/          # React Context Providers
│   │   └── work/               # 工作事项相关组件
│   │       ├── work-list-toolbar.tsx
│   │       ├── work-list-pagination.tsx
│   │       ├── priority-main-work-list-item.tsx
│   │       ├── todo-work-list-item.tsx
│   │       ├── work-operation-panel.tsx
│   │       ├── work-approval-panel.tsx
│   │       ├── work-attachment-panel.tsx
│   │       ├── work-decompose-panel.tsx
│   │       ├── work-returned-panel.tsx
│   │       ├── work-pending-adjustment-panel.tsx
│   │       ├── work-workflow-records.tsx
│   │       └── work-action-dialogs.tsx
│   └── lib/                     # 工具库和服务
│       ├── auth.ts              # 认证工具函数
│       ├── server-auth.ts       # 服务端认证
│       ├── workflow.ts          # 工作流逻辑
│       ├── permissions.ts       # 权限控制工具
│       ├── work-store.ts        # 工作事项状态管理
│       └── utils.ts             # 通用工具函数
├── next.config.ts               # Next.js 配置
├── package.json                 # 项目依赖管理
└── tsconfig.json                # TypeScript 配置
```

## 功能模块

### 1. 登录与认证
- 用户名 + 密码登录
- 会话管理（24小时有效）
- 登录信息存储在Cookie中

### 2. 首页 (Dashboard)
- 统计卡片：总事项、待审批、进行中、已完成、超期
- 分类统计：重点工作、主要工作、待办事项数量
- 最近事项列表
- 待审批提示

### 3. 事项管理
- **重点工作**：红色标识，公司级重要事项
- **主要工作**：蓝色标识，部门主要工作
- **待办事项**：绿色标识，日常任务
- 列表页：搜索、状态筛选、部门筛选、月份筛选
- 详情页：基本信息、节点进度、见证材料、审批记录
- 支持 Excel 导入导出

### 4. 审批中心
- 待审批列表
- 审批操作：同意/退回
- 审批历史

### 5. 系统管理
- 部门管理（固定16个部门）
- 用户管理
- 角色权限说明

## 权限控制

### 用户角色

| 角色 | 标识 | 说明 |
|------|------|------|
| 督办管理员 | ADMIN | 查看全部、录入/导入 |
| 督办人员 | SUPERVISOR | 督办跟踪 |
| 部门主管 | DEPARTMENT_MANAGER | 查看本部门、发起的申请 |
| 部门领导 | DEPARTMENT_LEADER | 查看本部门、审批（部门级） |
| 公司主管领导 | VICE_PRESIDENT | 查看全部、所有审批权限 |
| 公司主要领导 | PRESIDENT | 查看全部、仅重点工作取消审批 |

### 权限规则

1. **数据访问权限**
   - 督办管理员、公司领导：可查看全部数据
   - 部门主管、部门领导：仅可查看本部门数据

2. **审批权限**
   - 部门领导：可审批本部门提交的申请
   - 公司主管领导（副总）：可审批所有申请
   - 公司主要领导（一把手）：仅审批重点工作取消

3. **操作权限**
   - 发起申请：部门主管、部门领导、公司领导
   - 完成/调整/取消：事项责任人或部门领导

## 数据模型

### 事项表 (works)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | serial | 主键 |
| type | varchar | 类型(重点/主要/待办) |
| title | varchar | 事项名称 |
| description | text | 描述 |
| status | varchar | 状态 |
| department_id | integer | 责任部门ID |
| department_ids | integer[] | 责任部门IDs（用于待办） |
| creator_id | integer | 创建人ID |
| creator_role | varchar | 创建人角色 |
| business_category | varchar | 业务类别 |
| work_item | varchar | 工作事项 |
| work_node | varchar | 工作节点 |
| complete_time | varchar | 完成时间 |
| complete_form | varchar | 完成形式 |
| is_innovation | boolean | 是否为创新工作 |
| responsible_leader | varchar | 责任领导 |
| supervisor | varchar | 主管人员 |
| proposed_leader | varchar | 提出领导 |
| proposed_leader_id | integer | 提出领导ID |
| proposed_leader_role | varchar | 提出领导角色 |
| proposed_scene | varchar | 提出场景 |
| formed_time | varchar | 形成时间 |
| responsible_person | varchar | 责任人 |
| responsible_persons | varchar[] | 责任人列表 |
| cooperate_department | varchar | 配合部门 |
| cooperate_department_ids | integer[] | 配合部门IDs |
| cooperate_person | varchar | 配合人 |
| cooperate_persons | varchar[] | 配合人列表 |
| work_plan | text | 工作计划 |
| plan_complete_time | varchar | 计划完成时间 |
| progress | text | 进展情况 |
| proof | text | 见证材料说明 |
| adjust_reason | text | 调整原因 |
| adjust_new_time | varchar | 调整后时间 |
| cancel_reason | text | 取消原因 |
| reject_reason | text | 退回原因 |
| current_approver_id | integer | 当前审批人ID |
| current_approver_role | varchar | 当前审批人角色 |
| approval_leader_id | integer | 指定审批领导ID |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

### 节点表结构 (内嵌于事项)

```
WorkNode {
  id: number
  title: string
  completeTime?: string
  children: WorkSubNode[]
}

WorkSubNode {
  id: number
  title: string
  completeTime?: string
}
```

## 状态定义

| 状态 | 说明 | 颜色 |
|------|------|------|
| draft | 草稿 | 灰色 |
| pending_dept | 待部门审批 | 黄色 |
| pending_company | 待公司审批 | 黄色 |
| approved | 已立项 | 蓝色 |
| in_progress | 进行中 | 蓝色 |
| pending_decompose | 待分解 | 琥珀色 |
| pending_complete | 待完成 | 橙色 |
| pending_evidence_dept | 待部门见证审批 | 橙色 |
| pending_evidence_company | 待公司见证审批 | 橙色 |
| pending_main_leader_cancel | 待一把手审批取消 | 红色 |
| adjusting | 调整审批中 | 紫色 |
| cancelling | 取消审批中 | 紫色 |
| completed | 已完成 | 绿色 |
| cancelled | 已取消 | 灰色 |
| rejected | 已退回 | 红色 |

## 时间颜色规则

| 条件 | 颜色 |
|------|------|
| 超期 | 红色 |
| 半个月内 | 橙色 |
| 本月 | 黄色 |
| 本周 | 蓝色 |

## 固定部门（16个）

1. 综合处
2. 计划生产处
3. 工艺技术处
4. 信息档案中心
5. 质量管理处
6. 人力资源处
7. 综合财务处
8. 设备管理处
9. 行政保障处
10. 保密处
11. 51车间
12. 53车间
13. 55车间
14. 56车间
15. 57车间
16. 58车间

## 默认账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | 123456 | 督办管理员 |
| zh_manager | 123456 | 部门主管 |
| jh_manager | 123456 | 部门主管 |
| vice_president | 123456 | 公司主管领导 |
| president | 123456 | 公司主要领导 |

## API 接口

### 认证 API

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/auth/login | POST | 用户登录 |
| /api/auth/logout | POST | 用户登出 |
| /api/auth/me | GET | 获取当前用户 |
| /api/auth/change-password | PUT | 修改密码 |

### 部门与用户 API

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/departments | GET | 获取部门列表 |
| /api/users | GET/POST | 用户列表/创建用户 |
| /api/users/[id] | GET/PUT/DELETE | 用户详情 |
| /api/users/[id]/password | PUT | 修改用户密码 |
| /api/users/[id]/status | PUT | 修改用户状态 |
| /api/users/by-department | GET | 按部门获取用户 |
| /api/users/department-managers | GET | 获取部门主管列表 |
| /api/users/department-leaders | GET | 获取部门领导列表 |
| /api/users/company-leaders | GET | 获取公司领导列表 |
| /api/roles | GET | 获取角色列表 |

### 事项管理 API

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/works | GET/POST | 事项列表/创建事项 |
| /api/works/[id] | GET/PUT/DELETE | 事项详情 |
| /api/works/[id]/workflow | GET/POST | 工作流操作/记录 |

### 附件与上传 API

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/upload | POST | 文件上传 |
| /api/attachments/[id] | DELETE | 删除附件 |
| /api/attachments/[id]/download | GET | 下载附件 |

### Excel API

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/excel/export | GET | 导出事项到Excel |
| /api/excel/import/[type] | POST | 导入事项从Excel |
| /api/excel/template/[type] | GET | 下载导入模板 |
| /api/excel/completion-rate | GET | 导出完成率统计 |

### 仪表盘与日志 API

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/dashboard/summary | GET | 获取仪表盘统计数据 |
| /api/dashboard/completion-rate | GET | 获取完成率统计 |
| /api/operation-logs | GET | 获取操作日志 |

## 工作流操作

| action | 说明 |
|--------|------|
| submit | 提交审批 |
| evidence | 提交见证材料 |
| approve | 审批通过 |
| reject | 审批退回 |
| adjust | 申请调整 |
| cancel | 申请取消 |
| decompose | 分解待办 |

### 工作流程说明

**重点工作/主要工作流程**:
1. 部门提交 → 待部门领导审批
2. 部门领导审批 → 待公司领导审批
3. 公司领导审批通过 → 已立项/进行中
4. 提交完成材料 → 待见证审批
5. 见证审批通过 → 已完成

**待办事项流程**:
1. 部门发起并分解 → 待分解
2. 部门领导审批分解 → 待提出领导审批
3. 提出领导审批 → 进行中
4. 提交完成材料 → 待完成审批
5. 完成审批通过 → 已完成

**调整/取消流程**:
- 进行中状态可申请调整或取消
- 调整/取消需经过相应的审批流程
- 重点工作取消需公司主要领导审批

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 初始化数据库
```bash
npx prisma db push
npm run db:seed  # 可选：初始化种子数据
```

### 3. 启动开发服务器
```bash
npm run dev
```

### 4. 登录系统
1. 访问 http://localhost:5000/login
2. 使用默认账号登录（admin / 123456）
3. 在顶部切换用户（演示用）

### 5. 使用系统
1. 浏览首页统计信息
2. 查看各类事项列表
3. 进行审批操作
4. 导入导出Excel数据

## 访问地址

http://localhost:5000
