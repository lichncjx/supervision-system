# 公司内网离线部署方案

## 1. 适用场景

本方案适用于 supervision-system 部署在公司内网、内网服务器不能访问互联网、只能通过光盘或介质摆渡文件的场景。外网构建机提前构建并导出 Docker 镜像，内网服务器只负责 `docker load`、配置 `.env.production` 和启动容器。

第一阶段采用旁路部署：不修改服务器已有 OnlyOffice / Nginx，不占用 80/443，本系统固定通过 `http://服务器内网IP:5000` 访问。

## 2. 不要做什么

1. 不要在内网执行 `pnpm install`。
2. 不要在内网执行 `docker pull`。
3. 不要在内网执行 `docker build`。
4. 不要修改服务器已有 OnlyOffice/Nginx。
5. 不要占用 80/443。
6. 不要在正式环境运行 `seed-demo`。
7. 不要每次升级都运行 `seed-admin`，除非部门基础数据或初始化账号规则发生变化。

## 3. 外网构建机准备

外网构建机需要能访问 npm / pnpm registry 和 Docker Hub，并已安装 Docker。建议在干净工作区构建，确认代码版本与准备交付的版本一致。

检查 Docker：

```bash
docker version
```

如需提前拉取 PostgreSQL 镜像：

```bash
docker pull postgres:16
```

## 4. 外网构建镜像

在干净的 Git 工作区中，从项目源码根目录执行辅助脚本：

```bash
sh deploy/offline/scripts/build-images.sh
cat offline-release/VERSION
```

未显式传入 tag 时，脚本使用提交日期和 12 位 Git 短 SHA 生成稳定、可追溯的 tag，例如 `20260722-eb2b7e163ac9`，并写入 `offline-release/VERSION`。工作区存在未提交修改时，自动生成会拒绝构建，避免同一 SHA 对应不同镜像内容。

如需人工指定 tag，可显式传入；脚本仍会将最终值写入 `VERSION`：

```bash
sh deploy/offline/scripts/build-images.sh 20260722-hotfix
```

tag 必须符合 Docker 镜像 tag 规则。显式 tag 适用于经审批的补丁构建或源码目录不包含 Git 元数据的场景。

## 5. 外网导出镜像

构建完成后直接执行：

```bash
sh deploy/offline/scripts/export-images.sh
```

导出脚本默认读取 `offline-release/VERSION`，导出对应 tag 的镜像，生成 tag 匹配的 `docker-compose.yml`，并复制 `.env.production.template`、`README.md` 和辅助脚本到 `offline-release/`。仓库中的 `docker-compose.yml` 使用 `__OFFLINE_IMAGE_TAG__` 占位符，不应绕过导出脚本直接用于部署。

如果需要显式覆盖构建阶段记录的 tag，可以同时传入 tag 和输出目录：

```bash
sh deploy/offline/scripts/export-images.sh 20260722-hotfix offline-release/images
```

显式覆盖会同步更新 `offline-release/VERSION` 和生成后的 compose。生成后的 `offline-release/` 与内网 `/opt/supervision-system/` 目标目录结构一致，可以直接压缩打包。

建议生成校验文件：

```bash
cd offline-release
sha256sum images/*.tar.gz > SHA256SUMS.txt
```

## 6. 光盘/介质摆渡目录结构

建议最终摆渡目录结构为：

```text
offline-release/
├─ images/
│  ├─ supervision-system-app_20260722-eb2b7e163ac9.tar.gz
│  ├─ supervision-system-migrate_20260722-eb2b7e163ac9.tar.gz
│  ├─ supervision-system-seed_20260722-eb2b7e163ac9.tar.gz
│  └─ postgres_16.tar.gz
├─ scripts/
│  ├─ build-images.sh
│  ├─ export-images.sh
│  └─ load-images.sh
├─ docker-compose.yml
├─ VERSION
├─ .env.production.template
├─ README.md
└─ SHA256SUMS.txt
```

`offline-release/` 的结构与内网 `/opt/supervision-system/` 目标目录一致。外网构建机可以直接压缩整个 `offline-release/` 目录，内网解压后将内容放入 `/opt/supervision-system/`。

例如：

```bash
TAG="$(cat offline-release/VERSION)"
tar -czf "supervision-system-offline_${TAG}.tar.gz" offline-release
```

## 7. 内网服务器目录结构

在内网服务器创建部署目录：

```bash
mkdir -p /opt/supervision-system
cd /opt/supervision-system
```

将 `offline-release/` 中的内容放入 `/opt/supervision-system`。推荐结构：

```text
/opt/supervision-system/
├─ images/
├─ scripts/
│  └─ load-images.sh
├─ docker-compose.yml
├─ VERSION
├─ .env.production.template
├─ .env.production
├─ data/
│  └─ postgres/
├─ uploads/
└─ backup/
```

## 8. 内网导入镜像

```bash
cd /opt/supervision-system
TAG="$(cat VERSION)"

gzip -dc "images/supervision-system-app_${TAG}.tar.gz" | docker load
gzip -dc "images/supervision-system-migrate_${TAG}.tar.gz" | docker load
gzip -dc "images/supervision-system-seed_${TAG}.tar.gz" | docker load
gzip -dc images/postgres_16.tar.gz | docker load
```

也可以使用辅助脚本：

```bash
sh /opt/supervision-system/scripts/load-images.sh
```

检查镜像：

```bash
docker images | grep supervision
docker images | grep postgres
```

## 9. 配置 .env.production

```bash
cd /opt/supervision-system
cp .env.production.template .env.production
vi .env.production
```

必须修改：

1. `POSTGRES_PASSWORD`。
2. `DATABASE_URL` 和 `DIRECT_URL` 中的数据库密码，必须与 `POSTGRES_PASSWORD` 一致。
3. `JWT_SECRET`，填写足够长的随机字符串。
4. `NEXT_PUBLIC_APP_URL`、`NEXTAUTH_URL`，改为 `http://服务器内网IP:5000`。
5. `NEXTAUTH_SECRET`，填写足够长的随机字符串。
6. `INITIAL_ADMIN_PASSWORD`，内网正式部署必须设置。
7. `INITIAL_SUPERVISOR_PASSWORD`，内网正式部署必须设置。

首次登录后必须立即修改 `admin` 和 `supervisor` 的初始密码。

部署前检查 5000 端口：

```bash
ss -lntp | grep ':5000'
```

如果系统没有 `ss`，使用：

```bash
netstat -lntp | grep ':5000'
```

如果 5000 被占用，应停止部署并先确认占用来源，不要直接改 OnlyOffice/Nginx。

## 10. 第一次部署

新版 `docker compose`：

```bash
cd /opt/supervision-system

docker compose up -d db
docker compose run --rm migrate
docker compose run --rm seed-admin
docker compose up -d app
```

旧版 `docker-compose`：

```bash
cd /opt/supervision-system

docker-compose up -d db
docker-compose run --rm migrate
docker-compose run --rm seed-admin
docker-compose up -d app
```

## 11. 运行 seed-admin

`seed-admin` 是正式内网初始化入口，只初始化：

1. 全部部门基础数据。
2. `admin` 系统管理员。
3. `supervisor` 督办管理员。

`seed-admin` 不初始化公司主要领导、公司主管领导、部门领导、部门主管、部门成员、测试事项、测试审批记录、测试附件或任何演示数据。正式环境不要运行 `seed-demo`。

`seed-admin` 是幂等的，多次执行不会重复创建部门或这两个账号。但日常升级不要重复运行，除非部门基础数据或初始化账号规则发生变化。运行前应先备份数据库。

## 12. 日常升级

日常升级一般只导入新镜像、替换 `docker-compose.yml` 中的镜像 tag，然后执行迁移和重启 app。

新版 `docker compose`：

```bash
cd /opt/supervision-system

docker compose run --rm migrate
docker compose up -d app
```

旧版 `docker-compose`：

```bash
cd /opt/supervision-system

docker-compose run --rm migrate
docker-compose up -d app
```

不要每次升级都运行 `seed-admin`。只有部门基础数据或初始化账号规则变化时，才考虑运行 `seed-admin`，并且运行前必须先备份数据库。

## 13. 数据库备份

推荐备份：

```bash
mkdir -p /opt/supervision-system/backup

docker exec supervision-db pg_dump -U supervision supervision > /opt/supervision-system/backup/supervision_$(date +%F_%H%M%S).sql
```

如果旧环境 shell 不支持 `$(date ...)`，使用更保守的写法：

```bash
mkdir -p /opt/supervision-system/backup
BACKUP_FILE=/opt/supervision-system/backup/supervision_backup.sql
docker exec supervision-db pg_dump -U supervision supervision > "$BACKUP_FILE"
```

## 14. 回滚方案

1. 升级前必须备份数据库。
2. 保留上一版 app/migrate/seed 镜像及其 `VERSION`。
3. 保留上一版 `docker-compose.yml`。
4. 如果只是 app 代码问题，可以恢复上一版 compose，或把 image tag 改回上一版 `VERSION` 中记录的 tag 后重启 app。
5. 如果数据库迁移已执行且需要回滚，优先使用升级前数据库备份恢复。

恢复备份前应停止 app，确认备份文件和目标数据库，避免覆盖错误环境。

## 15. 查看日志

容器方式：

```bash
docker logs -f supervision-app
docker logs -f supervision-db
docker logs supervision-migrate
docker logs supervision-seed-admin
```

Compose 方式：

```bash
docker-compose logs -f app
docker-compose logs -f db
```

新版命令也可使用：

```bash
docker compose logs -f app
docker compose logs -f db
```

## 16. 常见问题

### docker compose 命令不可用

服务器可能只有旧版命令，改用 `docker-compose`。

### 数据库连接失败

检查 `.env.production` 中 `POSTGRES_PASSWORD`、`DATABASE_URL`、`DIRECT_URL` 的密码是否一致，并查看数据库日志：

```bash
docker logs -f supervision-db
```

### migrate 失败

先确认 db 容器已启动，再查看迁移日志：

```bash
docker logs supervision-migrate
```

### seed-admin 生产环境报缺少密码

生产环境必须设置：

```env
INITIAL_ADMIN_PASSWORD=<正式管理员初始密码>
INITIAL_SUPERVISOR_PASSWORD=<正式督办管理员初始密码>
```

`.env.production.template` 中这些值默认为空，留空或使用模板占位符时 `seed-admin` 会直接失败，避免正式环境误用默认密码。

### 页面无法访问

检查 app 是否运行、5000 端口是否监听、防火墙是否放行：

```bash
docker ps
ss -lntp | grep ':5000'
```

### 5000 端口被占用

停止部署，先确认占用来源。不要修改服务器已有 OnlyOffice/Nginx，也不要占用 80/443。

### 如何执行附件存储对账

离线部署完成后，使用系统管理员账号登录，在“系统管理 → 附件存储维护”中先执行只读检查，再核对并清理孤儿附件文件。

附件存储对账不提供命令行清理入口，避免绕过管理员身份校验和操作日志。页面不可用时，可通过已编译进应用的管理员 API 处理；接口参数和安全限制见 [`docs/core/API说明.md`](../../docs/core/API说明.md#附件存储对账)，完整运维原则见 [`deploy/synology/README.md`](../synology/README.md#附件存储对账)。

## 17. 验收清单

1. `docker ps` 中 `supervision-db` 正常。
2. `docker ps` 中 `supervision-app` 正常。
3. 浏览器可以访问 `http://服务器内网IP:5000`。
4. `admin` 可以登录。
5. `supervisor` 可以登录。
6. 部门数据完整。
7. 不存在编造的部门成员。
8. 不存在测试事项。
9. 重启 app 后数据正常。
10. 重启服务器后容器可恢复。
11. OnlyOffice 原服务未受影响。
12. 80/443 未被本系统占用。
