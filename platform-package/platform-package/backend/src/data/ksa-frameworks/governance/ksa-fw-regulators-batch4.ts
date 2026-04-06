// @ts-nocheck
// ============================================
// Shahin AI-KSA GRC — Regulator Frameworks Batch 4
// Finance, Healthcare, Energy, Telecom, Commerce, Transport
// ~50 regulators with frameworks + controls
// ============================================

import { FrameworkDef } from "./ksa-frameworks";
import { FW, bulkDomain, BulkDomainSpec } from "./ksa-control-builder";

// Helper: generate a standard 3-domain framework for any regulator
function regFW(p: {
  id: string; reg: string; nEn: string; nAr: string;
  type?: string; sectors: string[]; mandatory: boolean; tags: string[];
  domains: BulkDomainSpec[];
}): FrameworkDef {
  return FW({
    id: p.id, reg: p.reg, nEn: p.nEn, nAr: p.nAr,
    type: p.type || "standard", ver: "1.0", verId: `VER-${p.id}-1-0`,
    sectors: p.sectors, mandatory: p.mandatory,
    sumEn: p.nEn, sumAr: p.nAr, tags: p.tags,
    domains: p.domains.map(d => bulkDomain(d)),
  });
}

// ═══════════════════════════════════════════
// FINANCE (missing: CCHI, TADAWUL, SMEA, GOSI, PIF, SIDF)
// ═══════════════════════════════════════════

const CCHI_FW = regFW({
  id:"INST-KSA-CCHI-HI",reg:"REG-KSA-CCHI",
  nEn:"Cooperative Health Insurance Data & Compliance Standards",nAr:"معايير بيانات والتزام التأمين الصحي التعاوني",
  sectors:["SEC-KSA-FIN-INS","SEC-KSA-HEALTH-HOSP"],mandatory:true,tags:["insurance","health","data"],
  domains:[
    {id:"CCHI-D1",code:"1",nameEn:"Insurance Data Governance",nameAr:"حوكمة بيانات التأمين",subs:[
      {id:"CCHI-1-1",code:"1.1",nameEn:"Policyholder Data Protection",nameAr:"حماية بيانات حاملي الوثائق",topic:"policyholder data",topicAr:"بيانات حاملي الوثائق",templateSet:"data",count:8},
      {id:"CCHI-1-2",code:"1.2",nameEn:"Claims Processing Security",nameAr:"أمن معالجة المطالبات",topic:"claims processing",topicAr:"معالجة المطالبات",templateSet:"technical",count:8},
      {id:"CCHI-1-3",code:"1.3",nameEn:"Insurance Compliance",nameAr:"امتثال التأمين",topic:"insurance compliance",topicAr:"امتثال التأمين",templateSet:"governance",count:8},
    ]},
    {id:"CCHI-D2",code:"2",nameEn:"Health Insurance IT Security",nameAr:"أمن تقنية المعلومات للتأمين الصحي",subs:[
      {id:"CCHI-2-1",code:"2.1",nameEn:"Platform Security",nameAr:"أمن المنصة",topic:"insurance platform",topicAr:"منصة التأمين",templateSet:"technical",count:10},
      {id:"CCHI-2-2",code:"2.2",nameEn:"Provider Network Security",nameAr:"أمن شبكة مقدمي الخدمة",topic:"provider network",topicAr:"شبكة مقدمي الخدمة",templateSet:"technical",count:8},
    ]},
  ],
});

const TADAWUL_FW = regFW({
  id:"INST-KSA-TADAWUL-MKT",reg:"REG-KSA-TADAWUL",
  nEn:"Saudi Exchange Trading & Listing Compliance Standards",nAr:"معايير امتثال التداول والإدراج في تداول السعودية",
  sectors:["SEC-KSA-FIN-CAPITAL"],mandatory:true,tags:["exchange","trading","listing"],
  domains:[
    {id:"TAD-D1",code:"1",nameEn:"Trading Systems Security",nameAr:"أمن أنظمة التداول",subs:[
      {id:"TAD-1-1",code:"1.1",nameEn:"Market Data Protection",nameAr:"حماية بيانات السوق",topic:"market data",topicAr:"بيانات السوق",templateSet:"data",count:8},
      {id:"TAD-1-2",code:"1.2",nameEn:"Trading Platform Security",nameAr:"أمن منصة التداول",topic:"trading platform",topicAr:"منصة التداول",templateSet:"technical",count:10},
    ]},
    {id:"TAD-D2",code:"2",nameEn:"Listing & Disclosure Compliance",nameAr:"امتثال الإدراج والإفصاح",subs:[
      {id:"TAD-2-1",code:"2.1",nameEn:"Disclosure Governance",nameAr:"حوكمة الإفصاح",topic:"corporate disclosure",topicAr:"الإفصاح المؤسسي",templateSet:"governance",count:10},
      {id:"TAD-2-2",code:"2.2",nameEn:"Insider Trading Prevention",nameAr:"منع التداول بالمعلومات الداخلية",topic:"insider trading prevention",topicAr:"منع التداول الداخلي",templateSet:"data",count:8},
    ]},
  ],
});

const SMEA_FW = regFW({
  id:"INST-KSA-SMEA-SME",reg:"REG-KSA-SMEA",
  nEn:"SME Digital Compliance & Cybersecurity Essentials",nAr:"أساسيات الامتثال الرقمي والأمن السيبراني للمنشآت الصغيرة والمتوسطة",
  sectors:["SEC-KSA-FIN-FINTECH","SEC-KSA-RETAIL"],mandatory:false,tags:["sme","digital","compliance"],
  domains:[
    {id:"SMEA-D1",code:"1",nameEn:"SME Cybersecurity Basics",nameAr:"أساسيات الأمن السيبراني للمنشآت",subs:[
      {id:"SMEA-1-1",code:"1.1",nameEn:"Basic Security Controls",nameAr:"ضوابط الأمان الأساسية",topic:"SME security",topicAr:"أمان المنشآت",templateSet:"technical",count:10},
      {id:"SMEA-1-2",code:"1.2",nameEn:"SME Data Protection",nameAr:"حماية بيانات المنشآت",topic:"SME data",topicAr:"بيانات المنشآت",templateSet:"data",count:8},
    ]},
    {id:"SMEA-D2",code:"2",nameEn:"SME Licensing & Compliance",nameAr:"ترخيص وامتثال المنشآت",subs:[
      {id:"SMEA-2-1",code:"2.1",nameEn:"Digital Licensing Compliance",nameAr:"امتثال الترخيص الرقمي",topic:"SME licensing",topicAr:"ترخيص المنشآت",templateSet:"governance",count:10},
    ]},
  ],
});

const GOSI_FW = regFW({
  id:"INST-KSA-GOSI-SI",reg:"REG-KSA-GOSI",
  nEn:"Social Insurance Data & IT Compliance Standards",nAr:"معايير بيانات التأمينات الاجتماعية وامتثال تقنية المعلومات",
  sectors:["all_commercial"],mandatory:true,tags:["social-insurance","pension","data"],
  domains:[
    {id:"GOSI-D1",code:"1",nameEn:"Employee Benefits Data Governance",nameAr:"حوكمة بيانات مزايا الموظفين",subs:[
      {id:"GOSI-1-1",code:"1.1",nameEn:"Pension Data Protection",nameAr:"حماية بيانات المعاشات",topic:"pension data",topicAr:"بيانات المعاشات",templateSet:"data",count:8},
      {id:"GOSI-1-2",code:"1.2",nameEn:"Contribution Tracking Security",nameAr:"أمن تتبع الاشتراكات",topic:"contribution tracking",topicAr:"تتبع الاشتراكات",templateSet:"technical",count:8},
    ]},
    {id:"GOSI-D2",code:"2",nameEn:"Social Insurance Platform Security",nameAr:"أمن منصة التأمينات الاجتماعية",subs:[
      {id:"GOSI-2-1",code:"2.1",nameEn:"Platform Governance",nameAr:"حوكمة المنصة",topic:"GOSI platform",topicAr:"منصة التأمينات",templateSet:"governance",count:10},
      {id:"GOSI-2-2",code:"2.2",nameEn:"Claims & Benefits IT",nameAr:"تقنية المطالبات والمزايا",topic:"claims & benefits",topicAr:"المطالبات والمزايا",templateSet:"technical",count:8},
    ]},
  ],
});

const PIF_FW = regFW({
  id:"INST-KSA-PIF-GOV",reg:"REG-KSA-PIF",
  nEn:"Public Investment Fund Governance & Portfolio Cybersecurity Standards",nAr:"معايير حوكمة صندوق الاستثمارات العامة والأمن السيبراني للمحفظة",
  sectors:["SEC-KSA-FIN-CAPITAL"],mandatory:false,tags:["sovereign-fund","governance","investment"],
  domains:[
    {id:"PIF-D1",code:"1",nameEn:"Investment Data Governance",nameAr:"حوكمة بيانات الاستثمار",subs:[
      {id:"PIF-1-1",code:"1.1",nameEn:"Portfolio Data Security",nameAr:"أمن بيانات المحفظة",topic:"portfolio data",topicAr:"بيانات المحفظة",templateSet:"data",count:8},
      {id:"PIF-1-2",code:"1.2",nameEn:"Investment Decision Governance",nameAr:"حوكمة قرارات الاستثمار",topic:"investment decisions",topicAr:"قرارات الاستثمار",templateSet:"governance",count:10},
    ]},
    {id:"PIF-D2",code:"2",nameEn:"Portfolio Company Oversight",nameAr:"الرقابة على شركات المحفظة",subs:[
      {id:"PIF-2-1",code:"2.1",nameEn:"Subsidiary Cyber Requirements",nameAr:"متطلبات الأمن السيبراني للشركات التابعة",topic:"subsidiary cybersecurity",topicAr:"الأمن السيبراني للشركات التابعة",templateSet:"technical",count:10},
    ]},
  ],
});

const SIDF_FW = regFW({
  id:"INST-KSA-SIDF-IND",reg:"REG-KSA-SIDF",
  nEn:"Industrial Development Fund Lending & Project Compliance",nAr:"معايير الإقراض وامتثال المشاريع لصندوق التنمية الصناعية",
  sectors:["SEC-KSA-INDUSTRY"],mandatory:false,tags:["industrial","lending","compliance"],
  domains:[
    {id:"SIDF-D1",code:"1",nameEn:"Industrial Project IT Compliance",nameAr:"امتثال تقنية المعلومات للمشاريع الصناعية",subs:[
      {id:"SIDF-1-1",code:"1.1",nameEn:"Project Data Governance",nameAr:"حوكمة بيانات المشاريع",topic:"industrial project data",topicAr:"بيانات المشاريع الصناعية",templateSet:"governance",count:10},
      {id:"SIDF-1-2",code:"1.2",nameEn:"Lending Platform Security",nameAr:"أمن منصة الإقراض",topic:"lending platform",topicAr:"منصة الإقراض",templateSet:"technical",count:8},
    ]},
  ],
});

// ═══════════════════════════════════════════
// HEALTHCARE (missing: SCFHS, NUPCO, SHCC, GAHAR, KFSHRC)
// ═══════════════════════════════════════════

const SCFHS_FW = regFW({
  id:"INST-KSA-SCFHS-HCP",reg:"REG-KSA-SCFHS",
  nEn:"Health Professional Licensing & Credentials IT Standards",nAr:"معايير تقنية المعلومات لترخيص وتصنيف المهنيين الصحيين",
  sectors:["SEC-KSA-HEALTH-HOSP"],mandatory:true,tags:["health","licensing","credentials"],
  domains:[
    {id:"SCFHS-D1",code:"1",nameEn:"Professional Registry Security",nameAr:"أمن سجل المهنيين",subs:[
      {id:"SCFHS-1-1",code:"1.1",nameEn:"Practitioner Data",nameAr:"بيانات الممارسين",topic:"practitioner registry",topicAr:"سجل الممارسين",templateSet:"data",count:8},
      {id:"SCFHS-1-2",code:"1.2",nameEn:"Credential Verification Systems",nameAr:"أنظمة التحقق من المؤهلات",topic:"credential verification",topicAr:"التحقق من المؤهلات",templateSet:"technical",count:8},
    ]},
    {id:"SCFHS-D2",code:"2",nameEn:"Continuing Education Platform",nameAr:"منصة التعليم المستمر",subs:[
      {id:"SCFHS-2-1",code:"2.1",nameEn:"CME Platform Governance",nameAr:"حوكمة منصة التعليم المستمر",topic:"CME platform",topicAr:"منصة التعليم المستمر",templateSet:"governance",count:8},
    ]},
  ],
});

const NUPCO_FW = regFW({
  id:"INST-KSA-NUPCO-SC",reg:"REG-KSA-NUPCO",
  nEn:"Healthcare Supply Chain & Procurement IT Standards",nAr:"معايير تقنية المعلومات لسلسلة التوريد والمشتريات الصحية",
  sectors:["SEC-KSA-HEALTH-PHARMA"],mandatory:true,tags:["procurement","supply-chain","pharma"],
  domains:[
    {id:"NUPCO-D1",code:"1",nameEn:"Procurement Platform Security",nameAr:"أمن منصة المشتريات",subs:[
      {id:"NUPCO-1-1",code:"1.1",nameEn:"Supply Chain Data",nameAr:"بيانات سلسلة التوريد",topic:"supply chain data",topicAr:"بيانات سلسلة التوريد",templateSet:"data",count:8},
      {id:"NUPCO-1-2",code:"1.2",nameEn:"Procurement Systems",nameAr:"أنظمة المشتريات",topic:"procurement systems",topicAr:"أنظمة المشتريات",templateSet:"technical",count:10},
    ]},
    {id:"NUPCO-D2",code:"2",nameEn:"Pharmaceutical Tracking",nameAr:"تتبع المستحضرات الصيدلانية",subs:[
      {id:"NUPCO-2-1",code:"2.1",nameEn:"Drug Tracking Governance",nameAr:"حوكمة تتبع الأدوية",topic:"pharmaceutical tracking",topicAr:"تتبع المستحضرات الصيدلانية",templateSet:"governance",count:8},
    ]},
  ],
});

const SHCC_FW = regFW({
  id:"INST-KSA-SHCC-HEALTH",reg:"REG-KSA-SHCC",
  nEn:"National Health Data Exchange & Coordination Standards",nAr:"معايير تبادل البيانات الصحية والتنسيق الوطني",
  sectors:["SEC-KSA-HEALTH-HOSP","SEC-KSA-HEALTH-PHARMA"],mandatory:true,tags:["health","data-exchange","interoperability"],
  domains:[
    {id:"SHCC-D1",code:"1",nameEn:"Health Data Interoperability",nameAr:"تكامل البيانات الصحية",subs:[
      {id:"SHCC-1-1",code:"1.1",nameEn:"Health Information Exchange",nameAr:"تبادل المعلومات الصحية",topic:"health information exchange",topicAr:"تبادل المعلومات الصحية",templateSet:"data",count:8},
      {id:"SHCC-1-2",code:"1.2",nameEn:"National Health Registry",nameAr:"السجل الصحي الوطني",topic:"national health registry",topicAr:"السجل الصحي الوطني",templateSet:"technical",count:8},
    ]},
    {id:"SHCC-D2",code:"2",nameEn:"Health Policy Data Governance",nameAr:"حوكمة بيانات السياسات الصحية",subs:[
      {id:"SHCC-2-1",code:"2.1",nameEn:"Health KPI Compliance",nameAr:"امتثال مؤشرات الأداء الصحية",topic:"health KPI systems",topicAr:"أنظمة مؤشرات الأداء الصحية",templateSet:"governance",count:10},
    ]},
  ],
});

const GAHAR_FW = regFW({
  id:"INST-KSA-GAHAR-QA",reg:"REG-KSA-GAHAR",
  nEn:"Healthcare Facility Regulation & Quality IT Standards",nAr:"معايير تقنية المعلومات لتنظيم وجودة المنشآت الصحية",
  sectors:["SEC-KSA-HEALTH-HOSP"],mandatory:true,tags:["healthcare","quality","licensing"],
  domains:[
    {id:"GAHAR-D1",code:"1",nameEn:"Facility Licensing IT",nameAr:"تقنية المعلومات لترخيص المنشآت",subs:[
      {id:"GAHAR-1-1",code:"1.1",nameEn:"Licensing Data Systems",nameAr:"أنظمة بيانات الترخيص",topic:"facility licensing",topicAr:"ترخيص المنشآت",templateSet:"data",count:8},
      {id:"GAHAR-1-2",code:"1.2",nameEn:"Quality Inspection Systems",nameAr:"أنظمة التفتيش والجودة",topic:"quality inspection",topicAr:"التفتيش والجودة",templateSet:"technical",count:10},
    ]},
    {id:"GAHAR-D2",code:"2",nameEn:"Patient Safety IT",nameAr:"تقنية سلامة المرضى",subs:[
      {id:"GAHAR-2-1",code:"2.1",nameEn:"Safety Reporting Governance",nameAr:"حوكمة تقارير السلامة",topic:"patient safety reporting",topicAr:"تقارير سلامة المرضى",templateSet:"governance",count:8},
    ]},
  ],
});

const KFSHRC_FW = regFW({
  id:"INST-KSA-KFSHRC-RES",reg:"REG-KSA-KFSHRC",
  nEn:"Clinical Research Ethics & Biomedical Data Standards",nAr:"معايير أخلاقيات البحث السريري والبيانات الطبية الحيوية",
  sectors:["SEC-KSA-HEALTH-HOSP"],mandatory:false,tags:["research","biomedical","ethics"],
  domains:[
    {id:"KFSH-D1",code:"1",nameEn:"Research Data Governance",nameAr:"حوكمة بيانات البحث",subs:[
      {id:"KFSH-1-1",code:"1.1",nameEn:"Clinical Trial Data",nameAr:"بيانات التجارب السريرية",topic:"clinical trial data",topicAr:"بيانات التجارب السريرية",templateSet:"data",count:8},
      {id:"KFSH-1-2",code:"1.2",nameEn:"Research Ethics IT",nameAr:"تقنية أخلاقيات البحث",topic:"research ethics",topicAr:"أخلاقيات البحث",templateSet:"governance",count:8},
    ]},
  ],
});

// ═══════════════════════════════════════════
// ENERGY (missing: WERA, KACARE, MEIM, SEC, SWCC, MARAFIQ, NWRC)
// ═══════════════════════════════════════════

const WERA_FW = regFW({
  id:"INST-KSA-WERA-WATER",reg:"REG-KSA-WERA",
  nEn:"Water Services Regulation & SCADA Security Standards",nAr:"معايير تنظيم خدمات المياه وأمن أنظمة التحكم",
  sectors:["SEC-KSA-ENERGY-WATER"],mandatory:true,tags:["water","scada","ot"],
  domains:[
    {id:"WERA-D1",code:"1",nameEn:"Water Utility OT Security",nameAr:"أمن التقنيات التشغيلية لخدمات المياه",subs:[
      {id:"WERA-1-1",code:"1.1",nameEn:"SCADA System Protection",nameAr:"حماية أنظمة التحكم الإشرافي",topic:"water SCADA",topicAr:"أنظمة التحكم في المياه",templateSet:"technical",count:10},
      {id:"WERA-1-2",code:"1.2",nameEn:"Water Quality Monitoring IT",nameAr:"تقنية مراقبة جودة المياه",topic:"water quality monitoring",topicAr:"مراقبة جودة المياه",templateSet:"technical",count:8},
    ]},
    {id:"WERA-D2",code:"2",nameEn:"Customer Data & Billing",nameAr:"بيانات العملاء والفوترة",subs:[
      {id:"WERA-2-1",code:"2.1",nameEn:"Consumer Data Protection",nameAr:"حماية بيانات المستهلكين",topic:"water consumer data",topicAr:"بيانات مستهلكي المياه",templateSet:"data",count:8},
    ]},
  ],
});

const KACARE_FW = regFW({
  id:"INST-KSA-KACARE-NUKE",reg:"REG-KSA-KACARE",
  nEn:"Nuclear & Renewable Energy Cybersecurity Standards",nAr:"معايير الأمن السيبراني للطاقة النووية والمتجددة",
  sectors:["SEC-KSA-ENERGY-RENEW","SEC-KSA-NUCLEAR"],mandatory:true,tags:["nuclear","renewable","energy","ot"],
  domains:[
    {id:"KAC-D1",code:"1",nameEn:"Nuclear Facility Cybersecurity",nameAr:"الأمن السيبراني للمنشآت النووية",subs:[
      {id:"KAC-1-1",code:"1.1",nameEn:"Nuclear ICS Protection",nameAr:"حماية أنظمة التحكم النووية",topic:"nuclear ICS",topicAr:"أنظمة التحكم النووية",templateSet:"technical",count:10},
      {id:"KAC-1-2",code:"1.2",nameEn:"Nuclear Data Classification",nameAr:"تصنيف البيانات النووية",topic:"nuclear data",topicAr:"البيانات النووية",templateSet:"data",count:8},
    ]},
    {id:"KAC-D2",code:"2",nameEn:"Renewable Energy Grid Security",nameAr:"أمن شبكة الطاقة المتجددة",subs:[
      {id:"KAC-2-1",code:"2.1",nameEn:"Solar & Wind Farm OT",nameAr:"التقنيات التشغيلية لمحطات الطاقة الشمسية والرياح",topic:"renewable energy OT",topicAr:"التقنيات التشغيلية للطاقة المتجددة",templateSet:"technical",count:10},
      {id:"KAC-2-2",code:"2.2",nameEn:"Energy Governance",nameAr:"حوكمة الطاقة",topic:"energy governance",topicAr:"حوكمة الطاقة",templateSet:"governance",count:8},
    ]},
  ],
});

const MEIM_FW = regFW({
  id:"INST-KSA-MEIM-ENERGY",reg:"REG-KSA-MEIM",
  nEn:"Energy Sector Policy & OT Compliance Standards",nAr:"معايير سياسات قطاع الطاقة وامتثال التقنيات التشغيلية",
  sectors:["SEC-KSA-ENERGY-OG","SEC-KSA-ENERGY-ELEC","SEC-KSA-MINING"],mandatory:true,tags:["energy","oil-gas","mining"],
  domains:[
    {id:"MEIM-D1",code:"1",nameEn:"Oil & Gas OT Security",nameAr:"أمن التقنيات التشغيلية للنفط والغاز",subs:[
      {id:"MEIM-1-1",code:"1.1",nameEn:"Upstream Systems Security",nameAr:"أمن أنظمة الاستكشاف والإنتاج",topic:"upstream OT systems",topicAr:"أنظمة الاستكشاف والإنتاج",templateSet:"technical",count:10},
      {id:"MEIM-1-2",code:"1.2",nameEn:"Pipeline SCADA Security",nameAr:"أمن أنظمة التحكم في خطوط الأنابيب",topic:"pipeline SCADA",topicAr:"أنظمة التحكم في خطوط الأنابيب",templateSet:"technical",count:8},
    ]},
    {id:"MEIM-D2",code:"2",nameEn:"Mining & Mineral IT Compliance",nameAr:"امتثال تقنية المعلومات للتعدين والمعادن",subs:[
      {id:"MEIM-2-1",code:"2.1",nameEn:"Mining Data Governance",nameAr:"حوكمة بيانات التعدين",topic:"mining data",topicAr:"بيانات التعدين",templateSet:"data",count:8},
      {id:"MEIM-2-2",code:"2.2",nameEn:"Energy Policy Compliance",nameAr:"امتثال سياسات الطاقة",topic:"energy policy",topicAr:"سياسات الطاقة",templateSet:"governance",count:10},
    ]},
  ],
});

const SEC_ELEC_FW = regFW({
  id:"INST-KSA-SEC-GRID",reg:"REG-KSA-SEC",
  nEn:"Electricity Distribution Grid Cybersecurity Standards",nAr:"معايير الأمن السيبراني لشبكة توزيع الكهرباء",
  sectors:["SEC-KSA-ENERGY-ELEC"],mandatory:true,tags:["electricity","grid","scada"],
  domains:[
    {id:"SEC-D1",code:"1",nameEn:"Grid OT/SCADA Security",nameAr:"أمن التقنيات التشغيلية لشبكة الكهرباء",subs:[
      {id:"SEC-1-1",code:"1.1",nameEn:"Distribution SCADA",nameAr:"أنظمة التحكم في التوزيع",topic:"distribution SCADA",topicAr:"أنظمة التحكم في التوزيع",templateSet:"technical",count:10},
      {id:"SEC-1-2",code:"1.2",nameEn:"Smart Meter Security",nameAr:"أمن العدادات الذكية",topic:"smart meter",topicAr:"العدادات الذكية",templateSet:"technical",count:8},
    ]},
    {id:"SEC-D2",code:"2",nameEn:"Consumer Data & Billing",nameAr:"بيانات المستهلكين والفوترة",subs:[
      {id:"SEC-2-1",code:"2.1",nameEn:"Consumer Data Governance",nameAr:"حوكمة بيانات المستهلكين",topic:"electricity consumer data",topicAr:"بيانات مستهلكي الكهرباء",templateSet:"data",count:8},
    ]},
  ],
});

const SWCC_FW = regFW({
  id:"INST-KSA-SWCC-DESAL",reg:"REG-KSA-SWCC",
  nEn:"Desalination Plant OT & Cybersecurity Standards",nAr:"معايير التقنيات التشغيلية والأمن السيبراني لمحطات التحلية",
  sectors:["SEC-KSA-ENERGY-WATER"],mandatory:true,tags:["desalination","ot","scada"],
  domains:[
    {id:"SWCC-D1",code:"1",nameEn:"Desalination OT Security",nameAr:"أمن التقنيات التشغيلية للتحلية",subs:[
      {id:"SWCC-1-1",code:"1.1",nameEn:"Plant ICS Protection",nameAr:"حماية أنظمة التحكم في المحطة",topic:"desalination ICS",topicAr:"أنظمة التحكم في التحلية",templateSet:"technical",count:10},
      {id:"SWCC-1-2",code:"1.2",nameEn:"Water Treatment Monitoring",nameAr:"مراقبة معالجة المياه",topic:"water treatment monitoring",topicAr:"مراقبة معالجة المياه",templateSet:"technical",count:8},
    ]},
    {id:"SWCC-D2",code:"2",nameEn:"Operational Governance",nameAr:"الحوكمة التشغيلية",subs:[
      {id:"SWCC-2-1",code:"2.1",nameEn:"Operations Compliance",nameAr:"الامتثال التشغيلي",topic:"desalination operations",topicAr:"عمليات التحلية",templateSet:"governance",count:8},
    ]},
  ],
});

const MARAFIQ_FW = regFW({
  id:"INST-KSA-MARAFIQ-UTL",reg:"REG-KSA-MARAFIQ",
  nEn:"Industrial Utility Services OT Compliance Standards",nAr:"معايير امتثال التقنيات التشغيلية لخدمات المرافق الصناعية",
  sectors:["SEC-KSA-ENERGY-ELEC","SEC-KSA-ENERGY-WATER"],mandatory:true,tags:["utility","ot","industrial"],
  domains:[
    {id:"MRF-D1",code:"1",nameEn:"Utility OT Security",nameAr:"أمن التقنيات التشغيلية للمرافق",subs:[
      {id:"MRF-1-1",code:"1.1",nameEn:"Industrial Utility Systems",nameAr:"أنظمة المرافق الصناعية",topic:"industrial utility OT",topicAr:"التقنيات التشغيلية للمرافق الصناعية",templateSet:"technical",count:10},
      {id:"MRF-1-2",code:"1.2",nameEn:"Utility Data Governance",nameAr:"حوكمة بيانات المرافق",topic:"utility data",topicAr:"بيانات المرافق",templateSet:"governance",count:8},
    ]},
  ],
});

const NWRC_FW = regFW({
  id:"INST-KSA-NWRC-WATER",reg:"REG-KSA-NWRC",
  nEn:"National Water Quality & Distribution IT Standards",nAr:"معايير تقنية المعلومات لجودة وتوزيع المياه الوطنية",
  sectors:["SEC-KSA-ENERGY-WATER"],mandatory:true,tags:["water","quality","distribution"],
  domains:[
    {id:"NWRC-D1",code:"1",nameEn:"Water Distribution IT",nameAr:"تقنية المعلومات لتوزيع المياه",subs:[
      {id:"NWRC-1-1",code:"1.1",nameEn:"Water Network Monitoring",nameAr:"مراقبة شبكة المياه",topic:"water network monitoring",topicAr:"مراقبة شبكة المياه",templateSet:"technical",count:10},
      {id:"NWRC-1-2",code:"1.2",nameEn:"Water Quality Data",nameAr:"بيانات جودة المياه",topic:"water quality data",topicAr:"بيانات جودة المياه",templateSet:"data",count:8},
    ]},
  ],
});

// ═══════════════════════════════════════════
// TELECOM (missing: SSC, YESSER, CITC, IOT)
// ═══════════════════════════════════════════

const SSC_FW = regFW({
  id:"INST-KSA-SSC-SPACE",reg:"REG-KSA-SSC",
  nEn:"Space Technology & Satellite Communications Security Standards",nAr:"معايير أمن تكنولوجيا الفضاء والاتصالات الفضائية",
  sectors:["SEC-KSA-TEL-ICT","SEC-KSA-SPACE"],mandatory:true,tags:["space","satellite","communications"],
  domains:[
    {id:"SSC-D1",code:"1",nameEn:"Satellite Systems Security",nameAr:"أمن الأنظمة الفضائية",subs:[
      {id:"SSC-1-1",code:"1.1",nameEn:"Ground Station Security",nameAr:"أمن المحطات الأرضية",topic:"ground station",topicAr:"المحطات الأرضية",templateSet:"technical",count:10},
      {id:"SSC-1-2",code:"1.2",nameEn:"Space Data Governance",nameAr:"حوكمة البيانات الفضائية",topic:"space data",topicAr:"البيانات الفضائية",templateSet:"data",count:8},
    ]},
    {id:"SSC-D2",code:"2",nameEn:"Space Policy Compliance",nameAr:"امتثال السياسات الفضائية",subs:[
      {id:"SSC-2-1",code:"2.1",nameEn:"Space Program Governance",nameAr:"حوكمة البرنامج الفضائي",topic:"space program",topicAr:"البرنامج الفضائي",templateSet:"governance",count:8},
    ]},
  ],
});

const YESSER_FW = regFW({
  id:"INST-KSA-YESSER-EGOV",reg:"REG-KSA-YESSER",
  nEn:"E-Government Interoperability & Integration Standards",nAr:"معايير التشغيل البيني والتكامل للحكومة الإلكترونية",
  sectors:["SEC-KSA-GOV-MIN","SEC-KSA-GOV-AUTH"],mandatory:true,tags:["e-government","interoperability","integration"],
  domains:[
    {id:"YES-D1",code:"1",nameEn:"Government Integration Security",nameAr:"أمن التكامل الحكومي",subs:[
      {id:"YES-1-1",code:"1.1",nameEn:"API & Service Bus Security",nameAr:"أمن واجهات البرمجة وناقل الخدمات",topic:"government API",topicAr:"واجهات البرمجة الحكومية",templateSet:"technical",count:10},
      {id:"YES-1-2",code:"1.2",nameEn:"Inter-Agency Data Exchange",nameAr:"تبادل البيانات بين الجهات",topic:"inter-agency data",topicAr:"البيانات بين الجهات",templateSet:"data",count:8},
    ]},
    {id:"YES-D2",code:"2",nameEn:"E-Service Standards",nameAr:"معايير الخدمات الإلكترونية",subs:[
      {id:"YES-2-1",code:"2.1",nameEn:"Digital Service Governance",nameAr:"حوكمة الخدمات الرقمية",topic:"e-government service",topicAr:"الخدمات الحكومية الرقمية",templateSet:"governance",count:10},
    ]},
  ],
});

const CITC_FW = regFW({
  id:"INST-KSA-CITC-CLOUD",reg:"REG-KSA-CITC",
  nEn:"Cloud Service Provider Licensing & Data Localization Standards",nAr:"معايير ترخيص مقدمي الخدمات السحابية وتوطين البيانات",
  sectors:["SEC-KSA-TEL-ICT"],mandatory:true,tags:["cloud","licensing","data-localization"],
  domains:[
    {id:"CITC-D1",code:"1",nameEn:"Cloud Provider Compliance",nameAr:"امتثال مقدمي الخدمات السحابية",subs:[
      {id:"CITC-1-1",code:"1.1",nameEn:"CSP Licensing Controls",nameAr:"ضوابط ترخيص مقدمي الخدمات السحابية",topic:"cloud provider licensing",topicAr:"ترخيص مقدمي الخدمات السحابية",templateSet:"governance",count:10},
      {id:"CITC-1-2",code:"1.2",nameEn:"Data Residency Controls",nameAr:"ضوابط موقع البيانات",topic:"data residency",topicAr:"موقع البيانات",templateSet:"data",count:8},
    ]},
    {id:"CITC-D2",code:"2",nameEn:"Cloud Security Standards",nameAr:"معايير أمن الحوسبة السحابية",subs:[
      {id:"CITC-2-1",code:"2.1",nameEn:"Cloud Infrastructure Security",nameAr:"أمن البنية التحتية السحابية",topic:"cloud infrastructure",topicAr:"البنية التحتية السحابية",templateSet:"technical",count:10},
    ]},
  ],
});

const IOT_FW = regFW({
  id:"INST-KSA-IOT-DEVICE",reg:"REG-KSA-IOT",
  nEn:"IoT Device Certification & Security Standards",nAr:"معايير اعتماد وأمن أجهزة إنترنت الأشياء",
  sectors:["SEC-KSA-TEL-ICT"],mandatory:false,tags:["iot","device","certification"],
  domains:[
    {id:"IOT-D1",code:"1",nameEn:"IoT Device Security",nameAr:"أمن أجهزة إنترنت الأشياء",subs:[
      {id:"IOT-1-1",code:"1.1",nameEn:"Device Certification",nameAr:"اعتماد الأجهزة",topic:"IoT device",topicAr:"أجهزة إنترنت الأشياء",templateSet:"technical",count:10},
      {id:"IOT-1-2",code:"1.2",nameEn:"IoT Data Privacy",nameAr:"خصوصية بيانات إنترنت الأشياء",topic:"IoT data",topicAr:"بيانات إنترنت الأشياء",templateSet:"data",count:8},
    ]},
    {id:"IOT-D2",code:"2",nameEn:"IoT Governance",nameAr:"حوكمة إنترنت الأشياء",subs:[
      {id:"IOT-2-1",code:"2.1",nameEn:"IoT Policy & Standards",nameAr:"سياسات ومعايير إنترنت الأشياء",topic:"IoT governance",topicAr:"حوكمة إنترنت الأشياء",templateSet:"governance",count:8},
    ]},
  ],
});

// ═══════════════════════════════════════════
// COMMERCE (missing: MISA, SAIP, GAC, SABER, ECOM)
// ═══════════════════════════════════════════

const MISA_FW = regFW({
  id:"INST-KSA-MISA-INVEST",reg:"REG-KSA-MISA",
  nEn:"Foreign Investment Licensing & Compliance IT Standards",nAr:"معايير تقنية المعلومات لترخيص وامتثال الاستثمار الأجنبي",
  sectors:["all_commercial"],mandatory:true,tags:["investment","licensing","foreign"],
  domains:[
    {id:"MISA-D1",code:"1",nameEn:"Investment Data Governance",nameAr:"حوكمة بيانات الاستثمار",subs:[
      {id:"MISA-1-1",code:"1.1",nameEn:"Investor Data Protection",nameAr:"حماية بيانات المستثمرين",topic:"investor data",topicAr:"بيانات المستثمرين",templateSet:"data",count:8},
      {id:"MISA-1-2",code:"1.2",nameEn:"Investment Licensing IT",nameAr:"تقنية ترخيص الاستثمار",topic:"investment licensing",topicAr:"ترخيص الاستثمار",templateSet:"governance",count:10},
    ]},
  ],
});

const SAIP_FW = regFW({
  id:"INST-KSA-SAIP-IP",reg:"REG-KSA-SAIP",
  nEn:"Intellectual Property Protection & Digital Rights Standards",nAr:"معايير حماية الملكية الفكرية والحقوق الرقمية",
  sectors:["all_commercial"],mandatory:true,tags:["ip","patents","copyright"],
  domains:[
    {id:"SAIP-D1",code:"1",nameEn:"IP Data Governance",nameAr:"حوكمة بيانات الملكية الفكرية",subs:[
      {id:"SAIP-1-1",code:"1.1",nameEn:"Patent & Trademark Data",nameAr:"بيانات البراءات والعلامات التجارية",topic:"IP registry data",topicAr:"بيانات سجل الملكية الفكرية",templateSet:"data",count:8},
      {id:"SAIP-1-2",code:"1.2",nameEn:"IP Platform Security",nameAr:"أمن منصة الملكية الفكرية",topic:"IP platform",topicAr:"منصة الملكية الفكرية",templateSet:"technical",count:8},
    ]},
    {id:"SAIP-D2",code:"2",nameEn:"Digital Rights Management",nameAr:"إدارة الحقوق الرقمية",subs:[
      {id:"SAIP-2-1",code:"2.1",nameEn:"DRM Governance",nameAr:"حوكمة إدارة الحقوق الرقمية",topic:"digital rights",topicAr:"الحقوق الرقمية",templateSet:"governance",count:8},
    ]},
  ],
});

const GAC_FW = regFW({
  id:"INST-KSA-GAC-COMP",reg:"REG-KSA-GAC",
  nEn:"Fair Competition & Anti-Monopoly Compliance Standards",nAr:"معايير امتثال المنافسة العادلة ومكافحة الاحتكار",
  sectors:["all_commercial"],mandatory:true,tags:["competition","anti-monopoly","compliance"],
  domains:[
    {id:"GAC-D1",code:"1",nameEn:"Competition Data & Analysis",nameAr:"بيانات وتحليل المنافسة",subs:[
      {id:"GAC-1-1",code:"1.1",nameEn:"Market Data Governance",nameAr:"حوكمة بيانات السوق",topic:"market competition data",topicAr:"بيانات المنافسة السوقية",templateSet:"data",count:8},
      {id:"GAC-1-2",code:"1.2",nameEn:"Merger Review Systems",nameAr:"أنظمة مراجعة الاندماج",topic:"merger review",topicAr:"مراجعة الاندماج",templateSet:"governance",count:8},
    ]},
  ],
});

const SABER_FW = regFW({
  id:"INST-KSA-SABER-CONF",reg:"REG-KSA-SABER",
  nEn:"Product Conformity & Quality Certificate IT Standards",nAr:"معايير تقنية المعلومات لمطابقة المنتجات وشهادات الجودة",
  sectors:["SEC-KSA-RETAIL","SEC-KSA-INDUSTRY"],mandatory:true,tags:["conformity","quality","certification"],
  domains:[
    {id:"SAB-D1",code:"1",nameEn:"Conformity Systems Security",nameAr:"أمن أنظمة المطابقة",subs:[
      {id:"SAB-1-1",code:"1.1",nameEn:"Certificate Platform",nameAr:"منصة الشهادات",topic:"conformity certificate platform",topicAr:"منصة شهادات المطابقة",templateSet:"technical",count:10},
      {id:"SAB-1-2",code:"1.2",nameEn:"Product Testing Data",nameAr:"بيانات اختبار المنتجات",topic:"product testing data",topicAr:"بيانات اختبار المنتجات",templateSet:"data",count:8},
    ]},
  ],
});

const ECOM_FW = regFW({
  id:"INST-KSA-ECOM-DIGITAL",reg:"REG-KSA-ECOM",
  nEn:"E-Commerce Regulation & Consumer Rights IT Standards",nAr:"معايير تقنية المعلومات لتنظيم التجارة الإلكترونية وحقوق المستهلك",
  sectors:["SEC-KSA-RETAIL","SEC-KSA-FIN-FINTECH"],mandatory:true,tags:["e-commerce","consumer","digital"],
  domains:[
    {id:"ECOM-D1",code:"1",nameEn:"E-Commerce Platform Security",nameAr:"أمن منصات التجارة الإلكترونية",subs:[
      {id:"ECOM-1-1",code:"1.1",nameEn:"Marketplace Security",nameAr:"أمن السوق الإلكتروني",topic:"e-commerce marketplace",topicAr:"السوق الإلكتروني",templateSet:"technical",count:10},
      {id:"ECOM-1-2",code:"1.2",nameEn:"Consumer Data Protection",nameAr:"حماية بيانات المستهلكين",topic:"consumer data",topicAr:"بيانات المستهلكين",templateSet:"data",count:8},
    ]},
    {id:"ECOM-D2",code:"2",nameEn:"Digital Commerce Governance",nameAr:"حوكمة التجارة الرقمية",subs:[
      {id:"ECOM-2-1",code:"2.1",nameEn:"E-Commerce Compliance",nameAr:"امتثال التجارة الإلكترونية",topic:"e-commerce compliance",topicAr:"امتثال التجارة الإلكترونية",templateSet:"governance",count:10},
    ]},
  ],
});

// ═══════════════════════════════════════════
// TRANSPORT (missing: SAR, MOTL, SAPTCO, RDA, DRONES)
// ═══════════════════════════════════════════

const SAR_FW = regFW({
  id:"INST-KSA-SAR-RAIL",reg:"REG-KSA-SAR",
  nEn:"Railway OT/ICS & Signaling Cybersecurity Standards",nAr:"معايير الأمن السيبراني للتقنيات التشغيلية وأنظمة الإشارات في السكك الحديدية",
  sectors:["SEC-KSA-TRANS-RAIL"],mandatory:true,tags:["railway","ot","signaling"],
  domains:[
    {id:"SAR-D1",code:"1",nameEn:"Railway OT Security",nameAr:"أمن التقنيات التشغيلية للسكك الحديدية",subs:[
      {id:"SAR-1-1",code:"1.1",nameEn:"Signaling Systems Security",nameAr:"أمن أنظمة الإشارات",topic:"railway signaling",topicAr:"أنظمة إشارات السكك الحديدية",templateSet:"technical",count:10},
      {id:"SAR-1-2",code:"1.2",nameEn:"Train Control Systems",nameAr:"أنظمة التحكم في القطارات",topic:"train control systems",topicAr:"أنظمة التحكم في القطارات",templateSet:"technical",count:8},
    ]},
    {id:"SAR-D2",code:"2",nameEn:"Passenger Data & Operations",nameAr:"بيانات الركاب والعمليات",subs:[
      {id:"SAR-2-1",code:"2.1",nameEn:"Passenger Data Governance",nameAr:"حوكمة بيانات الركاب",topic:"railway passenger data",topicAr:"بيانات ركاب السكك الحديدية",templateSet:"data",count:8},
    ]},
  ],
});

const MOTL_FW = regFW({
  id:"INST-KSA-MOTL-TRANS",reg:"REG-KSA-MOTL",
  nEn:"National Transport & Logistics IT Security Standards",nAr:"معايير أمن تقنية المعلومات الوطنية للنقل والخدمات اللوجستية",
  sectors:["SEC-KSA-TRANS-AVIA","SEC-KSA-TRANS-MARI","SEC-KSA-TRANS-RAIL","SEC-KSA-TRANS-LOG"],mandatory:true,tags:["transport","logistics","national"],
  domains:[
    {id:"MOTL-D1",code:"1",nameEn:"Transport IT Infrastructure",nameAr:"البنية التحتية لتقنية المعلومات في النقل",subs:[
      {id:"MOTL-1-1",code:"1.1",nameEn:"Logistics Platform Security",nameAr:"أمن منصة الخدمات اللوجستية",topic:"logistics platform",topicAr:"منصة الخدمات اللوجستية",templateSet:"technical",count:10},
      {id:"MOTL-1-2",code:"1.2",nameEn:"Fleet Management IT",nameAr:"تقنية إدارة الأسطول",topic:"fleet management",topicAr:"إدارة الأسطول",templateSet:"technical",count:8},
    ]},
    {id:"MOTL-D2",code:"2",nameEn:"Transport Data Governance",nameAr:"حوكمة بيانات النقل",subs:[
      {id:"MOTL-2-1",code:"2.1",nameEn:"National Transport Data",nameAr:"البيانات الوطنية للنقل",topic:"transport data governance",topicAr:"حوكمة بيانات النقل",templateSet:"governance",count:10},
    ]},
  ],
});

const SAPTCO_FW = regFW({
  id:"INST-KSA-SAPTCO-PUB",reg:"REG-KSA-SAPTCO",
  nEn:"Public Transport IT Systems & Passenger Data Standards",nAr:"معايير أنظمة تقنية المعلومات وبيانات الركاب للنقل العام",
  sectors:["SEC-KSA-TRANS-LOG"],mandatory:false,tags:["public-transport","passenger","data"],
  domains:[
    {id:"SAPT-D1",code:"1",nameEn:"Public Transport IT",nameAr:"تقنية المعلومات للنقل العام",subs:[
      {id:"SAPT-1-1",code:"1.1",nameEn:"Fleet IT Systems",nameAr:"أنظمة تقنية الأسطول",topic:"public transport fleet IT",topicAr:"تقنية أسطول النقل العام",templateSet:"technical",count:8},
      {id:"SAPT-1-2",code:"1.2",nameEn:"Passenger Data Protection",nameAr:"حماية بيانات الركاب",topic:"passenger data",topicAr:"بيانات الركاب",templateSet:"data",count:8},
    ]},
  ],
});

const RDA_FW = regFW({
  id:"INST-KSA-RDA-ALULA",reg:"REG-KSA-RDA",
  nEn:"AlUla Heritage Smart Infrastructure & Cybersecurity Standards",nAr:"معايير البنية التحتية الذكية والأمن السيبراني لمحافظة العلا",
  sectors:["SEC-KSA-TOURISM","SEC-KSA-SPECIAL-ZONES"],mandatory:false,tags:["heritage","smart-city","tourism"],
  domains:[
    {id:"RDA-D1",code:"1",nameEn:"Smart Heritage Infrastructure",nameAr:"البنية التحتية الذكية للتراث",subs:[
      {id:"RDA-1-1",code:"1.1",nameEn:"Heritage Site Technology",nameAr:"تقنية المواقع التراثية",topic:"heritage site technology",topicAr:"تقنية المواقع التراثية",templateSet:"technical",count:10},
      {id:"RDA-1-2",code:"1.2",nameEn:"Visitor Analytics Data",nameAr:"بيانات تحليلات الزوار",topic:"visitor analytics",topicAr:"تحليلات الزوار",templateSet:"data",count:8},
    ]},
    {id:"RDA-D2",code:"2",nameEn:"Tourism IT Governance",nameAr:"حوكمة تقنية المعلومات السياحية",subs:[
      {id:"RDA-2-1",code:"2.1",nameEn:"AlUla Digital Governance",nameAr:"حوكمة العلا الرقمية",topic:"AlUla digital governance",topicAr:"الحوكمة الرقمية لمحافظة العلا",templateSet:"governance",count:8},
    ]},
  ],
});

const DRONES_FW = regFW({
  id:"INST-KSA-DRONES-UAS",reg:"REG-KSA-DRONES",
  nEn:"Unmanned Aerial Systems Registration & Cybersecurity Standards",nAr:"معايير تسجيل وأمن الأنظمة الجوية غير المأهولة",
  sectors:["SEC-KSA-TRANS-AVIA"],mandatory:true,tags:["drone","uas","airspace"],
  domains:[
    {id:"DRN-D1",code:"1",nameEn:"UAS Security Controls",nameAr:"ضوابط أمن الطائرات بدون طيار",subs:[
      {id:"DRN-1-1",code:"1.1",nameEn:"Drone Registration Systems",nameAr:"أنظمة تسجيل الطائرات بدون طيار",topic:"drone registration",topicAr:"تسجيل الطائرات بدون طيار",templateSet:"technical",count:10},
      {id:"DRN-1-2",code:"1.2",nameEn:"Airspace Cybersecurity",nameAr:"الأمن السيبراني للمجال الجوي",topic:"airspace cybersecurity",topicAr:"الأمن السيبراني للمجال الجوي",templateSet:"technical",count:8},
    ]},
    {id:"DRN-D2",code:"2",nameEn:"UAS Data Governance",nameAr:"حوكمة بيانات الأنظمة الجوية",subs:[
      {id:"DRN-2-1",code:"2.1",nameEn:"Telemetry Data Controls",nameAr:"ضوابط بيانات القياس عن بعد",topic:"drone telemetry data",topicAr:"بيانات القياس عن بعد للطائرات",templateSet:"data",count:8},
    ]},
  ],
});

// ═══════════════════════════════════════════
// DATA & CYBER (missing: NDMO, NCSC)
// ═══════════════════════════════════════════

const NDMO_FW = regFW({
  id:"INST-KSA-NDMO-DGOV",reg:"REG-KSA-NDMO",
  nEn:"Government Data Governance & Open Data Standards",nAr:"معايير حوكمة البيانات الحكومية والبيانات المفتوحة",
  sectors:["SEC-KSA-GOV-MIN","SEC-KSA-GOV-AUTH","SEC-KSA-GOV-MUN"],mandatory:true,tags:["data-governance","open-data","government"],
  domains:[
    {id:"NDMO-D1",code:"1",nameEn:"Government Data Management",nameAr:"إدارة البيانات الحكومية",subs:[
      {id:"NDMO-1-1",code:"1.1",nameEn:"Data Classification & Catalog",nameAr:"تصنيف وفهرسة البيانات",topic:"government data",topicAr:"البيانات الحكومية",templateSet:"data",count:8},
      {id:"NDMO-1-2",code:"1.2",nameEn:"Data Quality & Integrity",nameAr:"جودة وسلامة البيانات",topic:"government data quality",topicAr:"جودة البيانات الحكومية",templateSet:"data",count:8},
    ]},
    {id:"NDMO-D2",code:"2",nameEn:"Open Data & Sharing",nameAr:"البيانات المفتوحة والمشاركة",subs:[
      {id:"NDMO-2-1",code:"2.1",nameEn:"Open Data Platform Security",nameAr:"أمن منصة البيانات المفتوحة",topic:"open data platform",topicAr:"منصة البيانات المفتوحة",templateSet:"technical",count:10},
      {id:"NDMO-2-2",code:"2.2",nameEn:"Data Sharing Governance",nameAr:"حوكمة مشاركة البيانات",topic:"data sharing governance",topicAr:"حوكمة مشاركة البيانات",templateSet:"governance",count:10},
    ]},
  ],
});

const NCSC_FW = regFW({
  id:"INST-KSA-NCSC-OPS",reg:"REG-KSA-NCSC",
  nEn:"National Cyber Operations & Incident Response Standards",nAr:"معايير العمليات السيبرانية الوطنية والاستجابة للحوادث",
  sectors:["all"],mandatory:true,tags:["cyber-ops","incident-response","soc"],
  domains:[
    {id:"NCSC-D1",code:"1",nameEn:"National Cyber Operations",nameAr:"العمليات السيبرانية الوطنية",subs:[
      {id:"NCSC-1-1",code:"1.1",nameEn:"National SOC Standards",nameAr:"معايير مركز العمليات الوطني",topic:"national SOC",topicAr:"مركز العمليات السيبرانية الوطني",templateSet:"technical",count:10},
      {id:"NCSC-1-2",code:"1.2",nameEn:"Incident Coordination",nameAr:"تنسيق الحوادث",topic:"national incident coordination",topicAr:"تنسيق الحوادث الوطني",templateSet:"resilience",count:6},
    ]},
    {id:"NCSC-D2",code:"2",nameEn:"Threat Intelligence Sharing",nameAr:"مشاركة استخبارات التهديدات",subs:[
      {id:"NCSC-2-1",code:"2.1",nameEn:"TI Sharing Governance",nameAr:"حوكمة مشاركة استخبارات التهديدات",topic:"threat intelligence sharing",topicAr:"مشاركة استخبارات التهديدات",templateSet:"governance",count:10},
    ]},
  ],
});

// ═══════════════════════════════════════════
// EXPORT ALL
// ═══════════════════════════════════════════

export const REGULATOR_FRAMEWORKS_BATCH4: FrameworkDef[] = [
  // Finance
  CCHI_FW, TADAWUL_FW, SMEA_FW, GOSI_FW, PIF_FW, SIDF_FW,
  // Healthcare
  SCFHS_FW, NUPCO_FW, SHCC_FW, GAHAR_FW, KFSHRC_FW,
  // Energy
  WERA_FW, KACARE_FW, MEIM_FW, SEC_ELEC_FW, SWCC_FW, MARAFIQ_FW, NWRC_FW,
  // Telecom
  SSC_FW, YESSER_FW, CITC_FW, IOT_FW,
  // Commerce
  MISA_FW, SAIP_FW, GAC_FW, SABER_FW, ECOM_FW,
  // Transport
  SAR_FW, MOTL_FW, SAPTCO_FW, RDA_FW, DRONES_FW,
  // Data & Cyber
  NDMO_FW, NCSC_FW,
];
