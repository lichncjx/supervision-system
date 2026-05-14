# 文档目录索引

## 推荐阅读顺序

### 新开发者 / 新 AI Agent

1. [项目说明](core/项目说明.md) — 项目背景、功能模块、目录结构
2. [业务规则](core/业务规则.md) — 权限、审批流、状态机、统计口径的权威文档
3. [GitHub 协作流程](core/GitHub协作流程.md) — 分支、Issue、PR、CI
4. [业务人员与附件权限规则](core/业务人员与附件权限规则.md) — 人员字段命名体系、附件机制

### 部署运维

1. [部署说明-群晖](deploy/部署说明-群晖.md) — 群晖 NAS Docker 部署
2. [Vercel 预览环境说明](deploy/Vercel预览环境说明.md) — Vercel PR Preview 配置
3. [部署说明](deploy/部署说明.md) — Vercel/Supabase 测试环境初始化

### 发布与测试

1. [测试发布检查清单](release/测试发布检查清单.md)
2. [回归测试清单](release/回归测试清单.md)
3. [待修复问题](release/待修复问题.md)

---

## 目录结构

```
docs/
├── README.md                    ← 本文件
│
├── core/                        ← 核心必读
│   ├── 项目说明.md
│   ├── 业务规则.md
│   ├── 业务人员与附件权限规则.md
│   └── GitHub协作流程.md
│
├── rules/                       ← 业务规则专题
│   ├── 权限规则.md
│   ├── 状态机设计.md
│   ├── API说明.md
│   ├── 首页统计口径.md
│   ├── 导入导出规则.md
│   └── 数据库设计.md
│
├── deploy/                      ← 部署运维
│   ├── 部署说明-群晖.md
│   ├── 部署说明.md
│   └── Vercel预览环境说明.md
│
├── design/                      ← 架构设计（长期有效）
│   ├── 后端模块化架构约定.md
│   └── 责任事项方模型设计.md
│
├── release/                     ← 发布、测试、待修复
│   ├── 发布记录.md
│   ├── 测试发布检查清单.md
│   ├── 回归测试清单.md
│   └── 待修复问题.md
│
├── archive/                     ← 历史过程记录（仅供回溯）
│   ├── 现状审计报告.md
│   ├── 重构计划.md
│   ├── 变更记录.md
│   ├── 待办事项多部门多责任人字段逻辑分析.md
│   ├── backfill-first-submitter-id.sql
│   ├── phase-6/                 ← 第六阶段文档
│   │   ├── 第六阶段开工检查清单.md
│   │   └── 第六阶段状态迁移实施方案.md
│   └── audits/                  ← 历史 Phase 审计报告
│       ├── Phase3A-证明材料文件上传闭环-方案分析.md
│       ├── Phase5A-Workflow审计报告.md
│       ├── Phase6A-Excel审计报告.md
│       ├── Phase7A-Attachments审计报告.md
│       ├── Phase8A-Dashboard审计报告.md
│       ├── Phase9A-src-lib审计与收口地图.md
│       └── Phase10A-work-store审计与拆分地图.md
│
└── ai/                          ← AI 临时产物（plans/specs/reports）
    └── .gitkeep
```

---

## 文档分类说明

| 目录 | 内容性质 | 是否当前有效 |
|------|----------|:---:|
| `core/` | AGENTS.md 明确引用的核心必读文档 | 是 |
| `rules/` | 业务规则专题文档 | 是 |
| `deploy/` | 部署运维文档 | 是 |
| `design/` | 架构与设计文档 | 是 |
| `release/` | 发布、测试、待修复相关 | 是 |
| `archive/` | 历史过程记录和阶段性报告 | 否（仅供回溯） |
| `ai/` | AI 生成的临时计划和报告 | 否 |

---

## 后续建议

以下问题已在本轮或前一轮文档治理中处理，或待后续 Issue 单独处理：

1. **内容重叠（待后续合并）**：`docs/deploy/部署说明.md` 与 `docs/deploy/Vercel预览环境说明.md` 均涉及 Vercel/Supabase 环境配置。本轮已添加交叉引用，后续可评估合并。
2. **业务规则交叉引用（待后续核对）**：`docs/core/业务规则.md` 与 `docs/rules/` 下的专题文档存在部分重叠描述，建议后续逐一核对并消除重复。
3. **历史字段残留（已修复）**：`docs/deploy/部署说明-群晖.md` 中 Phase 2 的 `deptLeaderId`/`deptManagerId` 等已删除字段的回填说明已更新为当前字段体系。
4. **待修复问题时效性（待后续评估）**：`docs/release/待修复问题.md` 中的遗留事项已部分过时，建议重新评估并更新。
