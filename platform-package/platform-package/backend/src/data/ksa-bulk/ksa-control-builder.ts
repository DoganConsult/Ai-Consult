// ============================================
// Shahin AI-KSA GRC — Compact Control Builder
// Helpers to define controls/domains/subdomains
// in a single-line compact format
// ============================================

import { ControlDef, SubdomainDef, DomainDef, FrameworkDef } from "./ksa-frameworks";

/** Build a single ControlDef from positional args (one-liner per control) */
export function C(
  id: string, code: string,
  tEn: string, tAr: string,
  dEn: string, dAr: string,
  p: "critical"|"high"|"medium"|"low",
  auto: boolean,
  ev: string[],
  map?: string[]
): ControlDef {
  return { id, code, titleEn: tEn, titleAr: tAr, descEn: dEn, descAr: dAr, priority: p, automatable: auto, evidenceTypes: ev, mappedTo: map };
}

/** Build a SubdomainDef */
export function S(id: string, code: string, nEn: string, nAr: string, controls: ControlDef[]): SubdomainDef {
  return { id, code, nameEn: nEn, nameAr: nAr, controls };
}

/** Build a DomainDef */
export function D(id: string, code: string, nEn: string, nAr: string, subs: SubdomainDef[]): DomainDef {
  return { id, code, nameEn: nEn, nameAr: nAr, subdomains: subs };
}

/** Build a FrameworkDef */
export function FW(opts: {
  id: string; reg: string; nEn: string; nAr: string;
  type: string; ver: string; verId: string;
  sectors: string[]; mandatory: boolean;
  sumEn: string; sumAr: string; tags: string[];
  domains: DomainDef[];
}): FrameworkDef {
  return {
    instrumentId: opts.id, regulatorId: opts.reg,
    nameEn: opts.nEn, nameAr: opts.nAr,
    type: opts.type, version: opts.ver, versionId: opts.verId,
    sectors: opts.sectors, mandatory: opts.mandatory,
    summaryEn: opts.sumEn, summaryAr: opts.sumAr,
    tags: opts.tags, domains: opts.domains,
  };
}

/**
 * Batch-generate controls from a compact tuple array.
 * Each tuple: [id, code, titleEn, titleAr, descEn, descAr, priority, automatable, evidenceTypes, mappedTo?]
 */
export function controls(data: Array<[string,string,string,string,string,string,"critical"|"high"|"medium"|"low",boolean,string[],string[]?]>): ControlDef[] {
  return data.map(d => C(d[0],d[1],d[2],d[3],d[4],d[5],d[6],d[7],d[8],d[9]));
}

// ═══════════════════════════════════════════
// BULK CONTROL GENERATOR
// Generates many controls from compact specs
// ═══════════════════════════════════════════

/** Priority distribution for generated controls */
const PRIO_DIST: Array<"critical"|"high"|"medium"|"low"> = ["critical","critical","high","high","high","medium","medium","medium","low","low"];

/** Evidence type pools by category */
const EV_POOLS: Record<string, string[][]> = {
  governance: [["document"],["document","approval_record"],["document","meeting_minutes"],["document","org_chart"],["policy_document"],["document","board_report"]],
  technical: [["system_config"],["system_config","scan_report"],["system_config","monitoring_report"],["system_config","test_report"],["config_baseline"],["system_config","log_report"]],
  operational: [["process_document"],["training_record"],["audit_report"],["compliance_report"],["review_report"],["assessment_report"]],
  data: [["encryption_report"],["system_config","dlp_report"],["data_inventory"],["classification_record"],["anonymization_report"],["consent_record"]],
  incident: [["incident_report"],["drill_report"],["soc_report"],["forensic_report"],["notification_record"],["siem_config"]],
  physical: [["access_log"],["surveillance_log"],["visitor_log"],["monitoring_report"],["system_config"],["badge_report"]],
};

/** Control topic templates per domain area */
interface ControlTemplate {
  tEn: string; tAr: string; dEn: string; dAr: string;
  cat: string; auto: boolean;
}

const CTRL_TEMPLATES: Record<string, ControlTemplate[]> = {
  governance: [
    {tEn:"Policy Development",tAr:"تطوير السياسة",dEn:"Develop and approve {topic} policy",dAr:"تطوير واعتماد سياسة {topic_ar}",cat:"governance",auto:false},
    {tEn:"Policy Review",tAr:"مراجعة السياسة",dEn:"Review and update {topic} policy periodically",dAr:"مراجعة وتحديث سياسة {topic_ar} بشكل دوري",cat:"governance",auto:false},
    {tEn:"Roles & Responsibilities",tAr:"الأدوار والمسؤوليات",dEn:"Define roles and responsibilities for {topic}",dAr:"تحديد الأدوار والمسؤوليات لـ {topic_ar}",cat:"governance",auto:false},
    {tEn:"Risk Assessment",tAr:"تقييم المخاطر",dEn:"Conduct risk assessment for {topic}",dAr:"إجراء تقييم المخاطر لـ {topic_ar}",cat:"operational",auto:false},
    {tEn:"Compliance Monitoring",tAr:"مراقبة الامتثال",dEn:"Monitor compliance with {topic} requirements",dAr:"مراقبة الامتثال لمتطلبات {topic_ar}",cat:"operational",auto:true},
    {tEn:"Awareness Program",tAr:"برنامج التوعية",dEn:"Implement awareness program for {topic}",dAr:"تنفيذ برنامج التوعية بـ {topic_ar}",cat:"operational",auto:false},
    {tEn:"Performance Metrics",tAr:"مقاييس الأداء",dEn:"Define and track performance metrics for {topic}",dAr:"تحديد ومتابعة مقاييس الأداء لـ {topic_ar}",cat:"operational",auto:true},
    {tEn:"Exception Management",tAr:"إدارة الاستثناءات",dEn:"Define exception management process for {topic}",dAr:"تحديد عملية إدارة الاستثناءات لـ {topic_ar}",cat:"governance",auto:false},
    {tEn:"Reporting to Management",tAr:"التقارير للإدارة",dEn:"Regular reporting on {topic} status to management",dAr:"تقارير منتظمة عن حالة {topic_ar} للإدارة",cat:"governance",auto:true},
    {tEn:"Continuous Improvement",tAr:"التحسين المستمر",dEn:"Continuous improvement program for {topic}",dAr:"برنامج التحسين المستمر لـ {topic_ar}",cat:"governance",auto:false},
  ],
  technical: [
    {tEn:"Secure Configuration",tAr:"التكوين الآمن",dEn:"Implement secure configuration baselines for {topic}",dAr:"تنفيذ خطوط أساس التكوين الآمن لـ {topic_ar}",cat:"technical",auto:true},
    {tEn:"Access Control",tAr:"التحكم في الوصول",dEn:"Implement access controls for {topic}",dAr:"تنفيذ ضوابط الوصول لـ {topic_ar}",cat:"technical",auto:true},
    {tEn:"Encryption",tAr:"التشفير",dEn:"Encrypt {topic} data at rest and in transit",dAr:"تشفير بيانات {topic_ar} أثناء التخزين والنقل",cat:"data",auto:true},
    {tEn:"Monitoring & Logging",tAr:"المراقبة والتسجيل",dEn:"Implement monitoring and logging for {topic}",dAr:"تنفيذ المراقبة والتسجيل لـ {topic_ar}",cat:"technical",auto:true},
    {tEn:"Vulnerability Management",tAr:"إدارة الثغرات",dEn:"Conduct vulnerability assessments for {topic}",dAr:"إجراء تقييمات الثغرات لـ {topic_ar}",cat:"technical",auto:true},
    {tEn:"Patch Management",tAr:"إدارة التصحيحات",dEn:"Implement timely patch management for {topic}",dAr:"تنفيذ إدارة التصحيحات في الوقت المناسب لـ {topic_ar}",cat:"technical",auto:true},
    {tEn:"Backup & Recovery",tAr:"النسخ الاحتياطي والاسترداد",dEn:"Implement backup and recovery procedures for {topic}",dAr:"تنفيذ إجراءات النسخ الاحتياطي والاسترداد لـ {topic_ar}",cat:"technical",auto:true},
    {tEn:"Network Segmentation",tAr:"تجزئة الشبكة",dEn:"Implement network segmentation for {topic}",dAr:"تنفيذ تجزئة الشبكة لـ {topic_ar}",cat:"technical",auto:true},
    {tEn:"Penetration Testing",tAr:"اختبار الاختراق",dEn:"Conduct penetration testing for {topic}",dAr:"إجراء اختبار الاختراق لـ {topic_ar}",cat:"technical",auto:false},
    {tEn:"Incident Response",tAr:"الاستجابة للحوادث",dEn:"Define incident response procedures for {topic}",dAr:"تحديد إجراءات الاستجابة للحوادث لـ {topic_ar}",cat:"incident",auto:false},
    {tEn:"Change Management",tAr:"إدارة التغيير",dEn:"Implement change management process for {topic}",dAr:"تنفيذ عملية إدارة التغيير لـ {topic_ar}",cat:"operational",auto:true},
    {tEn:"Capacity Planning",tAr:"تخطيط السعة",dEn:"Plan and manage capacity for {topic}",dAr:"تخطيط وإدارة السعة لـ {topic_ar}",cat:"technical",auto:true},
  ],
  data: [
    {tEn:"Data Classification",tAr:"تصنيف البيانات",dEn:"Classify {topic} data per sensitivity",dAr:"تصنيف بيانات {topic_ar} حسب الحساسية",cat:"data",auto:false},
    {tEn:"Data Retention",tAr:"الاحتفاظ بالبيانات",dEn:"Define retention periods for {topic} data",dAr:"تحديد فترات الاحتفاظ ببيانات {topic_ar}",cat:"data",auto:true},
    {tEn:"Data Disposal",tAr:"التخلص من البيانات",dEn:"Secure disposal of {topic} data",dAr:"التخلص الآمن من بيانات {topic_ar}",cat:"data",auto:false},
    {tEn:"Privacy Protection",tAr:"حماية الخصوصية",dEn:"Protect personal data within {topic}",dAr:"حماية البيانات الشخصية في {topic_ar}",cat:"data",auto:true},
    {tEn:"Data Quality",tAr:"جودة البيانات",dEn:"Ensure data quality and integrity for {topic}",dAr:"ضمان جودة وسلامة بيانات {topic_ar}",cat:"data",auto:true},
    {tEn:"Data Loss Prevention",tAr:"منع فقدان البيانات",dEn:"Implement DLP controls for {topic}",dAr:"تنفيذ ضوابط منع فقدان البيانات لـ {topic_ar}",cat:"data",auto:true},
    {tEn:"Data Sharing Controls",tAr:"ضوابط مشاركة البيانات",dEn:"Control data sharing for {topic}",dAr:"التحكم في مشاركة بيانات {topic_ar}",cat:"data",auto:true},
    {tEn:"Cross-Border Transfer",tAr:"النقل عبر الحدود",dEn:"Control cross-border transfer of {topic} data",dAr:"التحكم في نقل بيانات {topic_ar} عبر الحدود",cat:"data",auto:false},
  ],
  resilience: [
    {tEn:"BCP",tAr:"خطة استمرارية الأعمال",dEn:"Develop business continuity plan for {topic}",dAr:"تطوير خطة استمرارية الأعمال لـ {topic_ar}",cat:"operational",auto:false},
    {tEn:"DR Plan",tAr:"خطة التعافي من الكوارث",dEn:"Develop disaster recovery plan for {topic}",dAr:"تطوير خطة التعافي من الكوارث لـ {topic_ar}",cat:"operational",auto:false},
    {tEn:"Testing & Exercises",tAr:"الاختبارات والتمارين",dEn:"Conduct periodic testing and exercises for {topic}",dAr:"إجراء اختبارات وتمارين دورية لـ {topic_ar}",cat:"operational",auto:false},
    {tEn:"Threat Intelligence",tAr:"استخبارات التهديدات",dEn:"Utilize threat intelligence for {topic}",dAr:"استخدام استخبارات التهديدات لـ {topic_ar}",cat:"incident",auto:true},
    {tEn:"Forensic Readiness",tAr:"الجاهزية الجنائية",dEn:"Maintain forensic readiness for {topic}",dAr:"الحفاظ على الجاهزية الجنائية لـ {topic_ar}",cat:"incident",auto:false},
    {tEn:"Lessons Learned",tAr:"الدروس المستفادة",dEn:"Document lessons learned from {topic} incidents",dAr:"توثيق الدروس المستفادة من حوادث {topic_ar}",cat:"operational",auto:false},
  ],
};

/**
 * Compact subdomain spec for bulk generation.
 */
export interface BulkSubSpec {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  topic: string;      // English topic for template substitution
  topicAr: string;    // Arabic topic
  templateSet: string; // key into CTRL_TEMPLATES
  count: number;       // how many controls to generate (picks first N from template)
}

/**
 * Generate a full subdomain with N controls from templates.
 */
export function bulkSub(spec: BulkSubSpec): SubdomainDef {
  const templates = CTRL_TEMPLATES[spec.templateSet] || CTRL_TEMPLATES.technical;
  const ctrls: ControlDef[] = [];
  for (let i = 0; i < spec.count && i < templates.length; i++) {
    const t = templates[i];
    const ctrlId = `${spec.id}.${i + 1}`;
    const ctrlCode = `${spec.code}.${i + 1}`;
    const prio = PRIO_DIST[i % PRIO_DIST.length];
    const evPool = EV_POOLS[t.cat] || EV_POOLS.technical;
    const ev = evPool[i % evPool.length];
    ctrls.push({
      id: ctrlId,
      code: ctrlCode,
      titleEn: t.tEn.replace("{topic}", spec.topic),
      titleAr: t.tAr.replace("{topic_ar}", spec.topicAr),
      descEn: t.dEn.replace("{topic}", spec.topic).replace("{topic}", spec.topic),
      descAr: t.dAr.replace("{topic_ar}", spec.topicAr).replace("{topic_ar}", spec.topicAr),
      priority: prio,
      automatable: t.auto,
      evidenceTypes: ev,
    });
  }
  return { id: spec.id, code: spec.code, nameEn: spec.nameEn, nameAr: spec.nameAr, controls: ctrls };
}

/**
 * Bulk-generate domains from compact specs.
 * Each domain spec: { id, code, nameEn, nameAr, subs: BulkSubSpec[] }
 */
export interface BulkDomainSpec {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  subs: BulkSubSpec[];
}

export function bulkDomain(spec: BulkDomainSpec): DomainDef {
  return {
    id: spec.id,
    code: spec.code,
    nameEn: spec.nameEn,
    nameAr: spec.nameAr,
    subdomains: spec.subs.map(s => bulkSub(s)),
  };
}
