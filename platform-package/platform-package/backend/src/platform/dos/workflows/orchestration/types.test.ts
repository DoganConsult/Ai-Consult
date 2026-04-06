/**
 * Co-located tests for process-orchestration types.ts
 * Tests type contracts and constants for the process orchestration system.
 */
import { describe, it, expect } from 'vitest';
import type { ProcessTaskType, ScopeType } from './types';

describe('process-orchestration — types', () => {
  it('ProcessTaskType includes core task types', () => {
    const coreTypes: ProcessTaskType[] = [
      'evidence_request',
      'control_review',
      'risk_assessment',
      'policy_creation',
      'audit_response',
      'incident_response',
      'remediation',
      'approval',
      'verification',
    ];

    // Each should be a valid assignment (TypeScript compile-time check)
    expect(coreTypes).toHaveLength(9);
  });

  it('ProcessTaskType includes vendor cross-agent types', () => {
    const vendorTypes: ProcessTaskType[] = [
      'vendor_risk_propagation',
      'vendor_gap_remediation',
      'vendor_evidence_review',
      'vendor_audit_finding',
      'vendor_framework_sync',
    ];

    expect(vendorTypes).toHaveLength(5);
  });

  it('ProcessTaskType includes workflow-generated types', () => {
    const wfTypes: ProcessTaskType[] = [
      'workflow_task',
      'workflow_approval',
    ];

    expect(wfTypes).toHaveLength(2);
  });

  it('ScopeType includes all organizational levels', () => {
    const scopes: ScopeType[] = [
      'tenant',
      'organization',
      'department',
      'team',
      'position',
      'process',
      'policy',
      'workflow',
    ];

    expect(scopes).toHaveLength(8);
  });
});
