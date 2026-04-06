// @ts-nocheck
/**
 * Onboarding Config Service — DB-driven configuration for the entire onboarding flow.
 * All methods use cacheGetOrSet with CacheTTL.LOOKUP (1 hour).
 * Replaces all hardcoded constants (stages, steps, blueprint rules, lookups).
 */

import { query } from '../../../config/database';
import { cacheGetOrSet, cacheInvalidatePattern, CacheTTL } from '../cache/cache.service';
import { logger } from '../observability/logger.service';
import { getFirstRow } from '../../../utils/db-utils';

const NS = 'lkp:onboarding:';

// ── Types ────────────────────────────────────────────────────────

export interface StageDefinition {
  stage_code: string;
  sort_order: number;
  label_en: string;
  label_ar: string;
  description_en: string | null;
  description_ar: string | null;
  icon_class: string | null;
  is_required: boolean;
  visibility_rule_json: Record<string, any>;
}

export interface ProvStepDef {
  step_code: string;
  step_name: string;
  step_name_ar: string | null;
  sequence_no: number;
  product_key: string | null;
  is_required: boolean;
  can_retry: boolean;
  max_retries: number;
  timeout_seconds: number;
  applicability_rule: Record<string, any> | null;
}

export interface RegulatorRule {
  rule_code: string;
  regulator_id: string;
  regulator_name: string;
  regulator_name_ar: string | null;
  condition_json: Record<string, any>;
  base_confidence: number;
  reason_en: string;
  reason_ar: string | null;
}

export interface FrameworkRule {
  rule_code: string;
  framework_code: string;
  framework_name: string;
  framework_name_ar: string | null;
  condition_json: Record<string, any>;
  reason_en: string;
  reason_ar: string | null;
  priority: string;
}

export interface BlueprintTemplate {
  template_type: string;
  template_code: string;
  title_en: string;
  title_ar: string | null;
  category: string | null;
  condition_json: Record<string, any> | null;
  metadata_json: Record<string, any>;
}

export interface ConfigDefault {
  config_key: string;
  condition_json: Record<string, any> | null;
  default_value: string;
  sort_order: number;
}

export interface CountryConfig {
  country_code: string;
  timezone: string;
  default_language: string;
  currency_code: string | null;
  is_gcc: boolean;
}

export interface MaturityMapping {
  input_value: string | null;
  output_level: string;
  min_readiness_score: number | null;
  max_readiness_score: number | null;
}

export interface ModuleRule {
  module_code: string;
  is_core: boolean;
  condition_json: Record<string, any> | null;
  description_en: string | null;
}

export interface DashboardRule {
  condition_json: Record<string, any>;
  dashboard_profile: string;
  sort_order: number;
}

export interface ValidationRule {
  blocker_code: string;
  severity: string;
  answer_code: string;
  check_type: string;
  title_en: string;
  title_ar: string;
  description_en: string | null;
  description_ar: string | null;
  resolution_action: string | null;
  stage_code: string | null;
  question_code: string | null;
}

export interface EditLink {
  section_key: string;
  stage_code: string;
  stage_index: number;
  label_en: string;
  label_ar: string;
}

export interface FrameworkEntry {
  framework_code: string;
  name_en: string;
  name_ar: string | null;
  summary_en: string | null;
  summary_ar: string | null;
  category: string | null;
  regulatory_authority: string | null;
}

// ── Queries ──────────────────────────────────────────────────────

export async function getStageDefinitions(): Promise<StageDefinition[]> {
  return cacheGetOrSet(`${NS}stages`, async () => {
    const r = await query('SELECT stage_code, sort_order, label_en, label_ar, description_en, description_ar, icon_class, is_required, visibility_rule_json FROM public.onboarding_stage_definitions WHERE is_active = true ORDER BY sort_order');
    return r.rows;
  }, CacheTTL.LOOKUP);
}

export async function getStageCodes(): Promise<string[]> {
  const stages = await getStageDefinitions();
  return stages.map(s => s.stage_code);
}

/**
 * Provisioning context for evaluating applicability rules.
 * Contains signals, answers, inferred regulators/frameworks, and other context needed to determine step applicability.
 */
export interface ProvisioningContext {
  signals?: Record<string, any>;
  answers?: Record<string, any>;
  inferredRegulators?: Array<{ code: string; confidence: number }>;
  inferredFrameworks?: Array<{ code: string; confidence: number }>;
  sector?: string;
  companySize?: string;
  [key: string]: unknown; // Allow additional context fields
}

/**
 * Evaluate an applicability rule against a provisioning context.
 * Returns true if the step should be included, false if it should be skipped.
 * If rule is null/undefined, always returns true (step always applies).
 */
function evaluateApplicabilityRule(rule: Record<string, any> | null | undefined, context: ProvisioningContext): boolean {
  if (!rule) {
    return true; // No rule means step always applies
  }

  // Simple rule evaluation (can be extended to support JSONLogic or more complex DSL)
  // For now, support basic condition checks:
  // { "if": { "signal": "value" } } or { "if": { "sector": ["BANKING", "INSURANCE"] } }
  
  if (rule.if) {
    const conditions = rule.if;
    
    // Check each condition
    for (const [key, expectedValue] of Object.entries(conditions)) {
      const actualValue = context[key] || context.signals?.[key] || context.answers?.[key];
      
      if (actualValue === undefined) {
        // Signal/answer not present - rule doesn't match
        return false;
      }
      
      // Handle array of allowed values (e.g., sector: ["BANKING", "INSURANCE"])
      if (Array.isArray(expectedValue)) {
        if (!expectedValue.includes(actualValue)) {
          return false;
        }
      } else if (actualValue !== expectedValue) {
        return false;
      }
    }
    
    return true; // All conditions matched
  }
  
  // If rule structure is not recognized, default to applying the step (fail open)
  logger.warn("Unrecognized applicability rule structure, defaulting to apply step", { rule });
  return true;
}

export async function getProvisioningStepDefinitions(
  productKey?: string,
  context?: ProvisioningContext
): Promise<ProvStepDef[]> {
  // Always cache the full list of steps (without filtering)
  // Filtering happens in memory after retrieval, so different contexts can reuse the same cached data
  const cacheKey = `${NS}prov_steps:${productKey || 'all'}`;
  
  const allSteps = await cacheGetOrSet(cacheKey, async () => {
    const sql = productKey
      ? 'SELECT step_code, step_name, step_name_ar, sequence_no, product_key, is_required, can_retry, max_retries, timeout_seconds, applicability_rule FROM public.provisioning_step_definitions WHERE is_active = true AND (product_key IS NULL OR product_key = $1) ORDER BY sequence_no'
      : 'SELECT step_code, step_name, step_name_ar, sequence_no, product_key, is_required, can_retry, max_retries, timeout_seconds, applicability_rule FROM public.provisioning_step_definitions WHERE is_active = true ORDER BY sequence_no';
    const r = productKey ? await query(sql, [productKey]) : await query(sql);
    return r.rows;
  }, CacheTTL.LOOKUP);
  
  // Filter steps based on applicability rules if context is provided
  if (context) {
    return allSteps.filter(step => evaluateApplicabilityRule(step.applicability_rule, context));
  }
  
  return allSteps;
}

export async function getRegulatorRules(): Promise<RegulatorRule[]> {
  return cacheGetOrSet(`${NS}regulator_rules`, async () => {
    const r = await query('SELECT rule_code, regulator_id, regulator_name, regulator_name_ar, condition_json, base_confidence, reason_en, reason_ar FROM public.regulator_inference_rules WHERE is_active = true ORDER BY sort_order');
    return r.rows;
  }, CacheTTL.LOOKUP);
}

export async function getFrameworkRules(): Promise<FrameworkRule[]> {
  return cacheGetOrSet(`${NS}framework_rules`, async () => {
    const r = await query('SELECT rule_code, framework_code, framework_name, framework_name_ar, condition_json, reason_en, reason_ar, priority FROM public.framework_recommendation_rules WHERE is_active = true ORDER BY sort_order');
    return r.rows;
  }, CacheTTL.LOOKUP);
}

export async function getBlueprintTemplates(type?: string): Promise<BlueprintTemplate[]> {
  return cacheGetOrSet(`${NS}templates:${type || 'all'}`, async () => {
    const sql = type
      ? 'SELECT template_type, template_code, title_en, title_ar, category, condition_json, metadata_json FROM public.blueprint_templates WHERE is_active = true AND template_type = $1 ORDER BY sort_order'
      : 'SELECT template_type, template_code, title_en, title_ar, category, condition_json, metadata_json FROM public.blueprint_templates WHERE is_active = true ORDER BY sort_order';
    const r = type ? await query(sql, [type]) : await query(sql);
    return r.rows;
  }, CacheTTL.LOOKUP);
}

export async function getAgrcConfigDefaults(): Promise<ConfigDefault[]> {
  return cacheGetOrSet(`${NS}agrc_defaults`, async () => {
    const r = await query('SELECT config_key, condition_json, default_value, sort_order FROM public.agrc_config_defaults WHERE is_active = true ORDER BY config_key, sort_order DESC');
    return r.rows;
  }, CacheTTL.LOOKUP);
}

export async function getCountryConfig(code?: string): Promise<CountryConfig[]> {
  return cacheGetOrSet(`${NS}country:${code || 'all'}`, async () => {
    const sql = code
      ? 'SELECT country_code, timezone, default_language, currency_code, is_gcc FROM public.country_config WHERE is_active = true AND country_code = $1'
      : 'SELECT country_code, timezone, default_language, currency_code, is_gcc FROM public.country_config WHERE is_active = true ORDER BY country_code';
    const r = code ? await query(sql, [code]) : await query(sql);
    return r.rows;
  }, CacheTTL.LOOKUP);
}

export async function getMaturityMap(): Promise<MaturityMapping[]> {
  return cacheGetOrSet(`${NS}maturity`, async () => {
    const r = await query('SELECT input_value, output_level, min_readiness_score, max_readiness_score FROM public.maturity_level_map ORDER BY id');
    return r.rows;
  }, CacheTTL.LOOKUP);
}

export async function getModuleRules(): Promise<ModuleRule[]> {
  return cacheGetOrSet(`${NS}module_rules`, async () => {
    const r = await query('SELECT module_code, is_core, condition_json, description_en FROM public.module_enablement_rules WHERE is_active = true ORDER BY sort_order');
    return r.rows;
  }, CacheTTL.LOOKUP);
}

export async function getDashboardRules(): Promise<DashboardRule[]> {
  return cacheGetOrSet(`${NS}dashboard_rules`, async () => {
    const r = await query('SELECT condition_json, dashboard_profile, sort_order FROM public.dashboard_assignment_rules WHERE is_active = true ORDER BY sort_order DESC');
    return r.rows;
  }, CacheTTL.LOOKUP);
}

export async function getValidationRules(): Promise<ValidationRule[]> {
  return cacheGetOrSet(`${NS}validation_rules`, async () => {
    const r = await query('SELECT blocker_code, severity, answer_code, check_type, title_en, title_ar, description_en, description_ar, resolution_action, stage_code, question_code FROM public.onboarding_validation_rules WHERE is_active = true ORDER BY sort_order');
    return r.rows;
  }, CacheTTL.LOOKUP);
}

export async function getEditLinks(): Promise<EditLink[]> {
  return cacheGetOrSet(`${NS}edit_links`, async () => {
    const r = await query('SELECT section_key, stage_code, stage_index, label_en, label_ar FROM public.onboarding_edit_links WHERE is_active = true ORDER BY sort_order');
    return r.rows;
  }, CacheTTL.LOOKUP);
}

export async function getFrameworkRegistry(): Promise<FrameworkEntry[]> {
  return cacheGetOrSet(`${NS}framework_registry`, async () => {
    const r = await query('SELECT framework_code, name_en, name_ar, summary_en, summary_ar, category, regulatory_authority FROM public.framework_registry WHERE is_active = true ORDER BY framework_code');
    return r.rows;
  }, CacheTTL.LOOKUP);
}

// ── Cache Invalidation ───────────────────────────────────────────

export async function invalidateAll(): Promise<number> {
  return cacheInvalidatePattern(`${NS}*`);
}

// ── Condition Evaluator ──────────────────────────────────────────
// Evaluates condition_json objects against an answers map.
// Supports: _eq, _include, _gte, _lte, _not_empty, and, or operators.

export function evaluateCondition(condition: Record<string, any> | null | undefined, answers: Record<string, any>): boolean {
  if (!condition || Object.keys(condition).length === 0) return true; // empty = universal match

  // Logical combinators
  if (condition.and) {
    return (condition.and as any[]).every(sub => evaluateCondition(sub, answers));
  }
  if (condition.or) {
    return (condition.or as any[]).some(sub => evaluateCondition(sub, answers));
  }

  // Leaf conditions
  for (const [key, expected] of Object.entries(condition)) {
    if (key === 'and' || key === 'or') continue;

    // Parse key: "industry_eq" → field="industry", op="eq"
    // or "regions_include" → field="regions", op="include"
    // or "readiness_score_gte" → field="readiness_score", op="gte"
    // or "people.auditor_email_not_empty" → field="people.auditor_email", op="not_empty"
    const opSuffixes = ['_not_empty', '_include', '_eq', '_gte', '_lte'];
    let field = key;
    let op = 'eq';

    for (const suffix of opSuffixes) {
      if (key.endsWith(suffix)) {
        field = key.slice(0, -suffix.length);
        op = suffix.slice(1); // remove leading underscore
        break;
      }
    }

    const actual = answers[field];

    switch (op) {
      case 'eq':
        if (actual !== expected) return false;
        break;
      case 'include': {
        const arr = Array.isArray(actual) ? actual : [];
        if (!arr.includes(expected)) return false;
        break;
      }
      case 'gte':
        if (Number(actual) < Number(expected)) return false;
        break;
      case 'lte':
        if (Number(actual) > Number(expected)) return false;
        break;
      case 'not_empty':
        if (!actual || (typeof actual === 'string' && actual.trim() === '')) return false;
        break;
      default:
        if (actual !== expected) return false;
    }
  }
  return true;
}

// ── Resolve Config Default ───────────────────────────────────────
// For a given config_key, find the highest-priority matching default.

export async function resolveConfigDefault(
  configKey: string,
  answers: Record<string, any>,
): Promise<string | undefined> {
  const defaults = await getAgrcConfigDefaults();
  const matching = defaults
    .filter(d => d.config_key === configKey)
    .sort((a, b) => b.sort_order - a.sort_order); // highest sort_order first

  for (const d of matching) {
    if (evaluateCondition(d.condition_json, answers)) {
      return d.default_value;
    }
  }
  return undefined;
}

// ── Resolve Maturity Level ───────────────────────────────────────

export async function resolveMaturityLevel(
  userInput: string | undefined,
  readinessScore: number,
): Promise<string> {
  const map = await getMaturityMap();

  // First try direct input mapping
  if (userInput) {
    const direct = map.find(m => m.input_value === userInput);
    if (direct) return direct.output_level;
  }

  // Fall back to score-based mapping
  const scoreBased = map.filter(m => m.input_value === null && m.min_readiness_score !== null);
  for (const m of scoreBased) {
    if (readinessScore >= (m.min_readiness_score ?? 0) && readinessScore <= (m.max_readiness_score ?? 100)) {
      return m.output_level;
    }
  }

  return 'foundational';
}

// ── Resolve Enabled Modules ──────────────────────────────────────

export async function resolveEnabledModules(
  answers: Record<string, any>,
  maturityLevel: string,
): Promise<string[]> {
  const rules = await getModuleRules();
  const modules: string[] = [];

  // Merge maturity into answers for condition evaluation
  const ctx = { ...answers, maturity_level: maturityLevel };

  for (const rule of rules) {
    if (rule.is_core) {
      modules.push(rule.module_code);
    } else if (evaluateCondition(rule.condition_json, ctx)) {
      modules.push(rule.module_code);
    }
  }

  return modules;
}

// ── Resolve Dashboard Profile ────────────────────────────────────

export async function resolveDashboardProfile(readinessScore: number): Promise<string> {
  const rules = await getDashboardRules();
  const sorted = [...rules].sort((a, b) => b.sort_order - a.sort_order);

  for (const r of sorted) {
    if (evaluateCondition(r.condition_json, { readiness_score: readinessScore })) {
      return r.dashboard_profile;
    }
  }
  return 'guided';
}

// ── Workspace Seed Profile Resolution ────────────────────────────

export interface WorkspaceSeedProfile {
  profile_id: string;
  profile_code: string;
  label_en: string;
  label_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  sector_code: string | null;
  company_size: string | null;
  regulator_codes: string[] | null;
  framework_codes: string[] | null;
  dashboard_template_codes: string[];
  workflow_template_codes: string[];
  assessment_template_codes: string[];
  plan90d_template_code: string;
  navigation_items: Record<string, any> | null;
  priority: number;
}

export interface SeedProfileResolutionContext {
  sector?: string;
  companySize?: string;
  regulatorCodes?: string[];
  frameworkCodes?: string[];
}

/**
 * Resolve the best matching workspace seed profile based on organizational profile.
 * Matches profiles by sector, company size, regulators, and frameworks.
 * Returns the highest priority profile that matches all provided criteria.
 * Falls back to a default profile if no match is found.
 */
export async function resolveWorkspaceSeedProfile(
  context: SeedProfileResolutionContext
): Promise<WorkspaceSeedProfile | null> {
  const cacheKey = `${NS}seed_profile:${context.sector || 'all'}:${context.companySize || 'all'}`;
  
  return cacheGetOrSet(cacheKey, async () => {
    // Build query to find matching profiles
    // Priority: exact sector+size match > sector match > size match > default (no criteria)
    const sql = `
      SELECT 
        profile_id,
        profile_code,
        label_en,
        label_ar,
        description_en,
        description_ar,
        sector_code,
        company_size,
        regulator_codes,
        framework_codes,
        dashboard_template_codes,
        workflow_template_codes,
        assessment_template_codes,
        plan90d_template_code,
        navigation_items,
        priority
      FROM public.workspace_seed_profile
      WHERE is_active = true
        AND (
          (sector_code IS NULL AND company_size IS NULL AND regulator_codes IS NULL AND framework_codes IS NULL)
          OR (sector_code = $1 OR sector_code IS NULL)
          OR (company_size = $2 OR company_size IS NULL)
        )
      ORDER BY 
        -- Exact matches first (sector + size)
        CASE WHEN sector_code = $1 AND company_size = $2 THEN 1 ELSE 0 END DESC,
        -- Then sector match
        CASE WHEN sector_code = $1 THEN 1 ELSE 0 END DESC,
        -- Then size match
        CASE WHEN company_size = $2 THEN 1 ELSE 0 END DESC,
        -- Then by priority (higher = more specific)
        priority DESC
      LIMIT 1
    `;
    
    const params = [context.sector || null, context.companySize || null];
    const r = await query(sql, params);
    
    if (r.rows.length === 0) {
      logger.warn("No workspace seed profile found, will use default templates", { context });
      return null;
    }
    
    const profile = getFirstRow(r);
    
    // Additional filtering: check regulator and framework codes if provided
    if (context.regulatorCodes && profile.regulator_codes && profile.regulator_codes.length > 0) {
      const hasMatchingRegulator = context.regulatorCodes.some(reg => 
        profile.regulator_codes.includes(reg)
      );
      if (!hasMatchingRegulator) {
        // This profile requires specific regulators that don't match
        // Try to find a more general profile
        logger.debug("Profile requires specific regulators that don't match, trying fallback", {
          profile: profile.profile_code,
          required: profile.regulator_codes,
          provided: context.regulatorCodes
        });
        // For now, we'll still return this profile but log a warning
        // In the future, we could implement a recursive fallback
      }
    }
    
    if (context.frameworkCodes && profile.framework_codes && profile.framework_codes.length > 0) {
      const hasMatchingFramework = context.frameworkCodes.some(fw => 
        profile.framework_codes.includes(fw)
      );
      if (!hasMatchingFramework) {
        logger.debug("Profile requires specific frameworks that don't match, trying fallback", {
          profile: profile.profile_code,
          required: profile.framework_codes,
          provided: context.frameworkCodes
        });
      }
    }
    
    return {
      profile_id: profile.profile_id,
      profile_code: profile.profile_code,
      label_en: profile.label_en,
      label_ar: profile.label_ar,
      description_en: profile.description_en,
      description_ar: profile.description_ar,
      sector_code: profile.sector_code,
      company_size: profile.company_size,
      regulator_codes: profile.regulator_codes,
      framework_codes: profile.framework_codes,
      dashboard_template_codes: profile.dashboard_template_codes || [],
      workflow_template_codes: profile.workflow_template_codes || [],
      assessment_template_codes: profile.assessment_template_codes || [],
      plan90d_template_code: profile.plan90d_template_code,
      navigation_items: profile.navigation_items,
      priority: profile.priority,
    };
  }, CacheTTL.LOOKUP);
}
