# 公司督办管理系统

用于跟踪和管理公司重点工作、主要工作、待办事项的企业级督办管理系统。

## 技术栈

- Next.js 15 App Router
- React 19
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui
- PostgreSQL + Prisma
- React Hook Form + Zod
- pnpm 9+

## 快速开始

安装依赖：

```bash
pnpm install
```

初始化数据库：

```bash
pnpm prisma:generate
pnpm prisma:deploy
pnpm prisma:seed
```

启动开发服务器：

```bash
pnpm dev
```

访问地址：

```text
http://localhost:5000
```

常用检查：

```bash
pnpm lint
pnpm typecheck
pnpm build
```

或运行聚合检查：

```bash
pnpm check
```

## 默认测试账号

默认密码均为 `123456`。

| 用户名 | 角色 |
|--------|------|
| `admin` | 系统管理员 |
| `supervisor` | 督办管理员 |
| `president` | 公司主要领导 |
| `vice_president` | 公司主管领导 |
| `dept_leader` | 综合处部门领导 |
| `dept_manager` | 综合处部门主管 |
| `dept_leader_2` | 计划生产处部门领导 |
| `dept_manager_2` | 计划生产处部门主管 |

默认账号以 `prisma/seed.ts` 为准。

## 项目目录

```text
src/
├── app/                     # Next.js App Router 页面和 API
│   ├── (app)/               # 已认证的应用页面
│   ├── login/               # 登录页
│   └── api/                 # API 路由
├── components/              # UI、布局、通用和事项组件
└── lib/                     # 认证、权限、工作流、数据访问和工具函数
```

## 文档导航

| 文档 | 用途 |
|------|------|
| `AGENTS.md` | AI Agent / Codex / Claude Code 开发规范 |
| `docs/项目说明.md` | 项目背景、模块、目录、数据模型和 API 概览 |
| `docs/业务规则.md` | 角色、权限、审批流、状态机、统计口径 |
| `docs/GitHub协作流程.md` | 分支、Issue、PR、CI 协作流程 |
| `docs/部署说明-群晖.md` | 群晖部署、迁移、日志和排障 |
| `docs/测试发布检查清单.md` | 测试环境发布前后检查 |
| `docs/发布记录.md` | 正式发布记录模板 |

## 开发约束

1. 必须使用 pnpm。
2. 优先使用 shadcn/ui 组件。
3. 遵循 Next.js App Router 规范，正确区分服务端和客户端组件。
4. 权限、审批流、状态机、统计口径修改前必须先阅读 `docs/业务规则.md`。
5. 所有关键操作必须有服务端权限校验。
