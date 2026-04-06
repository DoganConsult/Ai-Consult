// @ts-nocheck
/**
 * Template Engine Service — Process Lifecycle Templates
 *
 * Activates and customizes existing workflow templates for each journey phase.
 * Pure functions for template customization, serialization, and AI content generation.
 * DB functions for activated template persistence.
 *
 * Phase-to-template mapping:
 *   foundation         → policy_lifecycle
 *   assessment          → risk_treatment
 *   implementation      → compliance_remediation
 *   operations          → incident_response
 *   continuous_improvement → audit_cycle
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */

import { safeQuery, tenantSchema } from '../../../../config/database';
import { gatewayJSON } from '../../../../modules/ai/services/gateway/ai-gateway.service';
import {
  PREDEFINED_TEMPLATES,
  type PredefinedTemplate,
  type WorkflowDefinition,
  type WorkflowNode,
} from '../../../../modules/workflow/services/templates/workflow-templates.service';
import type {
  ActivatedTemplate,
  AIContent,
  RoadmapPhaseType,
  FrameworkRecommendation,
  JourneyCompanyProfile,
} from '../../../../types/journey.types';
import { classifyCompanySize } from '../../provisioning/setup-wizard.service';
import { getFirstRow } from '../../../../utils/db-utils';
import type { GenericRow } from '../../../../types/db-rows.types';

// ===========================================================================
// Constants
// ===========================================================================

/** Maps each roadmap phase to its corresponding predefined template key. */
const PHASE_TEMPLATE_MAP: Record<RoadmapPhaseType, string> = {
  foundation: 'policy_lifecycle',
  assessment: 'risk_treatment',
  implementation: 'compliance_remediation',
  operations: 'incident_response',
  continuous_improvement: 'audit_cycle',
};

/**
 * SLA multiplier by company size.
 * Smaller teams get more time (higher multiplier).
 * Requirement 4.6: Customize SLA hours based on team size.
 */
const SLA_MULTIPLIER: Record<string, number> = {
  small: 2.0,
  medium: 1.5,
  large: 1.0,
};

/** AI content type to system prompt mapping for Claude. */
const CONTENT_TYPE_PROMPTS: Record<AIContent['contentType'], string> = {
  policy_draft: `You are a GRC expert specializing in KSA regulatory compliance.
Generate a policy draft with bilingual content (English and Arabic).
The policy should follow ISO 27001 structure and be relevant to the specified frameworks.
Return JSON: { "titleEn": "...", "titleAr": "...", "bodyEn": "...", "bodyAr": "..." }`,

  risk_category: `You are a GRC risk management expert for KSA organizations.
Generate risk categories relevant to the specified sector and frameworks.
Each category should have bilingual names and descriptions.
Return JSON: { "titleEn": "...", "titleAr": "...", "bodyEn": "...", "bodyAr": "..." }`,

  questionnaire: `You are a compliance assessment expert for KSA regulatory frameworks.
Generate a compliance assessment questionnaire section with bilingual content.
Questions should be relevant to the specified frameworks and sector.
Return JSON: { "titleEn": "...", "titleAr": "...", "bodyEn": "...", "bodyAr": "..." }`,

  playbook: `You are an incident response expert for KSA organizations.
Generate an incident response playbook section with bilingual content.
The playbook should cover detection, containment, eradication, and recovery.
Return JSON: { "titleEn": "...", "titleAr": "...", "bodyEn": "...", "bodyAr": "..." }`,

  checklist: `You are a GRC audit expert for KSA regulatory compliance.
Generate an audit readiness checklist with bilingual content.
The checklist should be relevant to the specified frameworks.
Return JSON: { "titleEn": "...", "titleAr": "...", "bodyEn": "...", "bodyAr": "..." }`,
};

// ===========================================================================
// ID Generation Helper
// ===========================================================================

let _idCounter = 0;

function generateId(prefix: string): string {
  _idCounter += 1;
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${ts}-${rand}-${_idCounter}`;
}

// ===========================================================================
// Pure Functions
// ===========================================================================

/**
 * Customize a predefined workflow template based on team size and frameworks.
 *
 * - Adjusts SLA hours: smaller teams get more time (multiplied by size factor).
 * - Adds framework-specific swimlanes when multiple frameworks apply.
 *
 * Requirement 4.6: Customize workflow swimlanes and SLA hours based on team size.
 */
export function customizeTemplate(
  template: PredefinedTemplate,
  teamSize: number,
  frameworks: FrameworkRecommendation[],
): WorkflowDefinition {
  // Determine size category from raw team size number
  let sizeCategory: string;
  if (teamSize <= 50) {
    sizeCategory = 'small';
  } else if (teamSize <= 1000) {
    sizeCategory = 'medium';
  } else {
    sizeCategory = 'large';
  }

  const slaMultiplier = SLA_MULTIPLIER[sizeCategory] ?? 1.0;

  // Deep-clone the definition to avoid mutating the original
  const customized: WorkflowDefinition = {
    nodes: template.definition.nodes.map((node): WorkflowNode => ({
      ...node,
      // Scale SLA hours by team size multiplier
      ...(node.slaHours !== undefined
        ? { slaHours: Math.round(node.slaHours * slaMultiplier) }
        : {}),
    })),
    edges: template.definition.edges.map(edge => ({ ...edge })),
    swimlanes: [...template.definition.swimlanes],
    escalationChain: [...template.definition.escalationChain],
  };

  // Add framework-specific swimlanes if multiple frameworks apply
  if (frameworks.length > 1) {
    const frameworkSwimlane = 'framework_coordinator';
    if (!customized.swimlanes.includes(frameworkSwimlane)) {
      customized.swimlanes.push(frameworkSwimlane);
    }
  }

  return customized;
}

/**
 * Serialize an ActivatedTemplate to JSON string.
 * Round-trip safe with deserializeActivatedTemplate.
 *
 * Requirement 4.7: Round-trip serialization for activated templates.
 */
export function serializeActivatedTemplate(template: ActivatedTemplate): string {
  return JSON.stringify(template);
}

/**
 * Deserialize a JSON string back to an ActivatedTemplate.
 * Ensures all arrays default to empty if missing.
 *
 * Requirement 4.7: Round-trip serialization for activated templates.
 */
export function deserializeActivatedTemplate(json: string): ActivatedTemplate {
  const parsed = JSON.parse(json);
  return {
    activationId: parsed.activationId,
    tenantId: parsed.tenantId,
    templateKey: parsed.templateKey,
    phaseType: parsed.phaseType,
    customizedDefinition: parsed.customizedDefinition ?? {},
    aiGeneratedContent: Array.isArray(parsed.aiGeneratedContent)
      ? parsed.aiGeneratedContent.map((c: GenericRow) => ({
          contentId: c.contentId,
          contentType: c.contentType,
          titleEn: c.titleEn,
          titleAr: c.titleAr,
          bodyEn: c.bodyEn,
          bodyAr: c.bodyAr,
          ...(c.frameworkRef !== undefined ? { frameworkRef: c.frameworkRef } : {}),
        }))
      : [],
    activatedAt: parsed.activatedAt,
  };
}

// ===========================================================================
// AI Content Generation
// ===========================================================================

/**
 * Generate AI content for a specific content type using Claude.
 * Produces bilingual (English/Arabic) content relevant to the given
 * frameworks and sector.
 *
 * Requirements: 4.2 (policy drafts), 4.3 (risk categories),
 *               4.4 (questionnaires), 4.5 (playbooks)
 */
export async function generateAIContent(
  contentType: AIContent['contentType'],
  frameworks: FrameworkRecommendation[],
  sectorId: string,
  tenantId: string,
): Promise<AIContent> {
  const systemPrompt = CONTENT_TYPE_PROMPTS[contentType];
  const frameworkNames = frameworks.map(f => f.nameEn).join(', ');
  const frameworkRef = frameworks[0]?.frameworkId;

  const userMessage = `Generate ${contentType.replace('_', ' ')} content for:
- Sector: ${sectorId}
- Applicable frameworks: ${frameworkNames}
- Content must be practical and actionable for a KSA-based organization.
- Provide both English and Arabic content.`;

  try {
    const result = await gatewayJSON<{
      titleEn: string;
      titleAr: string;
      bodyEn: string;
      bodyAr: string;
    }>({
      systemPrompt,
      userMessage,
      temperature: 0.4,
      tenantId,
    });

    return {
      contentId: generateId('content'),
      contentType,
      titleEn: result.titleEn || `${contentType} - ${frameworkNames}`,
      titleAr: result.titleAr || `${contentType} - ${frameworkNames}`,
      bodyEn: result.bodyEn || '',
      bodyAr: result.bodyAr || '',
      frameworkRef,
    };
  } catch {
    // Fallback: return placeholder content if Claude is unavailable
    return buildFallbackContent(contentType, frameworkNames, frameworkRef);
  }
}

/**
 * Fallback content when Claude API is unavailable.
 * Provides basic bilingual placeholder content.
 */
function buildFallbackContent(
  contentType: AIContent['contentType'],
  frameworkNames: string,
  frameworkRef?: string,
): AIContent {
  const fallbacks: Record<AIContent['contentType'], { titleEn: string; titleAr: string; bodyEn: string; bodyAr: string }> = {
    policy_draft: {
      titleEn: `Information Security Policy - ${frameworkNames}`,
      titleAr: `سياسة أمن المعلومات - ${frameworkNames}`,
      bodyEn: `This policy establishes the information security requirements for compliance with ${frameworkNames}. It covers access control, data protection, incident management, and continuous monitoring.`,
      bodyAr: `تحدد هذه السياسة متطلبات أمن المعلومات للامتثال لـ ${frameworkNames}. وتشمل التحكم في الوصول وحماية البيانات وإدارة الحوادث والمراقبة المستمرة.`,
    },
    risk_category: {
      titleEn: `Risk Categories - ${frameworkNames}`,
      titleAr: `فئات المخاطر - ${frameworkNames}`,
      bodyEn: `Key risk categories: Cybersecurity Risk, Data Privacy Risk, Operational Risk, Third-Party Risk, Compliance Risk. Each category should be assessed against ${frameworkNames} requirements.`,
      bodyAr: `فئات المخاطر الرئيسية: مخاطر الأمن السيبراني، مخاطر خصوصية البيانات، المخاطر التشغيلية، مخاطر الأطراف الخارجية، مخاطر الامتثال. يجب تقييم كل فئة وفقاً لمتطلبات ${frameworkNames}.`,
    },
    questionnaire: {
      titleEn: `Compliance Assessment Questionnaire - ${frameworkNames}`,
      titleAr: `استبيان تقييم الامتثال - ${frameworkNames}`,
      bodyEn: `Assessment questionnaire covering: governance structure, policy management, risk assessment processes, control implementation, evidence collection, and monitoring practices per ${frameworkNames}.`,
      bodyAr: `استبيان التقييم يشمل: هيكل الحوكمة، إدارة السياسات، عمليات تقييم المخاطر، تنفيذ الضوابط، جمع الأدلة، وممارسات المراقبة وفقاً لـ ${frameworkNames}.`,
    },
    playbook: {
      titleEn: `Incident Response Playbook - ${frameworkNames}`,
      titleAr: `دليل الاستجابة للحوادث - ${frameworkNames}`,
      bodyEn: `Incident response playbook: 1) Detection & Triage, 2) Containment, 3) Eradication, 4) Recovery, 5) Post-Incident Review. Aligned with ${frameworkNames} incident reporting requirements.`,
      bodyAr: `دليل الاستجابة للحوادث: 1) الكشف والفرز، 2) الاحتواء، 3) الإزالة، 4) الاستعادة، 5) مراجعة ما بعد الحادث. متوافق مع متطلبات الإبلاغ عن الحوادث في ${frameworkNames}.`,
    },
    checklist: {
      titleEn: `Audit Readiness Checklist - ${frameworkNames}`,
      titleAr: `قائمة الجاهزية للتدقيق - ${frameworkNames}`,
      bodyEn: `Audit readiness checklist: evidence completeness, control effectiveness, policy currency, risk register updates, training records, and incident response testing per ${frameworkNames}.`,
      bodyAr: `قائمة الجاهزية للتدقيق: اكتمال الأدلة، فعالية الضوابط، حداثة السياسات، تحديثات سجل المخاطر، سجلات التدريب، واختبار الاستجابة للحوادث وفقاً لـ ${frameworkNames}.`,
    },
  };

  const fb = fallbacks[contentType];
  return {
    contentId: generateId('content'),
    contentType,
    titleEn: fb.titleEn,
    titleAr: fb.titleAr,
    bodyEn: fb.bodyEn,
    bodyAr: fb.bodyAr,
    frameworkRef,
  };
}

// ===========================================================================
// Phase-to-Content-Type Mapping
// ===========================================================================

/** Maps each phase to the AI content types it should generate. */
const PHASE_CONTENT_TYPES: Record<RoadmapPhaseType, AIContent['contentType'][]> = {
  foundation: ['policy_draft'],
  assessment: ['risk_category'],
  implementation: ['questionnaire'],
  operations: ['playbook'],
  continuous_improvement: ['checklist'],
};

// ===========================================================================
// Template Activation
// ===========================================================================

/**
 * Activate and customize the appropriate template for a given roadmap phase.
 *
 * 1. Looks up the template key for the phase.
 * 2. Finds the matching predefined template.
 * 3. Customizes it based on team size and frameworks.
 * 4. Generates AI content appropriate for the phase.
 * 5. Returns the fully activated template.
 *
 * Requirements: 4.1 (foundation→policy_lifecycle),
 *               4.3 (assessment→risk_treatment),
 *               4.4 (implementation→compliance_remediation),
 *               4.5 (operations→incident_response)
 */
export async function activateTemplateForPhase(
  tenantId: string,
  phaseType: RoadmapPhaseType,
  profile: JourneyCompanyProfile,
): Promise<ActivatedTemplate> {
  const templateKey = PHASE_TEMPLATE_MAP[phaseType];
  const template = PREDEFINED_TEMPLATES.find(t => t.templateKey === templateKey);

  if (!template) {
    throw new Error(`No predefined template found for key: ${templateKey}`);
  }

  // Derive team size from employee count
  const sizeCategory = classifyCompanySize(profile.employeeCount);
  const teamSizeNum = sizeCategory === 'small' ? 25 : sizeCategory === 'medium' ? 200 : 2000;

  // Customize the workflow definition
  const customizedDefinition = customizeTemplate(
    template,
    teamSizeNum,
    profile.applicableFrameworks,
  );

  // Generate AI content for this phase
  const contentTypes = PHASE_CONTENT_TYPES[phaseType];
  const aiGeneratedContent: AIContent[] = [];

  for (const contentType of contentTypes) {
    // Generate one piece of content per framework (up to 3)
    const frameworksToProcess = profile.applicableFrameworks.slice(0, 3);
    for (const fw of frameworksToProcess) {
      const content = await generateAIContent(
        contentType,
        [fw],
        profile.industrySector,
        tenantId,
      );
      aiGeneratedContent.push(content);
    }

    // If no frameworks, generate generic content
    if (frameworksToProcess.length === 0) {
      const content = await generateAIContent(
        contentType,
        profile.applicableFrameworks,
        profile.industrySector,
        tenantId,
      );
      aiGeneratedContent.push(content);
    }
  }

  const activated: ActivatedTemplate = {
    activationId: generateId('tmpl'),
    tenantId,
    templateKey,
    phaseType,
    customizedDefinition: customizedDefinition as any as Record<string, any>,
    aiGeneratedContent,
    activatedAt: new Date().toISOString(),
  };

  return activated;
}

// ===========================================================================
// DB Functions
// ===========================================================================

/**
 * Save an activated template to the tenant schema.
 * Uses upsert — if a template with the same key already exists for the tenant,
 * it is replaced.
 */
export async function saveActivatedTemplate(
  tenantId: string,
  template: ActivatedTemplate,
): Promise<ActivatedTemplate> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".activated_templates
       (tenant_id, template_key, phase_type, customized_definition, ai_generated_content)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tenant_id, template_key) DO UPDATE SET
       phase_type = EXCLUDED.phase_type,
       customized_definition = EXCLUDED.customized_definition,
       ai_generated_content = EXCLUDED.ai_generated_content,
       activated_at = NOW()
     RETURNING activation_id, activated_at`,
    [
      tenantId,
      template.templateKey,
      template.phaseType,
      JSON.stringify(template.customizedDefinition),
      JSON.stringify(template.aiGeneratedContent),
    ],
  );

  const row = getFirstRow(result);
  return {
    ...template,
    activationId: row.activation_id,
    activatedAt: row.activated_at instanceof Date
      ? row.activated_at.toISOString()
      : row.activated_at,
  };
}

/**
 * Retrieve all activated templates for a tenant, optionally filtered by phase.
 */
export async function getActivatedTemplates(
  tenantId: string,
  phaseType?: RoadmapPhaseType,
): Promise<ActivatedTemplate[]> {
  const schema = tenantSchema(tenantId);
  let sql = `
    SELECT activation_id, tenant_id, template_key, phase_type,
           customized_definition, ai_generated_content, activated_at
    FROM "${schema}".activated_templates
    WHERE tenant_id = $1`;
  const params: unknown[] = [tenantId];

  if (phaseType) {
    sql += ` AND phase_type = $2`;
    params.push(phaseType);
  }

  sql += ` ORDER BY activated_at DESC`;

  const result = await safeQuery(sql, params);

  return result.rows.map((row: GenericRow) => ({
    activationId: row.activation_id,
    tenantId: row.tenant_id,
    templateKey: row.template_key,
    phaseType: row.phase_type as RoadmapPhaseType,
    customizedDefinition: row.customized_definition ?? {},
    aiGeneratedContent: row.ai_generated_content ?? [],
    activatedAt: row.activated_at instanceof Date
      ? row.activated_at.toISOString()
      : row.activated_at,
  }));
}
