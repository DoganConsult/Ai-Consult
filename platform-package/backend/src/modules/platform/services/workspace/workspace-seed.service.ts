// @ts-nocheck
import { v4 as uuid } from "uuid";
import { createHash } from "crypto";
import { InferenceResult } from "../../../ai/services/reasoning/signal-inference.engine";
import type {
  WorkspaceSeed as CanonicalWorkspaceSeed,
  RegulatoryCandidate,
  FrameworkCandidate,
  ControlClusterSummary,
  EvidencePlanSeed,
  
  PlanItemSeed,
} from "../../../../types/workspace-seed.types";
import { WORKSPACE_SEED_SCHEMA_VERSION } from "../../../../types/workspace-seed.types";
import {  ASSESSMENT_TEMPLATE_CODES } from "../../../../data/seed/workspace-templates";
import { safeQuery, tenantSchema } from "../../../../config/database";
import type { WorkspaceSeedProfile } from '../../../../platform/dos/provisioning/onboarding-config.service';
import { getFirstRow } from '../../../../utils/db-utils';

export interface WorkspaceSeed {
  version: string;
  tenantId: string;
  createdAt: string;
  tenant: {
    orgName: string;
    industry: string;
    orgSize: string;
    regions: string[];
  };
  rbac: {
    roles: Array<{ id: string; name: string; permissions: string[] }>;
  };
  regulatoryProfile: {
    regulators: Array<{ id: string; name: string; confidence: number; reasons: string[] }>;
    frameworks: Array<{ id: string; name: string; confidence: number; priority: string; reasons: string[] }>;
  };
  controlUniverse: {
    controls: Array<{ id: string; title: string; frameworks: string[]; automatable: boolean; priority: string }>;
  };
  evidencePlan: {
    tasks: Array<{ id: string; controlId: string; title: string; evidenceType: string; frequency: string; dueOffset: number }>;
  };
  riskRegister: {
    risks: Array<{ id: string; title: string; category: string; likelihood: number; impact: number }>;
  };
  policies: {
    items: Array<{ id: string; title: string; frameworks: string[] }>;
  };
  dashboards: {
    layout: string;
    widgets: string[];
  };
  plan90d: {
    milestones: Array<{ id: string; title: string; day: number; tasks: string[] }>;
  };
  explainability: Array<{ targetId: string; targetName: string; targetType: string; reason: string; reasonAr?: string; confidence: number; signals: string[] }>;
}

export function buildWorkspaceSeed(
  tenantId: string,
  answers: Record<string, any>,
  inference: InferenceResult
): WorkspaceSeed {
  const fwIds = inference.frameworks.map(f => f.id);

  const evidenceTasks = inference.controls.flatMap(c => {
    const tasks = [];
    tasks.push({
      id: uuid().slice(0, 8),
      controlId: c.id,
      title: `Collect evidence: ${c.title}`,
      evidenceType: c.automatable ? "automated_scan" : "manual_upload",
      frequency: c.priority === "critical" ? "monthly" : "quarterly",
      dueOffset: c.priority === "critical" ? 30 : 60,
    });
    return tasks;
  });

  const risks = [
    { id: uuid().slice(0, 8), title: "Data Breach", category: "cybersecurity", likelihood: 3, impact: 5 },
    { id: uuid().slice(0, 8), title: "Unauthorized Access", category: "cybersecurity", likelihood: 3, impact: 4 },
    { id: uuid().slice(0, 8), title: "Regulatory Non-Compliance", category: "legal", likelihood: 2, impact: 5 },
    { id: uuid().slice(0, 8), title: "Third-Party Vendor Risk", category: "third_party", likelihood: 3, impact: 3 },
  ];

  const dataTypes: string[] = answers.data_types || [];
  if (dataTypes.includes("pii") || dataTypes.includes("health")) {
    risks.push({ id: uuid().slice(0, 8), title: "Personal Data Exposure", category: "reputational", likelihood: 2, impact: 5 });
  }
  if (answers.industry === "finance") {
    risks.push({ id: uuid().slice(0, 8), title: "Financial Fraud", category: "financial", likelihood: 2, impact: 5 });
  }

  const policies = [
    { id: uuid().slice(0, 8), title: "Information Security Policy", frameworks: fwIds },
    { id: uuid().slice(0, 8), title: "Acceptable Use Policy", frameworks: fwIds },
    { id: uuid().slice(0, 8), title: "Access Control Policy", frameworks: fwIds },
    { id: uuid().slice(0, 8), title: "Incident Response Policy", frameworks: fwIds },
    { id: uuid().slice(0, 8), title: "Data Classification Policy", frameworks: fwIds },
    { id: uuid().slice(0, 8), title: "Business Continuity Policy", frameworks: fwIds },
  ];

  if (dataTypes.includes("pii") || (answers.regions || []).includes("ksa") || (answers.regions || []).includes("eu")) {
    policies.push({ id: uuid().slice(0, 8), title: "Privacy & Data Protection Policy", frameworks: fwIds });
  }

  const goals: string[] = answers.goals || [];

  const plan90d = {
    milestones: [
      { id: uuid().slice(0, 8), title: "Governance Foundation", day: 7, tasks: ["Establish security committee", "Assign CISO/GRC roles", "Approve security policy"] },
      { id: uuid().slice(0, 8), title: "Risk Assessment", day: 21, tasks: ["Complete risk assessment", "Identify top 10 risks", "Define risk treatment plans"] },
      { id: uuid().slice(0, 8), title: "Framework Alignment", day: 35, tasks: ["Map controls to frameworks", "Identify compliance gaps", "Prioritize remediation"] },
      { id: uuid().slice(0, 8), title: "Control Implementation", day: 55, tasks: ["Deploy critical controls", "Enable MFA", "Configure logging & monitoring"] },
      { id: uuid().slice(0, 8), title: "Evidence Collection", day: 70, tasks: ["Start evidence collection", "Set up automated scans", "Train staff on evidence upload"] },
      { id: uuid().slice(0, 8), title: "Baseline Assessment", day: 90, tasks: ["Run first compliance assessment", "Generate maturity score", "Executive report to leadership"] },
    ],
  };

  return {
    version: "1.0.0",
    tenantId,
    createdAt: new Date().toISOString(),
    tenant: {
      orgName: answers.org_name || "My Organization",
      industry: answers.industry || "other",
      orgSize: answers.org_size || "1-50",
      regions: answers.regions || [],
    },
    rbac: {
      roles: [
        { id: "role-admin", name: "Administrator", permissions: ["admin", "read", "write", "approve", "delete"] },
        { id: "role-grc-mgr", name: "GRC Manager", permissions: ["read", "write", "approve"] },
        { id: "role-analyst", name: "Compliance Analyst", permissions: ["read", "write"] },
        { id: "role-auditor", name: "Internal Auditor", permissions: ["read", "audit"] },
        { id: "role-viewer", name: "Executive Viewer", permissions: ["read"] },
      ],
    },
    regulatoryProfile: {
      regulators: inference.regulators.map(r => ({ id: r.id, name: r.name, confidence: r.confidence, reasons: r.reasons })),
      frameworks: inference.frameworks.map(f => ({ id: f.id, name: f.name, confidence: f.confidence, priority: f.priority, reasons: f.reasons })),
    },
    controlUniverse: { controls: inference.controls },
    evidencePlan: { tasks: evidenceTasks },
    riskRegister: { risks },
    policies: { items: policies },
    dashboards: {
      layout: goals.includes("risk_mgmt") ? "risk_focused" : "compliance_focused",
      widgets: ["compliance_score", "risk_heatmap", "evidence_progress", "upcoming_tasks", "framework_coverage"],
    },
    plan90d,
    explainability: inference.reasons.map(r => ({
      targetId: r.targetId,
      targetName: r.targetName,
      targetType: r.targetType,
      reason: r.reason,
      reasonAr: r.reasonAr,
      confidence: r.confidence,
      signals: r.triggeringSignals,
    })),
  };
}

/** Build canonical WorkspaceSeed (versioned contract) from existing seed for persistence and provisioning.
 *  When dbResolution is provided, its counts and modules override inference-derived stubs. */
export function buildCanonicalWorkspaceSeed(
  tenantId: string,
  existing: WorkspaceSeed,
  options: { workspaceId?: string; answersHash?: string; dbControlCount?: number; dbEvidenceTaskCount?: number; dbModules?: string[]; seedProfile?: WorkspaceSeedProfile | null } = {}
): CanonicalWorkspaceSeed {
  const regulators: RegulatoryCandidate[] = existing.regulatoryProfile.regulators.map(r => ({
    code: r.id,
    name_en: r.name,
    confidence: r.confidence,
    reasons: r.reasons,
  }));
  const frameworks: FrameworkCandidate[] = existing.regulatoryProfile.frameworks.map(f => ({
    code: f.id,
    name_en: f.name,
    confidence: f.confidence,
    reasons: f.reasons,
  }));
  const clusters: ControlClusterSummary[] = [
    { code: "GOVERNANCE", name_en: "Governance", status: "APPLICABLE", confidence: 0.9, controlsCount: existing.controlUniverse.controls.length },
  ];
  const evidencePlan: EvidencePlanSeed = {
    cadenceDefaults: { GOVERNANCE: "quarterly", DEFAULT: "quarterly" },
    automationTargets: { day30: 0.3, day90: 0.6 },
    tasksCreated90d: existing.evidencePlan.tasks.length,
    firstDueItems: existing.evidencePlan.tasks.slice(0, 5).map(t => ({
      controlId: t.controlId,
      dueAt: new Date(Date.now() + t.dueOffset * 24 * 60 * 60 * 1000).toISOString(),
      role: "compliance_officer",
    })),
  };
  const startAt = new Date().toISOString().slice(0, 10);
  const planItems: PlanItemSeed[] = existing.plan90d.milestones.map(m => ({
    itemId: m.id,
    week: Math.min(13, Math.ceil(m.day / 7)),
    type: "evidence-collection",
    title_en: m.title,
    title_ar: m.title,
    owner_role: "compliance_officer",
    due_at: new Date(Date.now() + m.day * 24 * 60 * 60 * 1000).toISOString(),
    status: "Open",
  }));

  return {
    schemaVersion: WORKSPACE_SEED_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    answersHash: options.answersHash,
    tenant: {
      tenantId,
      orgName: existing.tenant.orgName,
      sector: existing.tenant.industry,
      country: "SA",
      tier: "standard",
      modules: options.dbModules?.length
        ? [...new Set([...options.dbModules, "compliance", "risk", "evidence", "reports", "workflow", "ai"])]
        : ["compliance", "risk", "evidence", "reports", "workflow", "ai"],
    },
    rbac: {
      roles: existing.rbac.roles.map(r => r.name),
      assignments: {},
    },
    regulatoryProfile: { regulators, frameworks },
    controlUniverse: {
      clusters,
      controlsApplicableCount: options.dbControlCount ?? existing.controlUniverse.controls.length,
      controlsNeedsConfirmationCount: 0,
      includedControlIds: existing.controlUniverse.controls.map(c => c.id),
    },
    evidencePlan: {
      ...evidencePlan,
      tasksCreated90d: options.dbEvidenceTaskCount ?? evidencePlan.tasksCreated90d,
    },
    dashboards: options.seedProfile?.dashboard_template_codes && options.seedProfile.dashboard_template_codes.length > 0
      ? options.seedProfile.dashboard_template_codes as typeof DASHBOARD_TEMPLATE_CODES[number][]
      : [...DASHBOARD_TEMPLATE_CODES],
    workflows: options.seedProfile?.workflow_template_codes && options.seedProfile.workflow_template_codes.length > 0
      ? options.seedProfile.workflow_template_codes as typeof WORKFLOW_TEMPLATE_CODES[number][]
      : [...WORKFLOW_TEMPLATE_CODES],
    assessments: options.seedProfile?.assessment_template_codes && options.seedProfile.assessment_template_codes.length > 0
      ? options.seedProfile.assessment_template_codes as typeof ASSESSMENT_TEMPLATE_CODES[number][]
      : [...ASSESSMENT_TEMPLATE_CODES],
    plan90d: {
      templateCode: options.seedProfile?.plan90d_template_code || "DEFAULT_90D",
      startAt,
      items: planItems,
    },
  };
}

/** Persist canonical WorkspaceSeed to tenant schema (workspace_seeds table). Returns seed_id. */
export async function persistWorkspaceSeed(
  tenantId: string,
  seed: CanonicalWorkspaceSeed,
  createdBy: string,
  options: { 
    provisioningJobId?: string; 
    answersHash?: string; 
    seedProfileCode?: string | null;
    seedProfileSector?: string | null;
    seedProfileCompanySize?: string | null;
    seedProfileRegulatorCodes?: string[] | null;
    seedProfileFrameworkCodes?: string[] | null;
  } = {}
): Promise<string> {
  const schema = tenantSchema(tenantId);
  const seedId = uuid();
  await safeQuery(
    `INSERT INTO "${schema}".workspace_seeds (
      seed_id, tenant_id, schema_version, seed_payload, answers_hash, provisioning_job_id, created_by, 
      seed_profile_code, seed_profile_sector, seed_profile_company_size, 
      seed_profile_regulator_codes, seed_profile_framework_codes
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      seedId,
      tenantId,
      seed.schemaVersion,
      JSON.stringify(seed),
      options.answersHash ?? null,
      options.provisioningJobId ?? null,
      createdBy,
      options.seedProfileCode ?? null,
      options.seedProfileSector ?? null,
      options.seedProfileCompanySize ?? null,
      options.seedProfileRegulatorCodes ?? null,
      options.seedProfileFrameworkCodes ?? null,
    ]
  );
  return seedId;
}

export async function seedRaciFromDistribution(tenantId: string): Promise<{ controlsSeeded: number; risksSeeded: number; evidenceSeeded: number }> {
  const schema = tenantSchema(tenantId);
  let controlsSeeded = 0, risksSeeded = 0, evidenceSeeded = 0;

  try {
    const controls = await safeQuery(
      `SELECT c.control_id FROM "${schema}".controls c
       WHERE NOT EXISTS (
         SELECT 1 FROM "${schema}".grc_raci_assignments gra
         WHERE gra.entity_type = 'control' AND gra.entity_id = c.control_id::text
           AND gra.is_active = TRUE AND gra.deleted_at IS NULL
       ) LIMIT 200`
    );

    const ctrlDist = await safeQuery(
      `SELECT DISTINCT td.team_code, td.raci_role, t.team_id
       FROM "${schema}".control_team_distribution td
       JOIN "${schema}".teams t ON t.team_code = td.team_code
       WHERE td.raci_role IN ('responsible', 'accountable')
       LIMIT 5`
    );

    for (const ctrl of controls.rows) {
      for (const d of ctrlDist.rows) {
        await safeQuery(
          `INSERT INTO "${schema}".grc_raci_assignments
             (entity_type, entity_id, team_id, raci_role, assignment_source)
           VALUES ('control', $1, $2, $3, 'auto_provision')
           ON CONFLICT DO NOTHING`,
          [ctrl.control_id, d.team_id, d.raci_role]
        );
      }
      controlsSeeded++;
    }

    const risks = await safeQuery(
      `SELECT r.risk_id FROM "${schema}".risks r
       WHERE NOT EXISTS (
         SELECT 1 FROM "${schema}".grc_raci_assignments gra
         WHERE gra.entity_type = 'risk' AND gra.entity_id = r.risk_id::text
           AND gra.is_active = TRUE AND gra.deleted_at IS NULL
       ) LIMIT 200`
    );

    const riskDist = await safeQuery(
      `SELECT DISTINCT td.team_code, td.raci_role, t.team_id
       FROM "${schema}".risk_team_distribution td
       JOIN "${schema}".teams t ON t.team_code = td.team_code
       WHERE td.raci_role IN ('responsible', 'accountable')
       LIMIT 5`
    );

    for (const risk of risks.rows) {
      for (const d of riskDist.rows) {
        await safeQuery(
          `INSERT INTO "${schema}".grc_raci_assignments
             (entity_type, entity_id, team_id, raci_role, assignment_source)
           VALUES ('risk', $1, $2, $3, 'auto_provision')
           ON CONFLICT DO NOTHING`,
          [risk.risk_id, d.team_id, d.raci_role]
        );
      }
      risksSeeded++;
    }

    const evidence = await safeQuery(
      `SELECT e.evidence_id FROM "${schema}".evidence e
       WHERE NOT EXISTS (
         SELECT 1 FROM "${schema}".grc_raci_assignments gra
         WHERE gra.entity_type = 'evidence' AND gra.entity_id = e.evidence_id::text
           AND gra.is_active = TRUE AND gra.deleted_at IS NULL
       ) LIMIT 200`
    );

    const evDist = await safeQuery(
      `SELECT DISTINCT td.team_code, td.raci_role, t.team_id
       FROM "${schema}".evidence_team_distribution td
       JOIN "${schema}".teams t ON t.team_code = td.team_code
       WHERE td.raci_role IN ('responsible', 'accountable')
       LIMIT 5`
    );

    for (const ev of evidence.rows) {
      for (const d of evDist.rows) {
        await safeQuery(
          `INSERT INTO "${schema}".grc_raci_assignments
             (entity_type, entity_id, team_id, raci_role, assignment_source)
           VALUES ('evidence', $1, $2, $3, 'auto_provision')
           ON CONFLICT DO NOTHING`,
          [ev.evidence_id, d.team_id, d.raci_role]
        );
      }
      evidenceSeeded++;
    }
  } catch { /* distribution or raci tables may not exist yet */ }

  return { controlsSeeded, risksSeeded, evidenceSeeded };
}

export async function seedModuleDemoData(tenantId: string): Promise<{
  incidents: number; nearMisses: number; bcpPlans: number; vendors: number;
  campaigns: number; assignments: number;
}> {
  const schema = tenantSchema(tenantId);
  let incidents = 0, nearMisses = 0, bcpPlans = 0, vendors = 0, campaigns = 0, assignments = 0;
  try {
    const existing = await safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".incidents`);
    if ((getFirstRow(existing)?.cnt || 0) < 3) {
      const demoIncidents = [
        { title: 'Unauthorized VPN Access Attempt', description: 'Multiple failed VPN login attempts from any IP range', severity: 'high', category: 'security', status: 'investigating' },
        { title: 'Email Server Outage', description: 'Exchange Online service degradation affecting 200+ users', severity: 'medium', category: 'it_outage', status: 'open' },
        { title: 'Policy Violation: USB Usage', description: 'Unauthorized USB device connected to classified workstation', severity: 'high', category: 'compliance', status: 'open' },
        { title: 'Phishing Campaign Detected', description: 'Targeted phishing emails mimicking SAMA communications', severity: 'critical', category: 'security', status: 'investigating' },
        { title: 'Data Center Cooling Failure', description: 'HVAC system malfunction in primary DC - temperature rising', severity: 'high', category: 'physical', status: 'resolved' },
      ];
      for (const inc of demoIncidents) {
        await safeQuery(
          `INSERT INTO "${schema}".incidents (title, description, severity, category, status, reported_by)
           VALUES ($1,$2,$3,$4,$5,'system') ON CONFLICT DO NOTHING`,
          [inc.title, inc.description, inc.severity, inc.category, inc.status]
        );
        incidents++;
      }
    }
  } catch { /* incidents table may not exist */ }

  try {
    const nmExisting = await safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".near_miss_reports`);
    if ((getFirstRow(nmExisting)?.cnt || 0) < 2) {
      await safeQuery(
        `INSERT INTO "${schema}".near_miss_reports (title, description, reported_by, severity_estimate, status)
         VALUES ('Tailgating Attempt at DC', 'Unregistered individual attempted to follow authorized staff into data center', 'system', 'medium', 'reported'),
                ('Almost-Expired SSL Certificate', 'Production SSL certificate was 3 days from expiry with no renewal planned', 'system', 'high', 'under_review')
         ON CONFLICT DO NOTHING`
      );
      nearMisses = 2;
    }
  } catch { /* near_miss_reports may not exist */ }

  try {
    const bcpExisting = await safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".bcp_plans`);
    if ((getFirstRow(bcpExisting)?.cnt || 0) < 2) {
      await safeQuery(
        `INSERT INTO "${schema}".bcp_plans (title, description, status, scope, priority)
         VALUES ('IT Disaster Recovery Plan', 'Comprehensive DR plan for critical IT systems including failover procedures', 'approved', 'it_systems', 'critical'),
                ('Pandemic Response Plan', 'Business continuity procedures for pandemic/epidemic scenarios', 'draft', 'organization', 'high'),
                ('Cyber Incident Recovery', 'Recovery procedures following ransomware or major cyber attack', 'approved', 'it_security', 'critical')
         ON CONFLICT DO NOTHING`
      );
      bcpPlans = 3;
    }
  } catch { /* bcp_plans may not exist */ }

  try {
    const vExisting = await safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".vendors`);
    if ((getFirstRow(vExisting)?.cnt || 0) < 3) {
      await safeQuery(
        `INSERT INTO "${schema}".vendors (name, status, risk_tier, category, contract_value_sar)
         VALUES ('CloudSecure Solutions', 'active', 'critical', 'cloud_infrastructure', 2500000),
                ('DataGuard Analytics', 'active', 'high', 'data_processing', 800000),
                ('SecurePay Gateway', 'pending_review', 'critical', 'payment_processing', 5000000),
                ('Office Supplies Co', 'active', 'low', 'general_supplies', 50000)
         ON CONFLICT DO NOTHING`
      );
      vendors = 4;
    }
  } catch { /* vendors may not exist */ }

  try {
    const tExisting = await safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".training_campaigns`);
    if ((getFirstRow(tExisting)?.cnt || 0) < 2) {
      await safeQuery(
        `INSERT INTO "${schema}".training_campaigns (title, campaign_type, description, status, target_completion_pct)
         VALUES ('Q1 Security Awareness', 'security_awareness', 'Quarterly security awareness training covering phishing, social engineering, and data protection', 'active', 95),
                ('NCA-ECC Compliance Training', 'compliance', 'Mandatory NCA Essential Cybersecurity Controls compliance training', 'active', 100),
                ('New Employee Onboarding', 'onboarding', 'Security and compliance onboarding for new hires', 'active', 100)
         ON CONFLICT DO NOTHING`
      );
      campaigns = 3;
    }
  } catch { /* training_campaigns may not exist */ }

  return { incidents, nearMisses, bcpPlans, vendors, campaigns, assignments };
}

/** Compute answers hash for idempotency (sha256 of canonical JSON). */
export function computeAnswersHash(answers: Record<string, any>): string {
  const canonical = JSON.stringify(answers, Object.keys(answers).sort());
  return createHash("sha256").update(canonical).digest("hex");
}
