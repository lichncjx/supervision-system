# Vercel 预览环境说明

## 定位

| 环境 | 用途 | 触发方式 |
|------|------|---------|
| **Vercel Preview** | PR 功能验收 | PR 创建后自动生成预览链接 |
| **群晖 NAS (Docker)** | main 分支固定测试环境 | 手动部署 |

- Vercel 仅作为 PR Preview 环境，不替代群晖部署。
- Vercel 不连接群晖数据库。
- Vercel 不自动执行数据库迁移。

## 工作流程

1. 创建 feature/fix/logic 分支并提交 PR。
2. Vercel 自动构建并生成 Preview 预览链接（出现在 PR 页面）。
3. 在 Preview 环境中验收功能。
4. 验收通过后合并 PR 到 main。
5. 如需更新固定测试环境，再在群晖上执行部署。

## Vercel 环境变量配置

在 Vercel 项目 Settings → Environment Variables 中配置以下变量：

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `DATABASE_URL` | 是 | Supabase Pooler 连接串，端口 **6543**，需带 `pgbouncer=true` |
| `DIRECT_URL` | 是 | Supabase 直连串，端口 **5432**，用于 Prisma migration |
| `JWT_SECRET` | 是 | Preview 专用随机字符串，不要和群晖共用 |

### Supabase 连接串格式

```
# DATABASE_URL（Pooler，端口 6543）
postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

# DIRECT_URL（直连，端口 5432）
postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

- `DATABASE_URL` 走 Supabase Transaction Pooler（端口 6543），带 `pgbouncer=true`，适用于应用运行时连接池。
- `DIRECT_URL` 走 Supabase 直连（端口 5432），Prisma 在执行 `migrate deploy` 时需要直连而非连接池。

### 不需要配置的变量

- `NEXT_PUBLIC_APP_URL` — 源码中未使用此变量，Vercel 会自动提供预览 URL。
- `POSTGRES_PASSWORD` — 仅 docker-compose 使用。
- `COZE_PROJECT_ENV` — 仅自定义 server (`src/server.ts`) 使用，Vercel 不走此文件。
- `HOSTNAME` / `PORT` — 仅自定义 server 使用。

## Prisma Schema 配置

`prisma/schema.prisma` 的 datasource 已配置 `directUrl`：

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

- `DATABASE_URL` 用于应用运行时查询（走 Pooler）。
- `DIRECT_URL` 用于 `prisma migrate` 等需要直连的操作。

## Preview 数据库

- Vercel Preview 使用 Supabase 独立数据库，不连接群晖数据库。
- Preview 数据库**不自动执行 migrate**，需要提前手动准备好 schema。
- 准备方式：在本地对 Preview 数据库执行一次：

```bash
DATABASE_URL="postgresql://..." DIRECT_URL="postgresql://..." pnpm prisma:deploy
pnpm prisma:generate
```

- 涉及 migration 的变更（如 Phase 2 WorkItem 四列新增、Phase 3A Attachment.category 新增）合并到 `main` 后，需重新执行上述命令。

- 可选：执行 `pnpm prisma:seed` 填充测试数据。
- 每次 PR 部署使用同一套 schema，数据在 PR 之间可选择性清理。
- **不要在 Vercel Preview 构建或运行时自动执行 `prisma migrate deploy`。**

## 文件上传

- Preview 环境的本地文件上传功能**不可用**。
- 原因：Vercel Serverless 函数的文件系统是只读的，项目当前使用本地文件系统存储上传文件。
- 后续如需在 Preview 中使用上传功能，可接入对象存储（如 Vercel Blob、S3 等），本次不做改造。

## 构建配置

项目通过 `vercel.json` 指定构建命令：

```json
{
  "framework": "nextjs",
  "buildCommand": "pnpm prisma:generate && pnpm build"
}
```

- `prisma generate` 在构建时生成 Prisma Client。
- 不会在构建时执行 `prisma migrate deploy`。

## .npmrc

项目使用 `registry=https://registry.npmmirror.com`。Vercel 构建时会读取项目 `.npmrc`。

- npmmirror 在海外有 CDN，通常可用。
- 如果 Vercel 构建时依赖下载失败或过慢，可评估是否切换回默认 registry。

## 注意事项

1. **不要在 Preview 环境中存放真实业务数据。**
2. Preview 数据库应使用测试专用数据。
3. 不要修改 Dockerfile、docker-compose、deploy.sh、migrate.sh。
4. 不要修改业务逻辑、权限、审批流、状态机。
5. Supabase 免费计划有连接数和计算时间限制，Preview 环境注意用量。
