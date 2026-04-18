-- Dogan AI OS — migration 0007: DSOC partition functions run as definer.
-- The audit_log partition manager + retention sweep need to create/drop
-- partitions inside the platform schema, but the runtime role
-- dogan_app is NOSUPERUSER and has no CREATE on schema platform.
-- Marking these functions SECURITY DEFINER (owned by dogan_master)
-- lets the runtime invoke them safely without granting broad DDL.

set local app.is_platform_admin = 'true';

alter function platform.audit_log_ensure_partition(timestamptz) security definer;
alter function platform.audit_log_retention_sweep()           security definer;

revoke all on function platform.audit_log_ensure_partition(timestamptz) from public;
revoke all on function platform.audit_log_retention_sweep()           from public;

grant execute on function platform.audit_log_ensure_partition(timestamptz) to dogan_app;
grant execute on function platform.audit_log_retention_sweep()           to dogan_app;
