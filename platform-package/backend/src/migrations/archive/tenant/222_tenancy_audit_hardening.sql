-- =====================================================
-- Migration 222: Tenancy & Audit Hardening
--
-- 1a. Immutability triggers on audit_trail_archive
-- 1b. Immutability triggers on authorization_audit_log
-- 1c. Hash chain columns on agrc_event_log
-- 1d. Immutability triggers on agrc_event_log
-- 1e. REVOKE DELETE from app role on all audit tables
-- =====================================================

-- ── 1a. audit_trail_archive immutability ────────────────────────────────────

DO $$ BEGIN
IF EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = current_schema() AND table_name = 'audit_trail_archive'
) THEN

  CREATE OR REPLACE FUNCTION audit_trail_archive_immutable() RETURNS TRIGGER AS $fn$
  BEGIN
    RAISE EXCEPTION 'audit_trail_archive is immutable: % operations are forbidden', TG_OP;
    RETURN NULL;
  END;
  $fn$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trg_audit_archive_no_update ON audit_trail_archive;
  CREATE TRIGGER trg_audit_archive_no_update
    BEFORE UPDATE ON audit_trail_archive
    FOR EACH ROW EXECUTE FUNCTION audit_trail_archive_immutable();

  DROP TRIGGER IF EXISTS trg_audit_archive_no_delete ON audit_trail_archive;
  CREATE TRIGGER trg_audit_archive_no_delete
    BEFORE DELETE ON audit_trail_archive
    FOR EACH ROW EXECUTE FUNCTION audit_trail_archive_immutable();

END IF;
END $$;

-- ── 1b. authorization_audit_log immutability ────────────────────────────────

DO $$ BEGIN
IF EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = current_schema() AND table_name = 'authorization_audit_log'
) THEN

  CREATE OR REPLACE FUNCTION auth_audit_log_immutable() RETURNS TRIGGER AS $fn$
  BEGIN
    RAISE EXCEPTION 'authorization_audit_log is immutable: % operations are forbidden', TG_OP;
    RETURN NULL;
  END;
  $fn$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trg_auth_audit_no_update ON authorization_audit_log;
  CREATE TRIGGER trg_auth_audit_no_update
    BEFORE UPDATE ON authorization_audit_log
    FOR EACH ROW EXECUTE FUNCTION auth_audit_log_immutable();

  DROP TRIGGER IF EXISTS trg_auth_audit_no_delete ON authorization_audit_log;
  CREATE TRIGGER trg_auth_audit_no_delete
    BEFORE DELETE ON authorization_audit_log
    FOR EACH ROW EXECUTE FUNCTION auth_audit_log_immutable();

END IF;
END $$;

-- ── 1c. Hash chain columns on agrc_event_log ────────────────────────────────

DO $$ BEGIN
IF EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = current_schema() AND table_name = 'agrc_event_log'
) THEN

  ALTER TABLE agrc_event_log ADD COLUMN IF NOT EXISTS entry_hash VARCHAR(64);
  ALTER TABLE agrc_event_log ADD COLUMN IF NOT EXISTS previous_hash VARCHAR(64);

  CREATE INDEX IF NOT EXISTS idx_agrc_event_entry_hash
    ON agrc_event_log (entry_hash);

END IF;
END $$;

-- ── 1d. agrc_event_log immutability ─────────────────────────────────────────

DO $$ BEGIN
IF EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = current_schema() AND table_name = 'agrc_event_log'
) THEN

  CREATE OR REPLACE FUNCTION agrc_event_log_immutable() RETURNS TRIGGER AS $fn$
  BEGIN
    RAISE EXCEPTION 'agrc_event_log is immutable: % operations are forbidden', TG_OP;
    RETURN NULL;
  END;
  $fn$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trg_event_log_no_update ON agrc_event_log;
  CREATE TRIGGER trg_event_log_no_update
    BEFORE UPDATE ON agrc_event_log
    FOR EACH ROW EXECUTE FUNCTION agrc_event_log_immutable();

  DROP TRIGGER IF EXISTS trg_event_log_no_delete ON agrc_event_log;
  CREATE TRIGGER trg_event_log_no_delete
    BEFORE DELETE ON agrc_event_log
    FOR EACH ROW EXECUTE FUNCTION agrc_event_log_immutable();

END IF;
END $$;

-- ── 1e. REVOKE DELETE from app role ─────────────────────────────────────────

DO $$
DECLARE
  app_role TEXT := current_user;
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['audit_trail', 'audit_trail_archive', 'authorization_audit_log', 'agrc_event_log']
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name = tbl
    ) THEN
      EXECUTE format('REVOKE DELETE ON %I.%I FROM %I', current_schema(), tbl, app_role);
    END IF;
  END LOOP;
END $$;

-- ── 1f. Composite index for anomaly detection query performance ─────────

DO $$ BEGIN
IF EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = current_schema() AND table_name = 'audit_trail'
) THEN
  CREATE INDEX IF NOT EXISTS idx_audit_trail_user_ts
    ON audit_trail (user_id, timestamp DESC);
END IF;
END $$;
