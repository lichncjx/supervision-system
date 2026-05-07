-- ============================================================
-- Phase 2: 新增部门领导和主管人员 ID/Name 字段
-- ============================================================

-- Add columns
ALTER TABLE "work_items" ADD COLUMN "deptLeaderId" INTEGER;
ALTER TABLE "work_items" ADD COLUMN "deptManagerId" INTEGER;
ALTER TABLE "work_items" ADD COLUMN "deptLeaderName" VARCHAR(50);
ALTER TABLE "work_items" ADD COLUMN "deptManagerName" VARCHAR(50);

-- Add FK constraints (onDelete: SetNull — user deleted → field nulled)
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_deptLeaderId_fkey"
  FOREIGN KEY ("deptLeaderId") REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "work_items" ADD CONSTRAINT "work_items_deptManagerId_fkey"
  FOREIGN KEY ("deptManagerId") REFERENCES "users"("id") ON DELETE SET NULL;

-- ============================================================
-- 回填 deptLeaderId / deptLeaderName
-- 规则：responsibleLeader 文本 + departmentId + role='department_leader' + isActive=true
--       只有 COUNT = 1（唯一匹配）时才回填 deptLeaderId
--       匹配不到或匹配多个时，deptLeaderId 留空
--       deptLeaderName 始终从 responsibleLeader 取（历史快照）
--       仅处理 priority / main 类型事项
-- ============================================================

-- Step A: 唯一匹配 → 回填 deptLeaderId + deptLeaderName
UPDATE work_items wi
SET
  "deptLeaderId" = sub.matched_user_id,
  "deptLeaderName" = sub.matched_user_name
FROM (
  SELECT
    wi2.id AS work_item_id,
    u.id AS matched_user_id,
    u.name AS matched_user_name
  FROM work_items wi2
  JOIN users u ON u."departmentId" = wi2."departmentId"
    AND u.name = wi2."responsibleLeader"
    AND u.role = 'department_leader'
    AND u."isActive" = true
  WHERE wi2."responsibleLeader" IS NOT NULL
    AND wi2."responsibleLeader" != ''
    AND (wi2.type = 'priority' OR wi2.type = 'main')
    AND (
      SELECT COUNT(*)
      FROM users u2
      WHERE u2."departmentId" = wi2."departmentId"
        AND u2.name = wi2."responsibleLeader"
        AND u2.role = 'department_leader'
        AND u2."isActive" = true
    ) = 1
) sub
WHERE wi.id = sub.work_item_id;

-- Step B: 所有非 NULL responsibleLeader → 写 deptLeaderName 快照
UPDATE work_items
SET "deptLeaderName" = "responsibleLeader"
WHERE "responsibleLeader" IS NOT NULL
  AND "responsibleLeader" != ''
  AND (type = 'priority' OR type = 'main');

-- ============================================================
-- 回填 deptManagerId / deptManagerName
-- 同上规则，role='department_manager'
-- ============================================================

-- Step C: 唯一匹配 → 回填 deptManagerId + deptManagerName
UPDATE work_items wi
SET
  "deptManagerId" = sub.matched_user_id,
  "deptManagerName" = sub.matched_user_name
FROM (
  SELECT
    wi2.id AS work_item_id,
    u.id AS matched_user_id,
    u.name AS matched_user_name
  FROM work_items wi2
  JOIN users u ON u."departmentId" = wi2."departmentId"
    AND u.name = wi2."supervisor"
    AND u.role = 'department_manager'
    AND u."isActive" = true
  WHERE wi2."supervisor" IS NOT NULL
    AND wi2."supervisor" != ''
    AND (wi2.type = 'priority' OR wi2.type = 'main')
    AND (
      SELECT COUNT(*)
      FROM users u2
      WHERE u2."departmentId" = wi2."departmentId"
        AND u2.name = wi2."supervisor"
        AND u2.role = 'department_manager'
        AND u2."isActive" = true
    ) = 1
) sub
WHERE wi.id = sub.work_item_id;

-- Step D: 所有非 NULL supervisor → 写 deptManagerName 快照
UPDATE work_items
SET "deptManagerName" = "supervisor"
WHERE "supervisor" IS NOT NULL
  AND "supervisor" != ''
  AND (type = 'priority' OR type = 'main');

-- ============================================================
-- 验证回填结果（上线前手动执行确认后删除以下注释）
-- ============================================================
-- SELECT COUNT(*) AS total_priority_main FROM work_items WHERE type IN ('priority', 'main');
-- SELECT COUNT(*) AS with_responsible_leader FROM work_items WHERE type IN ('priority', 'main') AND "responsibleLeader" IS NOT NULL AND "responsibleLeader" != '';
-- SELECT COUNT(*) AS with_dept_leader_id FROM work_items WHERE "deptLeaderId" IS NOT NULL;
-- SELECT COUNT(*) AS with_dept_leader_name FROM work_items WHERE "deptLeaderName" IS NOT NULL;
-- SELECT COUNT(*) AS with_dept_manager_id FROM work_items WHERE "deptManagerId" IS NOT NULL;
-- SELECT COUNT(*) AS with_dept_manager_name FROM work_items WHERE "deptManagerName" IS NOT NULL;
