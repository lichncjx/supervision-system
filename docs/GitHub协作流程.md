# GitHub 协作流程

## 分支策略

### main 分支

- `main` 是测试环境稳定分支
- **`main` 不允许直接提交**，所有修改通过 PR 合并
- 不创建 `develop` 分支

### 分支命名规范

| 分支类型 | 命名格式 | 示例 |
|---------|---------|------|
| Bug 修复 | `fix/xxx` | `fix/login-error`、`fix/workflow-status` |
| 功能需求 | `feature/xxx` | `feature/attachment-upload`、`feature/export-excel` |
| 业务规则调整 | `logic/xxx` | `logic/approval-flow-update`、`logic/permissions-adjustment` |

> **适用场景**：
> - `fix/`：功能异常、权限异常、统计异常、页面异常
> - `feature/`：新增功能、页面优化、交互优化、流程增强
> - `logic/`：权限、审批流、状态机、统计口径等业务规则调整

## AI 工具标准工作流程

AI Agent 或开发者开始任务前必须执行以下步骤：

### 1. 读取文档
```bash
# 阅读 AGENTS.md
cat AGENTS.md
# 阅读 GitHub 协作流程
cat docs/GitHub协作流程.md
```

### 2. 确认当前分支
```bash
git branch --show-current
```

### 3. 切换到 main
```bash
git checkout main
```

### 4. 拉取最新 main
```bash
git pull origin main
```

### 5. 根据任务类型创建分支

**Bug 修复**：
```bash
git checkout -b fix/xxx
```

**功能需求**：
```bash
git checkout -b feature/xxx
```

**业务规则调整**：
```bash
git checkout -b logic/xxx
```

### 6. 修改代码
- 遵循项目代码规范
- 不修改业务逻辑以外的内容
- 不擅自修改数据库结构

### 7. 本地检查
```bash
pnpm lint
pnpm typecheck
pnpm build
```

### 8. 推送任务分支
```bash
git push origin fix/xxx
# 或
git push origin feature/xxx
# 或
git push origin logic/xxx
```

### 9. 创建 PR 到 main
- 使用 PR 模板
- 关联对应 Issue
- 等待 CI 通过后再合并

## 开发流程

1. **创建 Issue**
   - 使用对应的 Issue 模板（Bug Report / Feature Request / Logic Change）
   - 清晰描述问题或需求

2. **从 main 创建分支**
   ```bash
   git checkout main
   git pull
   git checkout -b fix/xxx
   ```

3. **提交代码**
   - 遵循项目代码规范
   - 提交信息清晰描述修改内容

4. **创建 PR**
   - 关联对应 Issue
   - 填写 PR 模板的所有内容
   - 确保 CI 检查通过

5. **等待 CI 通过**
   - PR 必须等待 CI 通过后才能合并

## CI 与镜像构建

- PR 合并到 `main` 后自动触发 GitHub Actions
- 自动构建 GHCR 镜像
  - `ghcr.io/xxx/supervision-system-app:main`
  - `ghcr.io/xxx/supervision-system-migrate:main`（需要时）

## 部署流程

### 普通发布（无数据库变化）

1. 登录群晖服务器
2. 进入部署目录
3. 执行：`sh deploy.sh`

### 涉及数据库变化

1. 登录群晖服务器
2. 进入部署目录
3. 先执行：`sh migrate.sh`
4. 再执行：`sh deploy.sh`

> **重要说明**：
> - 普通发布只执行 `sh deploy.sh`
> - 数据库结构变化时先执行 `sh migrate.sh`，再执行 `sh deploy.sh`
> - 所有命令使用 `docker-compose`
> - 不使用 `docker compose`
> - 不使用 `-f` 参数
> - 用户会手动将 compose 文件改名为默认识别文件名

## 验收与关闭 Issue

1. 验证群晖测试环境部署成功
2. 使用测试账号验证功能正常
3. 测试通过后关闭对应 Issue