# 群晖部署说明

群晖在线部署与离线交付使用相同生命周期：数据库、一次性 ops、长期运行 app。所有群晖命令统一使用 `docker-compose`，不使用 `docker compose` 或 `-f` 参数。

## 部署目录

```text
/volume1/docker/supervision-system/
├── docker-compose.yml
├── .env
├── deploy.sh
├── migrate.sh
├── bootstrap-admin.sh
├── postgres_data/
└── uploads/
```

## 镜像版本

主分支构建会为 app/ops 同时发布完整 Git SHA 和 `latest`；`v*` Git Tag 会为两者发布相同 Release Tag。

`.env` 中的 `IMAGE_TAG` 控制两个镜像使用同一版本：

```env
IMAGE_TAG=latest
```

测试环境可跟随 `latest`；正式 Release 建议固定为 `v1.0.0` 或完整提交 SHA，避免 app 与 ops 版本不一致。

## 首次部署

1. 将 `deploy/synology/` 中的 Compose、脚本和 `.env.example` 复制到部署目录。
2. 将 `.env.example` 重命名为 `.env`，填写真实配置并设置 `chmod 600 .env`。
3. 登录 GHCR：

   ```bash
   docker login ghcr.io
   ```

4. 执行数据库迁移：

   ```bash
   sh migrate.sh
   ```

5. 交互式创建唯一管理员：

   ```bash
   sh bootstrap-admin.sh
   ```

6. 启动应用：

   ```bash
   sh deploy.sh
   ```

管理员初始密码只临时传给一次性 ops 容器，不写入 `.env`。检测到现有管理员时 bootstrap 会拒绝执行，不会覆盖密码或角色。首次登录后立即修改密码，再创建其他用户。

## 日常发布

普通应用更新：

```bash
sh deploy.sh
```

涉及数据库结构、Prisma migration 或不确定是否漏跑 migration 时：

```bash
sh migrate.sh
sh deploy.sh
```

`prisma migrate deploy` 会跳过已应用 migration，因此每次发布前执行也安全。Prisma Client 已在 app/ops 镜像构建阶段生成，生产环境执行 migration 后不需要再次运行 `prisma generate`。

## 年度字段历史回填

仅旧环境尚未完成 `assessmentYear` 回填时，从同版本 ops 镜像显式执行：

```bash
docker-compose run --no-deps --rm ops \
  ./node_modules/.bin/tsx \
  scripts/deployment-migrations/20260710-backfill-assessment-year.ts \
  --default-year=2026 --dry-run

docker-compose run --no-deps --rm ops \
  ./node_modules/.bin/tsx \
  scripts/deployment-migrations/20260710-backfill-assessment-year.ts \
  --default-year=2026 --apply
```

必须先核对 dry-run 数量；脚本只更新 `assessmentYear IS NULL` 的记录。

## 备份与恢复

发布前至少备份数据库和 uploads：

```bash
mkdir -p backup
docker exec supervision-db pg_dump -U supervision supervision \
  > "backup/supervision_$(date +%Y%m%d_%H%M%S).sql"
```

数据库 migration 不会随 app 镜像回退。需要回退数据库结果时，停止 app 并使用发布前备份恢复；不要删除 `postgres_data/` 或 `uploads/`。

## 日常运维

```bash
docker-compose ps
docker logs --tail 100 supervision-app
docker logs --tail 100 supervision-db
```

健康检查地址：`http://群晖IP:18080/api/health`。

附件记录与物理文件采用最终一致性设计。使用系统管理员账号进入“系统管理 → 附件存储维护”，先执行只读检查，再核对并清理孤儿文件。生产环境不配置自动清理，也不提供绕过登录身份的命令行清理入口。

## 常见问题

### app 无法启动

1. 检查 `.env` 中数据库密码和 `JWT_SECRET`；
2. 确认 `supervision-db` 健康；
3. 执行 `sh migrate.sh`；
4. 查看 `docker logs supervision-app`。

### GHCR 拉取失败

重新执行 `docker login ghcr.io`，使用具有 `read:packages` 权限的 Token。

### 更改 IMAGE_TAG

确认对应 app 和 ops 标签均存在，再修改 `.env`。正式环境不要只更新一个镜像，也不要使用来源不同的 app/ops 组合。

### 数据库密码变更

已有 PostgreSQL 数据目录不会因修改 `.env` 自动变更数据库内部密码。不要直接修改 `POSTGRES_PASSWORD`；如需轮换，应制定独立的数据库密码变更方案。
