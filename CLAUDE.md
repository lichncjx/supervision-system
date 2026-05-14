# Claude Code 项目入口

本项目的 AI 开发规范以 `AGENTS.md` 为唯一权威入口。Claude Code 开始任何任务前必须先阅读：

- `AGENTS.md`
- `docs/core/GitHub协作流程.md`

涉及业务逻辑、权限、审批流、状态机、统计口径、数据模型时，还必须阅读：

- `docs/core/业务规则.md`
- `docs/core/项目说明.md`

涉及部署、迁移、群晖环境时，还必须阅读：

- `docs/deploy/部署说明-群晖.md`

## AI 执行模式

项目支持四种 AI 执行模式，详见 `AGENTS.md`：

- `Autopilot`：低风险任务，AI 自动完成全流程。
- `Supervised-Batch`：已完成审计且用户确认边界的中低风险批量任务，AI 可在确认范围内一次性完成多个相关操作，不需每步确认。
- `Supervised`：中风险任务，分阶段推进，大阶段后报告，关键节点 Codex Review。
- `Locked`：高风险任务，AI 只能分析和出方案，不能直接编码。

## Claude Code 特别提醒

1. 不要直接修改或提交 `main`。
2. 文档更新使用 `docs/xxx` 分支，配置维护使用 `chore/xxx` 分支。
3. 开工前先检查当前分支和工作区状态，不要覆盖用户未提交改动。
4. 修改完成后按任务风险运行 `pnpm lint`、`pnpm typecheck`、`pnpm build` 或 `pnpm check`。
5. PR 描述使用 `.github/pull_request_template.md`。
