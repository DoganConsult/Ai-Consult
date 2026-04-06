-- ============================================
-- Migration 064: Approval → Workflow Engine Bridge
-- Adds workflow linkage columns to approval_requests
-- so approval outcomes can callback to the workflow engine.
-- ============================================

ALTER TABLE public.approval_requests ADD COLUMN IF NOT EXISTS workflow_instance_id UUID;
ALTER TABLE public.approval_requests ADD COLUMN IF NOT EXISTS workflow_step_id UUID;
ALTER TABLE public.approval_requests ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_approval_req_wf_instance
  ON public.approval_requests (workflow_instance_id) WHERE workflow_instance_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_approval_req_wf_step
  ON public.approval_requests (workflow_step_id) WHERE workflow_step_id IS NOT NULL;
