-- Migration 901: Merge raci_assignments + raci_matrices into governance_raci_assignments
--
-- Purpose:
--   Consolidate the legacy RACI tables (raci_assignments and raci_matrices) into the
--   canonical governance_raci_assignments table. This migration is fully idempotent —
--   all statements use IF EXISTS guards and WHERE NOT EXISTS dedup checks.
--
-- Source tables (NOT dropped — kept for audit trail):
--   1. raci_assignments  — per-activity RACI with responsible_id, accountable_id,
--                          consulted_ids[], informed_ids[] (UUID arrays)
--   2. raci_matrices     — JSONB blob with entries[] and roles[]
--
-- Target table:
--   governance_raci_assignments (assignment_id, template_id, activity, role_or_user, raci_type, created_at)
--
-- Mapping strategy:
--   raci_assignments → one row per non-null RACI role per activity:
--     responsible_id  → raci_type 'R'
--     accountable_id  → raci_type 'A'
--     each consulted_ids element → raci_type 'C'
--     each informed_ids element  → raci_type 'I'
--
--   raci_matrices → JSONB entries are expanded. Each entry is expected to contain
--     { activity, role, raci_type } or similar structure. Since the JSONB schema may
--     vary, we use a best-effort extraction with COALESCE fallbacks.
--
-- Note: Source tables are NOT dropped to preserve audit history and allow rollback.


-- ─────────────────────────────────────────────────────────────────────────────
-- Step 1: Ensure governance_raci_assignments table exists
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS governance_raci_assignments (
  assignment_id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  template_id   UUID NOT NULL,
  activity      TEXT NOT NULL,
  role_or_user  TEXT NOT NULL,
  raci_type     TEXT NOT NULL CHECK (raci_type IN ('R', 'A', 'C', 'I')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- Step 2: Migrate raci_assignments → governance_raci_assignments
--         Expand the per-row R/A/C/I columns into individual rows.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Only proceed if the source table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'raci_assignments'
  ) THEN

    -- Insert Responsible (R) rows
    INSERT INTO governance_raci_assignments (template_id, activity, role_or_user, raci_type, created_at)
    SELECT
      ra.template_id,
      COALESCE(ra.activity_name_en, ra.activity_code, 'unknown'),
      ra.responsible_id::TEXT,
      'R',
      COALESCE(ra.created_at, NOW())
    FROM raci_assignments ra
    WHERE ra.responsible_id IS NOT NULL
      AND ra.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM governance_raci_assignments g
        WHERE g.template_id = ra.template_id
          AND g.activity = COALESCE(ra.activity_name_en, ra.activity_code, 'unknown')
          AND g.role_or_user = ra.responsible_id::TEXT
          AND g.raci_type = 'R'
      );

    -- Insert Accountable (A) rows
    INSERT INTO governance_raci_assignments (template_id, activity, role_or_user, raci_type, created_at)
    SELECT
      ra.template_id,
      COALESCE(ra.activity_name_en, ra.activity_code, 'unknown'),
      ra.accountable_id::TEXT,
      'A',
      COALESCE(ra.created_at, NOW())
    FROM raci_assignments ra
    WHERE ra.accountable_id IS NOT NULL
      AND ra.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM governance_raci_assignments g
        WHERE g.template_id = ra.template_id
          AND g.activity = COALESCE(ra.activity_name_en, ra.activity_code, 'unknown')
          AND g.role_or_user = ra.accountable_id::TEXT
          AND g.raci_type = 'A'
      );

    -- Insert Consulted (C) rows — unnest the consulted_ids array
    INSERT INTO governance_raci_assignments (template_id, activity, role_or_user, raci_type, created_at)
    SELECT
      ra.template_id,
      COALESCE(ra.activity_name_en, ra.activity_code, 'unknown'),
      cid::TEXT,
      'C',
      COALESCE(ra.created_at, NOW())
    FROM raci_assignments ra,
         LATERAL unnest(ra.consulted_ids) AS cid
    WHERE ra.consulted_ids IS NOT NULL
      AND array_length(ra.consulted_ids, 1) > 0
      AND ra.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM governance_raci_assignments g
        WHERE g.template_id = ra.template_id
          AND g.activity = COALESCE(ra.activity_name_en, ra.activity_code, 'unknown')
          AND g.role_or_user = cid::TEXT
          AND g.raci_type = 'C'
      );

    -- Insert Informed (I) rows — unnest the informed_ids array
    INSERT INTO governance_raci_assignments (template_id, activity, role_or_user, raci_type, created_at)
    SELECT
      ra.template_id,
      COALESCE(ra.activity_name_en, ra.activity_code, 'unknown'),
      iid::TEXT,
      'I',
      COALESCE(ra.created_at, NOW())
    FROM raci_assignments ra,
         LATERAL unnest(ra.informed_ids) AS iid
    WHERE ra.informed_ids IS NOT NULL
      AND array_length(ra.informed_ids, 1) > 0
      AND ra.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM governance_raci_assignments g
        WHERE g.template_id = ra.template_id
          AND g.activity = COALESCE(ra.activity_name_en, ra.activity_code, 'unknown')
          AND g.role_or_user = iid::TEXT
          AND g.raci_type = 'I'
      );

    RAISE NOTICE '[901] raci_assignments → governance_raci_assignments migration complete';
  ELSE
    RAISE NOTICE '[901] raci_assignments table does not exist — skipping';
  END IF;
END
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- Step 3: Migrate raci_matrices → governance_raci_assignments
--         The raci_matrices table stores JSONB blobs. Each row has:
--           id (UUID), tenant_id, entries (JSONB array), roles (JSONB array)
--         We expand entries[] where each entry is expected to have activity,
--         role, and raci_type fields.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Only proceed if the source table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'raci_matrices'
  ) THEN

    -- Expand JSONB entries array into individual governance_raci_assignments rows.
    -- Use the raci_matrices.id as template_id since there is no explicit template reference.
    INSERT INTO governance_raci_assignments (template_id, activity, role_or_user, raci_type, created_at)
    SELECT
      rm.id AS template_id,
      COALESCE(entry->>'activity', entry->>'activity_name', 'unknown') AS activity,
      COALESCE(entry->>'role', entry->>'role_or_user', entry->>'assignee', 'unknown') AS role_or_user,
      CASE
        WHEN UPPER(COALESCE(entry->>'raci_type', entry->>'type', '')) IN ('R', 'A', 'C', 'I')
          THEN UPPER(COALESCE(entry->>'raci_type', entry->>'type', ''))
        WHEN LOWER(COALESCE(entry->>'raci_type', entry->>'type', '')) = 'responsible' THEN 'R'
        WHEN LOWER(COALESCE(entry->>'raci_type', entry->>'type', '')) = 'accountable' THEN 'A'
        WHEN LOWER(COALESCE(entry->>'raci_type', entry->>'type', '')) = 'consulted' THEN 'C'
        WHEN LOWER(COALESCE(entry->>'raci_type', entry->>'type', '')) = 'informed' THEN 'I'
        ELSE 'R'  -- default fallback
      END AS raci_type,
      COALESCE(rm.generated_at, NOW()) AS created_at
    FROM raci_matrices rm,
         LATERAL jsonb_array_elements(rm.entries) AS entry
    WHERE rm.entries IS NOT NULL
      AND jsonb_typeof(rm.entries) = 'array'
      AND jsonb_array_length(rm.entries) > 0
      AND NOT EXISTS (
        SELECT 1 FROM governance_raci_assignments g
        WHERE g.template_id = rm.id
          AND g.activity = COALESCE(entry->>'activity', entry->>'activity_name', 'unknown')
          AND g.role_or_user = COALESCE(entry->>'role', entry->>'role_or_user', entry->>'assignee', 'unknown')
          AND g.raci_type = CASE
            WHEN UPPER(COALESCE(entry->>'raci_type', entry->>'type', '')) IN ('R', 'A', 'C', 'I')
              THEN UPPER(COALESCE(entry->>'raci_type', entry->>'type', ''))
            WHEN LOWER(COALESCE(entry->>'raci_type', entry->>'type', '')) = 'responsible' THEN 'R'
            WHEN LOWER(COALESCE(entry->>'raci_type', entry->>'type', '')) = 'accountable' THEN 'A'
            WHEN LOWER(COALESCE(entry->>'raci_type', entry->>'type', '')) = 'consulted' THEN 'C'
            WHEN LOWER(COALESCE(entry->>'raci_type', entry->>'type', '')) = 'informed' THEN 'I'
            ELSE 'R'
          END
      );

    RAISE NOTICE '[901] raci_matrices → governance_raci_assignments migration complete';
  ELSE
    RAISE NOTICE '[901] raci_matrices table does not exist — skipping';
  END IF;
END
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- Step 4: Add useful indexes on governance_raci_assignments (idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_gov_raci_template
  ON governance_raci_assignments (template_id);

CREATE INDEX IF NOT EXISTS idx_gov_raci_activity
  ON governance_raci_assignments (activity);

CREATE INDEX IF NOT EXISTS idx_gov_raci_type
  ON governance_raci_assignments (raci_type);


-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE: Source tables raci_assignments and raci_matrices are intentionally
-- NOT dropped. They are retained for:
--   1. Audit trail / compliance evidence
--   2. Rollback safety if migration issues are discovered
--   3. Any downstream code that may still reference them during transition
--
-- Once all references are confirmed removed, a future migration can drop them.
-- ─────────────────────────────────────────────────────────────────────────────
