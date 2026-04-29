# 公司督办管理系统 - 项目文档

## 项目概览

公司督办管理系统是一个用于跟踪和管理公司重点工作、主要工作、待办事项的企业级应用。

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **数据库**: Supabase (PostgreSQL)

### 目录结构

```
├── public/                     # 静态资源
├── scripts/                     # 构建与启动脚本
├── src/
│   ├── app/                     # 页面路由
│   │   ├── api/                 # API 接口
│   │   │   ├── auth/            # 认证 API
│   │   │   ├── departments/     # 部门管理 API
│   │   │   ├── users/           # 用户管理 API
│   │   │   ├── items/           # 事项管理 API
│   │   │   ├── nodes/           # 节点管理 API
│   │   │   ├── approvals/       # 审批管理 API
│   │   │   ├── workflow/        # 工作流 API
│   │   │   └── init/            # 数据初始化 API
│   │   ├── [type]/              # 事项列表页（动态路由）
│   │   ├── [type]/[id]/         # 事项详情页
│   │   ├── approval/            # 审批中心
│   │   ├── login/               # 登录页
│   │   └── admin/               # 系统管理
│   ├── components/
│   │   ├── ui/                  # Shadcn UI 组件库
│   │   ├── layout/              # 布局组件
│   │   ├── common/              # 通用组件
│   │   └── providers/           # React Context Providers
│   ├── lib/                     # 工具库和服务
│   │   ├── services.ts         # 业务服务层
│   │   ├── workflow.ts          # 工作流逻辑
│   │   ├── server-workflow.ts   # 服务端工作流
│   │   ├── permissions.ts       # 权限控制工具
│   │   └── utils.ts             # 通用工具函数
│   └── storage/database/        # 数据库相关
│       └── supabase-client.ts   # Supabase 客户端
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
- 列表页：搜索、状态筛选、部门筛选
- 详情页：基本信息、节点进度、审批记录

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
| 督办管理员 | admin | 查看全部、录入/导入 |
| 部门主管 | department_manager | 查看本部门、发起的申请 |
| 部门领导 | department_leader | 查看本部门、审批（部门级） |
| 公司主管领导 | vice_president | 查看全部、所有审批权限 |
| 公司主要领导 | president | 查看全部、仅重点工作取消审批 |

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

### 部门表 (departments)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | serial | 主键 |
| name | varchar | 部门名称 |
| code | varchar | 部门代码 |
| created_at | timestamp | 创建时间 |

### 用户表 (users)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | serial | 主键 |
| username | varchar | 用户名 |
| name | varchar | 姓名 |
| role | varchar | 角色 |
| department_id | integer | 部门ID |
| password_hash | varchar | 密码哈希 |
| email | varchar | 邮箱 |
| phone | varchar | 电话 |
| created_at | timestamp | 创建时间 |

### 事项表 (items)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | serial | 主键 |
| type | varchar | 类型(priority/main/todo) |
| title | varchar | 事项名称 |
| description | text | 描述 |
| status | varchar | 状态 |
| department_id | integer | 责任部门 |
| owner_id | integer | 责任人 |
| leader_id | integer | 责任领导 |
| priority_date | timestamp | 计划完成时间 |
| actual_date | timestamp | 实际完成时间 |
| adjust_reason | text | 调整原因 |
| created_by | integer | 创建人 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

### 节点表 (nodes)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | serial | 主键 |
| item_id | integer | 事项ID |
| name | varchar | 节点名称 |
| plan_date | timestamp | 计划时间 |
| actual_date | timestamp | 完成时间 |
| deliverable | varchar | 完成形式 |
| sort_order | integer | 排序 |
| status | varchar | 状态 |

### 审批表 (approvals)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | serial | 主键 |
| item_id | integer | 事项ID |
| action_type | varchar | 操作类型 |
| initiator_id | integer | 申请人 |
| current_approver_id | integer | 当前审批人 |
| approval_level | integer | 审批级别 |
| status | varchar | 状态 |
| comment | text | 审批意见 |
| created_at | timestamp | 创建时间 |
| resolved_at | timestamp | 解决时间 |

## 状态定义

| 状态 | 说明 | 颜色 |
|------|------|------|
| draft | 草稿 | 灰色 |
| pending_approval | 待审批 | 黄色 |
| active | 进行中 | 蓝色 |
| pending_complete | 待完成 | 橙色 |
| completed | 已完成 | 绿色 |
| adjusting | 调整中 | 紫色 |
| cancelled | 已取消 | 灰色 |
| rejected | 已退回 | 红色 |
| pending_decompose | 待分解 | 琥珀色 |
| decomposed | 已分解 | 青色 |

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

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/auth | GET/POST/DELETE | 认证管理 |
| /api/auth/password | PUT | 修改密码 |
| /api/departments | GET/POST | 部门管理 |
| /api/users | GET/POST | 用户管理 |
| /api/items | GET/POST | 事项管理 |
| /api/items/[id] | GET/PUT/DELETE | 事项详情 |
| /api/items/stats | GET | 统计数据 |
| /api/nodes | GET/POST | 节点管理 |
| /api/approvals | GET/POST | 审批管理 |
| /api/workflow | POST | 工作流操作 |

## 工作流操作

| action | 说明 |
|--------|------|
| submit | 提交审批 |
| approve | 审批通过 |
| reject | 审批退回 |
| complete | 申请完成 |
| adjust | 申请调整 |
| cancel | 申请取消 |
| decompose | 分解待办 |

## 快速开始

### 1. 初始化数据
数据库已自动创建，运行服务后可直接使用。

### 2. 登录系统
1. 访问 /login 页面
2. 使用默认账号登录（admin / 123456）
3. 在顶部切换用户（演示用）

### 3. 使用系统
1. 浏览首页统计信息
2. 查看各类事项列表
3. 进行审批操作

## 访问地址

http://localhost:5000
