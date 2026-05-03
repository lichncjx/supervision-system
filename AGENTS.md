# 公司督办管理系统 - AI 开发规范

> **重要说明**：本文件用于约束 AI Agent 和开发者的代码修改行为。完整项目背景、目录结构、数据模型、角色权限、状态定义、API 接口说明详见 `docs/项目说明.md`。
>
> **开发前必读**：
> - 开始任何开发任务前，必须先阅读本文件（AGENTS.md）。
> - 涉及业务逻辑、权限、状态机、审批流、统计口径、数据模型时，还必须阅读 `docs/项目说明.md`。

## 一、项目定位
本系统用于管理公司重点工作、主要工作、待办事项，核心是事项、节点、审批、权限、统计、提醒闭环。

## 二、技术栈
- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- PostgreSQL
- Prisma

## 三、核心业务原则

1. 权限优先于页面展示。
2. 页面隐藏按钮不等于权限控制，所有关键操作必须有服务端权限校验。
3. 状态流转必须通过 workflow 层统一处理，页面不得直接改事项状态。
4. 审批记录不得被删除。
5. 统计口径必须和列表查询口径一致。
6. 首页卡片数量必须能和点击后的列表结果对应。
7. 待我处理 = 待审批 + 待办理。
8. 待审批只统计当前用户作为当前审批人的待审批事项。
9. 待办理指不需要审批但需要当前用户处理的事项，例如待分解、退回后修改、待完成确认等。
10. 涉及权限、状态、统计的修改必须说明影响范围。

## 四、开发边界

1. 不要擅自重构数据库结构。
2. 不要擅自引入新的流程引擎。
3. 不要擅自改变角色枚举。
4. 不要擅自改变状态枚举。
5. 不要把测试账号密码硬编码到前端页面。
6. 不要绕过服务端权限校验。
7. 不要删除已有数据。
8. 不要清空数据库。
9. 不要修改 Docker 和部署配置，除非 Issue 明确要求。
10. 不要为了修复一个页面问题而大范围重构全局架构。

## 五、PR 修改说明要求

AI 或开发者提交 PR 时必须说明：

1. 修改目的。
2. 修改文件。
3. 修改前逻辑。
4. 修改后逻辑。
5. 影响角色。
6. 影响页面。
7. 影响接口。
8. 是否影响权限。
9. 是否影响审批流。
10. 是否影响统计口径。
11. 自测步骤。
12. 风险点。
13. 回退方式。

## 六、检查要求

每次提交前至少确保：

1. TypeScript 检查通过。
2. Lint 检查通过，或说明项目暂无 lint。
3. Build 通过。
4. 涉及权限时必须说明测试角色。
5. 涉及统计时必须说明统计口径。
6. 涉及审批时必须说明状态流转前后变化。

## 七、Git 分支与提交规则

### 分支策略

- `main` 是测试环境稳定分支，**不允许直接提交**
- 不创建 `develop` 分支
- Bug 修复使用 `fix/xxx` 分支
- 功能需求使用 `feature/xxx` 分支
- 权限、审批流、状态机、统计口径等业务规则调整使用 `logic/xxx` 分支
- 所有修改通过 PR 合并到 `main`
- PR 必须等待 CI 通过后才能合并

### 分支命名示例

| 分支类型 | 示例 |
|---------|------|
| Bug 修复 | `fix/login-error`、`fix/workflow-status` |
| 功能需求 | `feature/attachment-upload`、`feature/export-excel` |
| 业务规则调整 | `logic/approval-flow`、`logic/permission-update` |

### AI 工具标准工作流程

AI Agent 或开发者开始任务前必须执行以下步骤：

1. **读取文档**
   - 阅读 `AGENTS.md`
   - 阅读 `docs/GitHub协作流程.md`

2. **确认当前分支**
   ```bash
   git branch --show-current
   ```

3. **切换到 main**
   ```bash
   git checkout main
   ```

4. **拉取最新 main**
   ```bash
   git pull origin main
   ```

5. **根据任务类型创建分支**
   ```bash
   # Bug 修复
   git checkout -b fix/xxx
   # 功能需求
   git checkout -b feature/xxx
   # 业务规则调整
   git checkout -b logic/xxx
   ```

6. **修改代码**
   - 遵循项目代码规范
   - 不修改业务逻辑以外的内容

7. **本地检查**
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm build
   ```

8. **推送任务分支**
   ```bash
   git push origin fix/xxx
   ```

9. **创建 PR 到 main**
   - 使用 PR 模板
   - 关联对应 Issue
   - 等待 CI 通过

### 部署规则

- **普通发布**：执行 `sh deploy.sh`
- **涉及数据库结构变化**：先执行 `sh migrate.sh`，再执行 `sh deploy.sh`
- **群晖部署命令**：统一使用 `docker-compose`，不使用 `docker compose`，不使用 `-f` 参数