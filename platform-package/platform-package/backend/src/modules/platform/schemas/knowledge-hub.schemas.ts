// @ts-nocheck
// ============================================================================
// API Validation Schemas for Knowledge Hub Routes (W2-17) — Zod v4 Enterprise Grade
// Zod schemas for request validation at API boundaries.
// Uses advanced features from common.schemas.
//
// @owner platform
// @module knowledge-hub
// @since 2026-03-31
// ============================================================================

import { z } from 'zod';
import {
  grcISODate,
  grcSeverity,
  grcSanitizedText,
  _grcConfidence,
  _grcPositiveInt,
} from '../../../schemas/common.schemas';

// ── Search ──

export const SearchQuerySchema = z.object({
  q: z.string().min(2, 'Search query must be at least 2 characters').max(200).trim(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  framework: z.string().max(50).optional(),
});

// ── Gap Analysis ──

export const GapAnalysisQuerySchema = z.object({
  tenantId: z.string().uuid('Invalid tenant ID'),
});

// ── Regulatory Changes ──

export const LogFrameworkChangeSchema = z.object({
  frameworkCode: z.string().min(1).max(50),
  fromVersion: z.string().max(20).optional(),
  toVersion: z.string().min(1).max(20),
  changeType: z.enum(['new', 'amended', 'repealed', 'superseded']).default('amended'),
  effectiveDate: grcISODate.optional(),
  affectedControls: z.array(z.string().max(100)).optional(),
  summary: grcSanitizedText(2000).optional(),
  publishedBy: z.string().max(100).optional(),
});

// ── Regulatory Alerts ──

export const CreateAlertSchema = z.object({
  authorityCode: z.string().min(1).max(20),
  authorityName: z.string().min(1).max(255).trim(),
  alertType: z.enum(['new_regulation', 'amendment', 'circular', 'enforcement', 'deadline']),
  title: z.string().min(1).max(500).trim(),
  description: z.string().min(1).max(5000),
  affectedSectors: z.array(z.string().max(50)).min(1, 'At least one sector required'),
  effectiveDate: grcISODate.optional(),
  urgency: grcSeverity.default('medium'),
  sourceUrl: z.string().url().max(2000).optional(),
});

// ── Framework Version ──

export const RegisterVersionSchema = z.object({
  frameworkCode: z.string().min(1).max(50),
  versionNumber: z.string().min(1).max(20),
  versionName: z.string().max(255).optional(),
  releaseDate: grcISODate,
  effectiveDate: grcISODate,
  transitionPeriodMonths: z.coerce.number().int().min(1).max(36).default(6),
  majorChanges: z.array(z.string().max(1000)).optional(),
  totalControls: z.coerce.number().int().min(0).optional(),
});

// ── Sector Management ──

export const AddSectorSchema = z.object({
  sectorCode: z.string().min(1).max(50),
});

// ── Mapping Suggestions ──

export const MappingSuggestionQuerySchema = z.object({
  source: z.string().min(1).max(50),
  target: z.string().min(1).max(50),
  minConfidence: z.coerce.number().min(0).max(1).default(0.6),
});

export const AcceptMappingsSchema = z.object({
  suggestions: z.array(z.object({
    sourceCode: z.string().min(1),
    targetCode: z.string().min(1),
    confidence: z.coerce.number().min(0).max(1),
    relationship: z.enum(['equivalent', 'partial', 'related']),
  })).min(1),
});

// ── Remediation Plan ──

export const RemediationPlanSchema = z.object({
  frameworkCode: z.string().min(1).max(50),
});

// ── Natural Language Query ──

export const NLQuerySchema = z.object({
  question: z.string().min(3, 'Question too short').max(500, 'Question too long').trim(),
});

// ── Executive Report ──

export const ExecutiveReportSchema = z.object({
  periodDays: z.coerce.number().int().min(7).max(365).default(30),
});

// ── Benchmarks ──

export const BenchmarkQuerySchema = z.object({
  tenantId: z.string().uuid('Invalid tenant ID'),
});

// ── Approval Chain ──

export const CreateApprovalChainSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  entityType: z.string().min(1).max(50),
  steps: z.array(z.object({
    stepNumber: z.coerce.number().int().min(1),
    approverRole: z.string().min(1).max(100),
    approverUserId: z.string().uuid().optional(),
    slaHours: z.coerce.number().int().min(1).max(720).default(48),
    autoEscalate: z.boolean().default(true),
  })).min(1),
});

export const SubmitApprovalSchema = z.object({
  entityType: z.string().min(1).max(50),
  entityId: z.string().uuid(),
  chainId: z.string().uuid().optional(),
  comments: grcSanitizedText(2000).optional(),
});

export const ApprovalActionSchema = z.object({
  comments: grcSanitizedText(2000).optional(),
});

export const NotesBody = z.object({
  notes: grcSanitizedText(2000).optional(),
});

export const DelegateApprovalSchema = z.object({
  toUserId: z.string().uuid(),
  reason: grcSanitizedText(500).optional(),
});

// ── Type Exports ──

export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type LogFrameworkChange = z.infer<typeof LogFrameworkChangeSchema>;
export type CreateAlert = z.infer<typeof CreateAlertSchema>;
