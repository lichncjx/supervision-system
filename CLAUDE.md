# Claude Code 项目入口

本项目的 AI 开发规范以 `AGENTS.md` 为唯一权威入口。Claude Code 开始任何任务前必须先阅读：

- `AGENTS.md`
- `docs/GitHub协作流程.md`

涉及业务逻辑、权限、审批流、状态机、统计口径、数据模型时，还必须阅读：

- `docs/业务规则.md`
- `docs/项目说明.md`

涉及部署、迁移、群晖环境时，还必须阅读：

- `docs/部署说明-群晖.md`

## Claude Code 特别提醒

1. 不要直接修改或提交 `main`。
2. 文档更新使用 `docs/xxx` 分支，配置维护使用 `chore/xxx` 分支。
3. 开工前先检查当前分支和工作区状态，不要覆盖用户未提交改动。
4. 修改完成后按任务风险运行 `pnpm lint`、`pnpm typecheck`、`pnpm build` 或 `pnpm check`。
5. PR 描述使用 `.github/pull_request_template.md`。
