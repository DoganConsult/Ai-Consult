// ============================================
// Platform — Invitation Constants & Types
// Extracted from invitation.service.ts for modularity.
//
// Contains: permission maps, role constants, role-to-module
// mappings, landing page defaults, and utility type guards.
//
// Requirements: 1.3, 2.1–2.8
// ============================================

import * as crypto from 'crypto';
import type { ExternalRole } from '../../../../types/engagement.types';

// ── Token helpers (pure crypto, no service deps — safe for cross-file import) ─

/** Generate a 256-bit random token encoded as base64url. */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/** SHA-256 hash of a raw token (hex-encoded). */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Constant-time comparison of a raw token against a stored hex hash.
 * Returns true when the token matches the hash.
 */
export function verifyTokenHash(token: string, storedHash: string): boolean {
  const candidateHash = hashToken(token);
  const a = Buffer.from(candidateHash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ── Invitation expiry ────────────────────────────────────────────────────────

/** Invitation expiry window in milliseconds (72 hours). */
export const INVITATION_EXPIRY_MS = 72 * 60 * 60 * 1000;

// ── External role permission sets (Requirement 1.3) ──────────────────────────

/** Permission sets per external role. */
export const EXTERNAL_ROLE_PERMISSIONS: Record<ExternalRole, string[]> = {
  vendor_contact: ['vendor_portal.page.read', 'questionnaire.form.read', 'questionnaire.form.write', 'evidence.item.submit', 'messaging.channel.read'],
  regulator_inspector: ['compliance.program.read', 'audit.record.read', 'framework.record.read', 'report.document.read', 'regulator_portal.page.read'],
  consultant_admin: ['multi_client.scope.read', 'client:switch'],
  external_auditor: ['audit.record.read', 'evidence.item.read', 'findings.record.read', 'findings.record.write', 'report.document.read'],
};

/** Set of all external role codes for O(1) membership tests. */
export const EXTERNAL_ROLES = new Set<string>([
  'vendor_contact',
  'regulator_inspector',
  'consultant_admin',
  'external_auditor',
]);

/** Type guard: returns true if the role string is an ExternalRole. */
export function isExternalRole(role: string): role is ExternalRole {
  return EXTERNAL_ROLES.has(role);
}

// ── Role-to-team default mappings ────────────────────────────────────────────

/** Default teams a role is auto-assigned to upon invitation acceptance. */
export const ROLE_DEFAULT_TEAMS: Record<string, { codes: string[]; teamRole: string }> = {
  compliance_officer: { codes: ['CYBER_GOV', 'COMPLIANCE'], teamRole: 'member' },
  risk_manager: { codes: ['ERM', 'RISK_OPS'], teamRole: 'member' },
  auditor: { codes: ['INTERNAL_AUDIT'], teamRole: 'member' },
  admin: { codes: [], teamRole: 'lead' },
  owner: { codes: [], teamRole: 'lead' },
};

// ── Role landing pages ───────────────────────────────────────────────────────

/** Default landing page per role after acceptance. */
export const ROLE_LANDING: Record<string, string> = {
  compliance_officer: '/compliance-module',
  risk_manager: '/risk-hub',
  auditor: '/audit-hub',
  admin: '/workspace-home',
  owner: '/workspace-home',
  viewer: '/dashboard',
};

// ── Role-to-module mappings ──────────────────────────────────────────────────

/** Modules each role gains access to after acceptance. */
export const ROLE_MODULES: Record<string, string[]> = {
  compliance_officer: ['compliance', 'controls', 'policies', 'evidence', 'frameworks'],
  risk_manager: ['risks', 'vendors', 'incidents', 'bcm'],
  auditor: ['audit', 'findings', 'evidence', 'assessments'],
  admin: ['all'],
  owner: ['all'],
};

// ── Role display labels (used in emails and UI) ──────────────────────────────

/** Human-readable label per role code. */
export const ROLE_LABELS: Record<string, string> = {
  vendor_contact: 'Vendor Contact',
  regulator_inspector: 'Regulator Inspector',
  consultant_admin: 'Consultant Administrator',
  external_auditor: 'External Auditor',
  owner: 'Platform Owner',
  admin: 'Administrator',
  compliance_officer: 'Compliance Officer',
  risk_manager: 'Risk Manager',
  auditor: 'Auditor',
  viewer: 'Viewer',
  ciso: 'CISO',
  dpo: 'Data Protection Officer',
  erm_lead: 'ERM Lead',
  it_security: 'IT Security',
  internal_auditor: 'Internal Auditor',
  bc_lead: 'Business Continuity Lead',
  legal_counsel: 'Legal Counsel',
  hr_lead: 'HR Lead',
};

// ── Role-specific email content helpers ──────────────────────────────────────

/** Modules listed in invitation emails per role. */
export const ROLE_MODULES_EMAIL: Record<string, string[]> = {
  compliance_officer: ['Compliance', 'Controls', 'Policies', 'Evidence', 'Frameworks'],
  risk_manager: ['Risks', 'Vendors', 'Incidents', 'BCM'],
  auditor: ['Audit', 'Findings', 'Evidence', 'Assessments'],
  admin: ['All Modules'],
  owner: ['All Modules'],
  viewer: ['Dashboard'],
};

/** Dashboard widgets listed in invitation emails per role. */
export const ROLE_WIDGETS_EMAIL: Record<string, string[]> = {
  compliance_officer: ['compliance_score', 'control_effectiveness', 'policy_status'],
  risk_manager: ['risk_heatmap', 'risk_trends', 'vendor_risk'],
  auditor: ['audit_findings', 'evidence_status', 'assessment_progress'],
  admin: ['org_overview', 'risk_heatmap', 'compliance_score'],
  owner: ['org_overview', 'executive_summary', 'compliance_score'],
};
