-- Phase 3A: 附件分类字段
-- category: general=普通附件, evidence=证明材料/见证材料
ALTER TABLE "attachments" ADD COLUMN "category" VARCHAR(30) NOT NULL DEFAULT 'general';
