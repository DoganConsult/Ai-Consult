-- Migration 924: Add workflow_retry_recovery_records table
-- Spec: MP-02 §5 item 10 — dedicated table for retry attempts and recovery actions
-- Required for §11 metrics: retry rate, recovery diagnostics

CREATE TABLE __TENANT_SCHEMA__.workflow_retry_recovery_records (
    record_id          uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    instance_id        uuid NOT NULL,
    step_id            text,
    attempt_number     integer NOT NULL DEFAULT 1,
    trigger_reason     text NOT NULL,
    action_taken       text NOT NULL,
    outcome            text NOT NULL CHECK (outcome IN ('recovered', 'failed', 'skipped', 'pending')),
    error_detail       text,
    initiated_by       character varying(64) NOT NULL DEFAULT 'system',
    duration_ms        integer,
    created_at         timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX idx_wf_retry_recovery_instance
    ON __TENANT_SCHEMA__.workflow_retry_recovery_records (instance_id);

CREATE INDEX idx_wf_retry_recovery_outcome
    ON __TENANT_SCHEMA__.workflow_retry_recovery_records (outcome);

CREATE INDEX idx_wf_retry_recovery_created
    ON __TENANT_SCHEMA__.workflow_retry_recovery_records (created_at DESC);

CREATE INDEX idx_wf_retry_recovery_step
    ON __TENANT_SCHEMA__.workflow_retry_recovery_records (step_id)
    WHERE step_id IS NOT NULL;

COMMENT ON TABLE __TENANT_SCHEMA__.workflow_retry_recovery_records IS
    'MP-02 §5.10: Tracks retry attempts and recovery actions for workflow instances and steps.';
