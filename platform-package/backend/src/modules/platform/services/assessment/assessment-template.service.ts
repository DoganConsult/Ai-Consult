// @ts-nocheck
import { catchHandler, EC } from '../../../../utils/resilient-catch';
// ============================================
// Shahin — Assessment Template Service
// Predefined assessment templates (NCA ECC,
// NCA CCC, SAMA CSF, PDPL, generic UCF),
// configurable scoring methodologies, score
// recalculation, and SAMA format export
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from "../../../../config/database";
import type {
  AssessmentTemplate,
  
  ScoringMethodology,
} from "../../../../types/grc-os.types";
import { getFirstRow } from '../../../../utils/db-utils';

// ============================================================
// Predefined Templates
// ============================================================

const NCA_ECC_TEMPLATE: AssessmentTemplate = {
  templateId: "NCA_ECC",
  nameEn: "NCA Essential Cybersecurity Controls Assessment",
  nameAr: "تقييم الضوابط الأساسية للأمن السيبراني - الهيئة الوطنية",
  frameworkId: "NCA-ECC",
  scoringMethodology: "maturity_1_5",
  weights: {
    "Cybersecurity Governance": 0.15,
    "Cybersecurity Defense": 0.20,
    "Cybersecurity Resilience": 0.20,
    "Third-Party Cybersecurity": 0.15,
    "ICS Cybersecurity": 0.15,
    "Cybersecurity Awareness": 0.15,
  },
  questionBank: [
    { questionId: "ECC-GOV-01", domainCode: "Cybersecurity Governance", textEn: "Is there a documented cybersecurity strategy approved by senior management?", textAr: "هل توجد استراتيجية أمن سيبراني موثقة ومعتمدة من الإدارة العليا؟", evidenceHint: "Approved strategy document", maxScore: 5 },
    { questionId: "ECC-GOV-02", domainCode: "Cybersecurity Governance", textEn: "Are cybersecurity roles and responsibilities clearly defined?", textAr: "هل تم تحديد أدوار ومسؤوليات الأمن السيبراني بوضوح؟", evidenceHint: "RACI matrix, org chart", maxScore: 5 },
    { questionId: "ECC-DEF-01", domainCode: "Cybersecurity Defense", textEn: "Are network security controls implemented and monitored?", textAr: "هل تم تطبيق ومراقبة ضوابط أمن الشبكات؟", evidenceHint: "Firewall configs, monitoring logs", maxScore: 5 },
    { questionId: "ECC-DEF-02", domainCode: "Cybersecurity Defense", textEn: "Is endpoint protection deployed across all assets?", textAr: "هل تم نشر حماية نقاط النهاية على جميع الأصول؟", evidenceHint: "EDR deployment report", maxScore: 5 },
    { questionId: "ECC-RES-01", domainCode: "Cybersecurity Resilience", textEn: "Is there a tested incident response plan?", textAr: "هل توجد خطة استجابة للحوادث تم اختبارها؟", evidenceHint: "IR plan, test results", maxScore: 5 },
    { questionId: "ECC-RES-02", domainCode: "Cybersecurity Resilience", textEn: "Are backup and recovery procedures documented and tested?", textAr: "هل تم توثيق واختبار إجراءات النسخ الاحتياطي والاسترداد؟", evidenceHint: "Backup policy, test logs", maxScore: 5 },
    { questionId: "ECC-TP-01", domainCode: "Third-Party Cybersecurity", textEn: "Are third-party cybersecurity requirements defined in contracts?", textAr: "هل تم تحديد متطلبات الأمن السيبراني للأطراف الثالثة في العقود؟", evidenceHint: "Contract clauses", maxScore: 5 },
    { questionId: "ECC-ICS-01", domainCode: "ICS Cybersecurity", textEn: "Are industrial control systems segmented from IT networks?", textAr: "هل تم عزل أنظمة التحكم الصناعي عن شبكات تقنية المعلومات؟", evidenceHint: "Network diagram", maxScore: 5 },
    { questionId: "ECC-AWR-01", domainCode: "Cybersecurity Awareness", textEn: "Is there a cybersecurity awareness program for all employees?", textAr: "هل يوجد برنامج توعية بالأمن السيبراني لجميع الموظفين؟", evidenceHint: "Training records", maxScore: 5 },
  ],
};

const NCA_CCC_TEMPLATE: AssessmentTemplate = {
  templateId: "NCA_CCC",
  nameEn: "NCA Cloud Computing Controls Assessment",
  nameAr: "تقييم ضوابط الحوسبة السحابية - الهيئة الوطنية",
  frameworkId: "NCA-CCC",
  scoringMethodology: "maturity_1_5",
  weights: {
    "Cloud Governance": 0.20,
    "Cloud Security Architecture": 0.25,
    "Cloud Data Protection": 0.25,
    "Cloud Operations": 0.15,
    "Cloud Compliance": 0.15,
  },
  questionBank: [
    { questionId: "CCC-GOV-01", domainCode: "Cloud Governance", textEn: "Is there a cloud governance policy approved by management?", textAr: "هل توجد سياسة حوكمة سحابية معتمدة من الإدارة؟", evidenceHint: "Cloud governance policy", maxScore: 5 },
    { questionId: "CCC-GOV-02", domainCode: "Cloud Governance", textEn: "Are cloud service provider risks assessed periodically?", textAr: "هل يتم تقييم مخاطر مزودي الخدمات السحابية بشكل دوري؟", evidenceHint: "CSP risk assessment", maxScore: 5 },
    { questionId: "CCC-SEC-01", domainCode: "Cloud Security Architecture", textEn: "Is network segmentation implemented in cloud environments?", textAr: "هل تم تطبيق تجزئة الشبكة في البيئات السحابية؟", evidenceHint: "VPC/network configs", maxScore: 5 },
    { questionId: "CCC-SEC-02", domainCode: "Cloud Security Architecture", textEn: "Are identity and access controls enforced for cloud resources?", textAr: "هل يتم فرض ضوابط الهوية والوصول للموارد السحابية؟", evidenceHint: "IAM policies", maxScore: 5 },
    { questionId: "CCC-DAT-01", domainCode: "Cloud Data Protection", textEn: "Is data encrypted at rest and in transit in cloud environments?", textAr: "هل يتم تشفير البيانات أثناء التخزين والنقل في البيئات السحابية؟", evidenceHint: "Encryption configs", maxScore: 5 },
    { questionId: "CCC-DAT-02", domainCode: "Cloud Data Protection", textEn: "Are data classification and handling procedures applied to cloud data?", textAr: "هل يتم تطبيق إجراءات تصنيف ومعالجة البيانات على البيانات السحابية؟", evidenceHint: "Data classification policy", maxScore: 5 },
    { questionId: "CCC-OPS-01", domainCode: "Cloud Operations", textEn: "Are cloud monitoring and logging capabilities implemented?", textAr: "هل تم تطبيق قدرات المراقبة والتسجيل السحابية؟", evidenceHint: "Monitoring dashboard", maxScore: 5 },
    { questionId: "CCC-CMP-01", domainCode: "Cloud Compliance", textEn: "Is cloud data residency compliant with Saudi regulations?", textAr: "هل يتوافق موقع البيانات السحابية مع الأنظمة السعودية؟", evidenceHint: "Data residency report", maxScore: 5 },
  ],
};

const SAMA_CSF_TEMPLATE: AssessmentTemplate = {
  templateId: "SAMA_CSF",
  nameEn: "SAMA Cyber Security Framework Assessment",
  nameAr: "تقييم إطار الأمن السيبراني - البنك المركزي السعودي",
  frameworkId: "SAMA-CSF",
  scoringMethodology: "maturity_1_5",
  weights: {
    "Cyber Security Leadership and Governance": 0.15,
    "Cyber Security Risk Management and Compliance": 0.15,
    "Cyber Security Operations and Technology": 0.20,
    "Third Party Cyber Security": 0.15,
    "Cyber Security Resilience": 0.20,
    "Cyber Security in Human Resources": 0.15,
  },
  questionBank: [
    { questionId: "SAMA-LG-01", domainCode: "Cyber Security Leadership and Governance", textEn: "Is there a board-approved cybersecurity strategy?", textAr: "هل توجد استراتيجية أمن سيبراني معتمدة من مجلس الإدارة؟", evidenceHint: "Board minutes, strategy doc", maxScore: 5 },
    { questionId: "SAMA-LG-02", domainCode: "Cyber Security Leadership and Governance", textEn: "Is there a dedicated CISO or equivalent role?", textAr: "هل يوجد مسؤول أمن معلومات رئيسي أو دور مكافئ؟", evidenceHint: "Org chart, job description", maxScore: 5 },
    { questionId: "SAMA-RM-01", domainCode: "Cyber Security Risk Management and Compliance", textEn: "Is there a formal cyber risk assessment process?", textAr: "هل توجد عملية رسمية لتقييم المخاطر السيبرانية؟", evidenceHint: "Risk assessment methodology", maxScore: 5 },
    { questionId: "SAMA-RM-02", domainCode: "Cyber Security Risk Management and Compliance", textEn: "Are regulatory compliance requirements tracked and monitored?", textAr: "هل يتم تتبع ومراقبة متطلبات الامتثال التنظيمي؟", evidenceHint: "Compliance tracker", maxScore: 5 },
    { questionId: "SAMA-OT-01", domainCode: "Cyber Security Operations and Technology", textEn: "Is there a 24/7 security operations center (SOC)?", textAr: "هل يوجد مركز عمليات أمنية يعمل على مدار الساعة؟", evidenceHint: "SOC operational docs", maxScore: 5 },
    { questionId: "SAMA-OT-02", domainCode: "Cyber Security Operations and Technology", textEn: "Are vulnerability management processes in place?", textAr: "هل توجد عمليات إدارة الثغرات الأمنية؟", evidenceHint: "Vuln scan reports", maxScore: 5 },
    { questionId: "SAMA-TP-01", domainCode: "Third Party Cyber Security", textEn: "Are third-party cyber risks assessed before engagement?", textAr: "هل يتم تقييم المخاطر السيبرانية للأطراف الثالثة قبل التعاقد؟", evidenceHint: "Vendor assessment records", maxScore: 5 },
    { questionId: "SAMA-CR-01", domainCode: "Cyber Security Resilience", textEn: "Is there a tested business continuity plan for cyber incidents?", textAr: "هل توجد خطة استمرارية أعمال مختبرة للحوادث السيبرانية؟", evidenceHint: "BCP test results", maxScore: 5 },
    { questionId: "SAMA-CR-02", domainCode: "Cyber Security Resilience", textEn: "Are disaster recovery procedures documented and tested?", textAr: "هل تم توثيق واختبار إجراءات التعافي من الكوارث؟", evidenceHint: "DR test logs", maxScore: 5 },
    { questionId: "SAMA-HR-01", domainCode: "Cyber Security in Human Resources", textEn: "Are background checks performed for cybersecurity roles?", textAr: "هل يتم إجراء فحوصات خلفية لأدوار الأمن السيبراني؟", evidenceHint: "HR screening records", maxScore: 5 },
  ],
};

const PDPL_TEMPLATE: AssessmentTemplate = {
  templateId: "PDPL",
  nameEn: "Personal Data Protection Law Assessment",
  nameAr: "تقييم نظام حماية البيانات الشخصية",
  frameworkId: "PDPL",
  scoringMethodology: "percentage",
  weights: {
    "Data Governance": 0.20,
    "Consent Management": 0.20,
    "Data Subject Rights": 0.20,
    "Data Security": 0.20,
    "Cross-Border Transfer": 0.20,
  },
  questionBank: [
    { questionId: "PDPL-DG-01", domainCode: "Data Governance", textEn: "Is there a designated Data Protection Officer?", textAr: "هل يوجد مسؤول حماية بيانات معين؟", evidenceHint: "DPO appointment letter", maxScore: 100 },
    { questionId: "PDPL-DG-02", domainCode: "Data Governance", textEn: "Is a Record of Processing Activities (RoPA) maintained?", textAr: "هل يتم الاحتفاظ بسجل أنشطة المعالجة؟", evidenceHint: "RoPA register", maxScore: 100 },
    { questionId: "PDPL-CM-01", domainCode: "Consent Management", textEn: "Are consent mechanisms implemented for data collection?", textAr: "هل تم تطبيق آليات الموافقة لجمع البيانات؟", evidenceHint: "Consent forms, UI screenshots", maxScore: 100 },
    { questionId: "PDPL-CM-02", domainCode: "Consent Management", textEn: "Can data subjects withdraw consent easily?", textAr: "هل يمكن لأصحاب البيانات سحب الموافقة بسهولة؟", evidenceHint: "Withdrawal process docs", maxScore: 100 },
    { questionId: "PDPL-DSR-01", domainCode: "Data Subject Rights", textEn: "Are data subject access request procedures in place?", textAr: "هل توجد إجراءات لطلبات وصول أصحاب البيانات؟", evidenceHint: "DSR procedure doc", maxScore: 100 },
    { questionId: "PDPL-DSR-02", domainCode: "Data Subject Rights", textEn: "Are data subject requests processed within PDPL timelines?", textAr: "هل يتم معالجة طلبات أصحاب البيانات ضمن المهل الزمنية المحددة؟", evidenceHint: "DSR tracking log", maxScore: 100 },
    { questionId: "PDPL-DS-01", domainCode: "Data Security", textEn: "Are appropriate technical measures in place to protect personal data?", textAr: "هل توجد تدابير تقنية مناسبة لحماية البيانات الشخصية؟", evidenceHint: "Security controls inventory", maxScore: 100 },
    { questionId: "PDPL-CBT-01", domainCode: "Cross-Border Transfer", textEn: "Are cross-border data transfers compliant with PDPL requirements?", textAr: "هل تتوافق عمليات نقل البيانات عبر الحدود مع متطلبات النظام؟", evidenceHint: "Transfer impact assessment", maxScore: 100 },
  ],
};

const GENERIC_UCF_TEMPLATE: AssessmentTemplate = {
  templateId: "GENERIC_UCF",
  nameEn: "Generic Unified Control Framework Assessment",
  nameAr: "تقييم إطار الضوابط الموحد العام",
  frameworkId: "UCF",
  scoringMethodology: "weighted",
  weights: {
    Governance: 0.15,
    "Risk Management": 0.15,
    "Access Control": 0.15,
    "Data Protection": 0.15,
    "Incident Management": 0.10,
    "Business Continuity": 0.10,
    "Third Party": 0.10,
    Compliance: 0.10,
  },
  questionBank: [
    { questionId: "UCF-GOV-01", domainCode: "Governance", textEn: "Are governance policies documented and approved?", textAr: "هل تم توثيق واعتماد سياسات الحوكمة؟", evidenceHint: "Policy documents", maxScore: 5 },
    { questionId: "UCF-RM-01", domainCode: "Risk Management", textEn: "Is there a formal risk management framework?", textAr: "هل يوجد إطار رسمي لإدارة المخاطر؟", evidenceHint: "Risk framework doc", maxScore: 5 },
    { questionId: "UCF-AC-01", domainCode: "Access Control", textEn: "Are access control policies enforced?", textAr: "هل يتم فرض سياسات التحكم في الوصول؟", evidenceHint: "IAM policies", maxScore: 5 },
    { questionId: "UCF-DP-01", domainCode: "Data Protection", textEn: "Are data protection measures implemented?", textAr: "هل تم تطبيق تدابير حماية البيانات؟", evidenceHint: "Encryption configs", maxScore: 5 },
    { questionId: "UCF-IM-01", domainCode: "Incident Management", textEn: "Is there an incident response plan?", textAr: "هل توجد خطة استجابة للحوادث؟", evidenceHint: "IR plan", maxScore: 5 },
    { questionId: "UCF-BC-01", domainCode: "Business Continuity", textEn: "Is there a business continuity plan?", textAr: "هل توجد خطة استمرارية الأعمال؟", evidenceHint: "BCP document", maxScore: 5 },
    { questionId: "UCF-TP-01", domainCode: "Third Party", textEn: "Are third-party risks assessed?", textAr: "هل يتم تقييم مخاطر الأطراف الثالثة؟", evidenceHint: "Vendor assessments", maxScore: 5 },
    { questionId: "UCF-CMP-01", domainCode: "Compliance", textEn: "Are compliance obligations tracked?", textAr: "هل يتم تتبع التزامات الامتثال؟", evidenceHint: "Compliance register", maxScore: 5 },
  ],
};

/** All predefined templates indexed by templateId */
const PREDEFINED_TEMPLATES: Record<string, AssessmentTemplate> = {
  NCA_ECC: NCA_ECC_TEMPLATE,
  NCA_CCC: NCA_CCC_TEMPLATE,
  SAMA_CSF: SAMA_CSF_TEMPLATE,
  PDPL: PDPL_TEMPLATE,
  GENERIC_UCF: GENERIC_UCF_TEMPLATE,
};

// ============================================================
// Pure Scoring Functions (exported for property-based testing)
// ============================================================

/**
 * Score a single item based on the scoring methodology.
 * Returns the normalized score (0-1 range) for the item.
 *
 * - binary: score must be 0 or 1 → returns 0 or 1
 * - maturity_1_5: score must be 1-5 → returns score / 5
 * - percentage: score must be 0-100 → returns score / 100
 * - weighted: same as maturity_1_5 (item-level scoring is the same;
 *   weighting applies at domain aggregation)
 */
export function normalizeItemScore(
  score: number,
  methodology: ScoringMethodology
): number {
  switch (methodology) {
    case "binary":
      return score >= 1 ? 1 : 0;
    case "maturity_1_5":
    case "weighted":
      return Math.max(0, Math.min(score, 5)) / 5;
    case "percentage":
      return Math.max(0, Math.min(score, 100)) / 100;
    default:
      return 0;
  }
}

/**
 * Recalculate domain scores and overall score from individual item scores.
 *
 * Property 28: For weighted scoring, domain score = average of normalized
 * item scores in that domain. Overall score = weighted average of domain
 * scores using configured weights.
 *
 * Returns { domainScores, overallScore } where scores are 0-100.
 */
export function recalculateScores(
  items: { domainCode: string; score: number }[],
  methodology: ScoringMethodology,
  weights: Record<string, number>
): { domainScores: Record<string, number>; overallScore: number } {
  // Group items by domain
  const byDomain: Record<string, number[]> = {};
  for (const item of items) {
    if (!byDomain[item.domainCode]) byDomain[item.domainCode] = [];
    byDomain[item.domainCode].push(normalizeItemScore(item.score, methodology));
  }

  // Calculate domain scores (average of normalized item scores × 100)
  const domainScores: Record<string, number> = {};
  for (const [domain, scores] of Object.entries(byDomain)) {
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    domainScores[domain] = avg * 100;
  }

  // Calculate overall score
  let overallScore = 0;
  const domainKeys = Object.keys(domainScores);

  if (methodology === "weighted" && Object.keys(weights).length > 0) {
    // Weighted average using configured domain weights
    let weightedSum = 0;
    let totalWeight = 0;
    for (const domain of domainKeys) {
      const w = weights[domain] ?? 0;
      weightedSum += domainScores[domain] * w;
      totalWeight += w;
    }
    overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  } else {
    // Simple average across all domains
    if (domainKeys.length > 0) {
      overallScore =
        domainKeys.reduce((s, d) => s + domainScores[d], 0) / domainKeys.length;
    }
  }

  return { domainScores, overallScore: Math.min(100, Math.max(0, overallScore)) };
}

/**
 * Serialize an AssessmentTemplate to JSON string.
 * Property 29: round-trip integrity.
 */
export function serializeTemplate(template: AssessmentTemplate): string {
  return JSON.stringify(template);
}

/**
 * Deserialize a JSON string back to an AssessmentTemplate.
 * Property 29: round-trip integrity.
 */
export function deserializeTemplate(json: string): AssessmentTemplate {
  return JSON.parse(json) as AssessmentTemplate;
}

// ============================================================
// SAMA Format Export (Pure)
// ============================================================

export interface SAMADomainResult {
  domainCode: string;
  domainNameEn: string;
  domainNameAr: string;
  maturityLevel: number;       // 1-5
  maturityLabel: string;       // e.g. "Managed"
  score: number;               // 0-100
  questionCount: number;
  scoredCount: number;
}

export interface SAMAAssessmentOutput {
  assessmentId: string;
  templateId: string;
  frameworkId: string;
  overallMaturityLevel: number;
  overallMaturityLabel: string;
  overallScore: number;
  domains: SAMADomainResult[];
  generatedAt: string;
}

const SAMA_MATURITY_LABELS: Record<number, string> = {
  1: "Initial",
  2: "Developing",
  3: "Defined",
  4: "Managed",
  5: "Optimized",
};

/**
 * Convert a 0-100 score to a SAMA maturity level (1-5).
 */
export function scoreToMaturityLevel(score: number): number {
  if (score >= 80) return 5;
  if (score >= 60) return 4;
  if (score >= 40) return 3;
  if (score >= 20) return 2;
  return 1;
}

/**
 * Pure function: generate SAMA CSF assessment output from scored items.
 * Requirements: 11.5
 */
export function generateSamaOutput(
  assessmentId: string,
  template: AssessmentTemplate,
  items: { questionId: string; domainCode: string; score: number }[]
): SAMAAssessmentOutput {
  const { domainScores, overallScore } = recalculateScores(
    items,
    template.scoringMethodology,
    template.weights
  );

  // Build domain results
  const domainQuestionCounts: Record<string, number> = {};
  const domainScoredCounts: Record<string, number> = {};
  for (const q of template.questionBank) {
    domainQuestionCounts[q.domainCode] =
      (domainQuestionCounts[q.domainCode] || 0) + 1;
  }
  for (const item of items) {
    domainScoredCounts[item.domainCode] =
      (domainScoredCounts[item.domainCode] || 0) + 1;
  }

  // Map SAMA domain codes to bilingual names from the template's question bank
  const domainNames: Record<string, { en: string; ar: string }> = {};
  for (const domain of Object.keys(domainScores)) {
    // Use domain code as name; SAMA template domains are descriptive already
    domainNames[domain] = { en: domain, ar: domain };
  }

  const domains: SAMADomainResult[] = Object.entries(domainScores).map(
    ([domain, score]) => {
      const level = scoreToMaturityLevel(score);
      return {
        domainCode: domain,
        domainNameEn: domainNames[domain]?.en ?? domain,
        domainNameAr: domainNames[domain]?.ar ?? domain,
        maturityLevel: level,
        maturityLabel: SAMA_MATURITY_LABELS[level] ?? "Unknown",
        score,
        questionCount: domainQuestionCounts[domain] ?? 0,
        scoredCount: domainScoredCounts[domain] ?? 0,
      };
    }
  );

  const overallLevel = scoreToMaturityLevel(overallScore);

  return {
    assessmentId,
    templateId: template.templateId,
    frameworkId: template.frameworkId,
    overallMaturityLevel: overallLevel,
    overallMaturityLabel: SAMA_MATURITY_LABELS[overallLevel] ?? "Unknown",
    overallScore,
    domains,
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================
// Database Functions
// ============================================================

/**
 * Get all available templates (predefined + tenant-custom from DB).
 * Requirements: 11.1
 */
export async function getTemplates(
  tenantId: string
): Promise<AssessmentTemplate[]> {
  const schema = tenantSchema(tenantId);

  // Fetch tenant-custom templates from DB
  const dbResult = await safeQuery(
    `SELECT * FROM "${schema}".assessment_templates ORDER BY created_at DESC`
  );

  const dbTemplates: AssessmentTemplate[] = dbResult.rows.map(rowToTemplate);

  // Merge: predefined first, then DB (DB can override predefined by templateId)
  const merged = new Map<string, AssessmentTemplate>();
  for (const t of Object.values(PREDEFINED_TEMPLATES)) {
    merged.set(t.templateId, t);
  }
  for (const t of dbTemplates) {
    merged.set(t.templateId, t);
  }

  return Array.from(merged.values());
}

/**
 * Get a single template by ID (checks predefined first, then DB).
 * Requirements: 11.1
 */
export async function getTemplateById(
  tenantId: string,
  templateId: string
): Promise<AssessmentTemplate | null> {
  // Check predefined
  if (PREDEFINED_TEMPLATES[templateId]) {
    return PREDEFINED_TEMPLATES[templateId];
  }

  // Check DB
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".assessment_templates WHERE template_id = $1`,
    [templateId]
  );
  if (result.rows.length === 0) return null;
  return rowToTemplate(getFirstRow(result));
}

/**
 * Create an assessment from a template. Auto-generates assessment items
 * from the template's question bank with the template's scoring methodology.
 * Requirements: 11.2
 */
export async function createAssessmentFromTemplate(
  tenantId: string,
  templateId: string,
  title: string,
  createdBy: string
): Promise<unknown> {
  const template = await getTemplateById(tenantId, templateId);
  if (!template) {
    throw new Error(`Assessment template '${templateId}' not found`);
  }

  const schema = tenantSchema(tenantId);
  const assessmentId = uuid();

  // Insert the assessment with template reference
  const result = await safeQuery(
    `INSERT INTO "${schema}".assessments
      (assessment_id, framework_id, title, status, score, created_by)
     VALUES ($1, $2, $3, 'draft', 0, $4)
     RETURNING *`,
    [assessmentId, template.frameworkId, title, createdBy]
  );
  const assessment = getFirstRow(result);

  // Generate assessment items from the template's question bank
  for (const question of template.questionBank) {
    await safeQuery(
      `INSERT INTO "${schema}".assessment_items
        (item_id, assessment_id, control_node_id, status, notes, remediation_ids)
       VALUES ($1, $2, $3, 'not_assessed', $4, '{}')`,
      [uuid(), assessmentId, question.questionId, question.textEn]
    );
  }

  return {
    ...assessment,
    templateId: template.templateId,
    scoringMethodology: template.scoringMethodology,
    weights: template.weights,
    itemCount: template.questionBank.length,
  };
}

/**
 * Score an individual assessment item and recalculate domain + overall scores.
 * Stores the score in a dedicated score column on the assessment_items table.
 * Requirements: 11.4
 */
export async function scoreItem(
  tenantId: string,
  assessmentId: string,
  itemId: string,
  score: number,
  templateId?: string
): Promise<{ domainScores: Record<string, number>; overallScore: number }> {
  const schema = tenantSchema(tenantId);

  // Ensure the score column exists on assessment_items
  await safeQuery(
    `ALTER TABLE "${schema}".assessment_items ADD COLUMN IF NOT EXISTS score DECIMAL(5,2)`
  ).catch(catchHandler(EC.EVENT_BUS, {}));

  // Update the item score in the dedicated column and mark as assessed
  await safeQuery(
    `UPDATE "${schema}".assessment_items
     SET status = 'assessed',
         score = $1,
         notes = COALESCE(notes, '') || '',
         updated_at = NOW()
     WHERE item_id = $2 AND assessment_id = $3`,
    [score, itemId, assessmentId]
  );

  // Determine the template for this assessment
  let template: AssessmentTemplate | null = null;
  if (templateId) {
    template = await getTemplateById(tenantId, templateId);
  }

  // If no template provided, try to infer from framework_id
  if (!template) {
    const assessResult = await safeQuery(
      `SELECT framework_id FROM "${schema}".assessments WHERE assessment_id = $1`,
      [assessmentId]
    );
    if (assessResult.rows.length > 0) {
      const fwId = getFirstRow(assessResult)?.framework_id;
      template =
        Object.values(PREDEFINED_TEMPLATES).find(
          (t) => t.frameworkId === fwId
        ) ?? null;
    }
  }

  // Fallback to generic UCF if no template found
  if (!template) {
    template = GENERIC_UCF_TEMPLATE;
  }

  // Fetch all scored items for this assessment — prefer the score column, fall back to notes JSON
  const itemsResult = await safeQuery(
    `SELECT item_id, control_node_id, score AS item_score, notes FROM "${schema}".assessment_items
     WHERE assessment_id = $1 AND status = 'assessed'`,
    [assessmentId]
  );

  // Build scored items array with domain codes from the template question bank
  const questionDomainMap = new Map<string, string>();
  for (const q of template.questionBank) {
    questionDomainMap.set(q.questionId, q.domainCode);
  }

  const scoredItems: { domainCode: string; score: number }[] = [];
  for (const row of itemsResult.rows) {
    const domainCode =
      questionDomainMap.get(row.control_node_id) ?? "Uncategorized";
    let itemScore = parseFloat(row.item_score);
    if (isNaN(itemScore)) {
      // Fall back to notes JSON for backward compatibility
      try {
        const parsed = JSON.parse(row.notes);
        itemScore = parsed.score ?? 0;
      } catch {
        itemScore = 0;
      }
    }
    scoredItems.push({ domainCode, score: itemScore });
  }

  // Recalculate
  const result = recalculateScores(
    scoredItems,
    template.scoringMethodology,
    template.weights
  );

  // Update the assessment's overall score
  await safeQuery(
    `UPDATE "${schema}".assessments SET score = $1, updated_at = NOW()
     WHERE assessment_id = $2`,
    [result.overallScore, assessmentId]
  );

  return result;
}

/**
 * Export an assessment in SAMA CSF format.
 * Requirements: 11.5
 */
export async function exportSamaFormat(
  tenantId: string,
  assessmentId: string
): Promise<SAMAAssessmentOutput> {
  const schema = tenantSchema(tenantId);

  // Get the assessment
  const assessResult = await safeQuery(
    `SELECT * FROM "${schema}".assessments WHERE assessment_id = $1`,
    [assessmentId]
  );
  if (assessResult.rows.length === 0) {
    throw new Error(`Assessment '${assessmentId}' not found`);
  }

  const assessment = getFirstRow(assessResult);

  // Find the matching template
  let template: AssessmentTemplate | null = null;
  for (const t of Object.values(PREDEFINED_TEMPLATES)) {
    if (t.frameworkId === assessment.framework_id) {
      template = t;
      break;
    }
  }
  // Also check DB templates
  if (!template) {
    const tplResult = await safeQuery(
      `SELECT * FROM "${schema}".assessment_templates
       WHERE framework_id = $1 LIMIT 1`,
      [assessment.framework_id]
    );
    if (tplResult.rows.length > 0) {
      template = rowToTemplate(getFirstRow(tplResult));
    }
  }

  if (!template) {
    // Default to SAMA CSF template for SAMA exports
    template = SAMA_CSF_TEMPLATE;
  }

  // Fetch all scored items
  const itemsResult = await safeQuery(
    `SELECT item_id, control_node_id, score AS item_score, notes, status
     FROM "${schema}".assessment_items
     WHERE assessment_id = $1`,
    [assessmentId]
  );

  // Build question domain map from template
  const questionDomainMap = new Map<string, string>();
  for (const q of template.questionBank) {
    questionDomainMap.set(q.questionId, q.domainCode);
  }

  const scoredItems: { questionId: string; domainCode: string; score: number }[] = [];
  for (const row of itemsResult.rows) {
    const domainCode =
      questionDomainMap.get(row.control_node_id) ?? "Uncategorized";
    let itemScore = 0;
    if (row.status === "assessed") {
      itemScore = parseFloat(row.item_score);
      if (isNaN(itemScore) && row.notes) {
        // Fall back to notes JSON for backward compatibility
        try {
          const parsed = JSON.parse(row.notes);
          itemScore = parsed.score ?? 0;
        } catch {
          itemScore = 0;
        }
      }
    }
    scoredItems.push({
      questionId: row.control_node_id,
      domainCode,
      score: itemScore,
    });
  }

  return generateSamaOutput(assessmentId, template, scoredItems);
}

// ============================================================
// Helpers
// ============================================================

function rowToTemplate(row: any): AssessmentTemplate {
  return {
    templateId: row.template_id,
    nameEn: row.name_en,
    nameAr: row.name_ar,
    frameworkId: row.framework_id ?? "",
    scoringMethodology: row.scoring_methodology,
    weights:
      typeof row.weights === "string" ? JSON.parse(row.weights) : row.weights ?? {},
    questionBank:
      typeof row.question_bank === "string"
        ? JSON.parse(row.question_bank)
        : row.question_bank ?? [],
  };
}
