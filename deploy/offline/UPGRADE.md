# 公司内网日常升级

upgrade 包只用于已经完成首次部署的环境。服务器必须已有并正在使用：

- `supervision-db` PostgreSQL 容器；
- `.env.production`；
- `data/postgres/`、`uploads/` 和 `backup/`。

upgrade 包只包含当前版本 app/ops 镜像、Compose、升级脚本和校验信息，不包含 PostgreSQL 镜像或管理员初始化入口。

## 外网生成

日常升级默认使用提交日期和 12 位 Git SHA：

```bash
sh deploy/offline/scripts/package-release.sh upgrade
```

产物示例：

```text
offline-release/
├─ supervision-system-upgrade_20260804-16381db8dfd8.tar
└─ supervision-system-upgrade_20260804-16381db8dfd8.tar.sha256
```

## 内网升级

验证外层归档校验文件后，将包内容覆盖到 `/opt/supervision-system/`。必须保留现有 `.env.production`、`data/`、`uploads/` 和 `backup/`。

```bash
cd /opt/supervision-system
sh scripts/upgrade.sh /opt/supervision-system
```

标准升级固定执行：

1. 确认现有数据库容器正在运行；
2. 使用 `pg_dump` 创建升级前备份；
3. 校验并加载当前 app/ops 镜像；
4. 执行 `prisma migrate deploy`；
5. 只重建 app，不启动或替换数据库；
6. 显示 app 状态。

没有待执行 migration 时，ops 会正常成功退出；不需要人工判断本次是否修改 Prisma。

## 年度字段历史回填

仅从尚未完成 `assessmentYear` 历史回填的旧版本升级时执行：

```bash
sh scripts/upgrade.sh /opt/supervision-system --migrate-only
sh scripts/backfill-assessment-year.sh --dry-run /opt/supervision-system
sh scripts/backfill-assessment-year.sh --apply /opt/supervision-system
sh scripts/upgrade.sh /opt/supervision-system --restart-app
```

默认回填年度为 2026；如经业务确认需要其他年度，可临时设置 `DEFAULT_YEAR`。脚本只更新 `assessmentYear IS NULL` 的记录，必须先核对 dry-run 数量。

## 验收与回滚

```bash
docker compose ps
docker logs --tail 100 supervision-app
```

保留上一版 VERSION、Compose 和镜像归档。仅 app 代码异常时可以恢复上一版 app；数据库 migration 不自动回滚，涉及数据库结果回退时必须使用升级前备份。

升级后如需附件存储对账，使用系统管理员账号进入“系统管理 → 附件存储维护”先只读检查，再二次确认清理。页面不可用时只允许调用管理员 API，不提供绕过登录身份的命令行清理入口。
