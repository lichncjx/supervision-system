# 群晖部署说明

## 部署目录建议

```
/volume1/docker/supervision-system/
├── docker-compose.yml
├── .env
├── deploy.sh
├── migrate.sh
├── postgres_data/
└── uploads/
```

> **注意**：
> - 所有部署文件已集中在 `deploy/synology/` 目录下
> - 将 `docker-compose.yml` 复制到部署目录后直接使用
> - 所有命令使用 `docker-compose`
> - 不使用 `docker compose`
> - 不使用 `-f` 参数

## 部署脚本说明

| 脚本 | 用途 | 使用场景 |
|------|------|----------|
| `deploy.sh` | 日常应用发布 | 普通业务代码、页面、权限、统计修复等更新 |
| `migrate.sh` | 数据库迁移 | 涉及 `prisma/**`、数据库表结构、字段、迁移文件变化时 |

### 什么时候用哪个脚本

- **普通业务代码、页面、权限、统计修复**：只需执行 `deploy.sh`
- **涉及数据库结构变化**（表结构、字段、新增迁移）：必须先执行 `migrate.sh`，再执行 `deploy.sh`

### migrate 镜像构建策略

GitHub Actions 按需构建 migrate 镜像：
- 普通业务代码变化：只重建 app 镜像
- 以下文件变化时：同时重建 migrate 镜像
  - `prisma/**`
  - `package.json`
  - `pnpm-lock.yaml`
  - `Dockerfile`
  - `.github/workflows/docker-publish.yml`

如需强制重建 migrate 镜像，可在 GitHub Actions 页面手动触发 `Build and Publish Docker Images`，并选择 `force_migrate: true`。

## 首次部署步骤

1. 登录群晖，打开终端或 SSH
2. 创建部署目录：
   ```bash
   mkdir -p /volume1/docker/supervision-system
   cd /volume1/docker/supervision-system
   ```
3. 将 `deploy/synology/` 下的文件复制到部署目录：
   - `docker-compose.yml`
   - `.env.example` → 重命名为 `.env`
   - `deploy.sh`
   - `migrate.sh`
4. 修改 `.env` 文件，填写真实配置：
   ```env
   POSTGRES_PASSWORD=你的强密码
   JWT_SECRET=你的JWT密钥（足够复杂的随机字符串）
   NEXT_PUBLIC_APP_URL=http://你的群晖IP:18080
   ```
5. 登录 GitHub Container Registry：
   ```bash
   docker login ghcr.io
   ```
   > 使用 GitHub 用户名和 Personal Access Token（需要 read:packages 权限）
6. 给部署脚本添加执行权限：
   ```bash
   chmod +x deploy.sh migrate.sh
   ```
7. 执行首次部署（包含数据库迁移）：
   ```bash
   sh migrate.sh
   sh deploy.sh
   ```

## 日常更新步骤

### 普通发布（无数据库变化）

普通业务代码、页面、权限、统计修复等更新，只需执行 `deploy.sh`：

```bash
cd /volume1/docker/supervision-system
sh deploy.sh
```

### 涉及数据库变化时的发布

涉及 `prisma/**` 或数据库结构变化时，先执行 `migrate.sh`，再执行 `deploy.sh`：

```bash
cd /volume1/docker/supervision-system
sh migrate.sh
sh deploy.sh
```

> **重要说明**：
> 1. 普通发布只执行 `sh deploy.sh`
> 2. 数据库结构变化时先执行 `sh migrate.sh`，再执行 `sh deploy.sh`
> 3. 所有命令使用 `docker-compose`
> 4. 不使用 `docker compose`
> 5. 不使用 `-f` 参数
> 6. 用户会手动将 compose 文件改名为默认识别文件名

> **执行 migration 后必须执行 `prisma generate`**，确保 Prisma Client 类型与数据库结构一致。部署脚本（deploy.sh / migrate.sh）中已包含此步骤。

### 年度字段的两阶段迁移

`assessmentYear` 先以可空字段上线，避免在未知历史数据上直接增加非空约束。生产环境需要保留数据时，按以下顺序执行：

```bash
# 1. 先应用只新增可空字段与索引的 Prisma migration
sh migrate.sh

# 2. 从具备 DATABASE_URL 的受控运行环境执行；先预检再显式应用
pnpm db:backfill-assessment-year -- --default-year=2026 --dry-run
pnpm db:backfill-assessment-year -- --default-year=2026 --apply
```

该脚本只更新 `assessmentYear IS NULL` 的记录，重复执行安全；不会根据当前开发库或创建时间猜测年度。确认空值为零后，才可以在后续独立发布中增加非空约束迁移并将 Prisma schema 改为必填。

## 查看日志

```bash
# 查看应用日志
docker logs -f supervision-app

# 查看迁移日志
docker logs supervision-migrate

# 查看数据库日志
docker logs -f supervision-db
```

## 查看容器状态

```bash
docker-compose ps
```

## 停止服务

```bash
docker-compose down
```

## 只重启 app

```bash
docker-compose up -d app
```

## 手动执行数据库迁移

```bash
sh migrate.sh
```

## 健康检查

应用提供健康检查接口：
- 地址：`http://你的群晖IP:18080/api/health`
- 响应：
  ```json
  {
    "status": "ok",
    "service": "supervision-system",
    "timestamp": "2026-05-03T10:00:00.000Z"
  }
  ```

## 常见问题排查

### GHCR 登录失败

**问题**：`docker login ghcr.io` 认证失败

**解决**：
1. 确认使用 GitHub Personal Access Token 而非密码
2. Token 需包含 `read:packages` 权限
3. 访问：https://github.com/settings/tokens 创建 Token

### 镜像拉取慢

**问题**：从 ghcr.io 拉取镜像速度慢

**解决**：
1. 配置 Docker 镜像加速（需要在群晖 Docker 注册表中配置）
2. 或者选择网络状况较好的时段更新

### 端口 18080 被占用

**问题**：启动时提示端口已被占用

**解决**：
1. 修改 `docker-compose.yml` 中的端口映射：
   ```yaml
   ports:
     - "你的端口:5000"
   ```
2. 同时更新 `.env` 中的 `NEXT_PUBLIC_APP_URL`

### .env 缺失

**问题**：提示 `.env` 文件未找到

**解决**：
1. 复制 `.env.example` 为 `.env`
2. 填写必要的配置项

### POSTGRES_PASSWORD 不一致

**问题**：数据库密码与之前不同导致无法连接

**解决**：
1. 如果是新部署，确认密码一致
2. 如果是旧部署，**不要修改** `POSTGRES_PASSWORD`，保持与首次部署时一致
3. 如果确实需要修改，需要删除 `postgres_data` 并重新初始化（会清空所有数据）

### migrate 执行失败

**问题**：迁移容器执行失败或退出码非 0

**解决**：
1. 查看迁移日志：`docker logs supervision-migrate`
2. 确认数据库已正常启动
3. 检查 `DATABASE_URL` 配置是否正确
4. 手动执行迁移：`docker-compose run --rm migrate`

### app 容器反复重启

**问题**：应用容器不断重启

**解决**：
1. 查看应用日志：`docker logs -f supervision-app`
2. 检查数据库连接是否正常
3. 检查 `.env` 配置是否正确
4. 确认数据库迁移已成功执行

### 附件存储对账

附件记录与物理文件采用最终一致性设计。数据库事务提交后的即时清理失败，或上传落盘后进程异常退出，可能留下没有数据库引用的孤儿文件。

1. 使用系统管理员账号登录，在“系统管理 → 附件存储维护”中执行只读检查；页面固定使用 24 小时安全时间窗。
2. 核对候选路径后，通过二次确认执行清理。执行时服务端会重新扫描，只删除数据库无引用且超过安全时间窗的文件。
3. `missingReferencedPaths` 表示数据库有附件记录但物理文件缺失，只用于排查，系统不会自动删除对应数据库记录。
4. 页面不可用时，可按 `docs/core/API说明.md` 直接调用管理员 API。实际清理统一通过管理员页面或管理员 API 执行，不提供绕过登录身份的命令行清理入口。

生产环境不配置自动定时清理。建议管理员先 dry-run，并结合 `uploads` 备份核对后再显式执行。

### 页面无法访问

**问题**：浏览器无法打开系统

**解决**：
1. 确认容器正在运行：`docker-compose ps`
2. 检查端口是否正确映射
3. 检查群晖防火墙是否允许 18080 端口
4. 检查 `NEXT_PUBLIC_APP_URL` 是否正确配置

## 注意事项

### 近期重要 Migration 记录

以下 migration 已合入 `main`，部署时需确保已执行：

| 阶段 | 内容 | 涉及表 |
|------|------|--------|
| Phase 2 | 新增 `deptLeaderId` / `deptLeaderName` / `deptManagerId` / `deptManagerName` 四列 | `work_items` |
| Phase 3A | 新增 `category` 字段 | `attachments` |

**执行顺序**：
1. 先执行 `sh migrate.sh`（DDL 变更）
2. 再执行 `sh deploy.sh`（发布应用）

旧字段 `responsibleLeader` / `supervisor` 未删除，不需要清理历史数据。

### Vercel Preview 环境说明

Vercel Preview 环境**不会自动执行数据库迁移**。每次涉及 `prisma/**` 变更的 PR 合并后，需手动对 Preview 数据库执行：
```bash
DATABASE_URL="..." DIRECT_URL="..." pnpm prisma:deploy
```

### ⚠️ 重要提示

1. **不要删除 `postgres_data` 目录**，除非确认要清空数据库
2. **不要删除 `uploads` 目录**，避免丢失上传的附件
3. **不要在群晖本地构建镜像**，所有镜像都从 GHCR 拉取
4. **deploy.sh 不会执行数据库迁移**
5. **migrate.sh 不会清空数据库**
6. **涉及数据库结构变化时，必须先执行 migrate.sh，再执行 deploy.sh**

### 数据安全

- 定期备份 `postgres_data` 和 `uploads` 目录
- 部署前先在测试环境验证
- 生产环境更新前先备份数据库

### 环境变量

- `POSTGRES_PASSWORD`：首次设置后不要随意更改
- `JWT_SECRET`：更改会导致所有用户需要重新登录
- `NEXT_PUBLIC_APP_URL`：确保与实际访问地址一致

## 技术架构

### 服务依赖

```
db (PostgreSQL)
  ↓
migrate (执行迁移，仅数据库结构变化时)
  ↓
app (Next.js 应用)
```

### 部署流程

**deploy.sh**：
1. 拉取 app 镜像
2. 启动数据库
3. 启动应用
4. 清理悬空镜像

**migrate.sh**：
1. 拉取 migrate 镜像（可能较慢）
2. 启动数据库
3. 执行数据库迁移
