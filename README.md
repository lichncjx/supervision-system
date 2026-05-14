# 公司督办管理系统

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

访问地址：`http://localhost:5000`

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

## 文档入口

- **AI Agent 开发规范**：[AGENTS.md](AGENTS.md)
- **完整文档索引**：[docs/README.md](docs/README.md) — 包含核心必读、业务规则、部署运维、发布测试、历史归档的全部文档导航和推荐阅读顺序

## 开发约束

1. 必须使用 pnpm。
2. 优先使用 shadcn/ui 组件。
3. 遵循 Next.js App Router 规范，正确区分服务端和客户端组件。
4. 权限、审批流、状态机、统计口径修改前必须先阅读 `docs/core/业务规则.md`。
5. 所有关键操作必须有服务端权限校验。
