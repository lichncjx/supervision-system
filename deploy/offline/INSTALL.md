# 公司内网首次安装

## 安装包内容

完整安装包由 `package-release.sh release <Git-Tag>` 生成，包含：

```text
supervision-system-install_<TAG>/
├─ images/
│  ├─ supervision-system-app_<TAG>.tar.gz
│  ├─ supervision-system-ops_<TAG>.tar.gz
│  └─ postgres_16.tar.gz
├─ scripts/
│  ├─ install.sh
│  ├─ upgrade.sh
│  ├─ load-images.sh
│  └─ backfill-assessment-year.sh
├─ docker-compose.yml
├─ .env.production.template
├─ VERSION
├─ SOURCE_COMMIT
├─ IMAGE_MANIFEST.txt
└─ SHA256SUMS.txt
```

## 准备目录与配置

将安装包解压到目标目录：

```bash
mkdir -p /opt/supervision-system
cd /opt/supervision-system
```

复制并修改运行配置：

```bash
cp .env.production.template .env.production
chmod 600 .env.production
vi .env.production
```

必须设置：

- `POSTGRES_PASSWORD`
- `DATABASE_URL` / `DIRECT_URL` 中相同且经过 URL 编码的数据库密码
- 足够长的随机 `JWT_SECRET`
- 实际内网访问地址 `NEXT_PUBLIC_APP_URL`

初始管理员密码不写入 `.env.production`。

## 执行首次安装

```bash
sudo sh scripts/install.sh /opt/supervision-system
```

脚本需要具备修改 `uploads/` 所有权和操作 Docker 的权限；已经使用 root 会话时可省略 `sudo`。

安装脚本依次执行：

1. 创建持久化目录，并将 `uploads/` 所有权设置为 app 容器使用的 UID/GID `1001:1001`；
2. 校验并导入 PostgreSQL、app、ops 镜像并启动 PostgreSQL；
3. 执行全部待应用 Prisma migrations；
4. 从终端隐藏读取一次性管理员初始密码；
5. create-only 创建基础部门和唯一的 `admin` 账号；
6. 启动应用并显示容器状态。

管理员 bootstrap 是 create-only：只补齐缺失的基础部门，不修改既有部门；检测到现有管理员或 `admin` 用户名时会拒绝执行，绝不会重置已有密码、角色或部门。首次登录后应立即修改初始密码，再由管理员创建其他系统用户。

## 验收

```bash
docker compose ps
docker logs --tail 100 supervision-app
```

确认：

1. PostgreSQL 和 app 容器正常；
2. `/api/health` 返回成功；
3. `admin` 可以登录并修改密码；
4. `data/postgres/` 与 `uploads/` 重启后仍保留；
5. 不存在测试事项或演示账号。

旧版环境没有 `docker compose` 时，脚本会自动使用 `docker-compose`。
