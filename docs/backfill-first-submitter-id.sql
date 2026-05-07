-- ============================================================
-- 历史数据回填：firstSubmitterId
-- 关联 Issue：#8
-- 分支：fix/first-submitter-return-flow
-- 执行环境：群晖 PostgreSQL
-- 执行前请先备份数据库
-- ============================================================

-- ============================================================
-- 【执行前检查 1】统计 firstSubmitterId 为空的 work_items 数量
-- ============================================================
SELECT COUNT(*) AS null_first_submitter_count
FROM work_items
WHERE "firstSubmitterId" IS NULL;

-- ============================================================
-- 【执行前检查 2】预览回填来源分布
-- 能从 workflow_records 匹配到的数量
-- ============================================================
SELECT COUNT(DISTINCT wi.id) AS from_workflow_records
FROM work_items wi
JOIN workflow_records wr ON wr."workItemId" = wi.id
WHERE wi."firstSubmitterId" IS NULL
  AND wr."statusAfter" IN ('pending_dept', 'pending_company');

-- ============================================================
-- 【执行前检查 3】匹配不到、将 fallback 为 creatorId 的数量
-- ============================================================
SELECT COUNT(*) AS fallback_to_creator
FROM work_items wi
WHERE wi."firstSubmitterId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM workflow_records wr
    WHERE wr."workItemId" = wi.id
      AND wr."statusAfter" IN ('pending_dept', 'pending_company')
  );

-- ============================================================
-- Step 1：从 workflow_records 回填
-- 逻辑：找到每个 workItem 最早一条将 statusAfter 设为
--        pending_dept 或 pending_company 的记录，
--        用该记录的 initiatorId 作为 firstSubmitterId
-- ============================================================
UPDATE work_items wi
SET "firstSubmitterId" = sub.first_submitter
FROM (
  SELECT DISTINCT ON (wr."workItemId")
    wr."workItemId",
    wr."initiatorId" AS first_submitter
  FROM workflow_records wr
  WHERE wr."statusAfter" IN ('pending_dept', 'pending_company')
  ORDER BY wr."workItemId", wr."createdAt" ASC
) sub
WHERE wi.id = sub."workItemId"
  AND wi."firstSubmitterId" IS NULL;

-- ============================================================
-- Step 2：剩余仍未回填的，fallback 为 creatorId
-- ============================================================
UPDATE work_items
SET "firstSubmitterId" = "creatorId"
WHERE "firstSubmitterId" IS NULL;

-- ============================================================
-- 【执行后检查 1】确认没有遗留 NULL
-- 期望结果：0
-- ============================================================
SELECT COUNT(*) AS remaining_null_count
FROM work_items
WHERE "firstSubmitterId" IS NULL;

-- ============================================================
-- 【执行后检查 2】验证回填的 firstSubmitterId 对应的用户存在
-- 期望结果：0
-- ============================================================
SELECT COUNT(*) AS orphan_submitter_count
FROM work_items wi
LEFT JOIN users u ON u.id = wi."firstSubmitterId"
WHERE u.id IS NULL;

-- ============================================================
-- 异常处理 / 回滚
-- 如果回填结果不正确，可将所有 firstSubmitterId 置为 NULL 后重新执行：
--   UPDATE work_items SET "firstSubmitterId" = NULL;
-- 然后修正数据后重新执行 Step 1 和 Step 2。
-- ============================================================
