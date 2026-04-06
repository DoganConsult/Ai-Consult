/**
 * Journey-Aware Contextual AI Extensions
 *
 * First-visit module introductions, content suggestion templates,
 * "what next" roadmap actions, and combined journey-aware suggestions.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.5, 3.6
 * Task: 10.1
 */

import { isFirstVisit, recordFirstVisit } from '../../../../platform/dos/notifications/nudge/nudge-engine.service';
import { getRoadmap } from '../../../agrc-engine/services/engine/roadmap-builder.service';
import { getCompanyProfile } from '../../../../platform/dos/provisioning/setup-wizard.service';
import { gatewayComplete } from '../../../ai/services/gateway/ai-gateway.service';
import type { FrameworkRecommendation, GRCRoadmap } from '../../../../types/journey.types';
import type {
  PageContext,
  
  ModuleIntro,
  ContentSuggestion,
  JourneyAwareSuggestion,
  WhatNextAction,
} from './contextual-ai.types';
import { getSuggestionsForContext } from './context-suggestions.service';

// ============================================================================
// Static Module Descriptions (fallback when Claude is unavailable)
// ============================================================================

const MODULE_DESCRIPTIONS: Record<string, { nameEn: string; nameAr: string; descEn: string; descAr: string }> = {
  risk: {
    nameEn: 'Risk Management',
    nameAr: 'إدارة المخاطر',
    descEn: 'Identify, assess, and treat risks that could impact your organization. This module helps you build a risk register, evaluate likelihood and impact, and track mitigation plans.',
    descAr: 'تحديد وتقييم ومعالجة المخاطر التي قد تؤثر على مؤسستك. يساعدك هذا القسم في بناء سجل المخاطر وتقييم الاحتمالية والتأثير وتتبع خطط التخفيف.',
  },
  control: {
    nameEn: 'Controls',
    nameAr: 'الضوابط',
    descEn: 'Define and manage security and compliance controls that protect your organization. Controls are the safeguards you put in place to mitigate risks and meet regulatory requirements.',
    descAr: 'تحديد وإدارة ضوابط الأمان والامتثال التي تحمي مؤسستك. الضوابط هي الإجراءات الوقائية التي تضعها للتخفيف من المخاطر وتلبية المتطلبات التنظيمية.',
  },
  policy: {
    nameEn: 'Policies',
    nameAr: 'السياسات',
    descEn: 'Create, review, and manage organizational policies. Policies define the rules and guidelines your organization follows for governance, security, and compliance.',
    descAr: 'إنشاء ومراجعة وإدارة السياسات التنظيمية. تحدد السياسات القواعد والإرشادات التي تتبعها مؤسستك للحوكمة والأمان والامتثال.',
  },
  compliance: {
    nameEn: 'Compliance',
    nameAr: 'الامتثال',
    descEn: 'Track your compliance status against applicable regulatory frameworks. Run assessments, identify gaps, and manage remediation plans to achieve and maintain compliance.',
    descAr: 'تتبع حالة الامتثال الخاصة بك مقابل الأطر التنظيمية المعمول بها. قم بإجراء التقييمات وتحديد الفجوات وإدارة خطط المعالجة لتحقيق الامتثال والحفاظ عليه.',
  },
  incident: {
    nameEn: 'Incident Management',
    nameAr: 'إدارة الحوادث',
    descEn: 'Report, track, and resolve security incidents. This module guides you through incident response from detection to resolution and lessons learned.',
    descAr: 'الإبلاغ عن الحوادث الأمنية وتتبعها وحلها. يرشدك هذا القسم خلال الاستجابة للحوادث من الاكتشاف إلى الحل والدروس المستفادة.',
  },
  vendor: {
    nameEn: 'Vendor Management',
    nameAr: 'إدارة الموردين',
    descEn: 'Assess and monitor third-party vendor risks. Track vendor compliance, manage SLAs, and ensure your supply chain meets your security standards.',
    descAr: 'تقييم ومراقبة مخاطر الموردين الخارجيين. تتبع امتثال الموردين وإدارة اتفاقيات مستوى الخدمة والتأكد من أن سلسلة التوريد تلبي معايير الأمان الخاصة بك.',
  },
  evidence: {
    nameEn: 'Evidence Collection',
    nameAr: 'جمع الأدلة',
    descEn: 'Collect and manage evidence that demonstrates your controls are working. Evidence is essential for audits and proving compliance to regulators.',
    descAr: 'جمع وإدارة الأدلة التي تثبت أن ضوابطك تعمل. الأدلة ضرورية للتدقيق وإثبات الامتثال للجهات التنظيمية.',
  },
  audit: {
    nameEn: 'Audit Management',
    nameAr: 'إدارة التدقيق',
    descEn: 'Plan and execute internal and external audits. Track findings, manage corrective actions, and maintain audit readiness.',
    descAr: 'تخطيط وتنفيذ عمليات التدقيق الداخلية والخارجية. تتبع النتائج وإدارة الإجراءات التصحيحية والحفاظ على الجاهزية للتدقيق.',
  },
  governance: {
    nameEn: 'Governance',
    nameAr: 'الحوكمة',
    descEn: 'Establish your governance structure including committees, roles, and decision-making processes. Good governance is the foundation of effective GRC.',
    descAr: 'إنشاء هيكل الحوكمة الخاص بك بما في ذلك اللجان والأدوار وعمليات صنع القرار. الحوكمة الجيدة هي أساس إدارة المخاطر والامتثال الفعالة.',
  },
  framework: {
    nameEn: 'Frameworks',
    nameAr: 'الأطر التنظيمية',
    descEn: 'View and manage the regulatory frameworks applicable to your organization. Frameworks define the compliance requirements you need to meet.',
    descAr: 'عرض وإدارة الأطر التنظيمية المعمول بها في مؤسستك. تحدد الأطر متطلبات الامتثال التي تحتاج إلى تلبيتها.',
  },
  dashboard: {
    nameEn: 'Dashboard',
    nameAr: 'لوحة المعلومات',
    descEn: 'Your GRC command center. View overall compliance posture, risk status, and key metrics at a glance.',
    descAr: 'مركز قيادة الحوكمة والمخاطر والامتثال. عرض وضع الامتثال العام وحالة المخاطر والمقاييس الرئيسية بنظرة واحدة.',
  },
  workflow: {
    nameEn: 'Workflows',
    nameAr: 'سير العمل',
    descEn: 'Manage approval workflows and process automation. Workflows ensure that policies, risks, and controls follow proper review and approval processes.',
    descAr: 'إدارة سير عمل الموافقات وأتمتة العمليات. يضمن سير العمل أن السياسات والمخاطر والضوابط تتبع عمليات المراجعة والموافقة المناسبة.',
  },
  report: {
    nameEn: 'Reports',
    nameAr: 'التقارير',
    descEn: 'Generate compliance reports, executive summaries, and board presentations. Track your GRC progress over time with data-driven insights.',
    descAr: 'إنشاء تقارير الامتثال والملخصات التنفيذية والعروض التقديمية لمجلس الإدارة. تتبع تقدم الحوكمة والمخاطر والامتثال بمرور الوقت مع رؤى مبنية على البيانات.',
  },
};

// ============================================================================
// Content Suggestion Templates
// ============================================================================

const CONTENT_TEMPLATES: Record<string, { titleEn: string; titleAr: string; bodyEn: string; bodyAr: string; frameworkPattern?: string }[]> = {
  risk: [
    {
      titleEn: 'Data Breach Risk',
      titleAr: 'خطر اختراق البيانات',
      bodyEn: 'Unauthorized access to sensitive personal or business data leading to regulatory penalties and reputational damage.',
      bodyAr: 'الوصول غير المصرح به إلى البيانات الشخصية أو التجارية الحساسة مما يؤدي إلى عقوبات تنظيمية وأضرار بالسمعة.',
      frameworkPattern: 'PDPL',
    },
    {
      titleEn: 'Third-Party Vendor Risk',
      titleAr: 'خطر الموردين الخارجيين',
      bodyEn: 'Risks arising from third-party service providers who may not meet your security and compliance standards.',
      bodyAr: 'المخاطر الناشئة عن مقدمي الخدمات الخارجيين الذين قد لا يستوفون معايير الأمان والامتثال الخاصة بك.',
    },
    {
      titleEn: 'Business Continuity Risk',
      titleAr: 'خطر استمرارية الأعمال',
      bodyEn: 'Risk of operational disruption due to inadequate disaster recovery and business continuity planning.',
      bodyAr: 'خطر انقطاع العمليات بسبب عدم كفاية التخطيط للتعافي من الكوارث واستمرارية الأعمال.',
      frameworkPattern: 'NCA',
    },
    {
      titleEn: 'Insider Threat Risk',
      titleAr: 'خطر التهديد الداخلي',
      bodyEn: 'Risk from employees or contractors who may intentionally or accidentally compromise security controls.',
      bodyAr: 'المخاطر من الموظفين أو المقاولين الذين قد يعرضون ضوابط الأمان للخطر عمداً أو عن طريق الخطأ.',
      frameworkPattern: 'ECC',
    },
    {
      titleEn: 'Regulatory Non-Compliance Risk',
      titleAr: 'خطر عدم الامتثال التنظيمي',
      bodyEn: 'Risk of failing to meet mandatory regulatory requirements, leading to fines, sanctions, or license revocation.',
      bodyAr: 'خطر عدم تلبية المتطلبات التنظيمية الإلزامية مما يؤدي إلى غرامات أو عقوبات أو إلغاء الترخيص.',
    },
  ],
  policy: [
    {
      titleEn: 'Information Security Policy',
      titleAr: 'سياسة أمن المعلومات',
      bodyEn: 'Establishes the organization\'s approach to managing information security, including roles, responsibilities, and acceptable use.',
      bodyAr: 'تحدد نهج المؤسسة في إدارة أمن المعلومات بما في ذلك الأدوار والمسؤوليات والاستخدام المقبول.',
      frameworkPattern: 'ECC',
    },
    {
      titleEn: 'Data Privacy Policy',
      titleAr: 'سياسة خصوصية البيانات',
      bodyEn: 'Defines how the organization collects, processes, stores, and protects personal data in compliance with PDPL.',
      bodyAr: 'تحدد كيفية جمع المؤسسة للبيانات الشخصية ومعالجتها وتخزينها وحمايتها وفقاً لنظام حماية البيانات الشخصية.',
      frameworkPattern: 'PDPL',
    },
    {
      titleEn: 'Incident Response Policy',
      titleAr: 'سياسة الاستجابة للحوادث',
      bodyEn: 'Outlines procedures for detecting, reporting, and responding to security incidents in a timely manner.',
      bodyAr: 'تحدد إجراءات اكتشاف الحوادث الأمنية والإبلاغ عنها والاستجابة لها في الوقت المناسب.',
    },
    {
      titleEn: 'Access Control Policy',
      titleAr: 'سياسة التحكم في الوصول',
      bodyEn: 'Defines rules for granting, reviewing, and revoking access to information systems and data.',
      bodyAr: 'تحدد قواعد منح ومراجعة وإلغاء الوصول إلى أنظمة المعلومات والبيانات.',
      frameworkPattern: 'CSF',
    },
    {
      titleEn: 'Risk Management Policy',
      titleAr: 'سياسة إدارة المخاطر',
      bodyEn: 'Establishes the framework for identifying, assessing, treating, and monitoring organizational risks.',
      bodyAr: 'تحدد إطار العمل لتحديد وتقييم ومعالجة ومراقبة المخاطر التنظيمية.',
    },
  ],
  control: [
    {
      titleEn: 'Multi-Factor Authentication',
      titleAr: 'المصادقة متعددة العوامل',
      bodyEn: 'Require multi-factor authentication for all privileged and remote access to information systems.',
      bodyAr: 'طلب المصادقة متعددة العوامل لجميع عمليات الوصول المميزة والبعيدة إلى أنظمة المعلومات.',
      frameworkPattern: 'ECC',
    },
    {
      titleEn: 'Data Encryption at Rest',
      titleAr: 'تشفير البيانات في حالة السكون',
      bodyEn: 'Encrypt all sensitive data stored in databases, file systems, and backup media using approved algorithms.',
      bodyAr: 'تشفير جميع البيانات الحساسة المخزنة في قواعد البيانات وأنظمة الملفات ووسائط النسخ الاحتياطي باستخدام خوارزميات معتمدة.',
      frameworkPattern: 'PDPL',
    },
    {
      titleEn: 'Security Awareness Training',
      titleAr: 'التدريب على الوعي الأمني',
      bodyEn: 'Conduct regular security awareness training for all employees covering phishing, social engineering, and data handling.',
      bodyAr: 'إجراء تدريب منتظم على الوعي الأمني لجميع الموظفين يغطي التصيد والهندسة الاجتماعية والتعامل مع البيانات.',
    },
    {
      titleEn: 'Vulnerability Management',
      titleAr: 'إدارة الثغرات الأمنية',
      bodyEn: 'Regularly scan systems for vulnerabilities, prioritize findings by severity, and remediate within defined SLAs.',
      bodyAr: 'فحص الأنظمة بانتظام بحثاً عن الثغرات الأمنية وترتيب النتائج حسب الخطورة والمعالجة ضمن اتفاقيات مستوى الخدمة المحددة.',
      frameworkPattern: 'NCA',
    },
    {
      titleEn: 'Backup and Recovery',
      titleAr: 'النسخ الاحتياطي والاسترداد',
      bodyEn: 'Maintain regular backups of critical data and systems with tested recovery procedures.',
      bodyAr: 'الحفاظ على نسخ احتياطية منتظمة للبيانات والأنظمة الحيوية مع إجراءات استرداد مختبرة.',
    },
  ],
};

// ============================================================================
// Module Introduction
// ============================================================================

/**
 * Generate a bilingual module introduction using Claude AI.
 * Falls back to static descriptions when Claude is unavailable.
 *
 * Requirements: 3.1, 3.6
 */
export async function generateModuleIntro(
  module: string,
  sectorId: string,
  frameworks: FrameworkRecommendation[],
  tenantId: string,
): Promise<ModuleIntro> {
  const staticDesc = MODULE_DESCRIPTIONS[module];
  const moduleName = staticDesc?.nameEn ?? module;
  const moduleNameAr = staticDesc?.nameAr ?? module;

  const frameworkNames = frameworks.map(f => f.nameEn).join(', ');
  const frameworkNamesAr = frameworks.map(f => f.nameAr).join('، ');

  try {
    const aiResponse = await gatewayComplete({
      systemPrompt: `You are a GRC advisor for Saudi Arabian organizations. Generate a welcoming first-visit introduction for a platform module.
The user is new to GRC and needs simple, clear explanations.
Respond in JSON format:
{
  "explanationEn": "2-3 sentence explanation in English",
  "explanationAr": "2-3 sentence explanation in Arabic",
  "relevanceEn": "1-2 sentences on why this matters for their sector",
  "relevanceAr": "1-2 sentences in Arabic on why this matters for their sector"
}`,
      userMessage: `Module: ${moduleName}
Sector: ${sectorId}
Applicable Frameworks: ${frameworkNames}
Generate a first-visit introduction explaining what this module does and why it matters for this sector.`,
      maxTokens: 600,
      tenantId,
    });

    try {
      const parsed = JSON.parse(aiResponse);
      return {
        module,
        titleEn: `Welcome to ${moduleName}`,
        titleAr: `مرحباً بك في ${moduleNameAr}`,
        explanationEn: parsed.explanationEn || staticDesc?.descEn || `This is the ${moduleName} module.`,
        explanationAr: parsed.explanationAr || staticDesc?.descAr || `هذا هو قسم ${moduleNameAr}.`,
        relevanceEn: parsed.relevanceEn || `This module is relevant to your ${frameworkNames} compliance requirements.`,
        relevanceAr: parsed.relevanceAr || `هذا القسم ذو صلة بمتطلبات الامتثال الخاصة بك: ${frameworkNamesAr}.`,
      };
    } catch {
      // JSON parse failed, use AI text as explanation
      return buildFallbackIntro(module, sectorId, frameworks);
    }
  } catch {
    // Claude unavailable, use static fallback
    return buildFallbackIntro(module, sectorId, frameworks);
  }
}

/**
 * Build a fallback module intro from static descriptions.
 * Used when Claude API is unavailable.
 */
function buildFallbackIntro(
  module: string,
  _sectorId: string,
  frameworks: FrameworkRecommendation[],
): ModuleIntro {
  const staticDesc = MODULE_DESCRIPTIONS[module];
  const moduleName = staticDesc?.nameEn ?? module;
  const moduleNameAr = staticDesc?.nameAr ?? module;
  const frameworkNames = frameworks.map(f => f.nameEn).join(', ');
  const frameworkNamesAr = frameworks.map(f => f.nameAr).join('، ');

  return {
    module,
    titleEn: `Welcome to ${moduleName}`,
    titleAr: `مرحباً بك في ${moduleNameAr}`,
    explanationEn: staticDesc?.descEn || `This is the ${moduleName} module where you manage your ${module} activities.`,
    explanationAr: staticDesc?.descAr || `هذا هو قسم ${moduleNameAr} حيث تدير أنشطة ${moduleNameAr} الخاصة بك.`,
    relevanceEn: frameworkNames
      ? `This module helps you meet requirements from ${frameworkNames}.`
      : `This module is part of your GRC journey.`,
    relevanceAr: frameworkNamesAr
      ? `يساعدك هذا القسم في تلبية متطلبات ${frameworkNamesAr}.`
      : `هذا القسم جزء من رحلة الحوكمة والمخاطر والامتثال الخاصة بك.`,
  };
}

// ============================================================================
// First-Visit Check
// ============================================================================

/**
 * Check if this is a user's first visit to a module.
 * If first visit, generate an intro, record the visit, and return the intro.
 * If not first visit, return null.
 *
 * Requirements: 3.1, 3.6
 */
export async function checkFirstVisitAndGetIntro(
  tenantId: string,
  userId: string,
  module: string,
): Promise<ModuleIntro | null> {
  const firstVisit = await isFirstVisit(tenantId, userId, module);
  if (!firstVisit) return null;

  // Get company profile for sector and framework context
  const profile = await getCompanyProfile(tenantId);
  const sectorId = profile?.industrySector ?? '';
  const frameworks = profile?.applicableFrameworks ?? [];

  // Generate intro and record the visit
  const intro = await generateModuleIntro(module, sectorId, frameworks, tenantId);
  await recordFirstVisit(tenantId, userId, module);

  return intro;
}

// ============================================================================
// Content Suggestions
// ============================================================================

/**
 * Generate content suggestions for risk/policy/control creation
 * based on the user's sector and applicable frameworks.
 *
 * Requirements: 3.2, 3.6
 * Validates: Property 8 - Content suggestions are non-empty for all sector/framework combinations
 */
export function getContentSuggestions(
  entityType: 'risk' | 'policy' | 'control',
  _sectorId: string,
  frameworks: FrameworkRecommendation[],
): ContentSuggestion[] {
  const templates = CONTENT_TEMPLATES[entityType] || [];
  const frameworkIds = frameworks.map(f => f.frameworkId);

  const suggestions: ContentSuggestion[] = templates
    .map((template, index) => {
      // Boost confidence for templates matching applicable frameworks
      const frameworkMatch = template.frameworkPattern
        ? frameworkIds.some(fid => fid.includes(template.frameworkPattern!))
        : false;

      const confidence = frameworkMatch ? 0.90 + (index * -0.02) : 0.70 + (index * -0.02);

      return {
        id: `content-${entityType}-${index}`,
        entityType,
        titleEn: template.titleEn,
        titleAr: template.titleAr,
        bodyEn: template.bodyEn,
        bodyAr: template.bodyAr,
        frameworkRef: frameworkMatch ? template.frameworkPattern : undefined,
        confidence: Math.max(confidence, 0.50),
      };
    })
    .sort((a, b) => b.confidence - a.confidence);

  return suggestions;
}

// ============================================================================
// What-Next Actions
// ============================================================================

/**
 * Build "what next" actions from the roadmap's pending tasks.
 * Returns prioritized actions with bilingual explanations.
 *
 * Requirements: 3.3
 */
function buildWhatNextActions(roadmap: GRCRoadmap): WhatNextAction[] {
  const actions: WhatNextAction[] = [];
  const sortedPhases = [...roadmap.phases].sort((a, b) => a.order - b.order);

  for (const phase of sortedPhases) {
    for (const milestone of phase.milestones) {
      for (const task of milestone.tasks) {
        if (task.status === 'pending' || task.status === 'in_progress') {
          actions.push({
            taskId: task.taskId,
            titleEn: task.titleEn,
            titleAr: task.titleAr,
            descriptionEn: task.descriptionEn,
            descriptionAr: task.descriptionAr,
            targetModule: task.targetModule,
            targetAction: task.targetAction,
            priority: task.priority,
            reasonEn: `Part of the ${phase.nameEn} phase — ${milestone.nameEn}`,
            reasonAr: `جزء من مرحلة ${phase.nameAr} — ${milestone.nameAr}`,
          });
        }
      }
    }
    // Only return actions from the earliest incomplete phase
    if (actions.length > 0) break;
  }

  // Sort by priority
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return actions.sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));
}

// ============================================================================
// Combined Journey-Aware Suggestions
// ============================================================================

/**
 * Get journey-aware suggestions combining existing context suggestions
 * with roadmap-based "what next" recommendations and first-visit intros.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.5, 3.6
 */
export async function getJourneyAwareSuggestions(
  tenantId: string,
  userId: string,
  context: PageContext,
): Promise<JourneyAwareSuggestion> {
  // Get existing context-based suggestions (Req 3.5)
  const suggestions = getSuggestionsForContext(context);

  // Check for first visit and get module intro (Req 3.1)
  const module = context.module || '';
  let moduleIntro: ModuleIntro | undefined;
  if (module) {
    const intro = await checkFirstVisitAndGetIntro(tenantId, userId, module);
    if (intro) moduleIntro = intro;
  }

  // Get roadmap-based "what next" actions (Req 3.3)
  let nextActions: WhatNextAction[] = [];
  try {
    const roadmap = await getRoadmap(tenantId);
    if (roadmap) {
      nextActions = buildWhatNextActions(roadmap);
    }
  } catch {
    // Roadmap not available yet, skip "what next"
  }

  return {
    suggestions,
    nextActions,
    moduleIntro,
  };
}
