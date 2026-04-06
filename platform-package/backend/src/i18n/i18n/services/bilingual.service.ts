// Shahin - Bilingual Operations Service

export type SupportedLanguage = "ar" | "en";

export interface BilingualContent {
  contentId: string;
  contentType: string;
  key: string;
  textAr: string;
  textEn: string;
}

export interface BilingualContentInput {
  contentType: string;
  key: string;
  textAr: string;
  textEn: string;
}

export interface GlossaryTerm {
  termEn: string;
  termAr: string;
  category: string;
}

export interface NotificationRenderResult {
  subject: string;
  body: string;
  language: SupportedLanguage;
}

export interface ArabicTemplate {
  templateId: string;
  templateType: string;
  nameAr: string;
  nameEn: string;
  contentAr: string;
  contentEn: string;
  customized: boolean;
}

export interface ArabicTemplateInput {
  templateType: string;
  nameAr: string;
  nameEn: string;
  contentAr: string;
  contentEn: string;
}

// === GRC Glossary ===

export const GRC_GLOSSARY: GlossaryTerm[] = [
  { termEn: "controls", termAr: "Dawabet", category: "core" },
  { termEn: "risk", termAr: "Makhatir", category: "core" },
  { termEn: "compliance", termAr: "Imtithal", category: "core" },
  { termEn: "audit", termAr: "Tadqiq", category: "core" },
  { termEn: "governance", termAr: "Hawkama", category: "core" },
  { termEn: "policy", termAr: "Siyasa", category: "core" },
  { termEn: "assessment", termAr: "Taqyim", category: "lifecycle" },
  { termEn: "remediation", termAr: "Mu'alaja", category: "lifecycle" },
  { termEn: "evidence", termAr: "Dalil", category: "lifecycle" },
  { termEn: "incident", termAr: "Haditha", category: "lifecycle" },
  { termEn: "vendor", termAr: "Muwarrid", category: "lifecycle" },
  { termEn: "framework", termAr: "Itar", category: "structure" },
  { termEn: "regulation", termAr: "Nizam", category: "structure" },
  { termEn: "exception", termAr: "Istithnaa", category: "structure" },
];

export function getGlossaryByCategory(category: string): GlossaryTerm[] {
  return GRC_GLOSSARY.filter((t) => t.category === category);
}

export function lookupGlossary(termEn: string): GlossaryTerm | undefined {
  const lower = termEn.toLowerCase();
  return GRC_GLOSSARY.find((t) => t.termEn.toLowerCase() === lower);
}

export function getGlossaryCategories(): string[] {
  return [...new Set(GRC_GLOSSARY.map((t) => t.category))];
}

export function getFullGlossary(): GlossaryTerm[] {
  return GRC_GLOSSARY.map((t) => ({ ...t }));
}

// === Notification Templates ===

interface NotificationTemplate {
  subjectEn: string;
  subjectAr: string;
  bodyEn: string;
  bodyAr: string;
}

const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  risk_threshold: {
    subjectEn: "Risk Alert: {{riskName}} exceeded {{threshold}}",
    subjectAr: "تنبيه مخاطر: {{riskName}} تجاوز {{threshold}}",
    bodyEn: "Risk {{riskName}} has reached a score of {{score}}, exceeding the {{threshold}} threshold.",
    bodyAr: "المخاطر {{riskName}} وصلت إلى درجة {{score}}، متجاوزة حد {{threshold}}.",
  },
  exception_expiry: {
    subjectEn: "Exception Expiring: {{exceptionName}}",
    subjectAr: "انتهاء استثناء: {{exceptionName}}",
    bodyEn: "Exception {{exceptionName}} will expire on {{expiryDate}}.",
    bodyAr: "الاستثناء {{exceptionName}} سينتهي في {{expiryDate}}.",
  },
  workflow_approval: {
    subjectEn: "Approval Required: {{itemName}}",
    subjectAr: "مطلوب موافقة: {{itemName}}",
    bodyEn: "{{itemName}} requires your approval. Requested by {{requester}}.",
    bodyAr: "{{itemName}} يتطلب موافقتك. مطلوب من {{requester}}.",
  },
  deadline_reminder: {
    subjectEn: "Deadline Approaching: {{taskName}}",
    subjectAr: "اقتراب الموعد النهائي: {{taskName}}",
    bodyEn: "Task {{taskName}} is due on {{dueDate}}.",
    bodyAr: "المهمة {{taskName}} مستحقة في {{dueDate}}.",
  },
  compliance_gap: {
    subjectEn: "Compliance Gap Detected: {{frameworkName}}",
    subjectAr: "فجوة امتثال: {{frameworkName}}",
    bodyEn: "A compliance gap was detected in {{frameworkName}} for control {{controlId}}.",
    bodyAr: "تم اكتشاف فجوة امتثال في {{frameworkName}} للضابط {{controlId}}.",
  },
};

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key] ?? match);
}

export function renderNotification(
  templateKey: string,
  lang: SupportedLanguage,
  vars: Record<string, string>
): NotificationRenderResult | null {
  const tpl = NOTIFICATION_TEMPLATES[templateKey];
  if (!tpl) return null;
  const subject = interpolate(lang === "ar" ? tpl.subjectAr : tpl.subjectEn, vars);
  const body = interpolate(lang === "ar" ? tpl.bodyAr : tpl.bodyEn, vars);
  return { subject, body, language: lang };
}

export function getNotificationTemplateKeys(): string[] {
  return Object.keys(NOTIFICATION_TEMPLATES);
}

// === Arabic Document Templates ===

const ARABIC_TEMPLATES: ArabicTemplate[] = [
  {
    templateId: "policy-standard",
    templateType: "policy",
    nameAr: "سياسة قياسية",
    nameEn: "Standard Policy",
    contentAr: "الغرض: {{purpose}}\nالنطاق: {{scope}}\nالمحتوى: {{content}}",
    contentEn: "Purpose: {{purpose}}\nScope: {{scope}}\nContent: {{content}}",
    customized: false,
  },
  {
    templateId: "policy-security",
    templateType: "policy",
    nameAr: "سياسة أمنية",
    nameEn: "Security Policy",
    contentAr: "الغرض: {{purpose}}\nالنطاق: {{scope}}\nالمتطلبات: {{requirements}}",
    contentEn: "Purpose: {{purpose}}\nScope: {{scope}}\nRequirements: {{requirements}}",
    customized: false,
  },
  {
    templateId: "risk-assessment",
    templateType: "assessment",
    nameAr: "تقييم المخاطر",
    nameEn: "Risk Assessment",
    contentAr: "الوصف: {{description}}\nالتأثير: {{impact}}\nالاحتمالية: {{likelihood}}",
    contentEn: "Description: {{description}}\nImpact: {{impact}}\nLikelihood: {{likelihood}}",
    customized: false,
  },
  {
    templateId: "audit-report",
    templateType: "report",
    nameAr: "تقرير تدقيق",
    nameEn: "Audit Report",
    contentAr: "النتائج: {{findings}}\nالتوصيات: {{recommendations}}",
    contentEn: "Findings: {{findings}}\nRecommendations: {{recommendations}}",
    customized: false,
  },
];

export function getArabicTemplates(templateType?: string): ArabicTemplate[] {
  if (!templateType) return [...ARABIC_TEMPLATES];
  return ARABIC_TEMPLATES.filter((t) => t.templateType === templateType);
}

export function getArabicTemplate(templateId: string): ArabicTemplate | undefined {
  return ARABIC_TEMPLATES.find((t) => t.templateId === templateId);
}

export function renderArabicTemplate(
  templateId: string,
  lang: SupportedLanguage,
  vars: Record<string, string>
): string | null {
  const tpl = ARABIC_TEMPLATES.find((t) => t.templateId === templateId);
  if (!tpl) return null;
  const content = lang === "ar" ? tpl.contentAr : tpl.contentEn;
  return interpolate(content, vars);
}
