# WorkDisplayInfo 信息分层 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure WorkDisplayInfo from flat field grid to layered information hierarchy (Hero → Content → Responsibility → Auxiliary), with per-type color palettes.

**Architecture:** Add `DETAIL_THEME` color tokens to `visual-tokens.ts`, extract 3 lightweight internal components (`DetailHero`, `DetailSection`, `DetailLongText`), then restructure both `PriorityMainWorkDisplayInfo` and `TodoWorkDisplayInfo` to use the new components and color tokens. Only `work-display-info.tsx` and `visual-tokens.ts` change.

**Tech Stack:** React, TypeScript, Tailwind CSS, existing visual-tokens system

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/features/works/ui/visual-tokens.ts` | Modify (add ~20 lines after line 121) | DETAIL_THEME color tokens |
| `src/features/works/ui/work-display-info.tsx` | Rewrite (~250 → ~280 lines) | Layout restructure + 3 internal components |

No new files created. All new components are internal to `work-display-info.tsx` (not exported).

---

### Task 1: Add DETAIL_THEME color tokens

**Files:**
- Modify: `src/features/works/ui/visual-tokens.ts` (after line 121, before the `WorkTypeThemeKey` type)

- [ ] **Step 1: Add DETAIL_THEME constant**

Insert after the closing `} as const;` of `TYPE_THEME` (line 121) and before `export type WorkTypeThemeKey` (line 123):

```ts
export const DETAIL_THEME = {
  priority: {
    deep: '#4f4f4f',
    mid: '#9a8c98',
    light: '#f2e9e4',
  },
  main: {
    deep: '#6b705c',
    mid: '#a5a58d',
    light: '#ddbea9',
  },
  todo: {
    deep: '#52796f',
    mid: '#84a98c',
    light: '#cad2c5',
  },
} as const;

export type DetailThemeKey = keyof typeof DETAIL_THEME;
```

- [ ] **Step 2: Verify build passes**

Run: `pnpm typecheck`
Expected: PASS (no new types exported that could conflict, DETAIL_THEME uses same keys as TYPE_THEME)

- [ ] **Step 3: Commit**

```bash
git add src/features/works/ui/visual-tokens.ts
git commit -m "feat: add DETAIL_THEME color tokens for #63"
```

---

### Task 2: Extract internal components (DetailHero, DetailSection, DetailLongText)

**Files:**
- Modify: `src/features/works/ui/work-display-info.tsx`

- [ ] **Step 1: Add imports for DETAIL_THEME and helper function**

At the top of `work-display-info.tsx`, add to the existing import from `./visual-tokens`:

```tsx
import { DISPLAY_LABEL, DETAIL_THEME } from './visual-tokens';
```

Add a helper function to map `WorkType` to `DetailThemeKey`, placed after the `getDepartmentName` function (after line 23):

```tsx
function getDetailThemeKey(type: Work['type']): DetailThemeKey {
  if (type === '重点') return 'priority';
  if (type === '主要') return 'main';
  return 'todo';
}
```

Also add the `DetailThemeKey` import — but since it's in the same file's import already (from visual-tokens), just add it:

```tsx
import { DISPLAY_LABEL, DETAIL_THEME, type DetailThemeKey } from './visual-tokens';
```

- [ ] **Step 2: Add the three internal components**

Place these before `PriorityMainWorkDisplayInfo` (before line 25). They are not exported:

```tsx
function DetailHero({
  title,
  statusBadge,
  process,
  meta,
  theme,
}: {
  title: string;
  statusBadge: React.ReactNode;
  process: React.ReactNode;
  meta: string[];
  theme: { deep: string; mid: string; light: string };
}) {
  return (
    <div
      className="rounded-xl px-5 py-4 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${theme.light}22, ${theme.light}11, #f8f8f8)`,
        border: `1px solid ${theme.light}`,
      }}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full blur-3xl"
        style={{ background: `${theme.mid}18` }}
      />
      <div className="relative">
        <h2 className="text-lg font-bold mb-2" style={{ color: theme.deep }}>
          {title}
        </h2>
        <div className="flex items-center gap-2 mb-2">
          {statusBadge}
          <span className="text-sm font-semibold" style={{ color: theme.mid }}>
            {process}
          </span>
        </div>
        {meta.length > 0 && (
          <div className="flex gap-4 text-xs flex-wrap" style={{ color: theme.deep }}>
            {meta.map((item, i) => (
              <span key={i}>{item}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailSection({
  title,
  accentColor,
  variant = 'default',
  children,
}: {
  title: string;
  accentColor: string;
  variant?: 'default' | 'muted';
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg px-4 py-3"
      style={{
        background: variant === 'muted' ? `${accentColor}15` : '#fafafa',
        border: `1px solid ${accentColor}30`,
        borderLeft: `3px solid ${accentColor}`,
        ...(variant === 'muted' ? { opacity: 0.85 } : {}),
      }}
    >
      <div
        className="text-[11px] font-bold uppercase tracking-wider mb-2"
        style={{ color: accentColor }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function DetailLongText({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="mb-2 last:mb-0">
      <span className={DISPLAY_LABEL}>{label}</span>
      <p className="mt-1 text-sm text-slate-700 leading-relaxed bg-white px-3 py-2 rounded-md border border-slate-200 whitespace-pre-wrap break-words">
        {value || '-'}
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: PASS — components are internal, no external API changes

- [ ] **Step 4: Commit**

```bash
git add src/features/works/ui/work-display-info.tsx
git commit -m "refactor: extract DetailHero/DetailSection/DetailLongText components for #63"
```

---

### Task 3: Restructure PriorityMainWorkDisplayInfo

**Files:**
- Modify: `src/features/works/ui/work-display-info.tsx` (lines 25-190, the `PriorityMainWorkDisplayInfo` function)

- [ ] **Step 1: Replace PriorityMainWorkDisplayInfo body**

Replace the entire function body (lines 25-190) with:

```tsx
function PriorityMainWorkDisplayInfo({ work, departments, hideNodes }: WorkDisplayInfoProps) {
  const themeKey = getDetailThemeKey(work.type);
  const theme = DETAIL_THEME[themeKey];
  const firstSubmitterName = work.firstSubmitterName || work.creatorName || '-';

  return (
    <div className="space-y-3">
      <DetailHero
        title={work.workItem || '-'}
        statusBadge={<StatusBadge status={work.status} work={work} />}
        process={getCurrentProcessDescription(
          work.status,
          work.currentApproverRole,
          work.currentApproverId,
        )}
        meta={[
          work.planCompleteTime ? `完成时间 ${work.planCompleteTime}` : '',
          getDepartmentName(departments, work.departmentId ?? 0),
          work.responsiblePerson || '-',
        ].filter(Boolean)}
        theme={theme}
      />

      <DetailSection title="主要内容" accentColor={theme.deep}>
        <DetailLongText label="工作计划" value={work.workPlan || '-'} />
        <DetailLongText label="进展情况" value={work.progress || '-'} />
      </DetailSection>

      <DetailSection title="责任详情" accentColor={theme.mid}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
          <div>
            <span className={DISPLAY_LABEL}>主责部门：</span>
            <span className="text-sm font-medium text-slate-800">
              {getDepartmentName(departments, work.departmentId ?? 0)}
            </span>
          </div>
          <div>
            <span className={DISPLAY_LABEL}>责任领导：</span>
            <span className="text-sm font-medium text-slate-800">
              {work.responsibleLeader || '-'}
            </span>
          </div>
          <div>
            <span className={DISPLAY_LABEL}>责任人员：</span>
            <span className="text-sm font-medium text-slate-800">
              {work.responsiblePerson || '-'}
            </span>
          </div>
          <div>
            <span className={DISPLAY_LABEL}>起草人员：</span>
            <span className="text-sm font-medium text-slate-800">
              {firstSubmitterName}
            </span>
          </div>
        </div>
      </DetailSection>

      <DetailSection title="辅助信息" accentColor={theme.light} variant="muted">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs text-slate-500">
          <div>业务类别：{work.businessCategory || '-'}</div>
          <div>工作节点：{work.workNode || '-'}</div>
          <div>完成形式：{work.completeForm || '-'}</div>
          {work.type === '重点' && (
            <div>创新工作：{work.isInnovation ? '是' : '否'}</div>
          )}
        </div>
      </DetailSection>

      {work.rejectReason && (
        <div className="p-3 bg-rose-50 border border-red-200 rounded text-sm text-red-700 break-words whitespace-pre-wrap">
          <div>退回人：{work.rejectedBy || '-'}</div>
          <div>退回原因：{work.rejectReason}</div>
          {work.rejectedAt && (
            <div>退回时间：{new Date(work.rejectedAt).toLocaleString()}</div>
          )}
        </div>
      )}

      {!hideNodes && work.nodes && work.nodes.length > 0 && (
        <div>
          <p className="font-medium mb-2">工作节点：</p>
          <div className="space-y-3">
            {work.nodes.map((node: any, index: number) => (
              <div key={node.id ?? index} className="border border-slate-200 bg-slate-50/70 rounded-lg p-3">
                <div className="font-medium break-words">
                  {index + 1}. {node.title}
                  {node.completeTime ? `（节点完成时间：${node.completeTime}）` : ''}
                </div>
                {node.children && node.children.length > 0 && (
                  <div className="pl-5 mt-2 space-y-1 text-sm text-slate-500">
                    {node.children.map((child: any, childIndex: number) => (
                      <div key={child.id ?? `${index}-${childIndex}`} className="break-words">
                        {index + 1}.{childIndex + 1} {child.title}
                        {child.completeTime ? `（完成日期：${child.completeTime}）` : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {work.proof && (
        <div>
          <span className={DISPLAY_LABEL}>见证材料说明：</span>
          <p className="mt-1 p-2 bg-slate-50 rounded break-words whitespace-pre-wrap overflow-hidden">{work.proof}</p>
        </div>
      )}
      {(() => {
        const evidenceAttachments = (work.attachments || []).filter((a: any) => a.category === 'evidence');
        if (evidenceAttachments.length === 0) return null;
        return (
          <div>
            <span className={DISPLAY_LABEL}>见证材料附件：</span>
            <div className="mt-2 space-y-2">
              {evidenceAttachments.map((att: any, i: number) => (
                <div key={att.id ?? i} className="flex items-center justify-between rounded-lg border border-slate-200 p-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium break-words">{att.fileName}</div>
                    <div className="text-xs text-slate-500">
                      上传人：{att.userName || '-'}
                      上传时间：{att.uploadedAt ? new Date(att.uploadedAt).toLocaleString() : '-'}
                    </div>
                  </div>
                  <a href={`/api/attachments/${att.id}/download`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="rounded-full">
                      <Download className="h-4 w-4 mr-1" />
                      下载
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {work.adjustReason && (
        <div>
          <p className="break-words whitespace-pre-wrap overflow-hidden">
            调整原因：{work.adjustReason}
          </p>
        </div>
      )}
      {work.adjustNewTime && (
        <p>
          调整后时间：{work.adjustNewTime}
        </p>
      )}
      {work.adjustHistory && work.adjustHistory.length > 0 && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded text-sm text-purple-700 space-y-2">
          <div className="font-medium">调整记录</div>
          {(work.adjustHistory as any[]).map((item, i: number) => (
            <div key={item.id ?? i} className="border-t border-purple-100 pt-2 first:border-t-0 first:pt-0">
              <div>调整原因：{item.reason || '-'}</div>
              <div>原完成时间：{item.fromTime || '-'}</div>
              <div>现完成时间：{item.toTime || '-'}</div>
              <div>审批人：{item.approvedBy || '-'}</div>
              <div>审批时间：{item.approvedAt ? new Date(item.approvedAt).toLocaleString() : '-'}</div>
            </div>
          ))}
        </div>
      )}
      {work.cancelReason && (
        <div>
          <span className={DISPLAY_LABEL}>取消原因：</span>
          <p className="mt-1 p-2 bg-slate-50 rounded break-words whitespace-pre-wrap overflow-hidden">{work.cancelReason}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/works/ui/work-display-info.tsx
git commit -m "feat: restructure PriorityMainWorkDisplayInfo with layered layout for #63"
```

---

### Task 4: Restructure TodoWorkDisplayInfo

**Files:**
- Modify: `src/features/works/ui/work-display-info.tsx` (lines 192-382, the `TodoWorkDisplayInfo` function)

- [ ] **Step 1: Replace TodoWorkDisplayInfo body**

Replace the entire function body (lines 192-382) with:

```tsx
function TodoWorkDisplayInfo({ work, departments, hideNodes, hideCooperators }: WorkDisplayInfoProps) {
  const theme = DETAIL_THEME.todo;
  const firstSubmitterName = work.firstSubmitterName || work.creatorName || '-';

  return (
    <div className="space-y-3">
      <DetailHero
        title={work.workItem || '-'}
        statusBadge={<StatusBadge status={work.status} work={work} />}
        process={getCurrentProcessDescription(
          work.status,
          work.currentApproverRole,
          work.currentApproverId,
        )}
        meta={[
          work.proposedLeader ? `提出领导 ${work.proposedLeader}` : '',
          work.proposedScene ? `提出场景 ${work.proposedScene}` : '',
          work.planCompleteTime ? `完成时间 ${work.planCompleteTime}` : '',
        ].filter(Boolean)}
        theme={theme}
      />

      <DetailSection title="主要内容" accentColor={theme.deep}>
        <DetailLongText label="工作计划" value={work.workPlan || '-'} />
        <DetailLongText label="进展情况" value={work.progress || '-'} />
      </DetailSection>

      <DetailSection title="责任详情" accentColor={theme.mid}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
          <div>
            <span className={DISPLAY_LABEL}>主责部门：</span>
            <span className="text-sm font-medium text-slate-800">
              {getDepartmentName(departments, work.departmentId ?? 0)}
            </span>
          </div>
          <div>
            <span className={DISPLAY_LABEL}>责任领导：</span>
            <span className="text-sm font-medium text-slate-800">
              {work.responsibleLeader || '-'}
            </span>
          </div>
          <div>
            <span className={DISPLAY_LABEL}>责任人员：</span>
            <span className="text-sm font-medium text-slate-800">
              {work.responsiblePerson || '-'}
            </span>
          </div>
          <div>
            <span className={DISPLAY_LABEL}>起草人员：</span>
            <span className="text-sm font-medium text-slate-800">
              {firstSubmitterName}
            </span>
          </div>
        </div>
        {!hideCooperators && work.cooperators && work.cooperators.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              <div>
                <span className={DISPLAY_LABEL}>配合部门：</span>
                <span className="text-sm font-medium text-slate-800">
                  {work.cooperators.map((c: any) => getDepartmentName(departments, c.departmentId) || c.departmentName).join('、')}
                </span>
              </div>
              <div>
                <span className={DISPLAY_LABEL}>配合责任人员：</span>
                <span className="text-sm font-medium text-slate-800">
                  {work.cooperators.map((c: any) => c.person).filter(Boolean).join('、')}
                </span>
              </div>
            </div>
          </div>
        )}
      </DetailSection>

      <DetailSection title="辅助信息" accentColor={theme.light} variant="muted">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs text-slate-500">
          {work.formedTime && <div>形成时间：{work.formedTime}</div>}
          {work.workNode && <div>工作节点：{work.workNode}</div>}
        </div>
      </DetailSection>

      {!hideNodes && work.nodes && work.nodes.length > 0 && (
        <div>
          <p className="font-medium mb-2">任务分解节点：</p>
          <div className="space-y-3">
            {work.nodes.map((node: any, index: number) => (
              <div key={node.id ?? index} className="border border-slate-200 bg-slate-50/70 rounded-lg p-3">
                <div className="font-medium break-words">
                  {index + 1}. {node.title}
                  {node.completeTime ? `（节点完成时间：${node.completeTime}）` : ''}
                </div>
                {node.children && node.children.length > 0 && (
                  <div className="pl-5 mt-2 space-y-1 text-sm text-slate-500">
                    {node.children.map((child: any, childIndex: number) => (
                      <div key={child.id ?? `${index}-${childIndex}`} className="break-words">
                        {index + 1}.{childIndex + 1} {child.title}
                        {child.completeTime ? `（完成日期：${child.completeTime}）` : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {work.rejectReason && (
        <div className="p-3 bg-rose-50 border border-red-200 rounded text-sm text-red-700 break-words whitespace-pre-wrap">
          <div>退回人：{work.rejectedBy || '-'}</div>
          <div>退回原因：{work.rejectReason}</div>
          {work.rejectedAt && (
            <div>退回时间：{new Date(work.rejectedAt).toLocaleString()}</div>
          )}
        </div>
      )}

      {work.proof && (
        <div>
          <span className={DISPLAY_LABEL}>见证材料说明：</span>
          <p className="mt-1 p-2 bg-slate-50 rounded break-words whitespace-pre-wrap overflow-hidden">{work.proof}</p>
        </div>
      )}
      {(() => {
        const evidenceAttachments = (work.attachments || []).filter((a: any) => a.category === 'evidence');
        if (evidenceAttachments.length === 0) return null;
        return (
          <div>
            <span className={DISPLAY_LABEL}>见证材料附件：</span>
            <div className="mt-2 space-y-2">
              {evidenceAttachments.map((att: any, i: number) => (
                <div key={att.id ?? i} className="flex items-center justify-between rounded-lg border border-slate-200 p-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium break-words">{att.fileName}</div>
                    <div className="text-xs text-slate-500">
                      上传人：{att.userName || '-'}
                      上传时间：{att.uploadedAt ? new Date(att.uploadedAt).toLocaleString() : '-'}
                    </div>
                  </div>
                  <a href={`/api/attachments/${att.id}/download`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="rounded-full">
                      <Download className="h-4 w-4 mr-1" />
                      下载
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {work.adjustReason && (
        <div>
          <p className="break-words whitespace-pre-wrap overflow-hidden">
            调整原因：{work.adjustReason}
          </p>
        </div>
      )}
      {work.adjustNewTime && (
        <p>
          调整后时间：{work.adjustNewTime}
        </p>
      )}
      {work.cancelReason && (
        <div>
          <span className={DISPLAY_LABEL}>取消原因：</span>
          <p className="mt-1 p-2 bg-slate-50 rounded break-words whitespace-pre-wrap overflow-hidden">{work.cancelReason}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/works/ui/work-display-info.tsx
git commit -m "feat: restructure TodoWorkDisplayInfo with separate layout for #63"
```

---

### Task 5: Final verification and cleanup

- [ ] **Step 1: Run full check**

Run: `pnpm lint && pnpm typecheck && pnpm build`
Expected: All PASS

- [ ] **Step 2: Verify no unused imports**

Check that `work-display-info.tsx` has no unused imports (the `_hideCooperators` rename was removed — replaced by proper usage of `hideCooperators`). If lint reports issues, fix them.

- [ ] **Step 3: Final commit (if any lint fixes needed)**

```bash
git add -A
git commit -m "chore: lint fixes for #63"
```

---

## Self-Review

**Spec coverage:**
- [x] Hero section with title + status + current step + meta — Tasks 3 & 4
- [x] 主要内容 above 责任详情 — Tasks 3 & 4
- [x] Per-type color palettes via DETAIL_THEME — Task 1 + Tasks 3 & 4
- [x] Todo has separate layout (proposedLeader/Scene in hero, cooperators in responsibility) — Task 4
- [x] 配合部门 with separator line — Task 4
- [x] firstSubmitterName with creatorName fallback — Tasks 3 & 4
- [x] 辅助信息 muted/opacity — Tasks 3 & 4 via DetailSection variant="muted"
- [x] Nodes, attachments, reject/adjust/cancel sections preserved — Tasks 3 & 4
- [x] Reusable design rules documented in spec — already in spec document

**Placeholder scan:** No TBD, TODO, or vague steps found.

**Type consistency:** `DetailThemeKey` matches `DETAIL_THEME` keys (`priority`, `main`, `todo`). `getDetailThemeKey` maps `WorkType` values (`'重点'`, `'主要'`, `'待办'`) correctly.
