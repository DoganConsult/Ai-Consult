-- ============================================
-- Migration 037: Approval Engine Tables
-- Multi-level approval chain management with
-- auto-escalation and audit logging.
--
-- Requirements: W2-9
-- ============================================

-- Reusable approval chain definitions
CREATE TABLE IF NOT EXISTS public.approval_chains (
  chain_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR(200) NOT NULL,
  entity_type    VARCHAR(100) NOT NULL,
  steps          JSONB NOT NULL DEFAULT '[]',
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_chains_entity_type
  ON public.approval_chains (entity_type) WHERE active = TRUE;

-- Approval requests tied to a specific chain
CREATE TABLE IF NOT EXISTS public.approval_requests (
  request_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id       UUID NOT NULL REFERENCES public.approval_chains(chain_id),
  entity_type    VARCHAR(100) NOT NULL,
  entity_id      VARCHAR(200) NOT NULL,
  current_step   INTEGER NOT NULL DEFAULT 1,
  status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')),
  submitted_by   VARCHAR(200) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_status
  ON public.approval_requests (status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_approval_requests_entity
  ON public.approval_requests (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_approval_requests_submitted_by
  ON public.approval_requests (submitted_by);

-- Step-level audit log for all approval actions
CREATE TABLE IF NOT EXISTS public.approval_steps_log (
  log_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id     UUID NOT NULL REFERENCES public.approval_requests(request_id),
  step_number    INTEGER NOT NULL,
  action         VARCHAR(20) NOT NULL
                   CHECK (action IN ('submitted', 'approved', 'rejected', 'delegated', 'escalated')),
  actor_id       VARCHAR(200) NOT NULL,
  comments       TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_steps_log_request
  ON public.approval_steps_log (request_id);
