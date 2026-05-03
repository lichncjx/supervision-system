# 公司督办管理系统

用于跟踪和管理公司重点工作、主要工作、待办事项的企业级督办管理系统。

## 技术栈

- **Framework**: Next.js 15 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **数据库**: PostgreSQL + Prisma ORM
- **表单**: React Hook Form + Zod
- **图标**: Lucide React
- **包管理器**: pnpm 9+

## 功能特性

### 事项管理
- **重点工作**：公司级重要事项，红色标识
- **主要工作**：部门主要工作，蓝色标识  
- **待办事项**：日常任务，绿色标识
- 支持搜索、状态筛选、部门筛选、月份筛选
- Excel 导入导出功能

### 审批中心
- 待审批列表
- 审批操作：同意/退回
- 审批历史记录

### 工作流
- 部门审批 → 公司审批 → 立项执行 → 见证材料 → 完成
- 支持申请调整、申请取消
- 待办事项分解审批流程

### 权限控制
- 固定角色：督办管理员、部门主管、部门领导、公司主管领导、公司主要领导
- 数据范围控制：部门用户只能查看和操作本部门事项
- 状态机权限控制：不同状态允许不同操作

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 初始化数据库

```bash
npx prisma db push
npm run db:seed  # 可选：初始化种子数据
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5000 查看应用。

### 构建生产版本

```bash
npm run build
```

### 启动生产服务器

```bash
npm run start
```

## 默认账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | 123456 | 系统管理员 |
| supervisor | 123456 | 督办管理员 |
| president | 123456 | 公司主要领导 |
| vice_president | 123456 | 公司主管领导 |
| dept_leader | 123456 | 综合处领导 |
| dept_manager | 123456 | 综合处主管 |
| dept_leader_2 | 123456 | 计划生产处领导 |
| dept_manager_2 | 123456 | 计划生产处主管 |

## 项目结构

```
src/
├── app/                     # Next.js App Router 页面路由
│   ├── (app)/              # 已认证的应用页面
│   │   ├── [type]/         # 事项列表页（动态路由）
│   │   ├── approval/       # 审批中心
│   │   ├── status/         # 状态筛选页面
│   │   └── page.tsx        # 首页/Dashboard
│   ├── login/              # 登录页
│   └── api/                # API 接口
├── components/
│   ├── ui/                 # shadcn/ui 基础组件
│   ├── layout/             # 布局组件
│   ├── common/             # 通用组件
│   ├── providers/          # React Context Providers
│   └── work/               # 工作事项相关组件
└── lib/                    # 工具库和服务
    ├── auth.ts             # 认证工具函数
    ├── workflow.ts         # 工作流逻辑
    ├── work-store.ts       # 工作事项状态管理
    └── utils.ts            # 通用工具函数
```

## 权限模型

### 固定角色

| 角色 | 标识 | 说明 |
|------|------|------|
| 系统管理员 | ADMIN | 系统配置管理 |
| 督办管理员 | SUPERVISOR | 督办跟踪 |
| 部门主管 | DEPARTMENT_MANAGER | 查看本部门、发起申请 |
| 部门领导 | DEPARTMENT_LEADER | 查看本部门、审批（部门级） |
| 公司主管领导 | VICE_PRESIDENT | 查看全部、所有审批权限 |
| 公司主要领导 | PRESIDENT | 查看全部、仅重点工作取消审批 |

### 权限控制机制

系统根据以下维度进行严格校验：
1. **事项状态**：不同状态允许的操作不同
2. **用户部门**：部门用户只能操作本部门事项
3. **当前审批人**：只有匹配的用户才能审批
4. **事项类型**：重点/主要/待办事项的流程和权限不同

## 开发规范

### 优先使用 shadcn/ui 组件

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
```

### 表单开发

使用 `react-hook-form` + `zod` 进行表单开发。

### 数据获取

服务端组件推荐使用 async/await 获取数据，客户端组件使用 `useEffect` + `fetch`。

### 路径别名

使用 `@/` 路径别名导入模块（已配置）。

## 参考文档

- [Next.js 官方文档](https://nextjs.org/docs)
- [shadcn/ui 组件文档](https://ui.shadcn.com)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [React Hook Form](https://react-hook-form.com)

## 重要提示

1. **必须使用 pnpm** 作为包管理器
2. **优先使用 shadcn/ui 组件** 而不是从零开发基础组件
3. **遵循 Next.js App Router 规范**，正确区分服务端/客户端组件
4. **使用 TypeScript** 进行类型安全开发
5. **查看 docs/项目说明.md** 获取更详细的项目文档
