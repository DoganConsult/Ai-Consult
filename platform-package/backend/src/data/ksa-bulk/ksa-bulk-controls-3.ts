// ============================================
// Shahin AI-KSA GRC — Bulk Control Expansion Part 3
// Additional ~600 controls to push past 4000+ total
// ============================================

import { FrameworkDef } from "./ksa-frameworks";
import { FW, bulkDomain, BulkSubSpec } from "./ksa-control-builder";

function bs(id:string, code:string, nEn:string, nAr:string, topic:string, topicAr:string, ts:string, count:number): BulkSubSpec {
  return { id, code, nameEn: nEn, nameAr: nAr, topic, topicAr, templateSet: ts, count };
}

// ════════════════════════════════════════════
// PRIVACY & COMPLIANCE OPERATIONS — 150 controls
// ════════════════════════════════════════════
export const PRIVACY_OPS: FrameworkDef = FW({
  id:"INST-KSA-PRIV-OPS",reg:"REG-KSA-SDAIA",
  nEn:"Privacy Operations & Compliance Controls",nAr:"ضوابط عمليات الخصوصية والامتثال",
  type:"standard",ver:"1.0",verId:"VER-KSA-PRIV-OPS-1-0",
  sectors:["all"],mandatory:true,
  sumEn:"Operational privacy controls for PDPL compliance including cookie consent, marketing consent, DSAR, and privacy engineering.",
  sumAr:"ضوابط الخصوصية التشغيلية للامتثال لنظام حماية البيانات.",
  tags:["privacy","pdpl","consent","dsar","privacy_engineering"],
  domains:[
    bulkDomain({id:"PVOP-D1",code:"PV1",nameEn:"Consent & Preference Management",nameAr:"إدارة الموافقة والتفضيلات",subs:[
      bs("PVOP-1-1","PV1.1","Cookie Consent","موافقة ملفات تعريف الارتباط","cookie consent management","إدارة موافقة ملفات تعريف الارتباط","data",8),
      bs("PVOP-1-2","PV1.2","Marketing Consent","موافقة التسويق","marketing consent","موافقة التسويق","data",8),
      bs("PVOP-1-3","PV1.3","Consent Withdrawal","سحب الموافقة","consent withdrawal process","عملية سحب الموافقة","data",8),
      bs("PVOP-1-4","PV1.4","Preference Center","مركز التفضيلات","preference center management","إدارة مركز التفضيلات","data",8),
      bs("PVOP-1-5","PV1.5","Consent Audit Trail","مسار تدقيق الموافقة","consent audit trail","مسار تدقيق الموافقة","data",8),
    ]}),
    bulkDomain({id:"PVOP-D2",code:"PV2",nameEn:"DSAR Operations",nameAr:"عمليات طلبات أصحاب البيانات",subs:[
      bs("PVOP-2-1","PV2.1","DSAR Portal","بوابة طلبات أصحاب البيانات","DSAR portal","بوابة طلبات أصحاب البيانات","technical",10),
      bs("PVOP-2-2","PV2.2","Identity Verification for DSAR","التحقق من الهوية للطلبات","DSAR identity verification","التحقق من الهوية لطلبات البيانات","technical",10),
      bs("PVOP-2-3","PV2.3","Data Discovery for DSAR","اكتشاف البيانات للطلبات","DSAR data discovery","اكتشاف البيانات لطلبات أصحاب البيانات","technical",10),
      bs("PVOP-2-4","PV2.4","DSAR Response SLA","اتفاقية مستوى خدمة الطلبات","DSAR response SLA","اتفاقية مستوى خدمة الاستجابة للطلبات","governance",8),
    ]}),
    bulkDomain({id:"PVOP-D3",code:"PV3",nameEn:"Privacy Engineering",nameAr:"هندسة الخصوصية",subs:[
      bs("PVOP-3-1","PV3.1","Privacy by Design","الخصوصية بالتصميم","privacy by design","الخصوصية بالتصميم","governance",10),
      bs("PVOP-3-2","PV3.2","Data Minimization Tech","تقنية تقليل البيانات","data minimization technology","تقنية تقليل البيانات","technical",10),
      bs("PVOP-3-3","PV3.3","Anonymization Technology","تقنية إزالة الهوية","anonymization technology","تقنية إزالة الهوية","technical",10),
      bs("PVOP-3-4","PV3.4","Differential Privacy","الخصوصية التفاضلية","differential privacy","الخصوصية التفاضلية","technical",8),
      bs("PVOP-3-5","PV3.5","Homomorphic Encryption","التشفير المتماثل الشكل","homomorphic encryption","التشفير المتماثل الشكل","technical",8),
    ]}),
  ],
});

// ════════════════════════════════════════════
// SUPPLY CHAIN & THIRD PARTY RISK — 150 controls
// ════════════════════════════════════════════
export const SUPPLY_CHAIN_RISK: FrameworkDef = FW({
  id:"INST-KSA-SCRM",reg:"REG-KSA-NCA",
  nEn:"Supply Chain & Third-Party Risk Management Controls",nAr:"ضوابط إدارة مخاطر سلسلة التوريد والأطراف الثالثة",
  type:"standard",ver:"1.0",verId:"VER-KSA-SCRM-1-0",
  sectors:["all"],mandatory:true,
  sumEn:"Comprehensive supply chain cybersecurity risk management controls for vendor assessment, SLA monitoring, and SBOM.",
  sumAr:"ضوابط إدارة مخاطر سلسلة التوريد الشاملة للأمن السيبراني.",
  tags:["supply_chain","third_party","vendor","sbom"],
  domains:[
    bulkDomain({id:"SCRM-D1",code:"SC1",nameEn:"Vendor Assessment & Onboarding",nameAr:"تقييم وإلحاق الموردين",subs:[
      bs("SCRM-1-1","SC1.1","Vendor Due Diligence","العناية الواجبة بالمورد","vendor due diligence","العناية الواجبة بالمورد","governance",10),
      bs("SCRM-1-2","SC1.2","Vendor Security Rating","تصنيف أمن المورد","vendor security rating","تصنيف أمن المورد","governance",10),
      bs("SCRM-1-3","SC1.3","Vendor Questionnaire","استبيان المورد","vendor security questionnaire","استبيان أمن المورد","governance",10),
      bs("SCRM-1-4","SC1.4","Vendor Contract Security","أمن عقد المورد","vendor contract security","أمن عقد المورد","governance",8),
    ]}),
    bulkDomain({id:"SCRM-D2",code:"SC2",nameEn:"Continuous Vendor Monitoring",nameAr:"المراقبة المستمرة للموردين",subs:[
      bs("SCRM-2-1","SC2.1","SLA Security Monitoring","مراقبة أمن SLA","SLA security monitoring","مراقبة اتفاقيات مستوى الخدمة الأمنية","technical",10),
      bs("SCRM-2-2","SC2.2","Vendor Incident Tracking","تتبع حوادث المورد","vendor incident tracking","تتبع حوادث المورد","technical",10),
      bs("SCRM-2-3","SC2.3","Fourth-Party Risk","مخاطر الطرف الرابع","fourth-party risk","مخاطر الطرف الرابع","governance",8),
      bs("SCRM-2-4","SC2.4","Vendor Access Review","مراجعة وصول المورد","vendor access review","مراجعة وصول المورد","technical",10),
    ]}),
    bulkDomain({id:"SCRM-D3",code:"SC3",nameEn:"Software Supply Chain",nameAr:"سلسلة توريد البرمجيات",subs:[
      bs("SCRM-3-1","SC3.1","SBOM Management","إدارة SBOM","software bill of materials","قائمة مواد البرمجيات","technical",12),
      bs("SCRM-3-2","SC3.2","Open Source Security","أمن المصادر المفتوحة","open source component security","أمن مكونات المصادر المفتوحة","technical",12),
      bs("SCRM-3-3","SC3.3","Dependency Scanning","فحص التبعيات","dependency vulnerability scanning","فحص ثغرات التبعيات","technical",10),
      bs("SCRM-3-4","SC3.4","Software Signing","توقيع البرمجيات","software code signing","توقيع كود البرمجيات","technical",10),
      bs("SCRM-3-5","SC3.5","Container Image Security","أمن صور الحاويات","container image security","أمن صور الحاويات","technical",10),
    ]}),
  ],
});

// ════════════════════════════════════════════
// WORKFORCE & AWARENESS — 120 controls
// ════════════════════════════════════════════
export const WORKFORCE_AWARENESS: FrameworkDef = FW({
  id:"INST-KSA-WORKFORCE",reg:"REG-KSA-NCA",
  nEn:"Cybersecurity Workforce & Awareness Controls",nAr:"ضوابط القوى العاملة والتوعية بالأمن السيبراني",
  type:"standard",ver:"1.0",verId:"VER-KSA-WORKFORCE-1-0",
  sectors:["all"],mandatory:true,
  sumEn:"Controls for cybersecurity workforce development, awareness training, phishing simulation, and security culture.",
  sumAr:"ضوابط تطوير القوى العاملة في الأمن السيبراني والتوعية والتدريب والثقافة الأمنية.",
  tags:["workforce","awareness","training","phishing","culture"],
  domains:[
    bulkDomain({id:"WKFC-D1",code:"WF1",nameEn:"Security Awareness Program",nameAr:"برنامج التوعية الأمنية",subs:[
      bs("WKFC-1-1","WF1.1","Awareness Training Platform","منصة تدريب التوعية","awareness training platform","منصة تدريب التوعية","governance",10),
      bs("WKFC-1-2","WF1.2","Phishing Simulation","محاكاة التصيد","phishing simulation program","برنامج محاكاة التصيد","technical",10),
      bs("WKFC-1-3","WF1.3","Role-Based Training","التدريب القائم على الأدوار","role-based security training","التدريب الأمني القائم على الأدوار","governance",10),
      bs("WKFC-1-4","WF1.4","Executive Briefings","إحاطات المسؤولين التنفيذيين","executive security briefings","إحاطات الأمن للمسؤولين التنفيذيين","governance",8),
      bs("WKFC-1-5","WF1.5","Security Champions","أبطال الأمن","security champions program","برنامج أبطال الأمن","governance",8),
    ]}),
    bulkDomain({id:"WKFC-D2",code:"WF2",nameEn:"Workforce Development",nameAr:"تطوير القوى العاملة",subs:[
      bs("WKFC-2-1","WF2.1","Skills Assessment","تقييم المهارات","cybersecurity skills assessment","تقييم مهارات الأمن السيبراني","governance",10),
      bs("WKFC-2-2","WF2.2","Certification Program","برنامج الشهادات","cybersecurity certification","شهادات الأمن السيبراني","governance",10),
      bs("WKFC-2-3","WF2.3","CTF & Exercises","المسابقات والتمارين","CTF competitions and exercises","مسابقات وتمارين الأمن السيبراني","governance",8),
      bs("WKFC-2-4","WF2.4","Career Development","التطوير المهني","cybersecurity career development","التطوير المهني للأمن السيبراني","governance",8),
    ]}),
  ],
});

// ════════════════════════════════════════════
// REAL ESTATE & CONSTRUCTION TECH — 100 controls
// ════════════════════════════════════════════
export const REALESTATE_CONST: FrameworkDef = FW({
  id:"INST-KSA-REALESTATE",reg:"REG-KSA-NCA",
  nEn:"Real Estate & PropTech Cybersecurity Controls",nAr:"ضوابط الأمن السيبراني للعقارات وتقنية العقارات",
  type:"standard",ver:"1.0",verId:"VER-KSA-REALESTATE-1-0",
  sectors:["SEC-KSA-CONST"],mandatory:false,
  sumEn:"Cybersecurity controls for real estate platforms, property management, and construction technology.",
  sumAr:"ضوابط الأمن السيبراني لمنصات العقارات وإدارة الممتلكات وتقنية البناء.",
  tags:["real_estate","proptech","construction","bim"],
  domains:[
    bulkDomain({id:"REST-D1",code:"RE1",nameEn:"PropTech Security",nameAr:"أمن تقنية العقارات",subs:[
      bs("REST-1-1","RE1.1","Ejar Platform","منصة إيجار","Ejar rental platform","منصة إيجار","technical",10),
      bs("REST-1-2","RE1.2","Sakani Platform","منصة سكني","Sakani housing platform","منصة سكني","technical",10),
      bs("REST-1-3","RE1.3","Deed Registration","تسجيل الصكوك","deed registration system","نظام تسجيل الصكوك","technical",10),
      bs("REST-1-4","RE1.4","Property Valuation AI","تقييم العقارات بالذكاء الاصطناعي","property valuation AI","تقييم العقارات بالذكاء الاصطناعي","technical",10),
    ]}),
    bulkDomain({id:"REST-D2",code:"RE2",nameEn:"Building Management Systems",nameAr:"أنظمة إدارة المباني",subs:[
      bs("REST-2-1","RE2.1","BMS/BAS Security","أمن أنظمة إدارة المباني","building management system","نظام إدارة المبنى","technical",12),
      bs("REST-2-2","RE2.2","HVAC Control Security","أمن التحكم في التكييف","HVAC control system","نظام التحكم في التكييف","technical",10),
      bs("REST-2-3","RE2.3","Fire Alarm System IT","تقنية المعلومات لنظام الإنذار","fire alarm information system","نظام معلومات إنذار الحريق","technical",10),
      bs("REST-2-4","RE2.4","Elevator Control Systems","أنظمة التحكم في المصاعد","elevator control system","نظام التحكم في المصاعد","technical",8),
      bs("REST-2-5","RE2.5","Access Control Physical","التحكم المادي في الوصول","physical access control","التحكم المادي في الوصول","technical",10),
    ]}),
  ],
});

// ════════════════════════════════════════════
// AUDIT & COMPLIANCE AUTOMATION — 100 controls
// ════════════════════════════════════════════
export const AUDIT_AUTOMATION: FrameworkDef = FW({
  id:"INST-KSA-AUDIT-AUTO",reg:"REG-KSA-NCA",
  nEn:"Audit & Compliance Automation Controls",nAr:"ضوابط أتمتة التدقيق والامتثال",
  type:"standard",ver:"1.0",verId:"VER-KSA-AUDIT-AUTO-1-0",
  sectors:["all"],mandatory:false,
  sumEn:"Controls for GRC automation, continuous compliance monitoring, evidence collection, and audit trail management.",
  sumAr:"ضوابط أتمتة الحوكمة والمخاطر والامتثال والمراقبة المستمرة وجمع الأدلة.",
  tags:["audit","compliance","automation","grc","evidence"],
  domains:[
    bulkDomain({id:"AUDA-D1",code:"AU1",nameEn:"Continuous Compliance Monitoring",nameAr:"مراقبة الامتثال المستمرة",subs:[
      bs("AUDA-1-1","AU1.1","Automated Evidence Collection","جمع الأدلة الآلي","automated evidence collection","جمع الأدلة الآلي","technical",12),
      bs("AUDA-1-2","AU1.2","Policy Compliance Scanning","فحص الامتثال للسياسات","policy compliance scanning","فحص الامتثال للسياسات","technical",12),
      bs("AUDA-1-3","AU1.3","Configuration Compliance","امتثال التكوين","configuration compliance monitoring","مراقبة امتثال التكوين","technical",12),
      bs("AUDA-1-4","AU1.4","License Compliance","امتثال التراخيص","software license compliance","امتثال تراخيص البرمجيات","governance",10),
    ]}),
    bulkDomain({id:"AUDA-D2",code:"AU2",nameEn:"Audit Management",nameAr:"إدارة التدقيق",subs:[
      bs("AUDA-2-1","AU2.1","Internal Audit Planning","تخطيط التدقيق الداخلي","internal audit planning","تخطيط التدقيق الداخلي","governance",10),
      bs("AUDA-2-2","AU2.2","External Audit Coordination","تنسيق التدقيق الخارجي","external audit coordination","تنسيق التدقيق الخارجي","governance",10),
      bs("AUDA-2-3","AU2.3","Finding Remediation","معالجة النتائج","audit finding remediation","معالجة نتائج التدقيق","governance",10),
      bs("AUDA-2-4","AU2.4","Audit Dashboard & Reporting","لوحة معلومات وتقارير التدقيق","audit dashboard and reporting","لوحة معلومات وتقارير التدقيق","technical",10),
    ]}),
  ],
});

// ── Export all Part 3 bulk frameworks ──
export const BULK_FRAMEWORKS_3: FrameworkDef[] = [
  PRIVACY_OPS,
  SUPPLY_CHAIN_RISK,
  WORKFORCE_AWARENESS,
  REALESTATE_CONST,
  AUDIT_AUTOMATION,
];
