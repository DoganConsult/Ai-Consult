-- Migration 078: action_items schema compatibility
-- Adds columns that action-item.service.ts needs on the 065-created table
-- Also adds updated_at to frameworks (for PUT route), and dashboard_layout/config to user_preferences

-- 1. action_items compatibility columns
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS item_id UUID;
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS deadline DATE;
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS reminder_schedule JSONB DEFAULT '[1, 3, 7]';
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS escalated_to VARCHAR(64);

-- Backfill item_id from action_id if both exist
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'action_items' AND column_name = 'action_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'action_items' AND column_name = 'item_id') THEN
    UPDATE action_items SET item_id = action_id WHERE item_id IS NULL;
  END IF;
END $$;

-- Backfill deadline from target_date if both exist
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'action_items' AND column_name = 'target_date')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'action_items' AND column_name = 'deadline') THEN
    UPDATE action_items SET deadline = target_date WHERE deadline IS NULL AND target_date IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_action_items_deadline ON action_items(deadline);
CREATE INDEX IF NOT EXISTS idx_action_items_user ON action_items(assigned_to, status);

-- 2. frameworks updated_at column (used by PUT /api/frameworks/:id)
ALTER TABLE frameworks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. user_preferences columns for dashboard layout/config storage
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS dashboard_layout JSONB;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS dashboard_config JSONB;

-- 4. Seed default dashboard_config for all existing users from widget registry
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'dashboard_widget_registry') THEN
    WITH widget_grid AS (
      SELECT
        widget_key AS id,
        widget_key AS type,
        ((ROW_NUMBER() OVER (ORDER BY widget_key) - 1) % 3) * 4 AS x,
        ((ROW_NUMBER() OVER (ORDER BY widget_key) - 1) / 3) * 3 AS y,
        4 AS w,
        3 AS h
      FROM dashboard_widget_registry
      WHERE is_active = true
    ),
    config_json AS (
      SELECT jsonb_build_object(
        'layout', 'grid',
        'theme', 'default',
        'widgets', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'id', id, 'type', type,
          'position', jsonb_build_object('x', x, 'y', y, 'w', w, 'h', h)
        )), '[]'::jsonb) FROM widget_grid)
      ) AS cfg
    )
    UPDATE user_preferences
    SET dashboard_config = (SELECT cfg FROM config_json),
        updated_at = NOW()
    WHERE dashboard_config IS NULL;
  END IF;
END $$;
