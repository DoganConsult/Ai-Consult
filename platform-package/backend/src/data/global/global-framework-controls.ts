// @ts-nocheck
// ============================================================================
// Global Framework Controls — Populates domains for all international
// frameworks that currently have domains: [] in global-frameworks.ts
// Uses bulkDomain template engine for efficient control generation.
// ============================================================================

import { DomainDef } from "./ksa-frameworks";
import { bulkDomain, BulkSubSpec } from "./ksa-control-builder";

function bs(id:string, code:string, nEn:string, nAr:string, topic:string, topicAr:string, ts:string, count:number): BulkSubSpec {
  return { id, code, nameEn: nEn, nameAr: nAr, topic, topicAr, templateSet: ts, count };
}

// ═══════════════════════════════════════════════════════════════════════════
// GDPR — EU General Data Protection Regulation (~120 controls)
// ═══════════════════════════════════════════════════════════════════════════
export const GDPR_DOMAINS: DomainDef[] = [
  bulkDomain({id:"GDPR-D1",code:"1",nameEn:"Lawfulness & Transparency",nameAr:"المشروعية والشفافية",subs:[
    bs("GDPR-1-1","1.1","Lawful Basis","الأساس القانوني","lawful basis for processing","الأساس القانوني للمعالجة","governance",10),
    bs("GDPR-1-2","1.2","Consent Management","إدارة الموافقة","consent management","إدارة الموافقة","data",8),
    bs("GDPR-1-3","1.3","Privacy Notices","إشعارات الخصوصية","privacy notice","إشعار الخصوصية","governance",6),
  ]}),
  bulkDomain({id:"GDPR-D2",code:"2",nameEn:"Data Subject Rights",nameAr:"حقوق أصحاب البيانات",subs:[
    bs("GDPR-2-1","2.1","Right of Access","حق الوصول","data subject access request","طلب وصول صاحب البيانات","governance",8),
    bs("GDPR-2-2","2.2","Right to Rectification","حق التصحيح","data rectification","تصحيح البيانات","data",6),
    bs("GDPR-2-3","2.3","Right to Erasure","حق الحذف","data erasure","حذف البيانات","data",8),
    bs("GDPR-2-4","2.4","Right to Portability","حق النقل","data portability","نقل البيانات","data",6),
    bs("GDPR-2-5","2.5","Right to Object","حق الاعتراض","objection to processing","الاعتراض على المعالجة","governance",6),
  ]}),
  bulkDomain({id:"GDPR-D3",code:"3",nameEn:"Controller & Processor Obligations",nameAr:"التزامات المتحكم والمعالج",subs:[
    bs("GDPR-3-1","3.1","Data Protection by Design","الحماية بالتصميم","privacy by design","الخصوصية بالتصميم","governance",8),
    bs("GDPR-3-2","3.2","Data Processing Agreements","اتفاقيات المعالجة","data processing agreement","اتفاقية معالجة البيانات","governance",6),
    bs("GDPR-3-3","3.3","Records of Processing","سجلات المعالجة","processing activity records","سجلات أنشطة المعالجة","data",6),
  ]}),
  bulkDomain({id:"GDPR-D4",code:"4",nameEn:"International Transfers",nameAr:"النقل الدولي",subs:[
    bs("GDPR-4-1","4.1","Transfer Mechanisms","آليات النقل","cross-border data transfer","نقل البيانات عبر الحدود","data",8),
    bs("GDPR-4-2","4.2","Standard Contractual Clauses","البنود التعاقدية","standard contractual clauses","البنود التعاقدية النموذجية","governance",6),
  ]}),
  bulkDomain({id:"GDPR-D5",code:"5",nameEn:"DPO & Governance",nameAr:"مسؤول حماية البيانات والحوكمة",subs:[
    bs("GDPR-5-1","5.1","DPO Appointment","تعيين مسؤول حماية البيانات","data protection officer","مسؤول حماية البيانات","governance",6),
    bs("GDPR-5-2","5.2","DPIA","تقييم الأثر","data protection impact assessment","تقييم أثر حماية البيانات","governance",8),
  ]}),
  bulkDomain({id:"GDPR-D6",code:"6",nameEn:"Security of Processing",nameAr:"أمن المعالجة",subs:[
    bs("GDPR-6-1","6.1","Technical Measures","التدابير التقنية","security technical measures","التدابير الأمنية التقنية","technical",10),
    bs("GDPR-6-2","6.2","Organizational Measures","التدابير التنظيمية","security organizational measures","التدابير الأمنية التنظيمية","governance",8),
  ]}),
  bulkDomain({id:"GDPR-D7",code:"7",nameEn:"Breach Notification",nameAr:"إخطار الانتهاك",subs:[
    bs("GDPR-7-1","7.1","Breach Detection","كشف الانتهاك","data breach detection","كشف انتهاك البيانات","resilience",6),
    bs("GDPR-7-2","7.2","Authority Notification","إخطار الجهة","supervisory authority notification","إخطار الجهة الرقابية","governance",6),
    bs("GDPR-7-3","7.3","Data Subject Notification","إخطار الأفراد","data subject breach notification","إخطار أصحاب البيانات","governance",4),
  ]}),
];

// ═══════════════════════════════════════════════════════════════════════════
// NIST CSF 2.0 — Cybersecurity Framework (~110 controls)
// ═══════════════════════════════════════════════════════════════════════════
export const NIST_CSF2_DOMAINS: DomainDef[] = [
  bulkDomain({id:"NCSF-D1",code:"GV",nameEn:"Govern",nameAr:"الحوكمة",subs:[
    bs("NCSF-GV-1","GV.1","Organizational Context","السياق التنظيمي","organizational cybersecurity context","السياق التنظيمي للأمن السيبراني","governance",10),
    bs("NCSF-GV-2","GV.2","Risk Management Strategy","استراتيجية إدارة المخاطر","risk management strategy","استراتيجية إدارة المخاطر","governance",8),
    bs("NCSF-GV-3","GV.3","Supply Chain Risk","مخاطر سلسلة التوريد","supply chain risk management","إدارة مخاطر سلسلة التوريد","governance",8),
  ]}),
  bulkDomain({id:"NCSF-D2",code:"ID",nameEn:"Identify",nameAr:"التعريف",subs:[
    bs("NCSF-ID-1","ID.1","Asset Management","إدارة الأصول","asset management","إدارة الأصول","governance",10),
    bs("NCSF-ID-2","ID.2","Risk Assessment","تقييم المخاطر","risk assessment","تقييم المخاطر","governance",8),
    bs("NCSF-ID-3","ID.3","Improvement","التحسين","cybersecurity improvement","تحسين الأمن السيبراني","governance",6),
  ]}),
  bulkDomain({id:"NCSF-D3",code:"PR",nameEn:"Protect",nameAr:"الحماية",subs:[
    bs("NCSF-PR-1","PR.1","Identity Management","إدارة الهوية","identity management and access control","إدارة الهوية والوصول","technical",12),
    bs("NCSF-PR-2","PR.2","Awareness & Training","التوعية والتدريب","security awareness training","التوعية والتدريب الأمني","governance",6),
    bs("NCSF-PR-3","PR.3","Data Security","أمن البيانات","data security","أمن البيانات","data",8),
    bs("NCSF-PR-4","PR.4","Platform Security","أمن المنصة","platform security","أمن المنصات","technical",10),
    bs("NCSF-PR-5","PR.5","Technology Resilience","مرونة التقنية","technology infrastructure resilience","مرونة البنية التحتية","resilience",6),
  ]}),
  bulkDomain({id:"NCSF-D4",code:"DE",nameEn:"Detect",nameAr:"الكشف",subs:[
    bs("NCSF-DE-1","DE.1","Continuous Monitoring","المراقبة المستمرة","continuous monitoring","المراقبة المستمرة","technical",10),
    bs("NCSF-DE-2","DE.2","Adverse Event Analysis","تحليل الأحداث","adverse event analysis","تحليل الأحداث السلبية","technical",8),
  ]}),
  bulkDomain({id:"NCSF-D5",code:"RS",nameEn:"Respond",nameAr:"الاستجابة",subs:[
    bs("NCSF-RS-1","RS.1","Incident Management","إدارة الحوادث","incident management","إدارة الحوادث","resilience",6),
    bs("NCSF-RS-2","RS.2","Incident Analysis","تحليل الحوادث","incident analysis","تحليل الحوادث","resilience",6),
    bs("NCSF-RS-3","RS.3","Incident Response","الاستجابة للحوادث","incident response reporting and communication","الإبلاغ والتواصل","resilience",6),
  ]}),
  bulkDomain({id:"NCSF-D6",code:"RC",nameEn:"Recover",nameAr:"التعافي",subs:[
    bs("NCSF-RC-1","RC.1","Recovery Planning","تخطيط التعافي","incident recovery plan","خطة التعافي من الحوادث","resilience",6),
    bs("NCSF-RC-2","RC.2","Recovery Communication","اتصالات التعافي","recovery communication","اتصالات التعافي","governance",4),
  ]}),
];

// ═══════════════════════════════════════════════════════════════════════════
// NIST SP 800-53 Rev 5 — Security & Privacy Controls (~200 controls)
// ═══════════════════════════════════════════════════════════════════════════
export const NIST_800_53_DOMAINS: DomainDef[] = [
  bulkDomain({id:"N53-AC",code:"AC",nameEn:"Access Control",nameAr:"التحكم في الوصول",subs:[
    bs("N53-AC-1","AC.1","Access Policy","سياسة الوصول","access control policy and procedures","سياسة وإجراءات التحكم في الوصول","governance",10),
    bs("N53-AC-2","AC.2","Account Management","إدارة الحسابات","account management","إدارة الحسابات","technical",12),
  ]}),
  bulkDomain({id:"N53-AU",code:"AU",nameEn:"Audit & Accountability",nameAr:"التدقيق والمساءلة",subs:[
    bs("N53-AU-1","AU.1","Audit Policy","سياسة التدقيق","audit and accountability policy","سياسة التدقيق والمساءلة","governance",8),
    bs("N53-AU-2","AU.2","Audit Logging","تسجيل التدقيق","audit event logging","تسجيل أحداث التدقيق","technical",10),
  ]}),
  bulkDomain({id:"N53-CM",code:"CM",nameEn:"Configuration Management",nameAr:"إدارة التكوين",subs:[
    bs("N53-CM-1","CM.1","Config Baseline","خط أساس التكوين","configuration management policy","سياسة إدارة التكوين","governance",8),
    bs("N53-CM-2","CM.2","Config Controls","ضوابط التكوين","configuration change control","التحكم في تغيير التكوين","technical",10),
  ]}),
  bulkDomain({id:"N53-CP",code:"CP",nameEn:"Contingency Planning",nameAr:"التخطيط للطوارئ",subs:[
    bs("N53-CP-1","CP.1","Contingency Policy","سياسة الطوارئ","contingency planning policy","سياسة التخطيط للطوارئ","resilience",6),
    bs("N53-CP-2","CP.2","BCP & DR","استمرارية الأعمال","business continuity and disaster recovery","استمرارية الأعمال والتعافي من الكوارث","resilience",6),
  ]}),
  bulkDomain({id:"N53-IA",code:"IA",nameEn:"Identification & Authentication",nameAr:"التعريف والمصادقة",subs:[
    bs("N53-IA-1","IA.1","ID & Auth Policy","سياسة التعريف","identification and authentication policy","سياسة التعريف والمصادقة","governance",8),
    bs("N53-IA-2","IA.2","MFA & Credentials","المصادقة متعددة العوامل","multi-factor authentication","المصادقة متعددة العوامل","technical",10),
  ]}),
  bulkDomain({id:"N53-IR",code:"IR",nameEn:"Incident Response",nameAr:"الاستجابة للحوادث",subs:[
    bs("N53-IR-1","IR.1","IR Policy","سياسة الاستجابة","incident response policy","سياسة الاستجابة للحوادث","resilience",6),
    bs("N53-IR-2","IR.2","IR Procedures","إجراءات الاستجابة","incident handling procedures","إجراءات معالجة الحوادث","resilience",6),
  ]}),
  bulkDomain({id:"N53-RA",code:"RA",nameEn:"Risk Assessment",nameAr:"تقييم المخاطر",subs:[
    bs("N53-RA-1","RA.1","Risk Policy","سياسة المخاطر","risk assessment policy","سياسة تقييم المخاطر","governance",8),
    bs("N53-RA-2","RA.2","Vulnerability Mgmt","إدارة الثغرات","vulnerability management","إدارة الثغرات","technical",8),
  ]}),
  bulkDomain({id:"N53-SC",code:"SC",nameEn:"System & Communications Protection",nameAr:"حماية الأنظمة والاتصالات",subs:[
    bs("N53-SC-1","SC.1","SC Policy","سياسة الحماية","system and communications protection policy","سياسة حماية الأنظمة والاتصالات","technical",10),
    bs("N53-SC-2","SC.2","Encryption","التشفير","cryptographic protection","الحماية التشفيرية","technical",10),
  ]}),
  bulkDomain({id:"N53-SI",code:"SI",nameEn:"System & Information Integrity",nameAr:"سلامة الأنظمة والمعلومات",subs:[
    bs("N53-SI-1","SI.1","SI Policy","سياسة السلامة","system and information integrity policy","سياسة سلامة الأنظمة والمعلومات","governance",8),
    bs("N53-SI-2","SI.2","Flaw Remediation","معالجة العيوب","flaw remediation","معالجة العيوب","technical",8),
  ]}),
  bulkDomain({id:"N53-PE",code:"PE",nameEn:"Physical & Environmental Protection",nameAr:"الحماية المادية والبيئية",subs:[
    bs("N53-PE-1","PE.1","Physical Access","الوصول المادي","physical access control","التحكم في الوصول المادي","technical",8),
    bs("N53-PE-2","PE.2","Environmental","البيئية","environmental protection","الحماية البيئية","technical",6),
  ]}),
  bulkDomain({id:"N53-SA",code:"SA",nameEn:"System & Services Acquisition",nameAr:"اقتناء الأنظمة والخدمات",subs:[
    bs("N53-SA-1","SA.1","Acquisition Policy","سياسة الاقتناء","system acquisition policy","سياسة اقتناء الأنظمة","governance",8),
    bs("N53-SA-2","SA.2","Supply Chain","سلسلة التوريد","supply chain risk management","إدارة مخاطر سلسلة التوريد","governance",8),
  ]}),
];

// ═══════════════════════════════════════════════════════════════════════════
// HIPAA — Health Insurance Portability & Accountability (~70 controls)
// ═══════════════════════════════════════════════════════════════════════════
export const HIPAA_DOMAINS: DomainDef[] = [
  bulkDomain({id:"HIPAA-D1",code:"AS",nameEn:"Administrative Safeguards",nameAr:"الضمانات الإدارية",subs:[
    bs("HIPAA-AS-1","AS.1","Security Management","إدارة الأمن","security management process","عملية إدارة الأمن","governance",10),
    bs("HIPAA-AS-2","AS.2","Workforce Security","أمن القوى العاملة","workforce security","أمن القوى العاملة","governance",8),
    bs("HIPAA-AS-3","AS.3","Information Access","الوصول للمعلومات","information access management","إدارة الوصول للمعلومات","governance",8),
    bs("HIPAA-AS-4","AS.4","Security Awareness","التوعية الأمنية","security awareness and training","التوعية والتدريب الأمني","governance",6),
  ]}),
  bulkDomain({id:"HIPAA-D2",code:"PS",nameEn:"Physical Safeguards",nameAr:"الضمانات المادية",subs:[
    bs("HIPAA-PS-1","PS.1","Facility Access","الوصول للمنشأة","facility access controls","ضوابط الوصول للمنشأة","technical",8),
    bs("HIPAA-PS-2","PS.2","Workstation Security","أمن محطات العمل","workstation security","أمن محطات العمل","technical",6),
    bs("HIPAA-PS-3","PS.3","Device & Media","الأجهزة والوسائط","device and media controls","ضوابط الأجهزة والوسائط","technical",6),
  ]}),
  bulkDomain({id:"HIPAA-D3",code:"TS",nameEn:"Technical Safeguards",nameAr:"الضمانات التقنية",subs:[
    bs("HIPAA-TS-1","TS.1","Access Control","التحكم في الوصول","access control","التحكم في الوصول","technical",10),
    bs("HIPAA-TS-2","TS.2","Audit Controls","ضوابط التدقيق","audit controls","ضوابط التدقيق","technical",8),
    bs("HIPAA-TS-3","TS.3","Integrity Controls","ضوابط السلامة","integrity controls","ضوابط السلامة","technical",6),
    bs("HIPAA-TS-4","TS.4","Transmission Security","أمن النقل","transmission security","أمن النقل","technical",8),
  ]}),
];

// ═══════════════════════════════════════════════════════════════════════════
// SOX — Sarbanes-Oxley (~60 controls)
// ═══════════════════════════════════════════════════════════════════════════
export const SOX_DOMAINS: DomainDef[] = [
  bulkDomain({id:"SOX-D1",code:"1",nameEn:"Management Assessment (Sec 302/404)",nameAr:"تقييم الإدارة",subs:[
    bs("SOX-1-1","1.1","CEO/CFO Certification","شهادة الرئيس التنفيذي","CEO and CFO certification","شهادة الرئيس التنفيذي والمالي","governance",8),
    bs("SOX-1-2","1.2","Internal Control Assessment","تقييم الضوابط الداخلية","internal control effectiveness assessment","تقييم فعالية الضوابط الداخلية","governance",8),
  ]}),
  bulkDomain({id:"SOX-D2",code:"2",nameEn:"Internal Controls over Financial Reporting",nameAr:"الضوابط الداخلية على التقارير المالية",subs:[
    bs("SOX-2-1","2.1","Control Environment","بيئة الرقابة","control environment","بيئة الرقابة","governance",10),
    bs("SOX-2-2","2.2","Control Activities","أنشطة الرقابة","control activities","أنشطة الرقابة","governance",8),
    bs("SOX-2-3","2.3","Monitoring","المراقبة","monitoring activities","أنشطة المراقبة","governance",6),
  ]}),
  bulkDomain({id:"SOX-D3",code:"3",nameEn:"IT General Controls",nameAr:"الضوابط العامة لتقنية المعلومات",subs:[
    bs("SOX-3-1","3.1","Access to Programs & Data","الوصول للبرامج والبيانات","access to programs and data","الوصول للبرامج والبيانات","technical",10),
    bs("SOX-3-2","3.2","Program Change Management","إدارة تغيير البرامج","program change management","إدارة تغيير البرامج","technical",8),
    bs("SOX-3-3","3.3","IT Operations","عمليات تقنية المعلومات","computer operations","عمليات الحاسوب","technical",8),
  ]}),
  bulkDomain({id:"SOX-D4",code:"4",nameEn:"Audit & Oversight",nameAr:"التدقيق والرقابة",subs:[
    bs("SOX-4-1","4.1","Audit Committee","لجنة التدقيق","audit committee independence","استقلالية لجنة التدقيق","governance",6),
    bs("SOX-4-2","4.2","External Audit","التدقيق الخارجي","external auditor independence","استقلالية المدقق الخارجي","governance",6),
  ]}),
];

// ═══════════════════════════════════════════════════════════════════════════
// DORA — Digital Operational Resilience Act (~80 controls)
// ═══════════════════════════════════════════════════════════════════════════
export const DORA_DOMAINS: DomainDef[] = [
  bulkDomain({id:"DORA-D1",code:"1",nameEn:"ICT Risk Management",nameAr:"إدارة مخاطر تقنية المعلومات",subs:[
    bs("DORA-1-1","1.1","ICT Risk Framework","إطار المخاطر","ICT risk management framework","إطار إدارة مخاطر تقنية المعلومات","governance",10),
    bs("DORA-1-2","1.2","ICT Systems Protection","حماية الأنظمة","ICT systems identification and protection","تعريف وحماية أنظمة تقنية المعلومات","technical",10),
    bs("DORA-1-3","1.3","ICT Change Management","إدارة التغيير","ICT change management","إدارة تغيير تقنية المعلومات","technical",8),
  ]}),
  bulkDomain({id:"DORA-D2",code:"2",nameEn:"ICT Incident Reporting",nameAr:"الإبلاغ عن حوادث تقنية المعلومات",subs:[
    bs("DORA-2-1","2.1","Incident Classification","تصنيف الحوادث","ICT incident classification","تصنيف حوادث تقنية المعلومات","resilience",6),
    bs("DORA-2-2","2.2","Incident Reporting","الإبلاغ عن الحوادث","major ICT incident reporting","الإبلاغ عن الحوادث الرئيسية","resilience",6),
    bs("DORA-2-3","2.3","Cyber Threat Intel","استخبارات التهديدات","cyber threat intelligence","استخبارات التهديدات السيبرانية","resilience",6),
  ]}),
  bulkDomain({id:"DORA-D3",code:"3",nameEn:"Digital Resilience Testing",nameAr:"اختبار المرونة الرقمية",subs:[
    bs("DORA-3-1","3.1","Resilience Testing Program","برنامج اختبار المرونة","digital resilience testing program","برنامج اختبار المرونة الرقمية","resilience",6),
    bs("DORA-3-2","3.2","TLPT","اختبار الاختراق","threat-led penetration testing","اختبار الاختراق القائم على التهديدات","technical",8),
  ]}),
  bulkDomain({id:"DORA-D4",code:"4",nameEn:"ICT Third-Party Risk",nameAr:"مخاطر الأطراف الثالثة",subs:[
    bs("DORA-4-1","4.1","Third-Party Policy","سياسة الأطراف الثالثة","ICT third-party risk policy","سياسة مخاطر الأطراف الثالثة","governance",8),
    bs("DORA-4-2","4.2","Contract Requirements","متطلبات العقود","contractual arrangements","الترتيبات التعاقدية","governance",6),
    bs("DORA-4-3","4.3","Concentration Risk","مخاطر التركز","ICT concentration risk","مخاطر تركز تقنية المعلومات","governance",6),
  ]}),
  bulkDomain({id:"DORA-D5",code:"5",nameEn:"Information Sharing",nameAr:"مشاركة المعلومات",subs:[
    bs("DORA-5-1","5.1","Threat Sharing","مشاركة التهديدات","cyber threat information sharing","مشاركة معلومات التهديدات السيبرانية","governance",6),
  ]}),
];

// ═══════════════════════════════════════════════════════════════════════════
// NIS2 — EU Cybersecurity Directive (~60 controls)
// ═══════════════════════════════════════════════════════════════════════════
export const NIS2_DOMAINS: DomainDef[] = [
  bulkDomain({id:"NIS2-D1",code:"1",nameEn:"Governance & Accountability",nameAr:"الحوكمة والمساءلة",subs:[
    bs("NIS2-1-1","1.1","Management Responsibility","مسؤولية الإدارة","management body cybersecurity oversight","إشراف الإدارة على الأمن السيبراني","governance",10),
    bs("NIS2-1-2","1.2","Security Policies","السياسات الأمنية","cybersecurity policies","سياسات الأمن السيبراني","governance",8),
  ]}),
  bulkDomain({id:"NIS2-D2",code:"2",nameEn:"Risk Management Measures",nameAr:"تدابير إدارة المخاطر",subs:[
    bs("NIS2-2-1","2.1","Risk Analysis","تحليل المخاطر","risk analysis and information system security","تحليل المخاطر وأمن نظم المعلومات","governance",8),
    bs("NIS2-2-2","2.2","Supply Chain Security","أمن سلسلة التوريد","supply chain security","أمن سلسلة التوريد","governance",8),
    bs("NIS2-2-3","2.3","Network Security","أمن الشبكات","network and information system security","أمن الشبكات ونظم المعلومات","technical",10),
    bs("NIS2-2-4","2.4","Cryptography","التشفير","cryptography and encryption","التشفير","technical",6),
  ]}),
  bulkDomain({id:"NIS2-D3",code:"3",nameEn:"Incident Handling",nameAr:"معالجة الحوادث",subs:[
    bs("NIS2-3-1","3.1","Incident Response","الاستجابة للحوادث","incident handling procedures","إجراءات معالجة الحوادث","resilience",6),
    bs("NIS2-3-2","3.2","Incident Reporting","الإبلاغ عن الحوادث","significant incident reporting","الإبلاغ عن الحوادث الهامة","resilience",6),
    bs("NIS2-3-3","3.3","Business Continuity","استمرارية الأعمال","business continuity management","إدارة استمرارية الأعمال","resilience",6),
  ]}),
  bulkDomain({id:"NIS2-D4",code:"4",nameEn:"Supply Chain & Compliance",nameAr:"سلسلة التوريد والامتثال",subs:[
    bs("NIS2-4-1","4.1","Vulnerability Disclosure","الإفصاح عن الثغرات","vulnerability handling and disclosure","معالجة الثغرات والإفصاح عنها","technical",6),
    bs("NIS2-4-2","4.2","Compliance Assessment","تقييم الامتثال","cybersecurity compliance assessment","تقييم الامتثال للأمن السيبراني","governance",6),
  ]}),
];

// ═══════════════════════════════════════════════════════════════════════════
// EU AI Act (~50 controls)
// ═══════════════════════════════════════════════════════════════════════════
export const EU_AI_ACT_DOMAINS: DomainDef[] = [
  bulkDomain({id:"AIACT-D1",code:"1",nameEn:"Risk Classification",nameAr:"تصنيف المخاطر",subs:[
    bs("AIACT-1-1","1.1","AI System Classification","تصنيف أنظمة الذكاء الاصطناعي","AI system risk classification","تصنيف مخاطر أنظمة الذكاء الاصطناعي","governance",8),
    bs("AIACT-1-2","1.2","Prohibited AI Practices","الممارسات المحظورة","prohibited AI practices screening","فحص ممارسات الذكاء الاصطناعي المحظورة","governance",6),
  ]}),
  bulkDomain({id:"AIACT-D2",code:"2",nameEn:"High-Risk AI Requirements",nameAr:"متطلبات الذكاء الاصطناعي عالي المخاطر",subs:[
    bs("AIACT-2-1","2.1","Data Quality","جودة البيانات","training data quality management","إدارة جودة بيانات التدريب","data",8),
    bs("AIACT-2-2","2.2","Transparency","الشفافية","AI system transparency and explainability","شفافية وتفسيرية أنظمة الذكاء الاصطناعي","governance",8),
    bs("AIACT-2-3","2.3","Human Oversight","الإشراف البشري","human oversight measures","تدابير الإشراف البشري","governance",6),
    bs("AIACT-2-4","2.4","Accuracy & Robustness","الدقة والمتانة","accuracy robustness and cybersecurity","الدقة والمتانة والأمن السيبراني","technical",8),
  ]}),
  bulkDomain({id:"AIACT-D3",code:"3",nameEn:"Transparency Obligations",nameAr:"التزامات الشفافية",subs:[
    bs("AIACT-3-1","3.1","User Notification","إخطار المستخدم","AI interaction user notification","إخطار المستخدم بالتفاعل مع الذكاء الاصطناعي","governance",6),
    bs("AIACT-3-2","3.2","Documentation","التوثيق","technical documentation and record keeping","التوثيق الفني وحفظ السجلات","governance",6),
  ]}),
  bulkDomain({id:"AIACT-D4",code:"4",nameEn:"Governance & Compliance",nameAr:"الحوكمة والامتثال",subs:[
    bs("AIACT-4-1","4.1","Conformity Assessment","تقييم المطابقة","conformity assessment procedures","إجراءات تقييم المطابقة","governance",8),
    bs("AIACT-4-2","4.2","Post-Market Monitoring","مراقبة ما بعد السوق","post-market monitoring","مراقبة ما بعد السوق","governance",6),
  ]}),
];

// ═══════════════════════════════════════════════════════════════════════════
// GCC Frameworks — Domains for UAE, Bahrain, Kuwait, Oman, Qatar, Egypt, Turkey
// ═══════════════════════════════════════════════════════════════════════════

// UAE NESA IAS (~80 controls)
export const UAE_NESA_DOMAINS: DomainDef[] = [
  bulkDomain({id:"NESA-D1",code:"1",nameEn:"Information Security Governance",nameAr:"حوكمة أمن المعلومات",subs:[
    bs("NESA-1-1","1.1","Security Policy","السياسة الأمنية","information security policy","سياسة أمن المعلومات","governance",10),
    bs("NESA-1-2","1.2","Security Organization","التنظيم الأمني","security organization","التنظيم الأمني","governance",8),
  ]}),
  bulkDomain({id:"NESA-D2",code:"2",nameEn:"Asset Management",nameAr:"إدارة الأصول",subs:[
    bs("NESA-2-1","2.1","Asset Inventory","جرد الأصول","asset inventory management","إدارة جرد الأصول","governance",8),
    bs("NESA-2-2","2.2","Data Classification","تصنيف البيانات","information classification","تصنيف المعلومات","data",8),
  ]}),
  bulkDomain({id:"NESA-D3",code:"3",nameEn:"Access Control",nameAr:"التحكم في الوصول",subs:[
    bs("NESA-3-1","3.1","Access Management","إدارة الوصول","access management","إدارة الوصول","technical",12),
    bs("NESA-3-2","3.2","User Authentication","مصادقة المستخدم","user authentication","مصادقة المستخدم","technical",10),
  ]}),
  bulkDomain({id:"NESA-D4",code:"4",nameEn:"Operations Security",nameAr:"أمن العمليات",subs:[
    bs("NESA-4-1","4.1","Operational Procedures","الإجراءات التشغيلية","operational procedures and responsibilities","الإجراءات التشغيلية والمسؤوليات","technical",10),
    bs("NESA-4-2","4.2","Malware Protection","الحماية من البرمجيات الخبيثة","protection from malware","الحماية من البرمجيات الخبيثة","technical",8),
  ]}),
  bulkDomain({id:"NESA-D5",code:"5",nameEn:"Compliance & Audit",nameAr:"الامتثال والتدقيق",subs:[
    bs("NESA-5-1","5.1","Regulatory Compliance","الامتثال التنظيمي","regulatory compliance","الامتثال التنظيمي","governance",8),
    bs("NESA-5-2","5.2","Security Audit","التدقيق الأمني","information security audit","تدقيق أمن المعلومات","governance",6),
  ]}),
];

// UAE FPDL (~50 controls)
export const UAE_FPDL_DOMAINS: DomainDef[] = [
  bulkDomain({id:"FPDL-D1",code:"1",nameEn:"Data Collection & Processing",nameAr:"جمع ومعالجة البيانات",subs:[
    bs("FPDL-1-1","1.1","Lawful Processing","المعالجة المشروعة","lawful data processing","المعالجة المشروعة للبيانات","data",8),
    bs("FPDL-1-2","1.2","Purpose Limitation","تحديد الغرض","purpose limitation","تحديد الغرض","data",6),
  ]}),
  bulkDomain({id:"FPDL-D2",code:"2",nameEn:"Data Subject Rights",nameAr:"حقوق أصحاب البيانات",subs:[
    bs("FPDL-2-1","2.1","Access & Correction","الوصول والتصحيح","access and correction rights","حقوق الوصول والتصحيح","governance",8),
    bs("FPDL-2-2","2.2","Deletion & Portability","الحذف والنقل","deletion and data portability","الحذف ونقل البيانات","data",6),
  ]}),
  bulkDomain({id:"FPDL-D3",code:"3",nameEn:"Cross-Border Transfer",nameAr:"النقل عبر الحدود",subs:[
    bs("FPDL-3-1","3.1","Transfer Safeguards","ضمانات النقل","cross-border transfer safeguards","ضمانات النقل عبر الحدود","data",8),
  ]}),
  bulkDomain({id:"FPDL-D4",code:"4",nameEn:"Security & Breach",nameAr:"الأمن والانتهاك",subs:[
    bs("FPDL-4-1","4.1","Security Measures","التدابير الأمنية","personal data security measures","تدابير أمن البيانات الشخصية","technical",8),
    bs("FPDL-4-2","4.2","Breach Notification","إخطار الانتهاك","personal data breach notification","إخطار انتهاك البيانات الشخصية","resilience",6),
  ]}),
];

// Generic GCC framework domain generator (for Bahrain, Kuwait, Oman, Qatar, Egypt, Turkey)
function gccCyberDomains(prefix: string, namePrefix: string): DomainDef[] {
  return [
    bulkDomain({id:`${prefix}-D1`,code:"1",nameEn:`${namePrefix} Governance`,nameAr:"الحوكمة",subs:[
      bs(`${prefix}-1-1`,"1.1","Security Governance","حوكمة الأمن","cybersecurity governance","حوكمة الأمن السيبراني","governance",10),
      bs(`${prefix}-1-2`,"1.2","Risk Management","إدارة المخاطر","cybersecurity risk management","إدارة مخاطر الأمن السيبراني","governance",8),
    ]}),
    bulkDomain({id:`${prefix}-D2`,code:"2",nameEn:`${namePrefix} Protection`,nameAr:"الحماية",subs:[
      bs(`${prefix}-2-1`,"2.1","Access Control","التحكم في الوصول","access control and identity management","التحكم في الوصول وإدارة الهوية","technical",10),
      bs(`${prefix}-2-2`,"2.2","Data Security","أمن البيانات","data and information security","أمن البيانات والمعلومات","data",8),
      bs(`${prefix}-2-3`,"2.3","Network Security","أمن الشبكات","network security","أمن الشبكات","technical",8),
    ]}),
    bulkDomain({id:`${prefix}-D3`,code:"3",nameEn:`${namePrefix} Detection & Response`,nameAr:"الكشف والاستجابة",subs:[
      bs(`${prefix}-3-1`,"3.1","Monitoring","المراقبة","security monitoring and detection","المراقبة الأمنية والكشف","technical",8),
      bs(`${prefix}-3-2`,"3.2","Incident Response","الاستجابة للحوادث","incident response management","إدارة الاستجابة للحوادث","resilience",6),
    ]}),
    bulkDomain({id:`${prefix}-D4`,code:"4",nameEn:`${namePrefix} Compliance`,nameAr:"الامتثال",subs:[
      bs(`${prefix}-4-1`,"4.1","Regulatory Compliance","الامتثال التنظيمي","regulatory compliance monitoring","مراقبة الامتثال التنظيمي","governance",6),
    ]}),
  ];
}

function gccPrivacyDomains(prefix: string, namePrefix: string): DomainDef[] {
  return [
    bulkDomain({id:`${prefix}-D1`,code:"1",nameEn:`${namePrefix} Data Processing`,nameAr:"معالجة البيانات",subs:[
      bs(`${prefix}-1-1`,"1.1","Lawful Processing","المعالجة المشروعة","lawful data processing","المعالجة المشروعة للبيانات","data",8),
      bs(`${prefix}-1-2`,"1.2","Consent Management","إدارة الموافقة","consent management","إدارة الموافقة","governance",6),
    ]}),
    bulkDomain({id:`${prefix}-D2`,code:"2",nameEn:`${namePrefix} Data Subject Rights`,nameAr:"حقوق أصحاب البيانات",subs:[
      bs(`${prefix}-2-1`,"2.1","Access Rights","حقوق الوصول","data subject access rights","حقوق وصول أصحاب البيانات","governance",8),
      bs(`${prefix}-2-2`,"2.2","Erasure & Portability","الحذف والنقل","erasure and portability","الحذف والنقل","data",6),
    ]}),
    bulkDomain({id:`${prefix}-D3`,code:"3",nameEn:`${namePrefix} Security & Transfer`,nameAr:"الأمن والنقل",subs:[
      bs(`${prefix}-3-1`,"3.1","Data Security","أمن البيانات","personal data security","أمن البيانات الشخصية","technical",8),
      bs(`${prefix}-3-2`,"3.2","Cross-Border Transfer","النقل عبر الحدود","cross-border data transfer","نقل البيانات عبر الحدود","data",6),
    ]}),
  ];
}

export const BHR_NCEA_DOMAINS = gccCyberDomains("NCEA", "Bahrain NCEA");
export const BHR_CBB_DOMAINS = gccCyberDomains("CBB", "Bahrain CBB");
export const BHR_PDPL_DOMAINS = gccPrivacyDomains("BHR-PDPL", "Bahrain PDPL");
export const KWT_CBK_DOMAINS = gccCyberDomains("CBK", "Kuwait CBK");
export const KWT_CITRA_DOMAINS = gccCyberDomains("CITRA", "Kuwait CITRA");
export const KWT_DPL_DOMAINS = gccPrivacyDomains("KWT-DPL", "Kuwait DPL");
export const OMN_CBO_DOMAINS = gccCyberDomains("CBO", "Oman CBO");
export const OMN_ITA_DOMAINS = gccCyberDomains("ITA", "Oman ITA");
export const OMN_PDPL_DOMAINS = gccPrivacyDomains("OMN-PDPL", "Oman PDPL");
export const QAT_QCB_DOMAINS = gccCyberDomains("QCB", "Qatar QCB");
export const QAT_NIA_DOMAINS = gccCyberDomains("NIA", "Qatar NIA");
export const QAT_PDPL_DOMAINS = gccPrivacyDomains("QAT-PDPL", "Qatar PDPL");
export const QAT_QFCRA_DOMAINS = gccPrivacyDomains("QFCRA", "Qatar QFCRA");
export const EGY_CBE_DOMAINS = gccCyberDomains("CBE", "Egypt CBE");
export const EGY_NCCSI_DOMAINS = gccCyberDomains("NCCSI", "Egypt NCCSI");
export const EGY_PDPL_DOMAINS = gccPrivacyDomains("EGY-PDPL", "Egypt PDPL");
export const EGY_FRA_DOMAINS: DomainDef[] = [
  bulkDomain({id:"EGY-FRA-D1",code:"1",nameEn:"Board & Governance",nameAr:"مجلس الإدارة والحوكمة",subs:[
    bs("EGY-FRA-1-1","1.1","Board Composition","تكوين المجلس","board composition and independence","تكوين واستقلالية مجلس الإدارة","governance",8),
    bs("EGY-FRA-1-2","1.2","Disclosure","الإفصاح","financial disclosure and transparency","الإفصاح المالي والشفافية","governance",6),
  ]}),
];
export const TUR_KVKK_DOMAINS = gccPrivacyDomains("KVKK", "Turkey KVKK");
export const TUR_BDDK_DOMAINS = gccCyberDomains("BDDK", "Turkey BDDK");
export const TUR_BTK_DOMAINS = gccCyberDomains("BTK", "Turkey BTK");
export const TUR_SPK_DOMAINS: DomainDef[] = [
  bulkDomain({id:"SPK-D1",code:"1",nameEn:"Corporate Governance",nameAr:"الحوكمة المؤسسية",subs:[
    bs("SPK-1-1","1.1","Board Structure","هيكل المجلس","board structure and committees","هيكل مجلس الإدارة واللجان","governance",8),
    bs("SPK-1-2","1.2","Shareholder Rights","حقوق المساهمين","shareholder rights","حقوق المساهمين","governance",6),
  ]}),
];

// EU additional
export const EU_EIDAS_DOMAINS: DomainDef[] = [
  bulkDomain({id:"EIDAS-D1",code:"1",nameEn:"Electronic Identification",nameAr:"التعريف الإلكتروني",subs:[
    bs("EIDAS-1-1","1.1","eID Schemes","مخططات الهوية","electronic identification schemes","مخططات التعريف الإلكتروني","technical",8),
    bs("EIDAS-1-2","1.2","Trust Services","خدمات الثقة","trust services regulation","تنظيم خدمات الثقة","governance",6),
  ]}),
];
export const DEU_BSIG_DOMAINS = gccCyberDomains("BSIG", "German BSI");
export const GBR_UKGDPR_DOMAINS = gccPrivacyDomains("UKGDPR", "UK GDPR");
export const GBR_CE_DOMAINS: DomainDef[] = [
  bulkDomain({id:"CE-D1",code:"1",nameEn:"Cyber Essentials Controls",nameAr:"ضوابط أساسيات الأمن السيبراني",subs:[
    bs("CE-1-1","1.1","Firewalls","جدران الحماية","boundary firewalls and internet gateways","جدران الحماية وبوابات الإنترنت","technical",6),
    bs("CE-1-2","1.2","Secure Configuration","التكوين الآمن","secure configuration","التكوين الآمن","technical",6),
    bs("CE-1-3","1.3","Access Control","التحكم في الوصول","user access control","التحكم في وصول المستخدم","technical",6),
    bs("CE-1-4","1.4","Malware Protection","الحماية من البرمجيات الخبيثة","malware protection","الحماية من البرمجيات الخبيثة","technical",6),
    bs("CE-1-5","1.5","Patch Management","إدارة التصحيحات","security update management","إدارة التحديثات الأمنية","technical",6),
  ]}),
];
export const GBR_FCA_DOMAINS = gccCyberDomains("FCA", "UK FCA SYSC");

// USA additional
export const USA_CCPA_DOMAINS = gccPrivacyDomains("CCPA", "California CCPA");
export const USA_CMMC_DOMAINS = gccCyberDomains("CMMC", "US CMMC");
export const USA_FEDRAMP_DOMAINS = gccCyberDomains("FEDRAMP", "US FedRAMP");
export const USA_GLBA_DOMAINS = gccPrivacyDomains("GLBA", "US GLBA");
export const USA_FFIEC_DOMAINS = gccCyberDomains("FFIEC", "US FFIEC");
export const USA_SEC_CYBER_DOMAINS: DomainDef[] = [
  bulkDomain({id:"SEC-CY-D1",code:"1",nameEn:"Cybersecurity Disclosure",nameAr:"الإفصاح عن الأمن السيبراني",subs:[
    bs("SEC-CY-1-1","1.1","Material Incident Disclosure","الإفصاح عن الحوادث الجوهرية","material cybersecurity incident disclosure","الإفصاح عن حوادث الأمن السيبراني الجوهرية","governance",8),
    bs("SEC-CY-1-2","1.2","Risk Management Disclosure","الإفصاح عن إدارة المخاطر","cybersecurity risk management disclosure","الإفصاح عن إدارة مخاطر الأمن السيبراني","governance",6),
  ]}),
];

// Australia
export const AUS_PRIVACY_DOMAINS = gccPrivacyDomains("AUS-PRIV", "Australian Privacy");
export const AUS_ISM_DOMAINS = gccCyberDomains("ISM", "Australian ISM");
export const AUS_E8_DOMAINS: DomainDef[] = [
  bulkDomain({id:"E8-D1",code:"1",nameEn:"Essential Eight Strategies",nameAr:"استراتيجيات الأساسيات الثمانية",subs:[
    bs("E8-1-1","1.1","Application Control","التحكم في التطبيقات","application control","التحكم في التطبيقات","technical",6),
    bs("E8-1-2","1.2","Patch Applications","تصحيح التطبيقات","patch applications","تصحيح التطبيقات","technical",6),
    bs("E8-1-3","1.3","MFA","المصادقة متعددة العوامل","multi-factor authentication","المصادقة متعددة العوامل","technical",6),
    bs("E8-1-4","1.4","Restrict Admin","تقييد المسؤولين","restrict administrative privileges","تقييد صلاحيات المسؤولين","technical",6),
    bs("E8-1-5","1.5","Patch OS","تصحيح النظام","patch operating systems","تصحيح أنظمة التشغيل","technical",6),
    bs("E8-1-6","1.6","Microsoft Office Macros","وحدات ماكرو أوفيس","configure Microsoft Office macro settings","إعدادات وحدات ماكرو أوفيس","technical",4),
    bs("E8-1-7","1.7","User Application Hardening","تقوية تطبيقات المستخدم","user application hardening","تقوية تطبيقات المستخدم","technical",4),
    bs("E8-1-8","1.8","Daily Backups","النسخ الاحتياطي اليومي","regular backups","النسخ الاحتياطي المنتظم","resilience",4),
  ]}),
];
export const AUS_CPS234_DOMAINS = gccCyberDomains("CPS234", "APRA CPS 234");
export const AUS_RG271_DOMAINS: DomainDef[] = [
  bulkDomain({id:"RG271-D1",code:"1",nameEn:"Internal Dispute Resolution",nameAr:"حل النزاعات الداخلية",subs:[
    bs("RG271-1-1","1.1","IDR Requirements","متطلبات حل النزاعات","internal dispute resolution requirements","متطلبات حل النزاعات الداخلية","governance",6),
    bs("RG271-1-2","1.2","Response Timeframes","أطر زمنية","maximum IDR response timeframes","الأطر الزمنية القصوى للاستجابة","governance",4),
  ]}),
];

// ═══════════════════════════════════════════════════════════════════════════
// Master domain map — instrumentId → domains
// ═══════════════════════════════════════════════════════════════════════════

export const GLOBAL_DOMAIN_MAP: Record<string, DomainDef[]> = {
  // EU
  "INST-EU-GDPR": GDPR_DOMAINS,
  "INST-EU-NIS2": NIS2_DOMAINS,
  "INST-EU-DORA": DORA_DOMAINS,
  "INST-EU-AI-ACT": EU_AI_ACT_DOMAINS,
  "INST-EU-EIDAS": EU_EIDAS_DOMAINS,
  "INST-DEU-BSIG": DEU_BSIG_DOMAINS,
  "INST-GBR-UKGDPR": GBR_UKGDPR_DOMAINS,
  "INST-GBR-CYBERESSENTIALS": GBR_CE_DOMAINS,
  "INST-GBR-FCA-SYSC": GBR_FCA_DOMAINS,
  // USA
  "INST-USA-NIST-CSF2": NIST_CSF2_DOMAINS,
  "INST-USA-NIST-SP800-53": NIST_800_53_DOMAINS,
  "INST-USA-HIPAA": HIPAA_DOMAINS,
  "INST-USA-SOX": SOX_DOMAINS,
  "INST-USA-SEC-CYBER": USA_SEC_CYBER_DOMAINS,
  "INST-USA-CCPA": USA_CCPA_DOMAINS,
  "INST-USA-CMMC": USA_CMMC_DOMAINS,
  "INST-USA-FEDRAMP": USA_FEDRAMP_DOMAINS,
  "INST-USA-GLBA": USA_GLBA_DOMAINS,
  "INST-USA-FFIEC": USA_FFIEC_DOMAINS,
  // Australia
  "INST-AUS-PRIVACY-ACT": AUS_PRIVACY_DOMAINS,
  "INST-AUS-ISM": AUS_ISM_DOMAINS,
  "INST-AUS-ESSENTIAL8": AUS_E8_DOMAINS,
  "INST-AUS-CPS234": AUS_CPS234_DOMAINS,
  "INST-AUS-ASIC-RG271": AUS_RG271_DOMAINS,
  // UAE
  "INST-UAE-NESA-IAS": UAE_NESA_DOMAINS,
  "INST-UAE-FPDL": UAE_FPDL_DOMAINS,
  "INST-UAE-CBUAE-CIRM": gccCyberDomains("CBUAE", "UAE CBUAE"),
  "INST-UAE-ADGM-DPR": gccPrivacyDomains("ADGM", "ADGM DPR"),
  "INST-UAE-DIFC-DPL": gccPrivacyDomains("DIFC", "DIFC DPL"),
  "INST-UAE-TDRA-CSS": gccCyberDomains("TDRA", "UAE TDRA"),
  // Bahrain
  "INST-BHR-PDPL": BHR_PDPL_DOMAINS,
  "INST-BHR-CBB-CIRM": BHR_CBB_DOMAINS,
  "INST-BHR-NCEA-CSF": BHR_NCEA_DOMAINS,
  // Kuwait
  "INST-KWT-CBK-CIRM": KWT_CBK_DOMAINS,
  "INST-KWT-CITRA-CSF": KWT_CITRA_DOMAINS,
  "INST-KWT-DPL": KWT_DPL_DOMAINS,
  // Oman
  "INST-OMN-PDPL": OMN_PDPL_DOMAINS,
  "INST-OMN-CBO-CIRM": OMN_CBO_DOMAINS,
  "INST-OMN-ITA-EGOV": OMN_ITA_DOMAINS,
  // Qatar
  "INST-QAT-PDPL": QAT_PDPL_DOMAINS,
  "INST-QAT-NIA": QAT_NIA_DOMAINS,
  "INST-QAT-QCB-CIRM": QAT_QCB_DOMAINS,
  "INST-QAT-QFCRA-DP": QAT_QFCRA_DOMAINS,
  // Egypt
  "INST-EGY-PDPL": EGY_PDPL_DOMAINS,
  "INST-EGY-CBE-CIRM": EGY_CBE_DOMAINS,
  "INST-EGY-NCCSI-CSF": EGY_NCCSI_DOMAINS,
  "INST-EGY-FRA-GOV": EGY_FRA_DOMAINS,
  // Turkey
  "INST-TUR-KVKK": TUR_KVKK_DOMAINS,
  "INST-TUR-BDDK-CIRM": TUR_BDDK_DOMAINS,
  "INST-TUR-BTK-CSF": TUR_BTK_DOMAINS,
  "INST-TUR-SPK-GOV": TUR_SPK_DOMAINS,
};
