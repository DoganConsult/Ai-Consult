-- ============================================================
-- Migration 340: Fix v_ownership_map VIEW column references
-- departments uses head_user_id (not manager_id),
-- teams uses team_lead_user_id (not lead_user_id).
-- ============================================================

DO $$
BEGIN
  EXECUTE '
    CREATE OR REPLACE VIEW v_ownership_map AS
      SELECT ''department'' AS entity_type,
             dept_id::text AS entity_id,
             name_en AS entity_name,
             head_user_id AS owner_id,
             ''manager'' AS owner_role
      FROM departments WHERE deleted_at IS NULL AND head_user_id IS NOT NULL
    UNION ALL
      SELECT ''team'' AS entity_type,
             team_id::text AS entity_id,
             name_en AS entity_name,
             ' || CASE
               WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='team_lead_user_id' AND table_schema=current_schema())
               THEN 'team_lead_user_id'
               ELSE 'team_lead'
             END || ' AS owner_id,
             ''lead'' AS owner_role
      FROM teams WHERE deleted_at IS NULL AND ' || CASE
               WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='team_lead_user_id' AND table_schema=current_schema())
               THEN 'team_lead_user_id'
               ELSE 'team_lead'
             END || ' IS NOT NULL
    UNION ALL
      SELECT ''position'' AS entity_type,
             position_id::text AS entity_id,
             title_en AS entity_name,
             created_by AS owner_id,
             ''creator'' AS owner_role
      FROM positions WHERE deleted_at IS NULL AND created_by IS NOT NULL
  ';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'v_ownership_map view creation skipped: %', SQLERRM;
END $$;
