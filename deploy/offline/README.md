# 公司内网离线交付

离线交付使用同一批 `app` / `ops` 镜像组合两种产物，覆盖首次安装、日常升级和灾难恢复。

## 产物选择

| 模式 | 生成产物 | 使用场景 |
|------|----------|----------|
| `upgrade` | 仅 upgrade 包 | 日常向已部署内网环境发布 |
| `release` | 同一 Git Tag 的 upgrade + install 包 | 正式 Release、阶段归档、新环境部署前 |

日常升级默认使用提交日期和 12 位 Git SHA，例如 `20260804-16381db8dfd8`：

```bash
sh deploy/offline/scripts/package-release.sh upgrade
```

正式 Release 必须先给当前提交打 Git Tag，再生成同 Tag 的两套包：

```bash
git tag -a v1.0.0 -m "v1.0.0"
sh deploy/offline/scripts/package-release.sh release v1.0.0
```

`release` 只构建一次 app/ops 镜像；install 包在 upgrade 内容基础上增加 PostgreSQL 镜像、环境模板、安装脚本和管理员初始化能力。

## 文档入口

- [首次安装](INSTALL.md)
- [日常升级](UPGRADE.md)
- [灾难恢复与换机](RECOVERY.md)

## 安全边界

1. 构建交付包时 Git 工作区必须干净。
2. 内网不执行 `pnpm install`、`docker build` 或 `docker pull`。
3. upgrade 不启动、拉取、重建或替换 PostgreSQL。
4. `.env.production`、`data/postgres/` 和 `uploads/` 不包含在升级包中。
5. `seed-demo` 只用于开发测试，生产环境禁止执行。
6. 初始管理员密码不写入长期环境文件，只在首次安装时临时传给一次性 ops 容器。
7. 首次安装仅 create-only 创建基础部门和 `admin`；不创建演示事项或其他预置账号，也不覆盖任何既有记录。
