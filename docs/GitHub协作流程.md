# GitHub 协作流程

本文档说明 Issue、分支、PR、CI 和发布验收流程。AI Agent 的开发约束以 `AGENTS.md` 为准。

## 分支策略

- `main` 是测试环境稳定分支，不允许直接提交。
- 不创建 `develop` 分支。
- 所有修改通过 PR 合并到 `main`。
- PR 必须等待 CI 通过后才能合并。

## 分支命名

| 分支类型 | 命名格式 | 适用场景 |
|---------|----------|----------|
| Bug 修复 | `fix/xxx` | 功能异常、权限异常、统计异常、页面异常 |
| 功能需求 | `feature/xxx` | 新增功能、页面优化、交互优化、流程增强 |
| 业务规则调整 | `logic/xxx` | 权限、审批流、状态机、统计口径调整 |
| 文档更新 | `docs/xxx` | 文档整理、说明补充、流程说明 |

## 标准开发流程

1. 创建或确认 Issue。
2. 检查当前分支和工作区状态：
   ```bash
   git branch --show-current
   git status --short
   ```
3. 从最新 `main` 创建任务分支：
   ```bash
   git checkout main
   git pull origin main
   git checkout -b docs/update-project-docs
   ```
4. 修改代码或文档。
5. 运行必要检查：
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm build
   ```
6. 推送任务分支：
   ```bash
   git push origin docs/update-project-docs
   ```
7. 创建 PR 到 `main`。
8. 等待 CI 通过。
9. 合并后按发布流程更新测试环境。

如果工作区存在用户未提交改动，不要直接切换分支或覆盖文件，应先确认这些改动是否与当前任务相关。

## PR 要求

PR 使用 `.github/pull_request_template.md`，至少说明：

1. 关联 Issue。
2. 修改目的。
3. 修改文件。
4. 修改前后逻辑。
5. 是否影响权限、审批流、状态机、统计口径。
6. 是否涉及 Prisma、数据库结构或迁移。
7. 自测结果和测试角色。
8. 风险点和回退方式。

## CI

PR 到 `main` 时会运行 CI：

1. 安装依赖。
2. TypeScript 检查。
3. Lint。
4. Build。

合并到 `main` 后会触发 Docker 镜像构建和推送。

## 镜像构建

GitHub Actions 会构建应用镜像：

- `ghcr.io/lichncjx/supervision-system:latest`
- `ghcr.io/lichncjx/supervision-system:<commit-sha>`

当以下文件变化时，还会构建迁移镜像：

- `prisma/**`
- `package.json`
- `pnpm-lock.yaml`
- `Dockerfile`
- `.github/workflows/docker-publish.yml`

也可以在 GitHub Actions 手动触发构建，并设置 `force_migrate: true` 强制构建迁移镜像。

## 发布流程

### 普通发布

无数据库结构变化时，在群晖部署目录执行：

```bash
sh deploy.sh
```

### 涉及数据库变化

涉及 `prisma/**`、schema、迁移文件或数据库结构变化时，先迁移再发布：

```bash
sh migrate.sh
sh deploy.sh
```

群晖环境统一使用 `docker-compose`，不使用 `docker compose`，不使用 `-f` 参数。详细说明见 `docs/部署说明-群晖.md`。

## 验收与关闭 Issue

1. 确认 CI 通过。
2. 确认 Docker 镜像构建成功。
3. 按 `docs/测试发布检查清单.md` 验证测试环境。
4. 使用本次修改涉及的角色完成验证。
5. 测试通过后关闭对应 Issue。
