// @ts-nocheck
/**
 * Guidance Service — AI-Guided GRC Partner
 *
 * Provides contextual guidance for journey steps and GRC modules,
 * GRC term definitions, proactive assistance, and completion feedback.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.5, 1.2, 2.1
 */

import { GRC_GLOSSARY } from '../../../../data/grc-glossary';
import { SECTOR_GUIDANCE } from '../../../../data/sector-guidance';
import type { GuidanceCard, GrcTermDefinition } from '../../../../types/journey.types';

// ===========================================================================
// Static Guidance Content Maps
// ===========================================================================

/** Guidance keyed by stepId for journey steps. */
const STEP_GUIDANCE: Record<string, GuidanceCard> = {
  'company_profile': {
    guidanceId: 'g-company-profile',
    stepId: 'company_profile',
    titleEn: 'Company Profile Setup',
    titleAr: 'إعداد ملف الشركة',
    explanationEn: 'Tell us about your organization so we can recommend the right regulatory frameworks and team structure for your GRC program.',
    explanationAr: 'أخبرنا عن مؤسستك حتى نتمكن من التوصية بالأطر التنظيمية المناسبة وهيكل الفريق لبرنامج الحوكمة والمخاطر والامتثال.',
    examples: ['Select your industry sector', 'Specify company size', 'Choose your KSA region'],
    recommendedActions: ['Complete all required fields', 'Review detected frameworks'],
    relatedTerms: [{ term: 'GRC', definition: 'Governance, Risk, and Compliance' }],
    difficulty: 'beginner',
  },
  'governance_setup': {
    guidanceId: 'g-governance-setup',
    stepId: 'governance_setup',
    titleEn: 'Governance Structure',
    titleAr: 'هيكل الحوكمة',
    explanationEn: 'Establish your organizational governance structure including committees, reporting lines, and accountability frameworks.',
    explanationAr: 'إنشاء هيكل الحوكمة التنظيمي بما في ذلك اللجان وخطوط الإبلاغ وأطر المساءلة.',
    examples: ['Create GRC committee', 'Define reporting structure'],
    recommendedActions: ['Define committee charter', 'Assign committee members'],
    relatedTerms: [{ term: 'Governance', definition: 'The system of rules and practices for directing an organization' }],
    difficulty: 'intermediate',
  },
  'policy_creation': {
    guidanceId: 'g-policy-creation',
    stepId: 'policy_creation',
    titleEn: 'Policy Creation',
    titleAr: 'إنشاء السياسات',
    explanationEn: 'Draft foundational security and compliance policies that define your organization\'s rules and guidelines.',
    explanationAr: 'صياغة سياسات الأمن والامتثال التأسيسية التي تحدد قواعد وإرشادات مؤسستك.',
    examples: ['Information security policy', 'Data protection policy', 'Acceptable use policy'],
    recommendedActions: ['Use policy templates', 'Assign policy owners', 'Set review dates'],
    relatedTerms: [{ term: 'Policy', definition: 'A formal statement of rules and guidelines' }],
    difficulty: 'intermediate',
  },
  'risk_register': {
    guidanceId: 'g-risk-register',
    stepId: 'risk_register',
    titleEn: 'Risk Register Setup',
    titleAr: 'إعداد سجل المخاطر',
    explanationEn: 'Initialize your risk register with key risk categories and define your organization\'s risk appetite.',
    explanationAr: 'تهيئة سجل المخاطر مع فئات المخاطر الرئيسية وتحديد مستوى تقبل المخاطر في مؤسستك.',
    examples: ['Cyber risks', 'Operational risks', 'Compliance risks', 'Third-party risks'],
    recommendedActions: ['Define risk categories', 'Set risk appetite', 'Assign risk owners'],
    relatedTerms: [{ term: 'Risk Appetite', definition: 'The level of risk an organization is willing to accept' }],
    difficulty: 'intermediate',
  },
};

/** Guidance keyed by module route. */
const MODULE_GUIDANCE: Record<string, GuidanceCard> = {
  'risks': {
    guidanceId: 'g-mod-risks', stepId: 'risks',
    titleEn: 'Risk Management', titleAr: 'إدارة المخاطر',
    explanationEn: 'Identify, assess, and treat risks. Build your risk register and track mitigation plans.',
    explanationAr: 'تحديد وتقييم ومعالجة المخاطر. بناء سجل المخاطر وتتبع خطط التخفيف.',
    examples: ['Create risk entries', 'Run risk assessments', 'Define treatment plans'],
    recommendedActions: ['Add your top 5 risks', 'Assess likelihood and impact'],
    relatedTerms: [{ term: 'Risk Treatment', definition: 'Actions to modify risk' }],
    difficulty: 'beginner',
  },
  'policies': {
    guidanceId: 'g-mod-policies', stepId: 'policies',
    titleEn: 'Policy Management', titleAr: 'إدارة السياسات',
    explanationEn: 'Create, review, and manage organizational policies through their lifecycle.',
    explanationAr: 'إنشاء ومراجعة وإدارة السياسات التنظيمية خلال دورة حياتها.',
    examples: ['Draft policies', 'Submit for review', 'Track approvals'],
    recommendedActions: ['Start with information security policy', 'Set review schedules'],
    relatedTerms: [{ term: 'Policy Lifecycle', definition: 'Draft → Review → Approve → Publish → Retire' }],
    difficulty: 'beginner',
  },
  'controls': {
    guidanceId: 'g-mod-controls', stepId: 'controls',
    titleEn: 'Control Management', titleAr: 'إدارة الضوابط',
    explanationEn: 'Define and manage security controls that protect your organization and meet regulatory requirements.',
    explanationAr: 'تحديد وإدارة ضوابط الأمان التي تحمي مؤسستك وتلبي المتطلبات التنظيمية.',
    examples: ['Map controls to frameworks', 'Attach evidence', 'Test controls'],
    recommendedActions: ['Import framework controls', 'Assign control owners'],
    relatedTerms: [{ term: 'Control', definition: 'A safeguard to mitigate risk' }],
    difficulty: 'intermediate',
  },
  'compliance': {
    guidanceId: 'g-mod-compliance', stepId: 'compliance',
    titleEn: 'Compliance Management', titleAr: 'إدارة الامتثال',
    explanationEn: 'Track compliance against regulatory frameworks, run assessments, and manage remediation.',
    explanationAr: 'تتبع الامتثال مقابل الأطر التنظيمية وإجراء التقييمات وإدارة المعالجة.',
    examples: ['Run gap analysis', 'Track remediation', 'Generate compliance reports'],
    recommendedActions: ['Start with your primary framework assessment'],
    relatedTerms: [{ term: 'Gap Analysis', definition: 'Comparing current state to required state' }],
    difficulty: 'intermediate',
  },
  'incidents': {
    guidanceId: 'g-mod-incidents', stepId: 'incidents',
    titleEn: 'Incident Management', titleAr: 'إدارة الحوادث',
    explanationEn: 'Report, track, and resolve security incidents through a structured response process.',
    explanationAr: 'الإبلاغ عن الحوادث الأمنية وتتبعها وحلها من خلال عملية استجابة منظمة.',
    examples: ['Report incidents', 'Track resolution', 'Document lessons learned'],
    recommendedActions: ['Set up incident response workflow', 'Define severity levels'],
    relatedTerms: [{ term: 'Incident Response', definition: 'Organized approach to handling security events' }],
    difficulty: 'beginner',
  },
  'vendors': {
    guidanceId: 'g-mod-vendors', stepId: 'vendors',
    titleEn: 'Vendor Risk Management', titleAr: 'إدارة مخاطر الموردين',
    explanationEn: 'Assess and monitor third-party vendor risks with tiered classification and continuous monitoring.',
    explanationAr: 'تقييم ومراقبة مخاطر الموردين الخارجيين مع التصنيف المتدرج والمراقبة المستمرة.',
    examples: ['Add vendors', 'Classify risk tiers', 'Send questionnaires'],
    recommendedActions: ['Add your critical vendors first', 'Complete risk assessments'],
    relatedTerms: [{ term: 'TPRM', definition: 'Third-Party Risk Management' }],
    difficulty: 'intermediate',
  },
  'evidence': {
    guidanceId: 'g-mod-evidence', stepId: 'evidence',
    titleEn: 'Evidence Management', titleAr: 'إدارة الأدلة',
    explanationEn: 'Collect, organize, and maintain evidence to demonstrate compliance with controls and frameworks.',
    explanationAr: 'جمع وتنظيم وصيانة الأدلة لإثبات الامتثال للضوابط والأطر.',
    examples: ['Upload evidence files', 'Link to controls', 'Set expiry dates'],
    recommendedActions: ['Start with high-priority controls', 'Set up collection schedules'],
    relatedTerms: [{ term: 'Evidence', definition: 'Documentation proving control effectiveness' }],
    difficulty: 'beginner',
  },
  'audit': {
    guidanceId: 'g-mod-audit', stepId: 'audit',
    titleEn: 'Audit Management', titleAr: 'إدارة التدقيق',
    explanationEn: 'Plan and manage internal and external audits, track findings, and ensure audit readiness.',
    explanationAr: 'تخطيط وإدارة عمليات التدقيق الداخلية والخارجية وتتبع النتائج وضمان الجاهزية للتدقيق.',
    examples: ['Plan audits', 'Track findings', 'Manage remediation'],
    recommendedActions: ['Schedule your first internal audit', 'Prepare evidence packs'],
    relatedTerms: [{ term: 'Audit Trail', definition: 'Chronological record of activities' }],
    difficulty: 'advanced',
  },
};

// ===========================================================================
// Pure Functions
// ===========================================================================

/**
 * Get guidance for a specific journey step.
 * Returns the static guidance card for the step, or a generic one if not found.
 *
 * Requirement 11.1: Contextual guidance for each journey step.
 */
export function getGuidanceForStep(stepId: string): GuidanceCard {
  const card = STEP_GUIDANCE[stepId];
  if (card) return card;

  return {
    guidanceId: `g-${stepId}`,
    stepId,
    titleEn: 'Step Guidance',
    titleAr: 'إرشادات الخطوة',
    explanationEn: 'Complete this step to advance your GRC journey.',
    explanationAr: 'أكمل هذه الخطوة لتقدم رحلة الحوكمة والمخاطر والامتثال.',
    examples: [],
    recommendedActions: ['Review the requirements', 'Complete all fields'],
    relatedTerms: [],
    difficulty: 'beginner',
  };
}

/**
 * Get guidance for a GRC module by its route name.
 *
 * Requirement 11.1: Module-level guidance.
 */
export function getGuidanceForModule(moduleRoute: string): GuidanceCard {
  const card = MODULE_GUIDANCE[moduleRoute];
  if (card) return card;

  return {
    guidanceId: `g-mod-${moduleRoute}`,
    stepId: moduleRoute,
    titleEn: moduleRoute.charAt(0).toUpperCase() + moduleRoute.slice(1),
    titleAr: moduleRoute,
    explanationEn: `Manage your ${moduleRoute} activities in this module.`,
    explanationAr: `إدارة أنشطة ${moduleRoute} في هذا القسم.`,
    examples: [],
    recommendedActions: [],
    relatedTerms: [],
    difficulty: 'beginner',
  };
}

/**
 * Look up a GRC term definition from the glossary.
 *
 * Requirement 11.2: GRC term definitions with bilingual support.
 */
export function getTermDefinition(term: string): GrcTermDefinition | null {
  const normalized = term.toLowerCase().trim();
  const entry = GRC_GLOSSARY.find(
    g => g.term.toLowerCase() === normalized,
  );
  return entry ?? null;
}

/**
 * Generate proactive assistance suggestion based on idle context.
 *
 * Requirement 11.3: Proactive assistance after idle period.
 */
export function generateProactiveAssistance(
  currentModule: string,
  completionPercent: number,
): { titleEn: string; titleAr: string; suggestionEn: string; suggestionAr: string } {
  if (completionPercent < 25) {
    return {
      titleEn: 'Getting Started',
      titleAr: 'البدء',
      suggestionEn: `You're just getting started with ${currentModule}. Would you like guidance on the first steps?`,
      suggestionAr: `أنت في بداية ${currentModule}. هل تريد إرشادات حول الخطوات الأولى؟`,
    };
  }
  if (completionPercent < 75) {
    return {
      titleEn: 'Keep Going',
      titleAr: 'استمر',
      suggestionEn: `You're ${completionPercent}% through ${currentModule}. Review your progress and tackle the next item.`,
      suggestionAr: `أنت عند ${completionPercent}% في ${currentModule}. راجع تقدمك وتعامل مع العنصر التالي.`,
    };
  }
  return {
    titleEn: 'Almost There',
    titleAr: 'أوشكت على الانتهاء',
    suggestionEn: `You're ${completionPercent}% done with ${currentModule}. Just a few more items to complete.`,
    suggestionAr: `أنت عند ${completionPercent}% في ${currentModule}. بقيت بضعة عناصر فقط لإكمالها.`,
  };
}

/**
 * Generate completion feedback message.
 *
 * Requirement 11.5: Completion feedback with progress percentage.
 */
export function generateCompletionFeedback(
  stepName: string,
  overallPercent: number,
): { messageEn: string; messageAr: string } {
  return {
    messageEn: `Great job completing "${stepName}"! Your overall journey progress is now ${overallPercent}%.`,
    messageAr: `عمل رائع في إكمال "${stepName}"! تقدمك الإجمالي في الرحلة الآن ${overallPercent}%.`,
  };
}

/**
 * Get sector-specific guidance content.
 *
 * Requirement 1.2, 2.1: Sector-specific GRC explanations.
 */
export function getSectorGuidance(sectorId: string): {
  sectorEn: string;
  sectorAr: string;
  descriptionEn: string;
  descriptionAr: string;
} | null {
  return SECTOR_GUIDANCE[sectorId] ?? null;
}
