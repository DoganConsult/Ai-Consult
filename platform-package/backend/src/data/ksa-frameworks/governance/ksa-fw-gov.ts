// ============================================
// Shahin AI-KSA GRC — Government Sector Frameworks
// ADAA, Nazaha, BGA, MOF, MOMRAH, NCPD
// ============================================
import { FrameworkDef } from "./ksa-frameworks";
import { S, D, FW, controls } from "./ksa-control-builder";

export const ADAA_KPI: FrameworkDef = FW({
  id:"INST-KSA-ADAA-KPI",reg:"REG-KSA-ADAA",nEn:"Government Performance & IT Governance Standards",nAr:"معايير أداء الأجهزة الحكومية وحوكمة تقنية المعلومات",
  type:"standard",ver:"2.0",verId:"VER-KSA-ADAA-KPI-2-0",
  sectors:["SEC-KSA-GOV-MIN","SEC-KSA-GOV-AUTH"],mandatory:true,
  sumEn:"ADAA performance measurement standards including IT governance and digital transformation KPIs for government entities.",
  sumAr:"معايير أداء المركز الوطني لقياس الأداء بما في ذلك حوكمة تقنية المعلومات والتحول الرقمي.",
  tags:["government","performance","it_governance"],
  domains:[
    D("ADAA-D1","1","IT Governance","حوكمة تقنية المعلومات",[
      S("ADAA-1-1","1.1","Digital Maturity","النضج الرقمي",controls([
        ["ADAA-1.1.1","1.1.1","Digital Strategy","الاستراتيجية الرقمية","Develop digital transformation strategy aligned with Vision 2030","تطوير استراتيجية التحول الرقمي المتوافقة مع رؤية 2030","critical",false,["document"]],
        ["ADAA-1.1.2","1.1.2","IT Governance Framework","إطار حوكمة تقنية المعلومات","Establish IT governance framework per COBIT principles","إنشاء إطار حوكمة تقنية المعلومات وفقاً لمبادئ COBIT","critical",false,["document"]],
        ["ADAA-1.1.3","1.1.3","Digital KPIs","مؤشرات الأداء الرقمية","Define and track digital transformation KPIs","تحديد ومتابعة مؤشرات الأداء الرقمية","high",true,["kpi_dashboard"]],
        ["ADAA-1.1.4","1.1.4","E-Service Maturity","نضج الخدمات الإلكترونية","Achieve target e-service maturity level per ADAA","تحقيق مستوى نضج الخدمات الإلكترونية المستهدف","high",true,["maturity_report"]],
      ])),
      S("ADAA-1-2","1.2","CS Performance","أداء الأمن السيبراني",controls([
        ["ADAA-1.2.1","1.2.1","CS Maturity Score","درجة نضج الأمن السيبراني","Achieve target NCA cybersecurity maturity score","تحقيق درجة نضج الأمن السيبراني المستهدفة من الهيئة","critical",false,["maturity_report"]],
        ["ADAA-1.2.2","1.2.2","Incident Response Time","وقت الاستجابة للحوادث","Meet ADAA incident response time benchmarks","تحقيق معايير وقت الاستجابة للحوادث لأداء","high",true,["incident_metrics"]],
        ["ADAA-1.2.3","1.2.3","Vulnerability Remediation","معالجة الثغرات","Meet vulnerability remediation SLA targets","تحقيق أهداف اتفاقية مستوى خدمة معالجة الثغرات","high",true,["remediation_metrics"]],
        ["ADAA-1.2.4","1.2.4","Training Coverage","تغطية التدريب","Achieve 100% cybersecurity awareness training coverage","تحقيق تغطية 100% لتدريب التوعية بالأمن السيبراني","high",true,["training_metrics"]],
      ])),
    ]),
    D("ADAA-D2","2","Data & Innovation","البيانات والابتكار",[
      S("ADAA-2-1","2.1","Open Data","البيانات المفتوحة",controls([
        ["ADAA-2.1.1","2.1.1","Open Data Publication","نشر البيانات المفتوحة","Publish government datasets per NDMO open data policy","نشر مجموعات البيانات الحكومية وفقاً لسياسة البيانات المفتوحة","high",true,["portal_metrics"]],
        ["ADAA-2.1.2","2.1.2","Data Quality Score","درجة جودة البيانات","Meet ADAA data quality benchmarks","تحقيق معايير جودة البيانات لأداء","high",true,["quality_report"]],
        ["ADAA-2.1.3","2.1.3","API Availability","توفر واجهات البرمجة","Government API availability and performance targets","أهداف توفر وأداء واجهات البرمجة الحكومية","high",true,["api_metrics"]],
      ])),
      S("ADAA-2-2","2.2","Innovation Metrics","مقاييس الابتكار",controls([
        ["ADAA-2.2.1","2.2.1","AI Adoption","تبني الذكاء الاصطناعي","Track AI/ML adoption in government services","تتبع تبني الذكاء الاصطناعي في الخدمات الحكومية","medium",true,["adoption_report"]],
        ["ADAA-2.2.2","2.2.2","Automation Rate","معدل الأتمتة","Measure process automation percentage","قياس نسبة أتمتة العمليات","medium",true,["automation_metrics"]],
        ["ADAA-2.2.3","2.2.3","User Satisfaction","رضا المستخدمين","Digital service user satisfaction score","درجة رضا مستخدمي الخدمات الرقمية","high",true,["satisfaction_survey"]],
      ])),
    ]),
  ],
});

export const NAZAHA_AC: FrameworkDef = FW({
  id:"INST-KSA-NAZAHA-AC",reg:"REG-KSA-NAZAHA",nEn:"Anti-Corruption & Transparency Framework",nAr:"إطار مكافحة الفساد والشفافية",
  type:"framework",ver:"1.0",verId:"VER-KSA-NAZAHA-AC-1-0",
  sectors:["SEC-KSA-GOV-MIN","SEC-KSA-GOV-AUTH","SEC-KSA-GOV-MUN"],mandatory:true,
  sumEn:"Nazaha anti-corruption framework including IT controls for transparency, whistleblower protection, and audit trails.",
  sumAr:"إطار نزاهة لمكافحة الفساد بما في ذلك ضوابط تقنية المعلومات للشفافية وحماية المبلغين.",
  tags:["anti_corruption","transparency","government"],
  domains:[
    D("NAZ-D1","1","Transparency Controls","ضوابط الشفافية",[
      S("NAZ-1-1","1.1","Digital Transparency","الشفافية الرقمية",controls([
        ["NAZ-1.1.1","1.1.1","Procurement Transparency","شفافية المشتريات","Publish all government procurement on Etimad platform","نشر جميع المشتريات الحكومية على منصة اعتماد","critical",true,["system_config"]],
        ["NAZ-1.1.2","1.1.2","Financial Transparency","الشفافية المالية","Publish government financial statements","نشر البيانات المالية الحكومية","critical",false,["financial_statement"]],
        ["NAZ-1.1.3","1.1.3","Decision Audit Trail","مسار تدقيق القرارات","Complete audit trail for all government decisions","مسار تدقيق كامل لجميع القرارات الحكومية","critical",true,["audit_log"]],
        ["NAZ-1.1.4","1.1.4","Conflict of Interest","تضارب المصالح","Digital conflict of interest disclosure system","نظام رقمي للإفصاح عن تضارب المصالح","high",true,["system_config"]],
      ])),
      S("NAZ-1-2","1.2","Whistleblower Protection","حماية المبلغين",controls([
        ["NAZ-1.2.1","1.2.1","Reporting Channel","قناة الإبلاغ","Secure anonymous whistleblower reporting channel","قناة إبلاغ مجهولة آمنة للمبلغين","critical",true,["system_config"]],
        ["NAZ-1.2.2","1.2.2","Identity Protection","حماية الهوية","Protect whistleblower identity with encryption","حماية هوية المبلغ بالتشفير","critical",true,["system_config"]],
        ["NAZ-1.2.3","1.2.3","Investigation Security","أمن التحقيقات","Secure investigation data and communications","تأمين بيانات واتصالات التحقيقات","critical",true,["system_config"]],
        ["NAZ-1.2.4","1.2.4","Case Management","إدارة القضايا","Secure case management system for corruption reports","نظام إدارة قضايا آمن لتقارير الفساد","high",true,["system_config"]],
      ])),
    ]),
    D("NAZ-D2","2","Compliance & Monitoring","الامتثال والمراقبة",[
      S("NAZ-2-1","2.1","Government Audit IT","تقنية المعلومات للتدقيق الحكومي",controls([
        ["NAZ-2.1.1","2.1.1","IT Audit Capability","قدرة التدقيق التقني","Maintain IT audit capability for corruption detection","الحفاظ على قدرة التدقيق التقني لكشف الفساد","critical",false,["audit_report"]],
        ["NAZ-2.1.2","2.1.2","Data Analytics","تحليلات البيانات","Use data analytics for fraud and corruption detection","استخدام تحليلات البيانات لكشف الاحتيال والفساد","high",true,["analytics_report"]],
        ["NAZ-2.1.3","2.1.3","Continuous Monitoring","المراقبة المستمرة","Continuous monitoring of government financial transactions","المراقبة المستمرة للمعاملات المالية الحكومية","critical",true,["monitoring_report"]],
        ["NAZ-2.1.4","2.1.4","Nazaha Reporting","تقارير نزاهة","Submit annual integrity reports to Nazaha","تقديم تقارير النزاهة السنوية لنزاهة","critical",false,["annual_report"]],
      ])),
    ]),
  ],
});

export const MOF_FISCAL: FrameworkDef = FW({
  id:"INST-KSA-MOF-FISCAL",reg:"REG-KSA-MOF",nEn:"Government Financial Management & IT Standards",nAr:"معايير الإدارة المالية الحكومية وتقنية المعلومات",
  type:"standard",ver:"1.0",verId:"VER-KSA-MOF-FISCAL-1-0",
  sectors:["SEC-KSA-GOV-MIN","SEC-KSA-GOV-AUTH"],mandatory:true,
  sumEn:"Ministry of Finance standards for government financial management systems, IPSAS adoption, and IT controls.",
  sumAr:"معايير وزارة المالية لأنظمة الإدارة المالية الحكومية واعتماد معايير المحاسبة الدولية.",
  tags:["financial_management","government","ipsas"],
  domains:[
    D("MFIS-D1","1","Financial System Security","أمن الأنظمة المالية",[
      S("MFIS-1-1","1.1","Etimad Platform","منصة اعتماد",controls([
        ["MFIS-1.1.1","1.1.1","Etimad Compliance","امتثال اعتماد","Comply with Etimad procurement platform requirements","الامتثال لمتطلبات منصة اعتماد للمشتريات","critical",true,["compliance_report"]],
        ["MFIS-1.1.2","1.1.2","E-Payment Security","أمن الدفع الإلكتروني","Secure government e-payment processes","تأمين عمليات الدفع الإلكتروني الحكومية","critical",true,["system_config"]],
        ["MFIS-1.1.3","1.1.3","Budget System Security","أمن نظام الميزانية","Protect budget management systems","حماية أنظمة إدارة الميزانية","critical",true,["system_config"]],
        ["MFIS-1.1.4","1.1.4","IPSAS System Controls","ضوابط نظام IPSAS","IT controls for IPSAS-compliant financial reporting","ضوابط تقنية المعلومات للتقارير المالية المتوافقة مع IPSAS","high",true,["system_config"]],
      ])),
      S("MFIS-1-2","1.2","Financial Data Protection","حماية البيانات المالية",controls([
        ["MFIS-1.2.1","1.2.1","Financial Data Classification","تصنيف البيانات المالية","Classify government financial data per sensitivity","تصنيف البيانات المالية الحكومية حسب الحساسية","critical",false,["document"]],
        ["MFIS-1.2.2","1.2.2","Financial Data Encryption","تشفير البيانات المالية","Encrypt all government financial data","تشفير جميع البيانات المالية الحكومية","critical",true,["encryption_report"]],
        ["MFIS-1.2.3","1.2.3","Audit Trail","مسار التدقيق","Maintain immutable audit trail for financial transactions","الحفاظ على مسار تدقيق غير قابل للتغيير للمعاملات المالية","critical",true,["audit_log"]],
        ["MFIS-1.2.4","1.2.4","Segregation of Duties","فصل المهام","Enforce segregation of duties in financial systems","فرض فصل المهام في الأنظمة المالية","critical",true,["system_config"]],
      ])),
    ]),
  ],
});

export const GOV_FRAMEWORKS: FrameworkDef[] = [ADAA_KPI, NAZAHA_AC, MOF_FISCAL];
