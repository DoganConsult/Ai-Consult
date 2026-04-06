-- =====================================================
-- Migration 209: Audit trail immutability enforcement
-- Blocks UPDATE and DELETE on audit_trail at the DB level.
-- The audit_trail table is append-only by design; this
-- trigger enforces that invariant regardless of caller.
-- =====================================================

CREATE OR REPLACE FUNCTION audit_trail_immutable() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_trail is immutable: % operations are forbidden', TG_OP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_trail_no_update ON audit_trail;
CREATE TRIGGER trg_audit_trail_no_update
  BEFORE UPDATE ON audit_trail
  FOR EACH ROW EXECUTE FUNCTION audit_trail_immutable();

DROP TRIGGER IF EXISTS trg_audit_trail_no_delete ON audit_trail;
CREATE TRIGGER trg_audit_trail_no_delete
  BEFORE DELETE ON audit_trail
  FOR EACH ROW EXECUTE FUNCTION audit_trail_immutable();
