# GitHub 协作流程

本文档说明 Issue、分支、PR、CI 和发布验收流程。AI Agent 的开发约束以 `AGENTS.md` 为准。

## 分支策略

- `main` 是测试环境稳定分支，不允许直接提交。
- 不创建 `develop` 分支。
- 所有修改通过 PR 合并到 `main`。
- PR 必须等待 CI 通过后才能合并。

## AI 执行模式

每个 Issue 必须指定执行模式，详见 `AGENTS.md`：

| 模式 | 风险等级 | 适用场景 | AI 自主程度 |
|------|:---:|------|:---:|
| `Autopilot` | 低 | 文档、配置、小 UI、低风险 bug、lint/type/build 修复 | 全自动 |
| `Supervised-Batch` | 中低 | 文档目录重构、历史文档归档、无用文件清理、工程配置整理 | 可在确认边界内批量执行，不每步确认 |
| `Supervised` | 中 | 统计口径、权限展示、列表筛选、导出逻辑、页面和 API 联动 | 分阶段，关键节点 Codex Review |
| `Locked` | 高 | 数据库 schema、审批流、状态机、权限模型、部署架构、数据迁移 | 仅分析和出方案 |

### Supervised-Batch 执行规则

`Supervised-Batch` 适用于已经完成审计、用户已确认关键风险点、可以在明确边界内批量执行的中低风险任务。

典型场景：
- 文档目录重构；
- 历史过程文档归档；
- 无用测试文件清理；
- 工程配置整理；
- 低风险重复文件整理；
- 已确认无引用文件删除；
- 非业务代码的仓库结构治理。

执行规则：
1. AI 可以在用户确认的边界内一次性完成多个相关操作；
2. 不需要每移动、归档、删除一个文件都等待确认；
3. 必须先做引用检查，再处理文件移动或删除；
4. 只在触发暂停条件时停止；
5. 完成后输出最终收口报告。

必须暂停的情况：
1. 发现待删除文件仍被 package.json、CI、脚本或代码引用；
2. 发现某历史文档仍是当前有效规则来源；
3. 需要修改业务代码；
4. 需要修改数据库 schema 或 migrations；
5. 需要修改权限、审批流、状态机；
6. 需要修改 Docker、Vercel、Supabase、群晖部署架构；
7. 删除或合并操作存在不确定性；
8. 修改范围超出用户确认边界。

## 分支命名

| 分支类型 | 命名格式 | 适用场景 |
|---------|----------|----------|
| Bug 修复 | `fix/xxx` | 功能异常、权限异常、统计异常、页面异常 |
| 功能需求 | `feature/xxx` | 新增功能、页面优化、交互优化、流程增强 |
| 业务规则调整 | `logic/xxx` | 权限、审批流、状态机、统计口径调整 |
| 文档更新 | `docs/xxx` | 文档整理、说明补充、流程说明 |
| 配置维护 | `chore/xxx` | 依赖升级、忽略文件、工具配置、工程化维护 |

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

群晖环境统一使用 `docker-compose`，不使用 `docker compose`，不使用 `-f` 参数。详细说明见 `docs/deploy/部署说明-群晖.md`。

## 验收与关闭 Issue

1. 确认 CI 通过。
2. 确认 Docker 镜像构建成功。
3. 按 `docs/release/测试发布检查清单.md` 验证测试环境。
4. 使用本次修改涉及的角色完成验证。
5. 测试通过后关闭对应 Issue。
