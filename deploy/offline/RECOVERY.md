# 公司内网灾难恢复与换机

灾难恢复使用最近归档的 install 包、数据库备份和 uploads 备份，不运行管理员 bootstrap。

## 恢复顺序

1. 解压 install 包并校验 `SHA256SUMS.txt`；
2. 恢复原 `.env.production`，确认数据库密码和 `JWT_SECRET` 未改变；
3. 恢复 `data/postgres/` 或将 SQL 备份导入新的 PostgreSQL 容器；
4. 恢复 `uploads/`；
5. 加载 install 包中的 PostgreSQL、app、ops 镜像；
6. 启动数据库并执行 ops migration；
7. 启动 app；
8. 如归档 install 版本落后，再连续应用后续 upgrade 包。

使用 SQL 备份恢复时的基本流程：

```bash
sh scripts/load-images.sh /opt/supervision-system
docker compose up -d db
docker exec -i supervision-db psql -U supervision supervision < backup/supervision.sql
docker compose run --rm ops
docker compose up -d --no-deps app
```

不要执行 `install.sh` 或管理员 bootstrap，否则会因现有管理员而失败。不要只恢复数据库而遗漏 uploads；附件数据库记录与物理文件必须成对恢复。

## 恢复验收

1. 使用原管理员账号登录；
2. 检查事项、审批记录和系统配置；
3. 随机抽查附件下载；
4. 检查当前 VERSION 与数据库 migration 状态；
5. 确认备份文件保留到恢复验收完成后。
