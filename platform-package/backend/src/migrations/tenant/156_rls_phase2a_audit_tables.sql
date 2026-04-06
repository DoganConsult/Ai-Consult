-- Phase 2A: Row-Level Security on audit/notification/activity tables
-- Defense-in-depth: ensures tenant_id column matches session variable.
-- Policy is permissive when session variable is not set (migrations, admin).

-- 1. audit_trail
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'audit_trail') THEN
    ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);
    ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;
    ALTER TABLE audit_trail FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_audit_trail_tenant ON audit_trail;
    CREATE POLICY rls_audit_trail_tenant ON audit_trail
      USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = current_setting('app.current_tenant_id', true)
      )
      WITH CHECK (true);
  END IF;
END $$;

-- 2. authorization_audit_log
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'authorization_audit_log') THEN
    ALTER TABLE authorization_audit_log ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);
    ALTER TABLE authorization_audit_log ENABLE ROW LEVEL SECURITY;
    ALTER TABLE authorization_audit_log FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_auth_audit_tenant ON authorization_audit_log;
    CREATE POLICY rls_auth_audit_tenant ON authorization_audit_log
      USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = current_setting('app.current_tenant_id', true)
      )
      WITH CHECK (true);
  END IF;
END $$;

-- 3. authorization_mismatch_log
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'authorization_mismatch_log') THEN
    ALTER TABLE authorization_mismatch_log ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);
    ALTER TABLE authorization_mismatch_log ENABLE ROW LEVEL SECURITY;
    ALTER TABLE authorization_mismatch_log FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_auth_mismatch_tenant ON authorization_mismatch_log;
    CREATE POLICY rls_auth_mismatch_tenant ON authorization_mismatch_log
      USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = current_setting('app.current_tenant_id', true)
      )
      WITH CHECK (true);
  END IF;
END $$;

-- 4. notifications
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'notifications') THEN
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_notifications_tenant ON notifications;
    CREATE POLICY rls_notifications_tenant ON notifications
      USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = current_setting('app.current_tenant_id', true)
      )
      WITH CHECK (true);
  END IF;
END $$;

-- 5. activity_feed
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'activity_feed') THEN
    ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);
    ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
    ALTER TABLE activity_feed FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_activity_feed_tenant ON activity_feed;
    CREATE POLICY rls_activity_feed_tenant ON activity_feed
      USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = current_setting('app.current_tenant_id', true)
      )
      WITH CHECK (true);
  END IF;
END $$;
