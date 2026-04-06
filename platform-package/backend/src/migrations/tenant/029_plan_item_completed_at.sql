-- Add completed_at column to plan_item_instances so milestones can track completion date
ALTER TABLE IF EXISTS plan_item_instances
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add description columns for richer milestone display
ALTER TABLE IF EXISTS plan_item_instances
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_ar TEXT;
