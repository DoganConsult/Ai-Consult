// @ts-nocheck
// ============================================
// Shahin AI-KSA GRC — Regulator Frameworks Batch 5
// Government, Labor, Education, Environment, Tourism, Defense
// ============================================

import { FrameworkDef } from "./ksa-frameworks";
import { FW, bulkDomain, BulkDomainSpec } from "./ksa-control-builder";

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

// ═══ GOVERNMENT ═══
const BGA_FW = regFW({id:"INST-KSA-BGA-AUDIT",reg:"REG-KSA-BGA",nEn:"Government Financial & IT Audit Standards",nAr:"معايير التدقيق المالي وتقنية المعلومات الحكومية",sectors:["SEC-KSA-GOV-MIN","SEC-KSA-GOV-AUTH"],mandatory:true,tags:["audit","government"],domains:[
  {id:"BGA-D1",code:"1",nameEn:"IT Audit Standards",nameAr:"معايير تدقيق تقنية المعلومات",subs:[
    {id:"BGA-1-1",code:"1.1",nameEn:"IT Audit Framework",nameAr:"إطار تدقيق تقنية المعلومات",topic:"government IT audit",topicAr:"تدقيق تقنية المعلومات الحكومية",templateSet:"governance",count:10},
    {id:"BGA-1-2",code:"1.2",nameEn:"Financial IT Controls",nameAr:"ضوابط تقنية المعلومات المالية",topic:"financial IT systems",topicAr:"أنظمة تقنية المعلومات المالية",templateSet:"technical",count:10},
  ]},
]});

const MOMRAH_FW = regFW({id:"INST-KSA-MOMRAH-SMART",reg:"REG-KSA-MOMRAH",nEn:"Smart City & Municipal IT Governance",nAr:"حوكمة المدن الذكية وتقنية المعلومات البلدية",sectors:["SEC-KSA-GOV-MUN","SEC-KSA-CONST"],mandatory:true,tags:["smart-city","municipal"],domains:[
  {id:"MOM-D1",code:"1",nameEn:"Smart City IT Security",nameAr:"أمن تقنية المدن الذكية",subs:[
    {id:"MOM-1-1",code:"1.1",nameEn:"Smart Infrastructure",nameAr:"البنية التحتية الذكية",topic:"smart city infrastructure",topicAr:"البنية التحتية للمدن الذكية",templateSet:"technical",count:10},
    {id:"MOM-1-2",code:"1.2",nameEn:"Municipal Data Governance",nameAr:"حوكمة البيانات البلدية",topic:"municipal data",topicAr:"البيانات البلدية",templateSet:"data",count:8},
    {id:"MOM-1-3",code:"1.3",nameEn:"Permit Systems",nameAr:"أنظمة التراخيص",topic:"building permit systems",topicAr:"أنظمة تراخيص البناء",templateSet:"governance",count:8},
  ]},
]});

const CGC_FW = regFW({id:"INST-KSA-CGC-COMPLY",reg:"REG-KSA-CGC",nEn:"Whole-of-Government Compliance Coordination",nAr:"تنسيق الامتثال على مستوى الحكومة",sectors:["SEC-KSA-GOV-MIN","SEC-KSA-GOV-AUTH","SEC-KSA-GOV-MUN"],mandatory:true,tags:["compliance","coordination"],domains:[
  {id:"CGC-D1",code:"1",nameEn:"Cross-Agency Compliance",nameAr:"الامتثال بين الجهات",subs:[
    {id:"CGC-1-1",code:"1.1",nameEn:"Compliance Reporting",nameAr:"تقارير الامتثال",topic:"compliance reporting",topicAr:"تقارير الامتثال",templateSet:"technical",count:10},
    {id:"CGC-1-2",code:"1.2",nameEn:"Policy Alignment",nameAr:"محاذاة السياسات",topic:"compliance policy",topicAr:"سياسات الامتثال",templateSet:"governance",count:10},
  ]},
]});

const NCPD_FW = regFW({id:"INST-KSA-NCPD-PPP",reg:"REG-KSA-NCPD",nEn:"Privatization & PPP IT Governance",nAr:"حوكمة تقنية المعلومات للتخصيص والشراكة",sectors:["SEC-KSA-GOV-MIN","SEC-KSA-GOV-AUTH"],mandatory:false,tags:["privatization","ppp"],domains:[
  {id:"NCPD-D1",code:"1",nameEn:"PPP IT Governance",nameAr:"حوكمة تقنية الشراكة",subs:[
    {id:"NCPD-1-1",code:"1.1",nameEn:"Transition Data Security",nameAr:"أمن بيانات التحول",topic:"privatization transition",topicAr:"تحول التخصيص",templateSet:"data",count:8},
    {id:"NCPD-1-2",code:"1.2",nameEn:"PPP Contract Standards",nameAr:"معايير عقود الشراكة",topic:"PPP contract",topicAr:"عقود الشراكة",templateSet:"governance",count:8},
  ]},
]});

const MOJ_FW = regFW({id:"INST-KSA-MOJ-JUST",reg:"REG-KSA-MOJ",nEn:"Digital Court Systems & Legal Data Governance",nAr:"أنظمة المحاكم الرقمية وحوكمة البيانات القانونية",sectors:["SEC-KSA-GOV-MIN"],mandatory:true,tags:["justice","e-court"],domains:[
  {id:"MOJ-D1",code:"1",nameEn:"E-Justice Systems",nameAr:"أنظمة العدالة الإلكترونية",subs:[
    {id:"MOJ-1-1",code:"1.1",nameEn:"Court IT Systems",nameAr:"أنظمة تقنية المحاكم",topic:"e-justice platform",topicAr:"منصة العدالة الإلكترونية",templateSet:"technical",count:10},
    {id:"MOJ-1-2",code:"1.2",nameEn:"Legal Data Protection",nameAr:"حماية البيانات القانونية",topic:"legal case data",topicAr:"بيانات القضايا القانونية",templateSet:"data",count:8},
    {id:"MOJ-1-3",code:"1.3",nameEn:"Judicial IT Governance",nameAr:"حوكمة تقنية القضاء",topic:"judicial IT governance",topicAr:"حوكمة تقنية القضاء",templateSet:"governance",count:10},
  ]},
]});

const MOI_FW = regFW({id:"INST-KSA-MOI-SEC",reg:"REG-KSA-MOI",nEn:"Internal Security & Identity Systems Cybersecurity",nAr:"الأمن السيبراني لأنظمة الأمن الداخلي والهوية",sectors:["SEC-KSA-GOV-MIN","SEC-KSA-DEFENSE"],mandatory:true,tags:["security","identity","biometric"],domains:[
  {id:"MOI-D1",code:"1",nameEn:"Identity & Biometric Systems",nameAr:"أنظمة الهوية والقياسات الحيوية",subs:[
    {id:"MOI-1-1",code:"1.1",nameEn:"Absher Platform Security",nameAr:"أمن منصة أبشر",topic:"identity platform",topicAr:"منصة الهوية",templateSet:"technical",count:10},
    {id:"MOI-1-2",code:"1.2",nameEn:"Biometric Data Protection",nameAr:"حماية البيانات البيومترية",topic:"biometric data",topicAr:"البيانات البيومترية",templateSet:"data",count:8},
    {id:"MOI-1-3",code:"1.3",nameEn:"Security Systems Governance",nameAr:"حوكمة الأنظمة الأمنية",topic:"security IT systems",topicAr:"أنظمة تقنية الأمن",templateSet:"governance",count:10},
  ]},
]});

const MOFA_FW = regFW({id:"INST-KSA-MOFA-DIPL",reg:"REG-KSA-MOFA",nEn:"Diplomatic IT & Consular Data Governance",nAr:"تقنية المعلومات الدبلوماسية وحوكمة البيانات القنصلية",sectors:["SEC-KSA-GOV-MIN"],mandatory:true,tags:["diplomatic","consular"],domains:[
  {id:"MOFA-D1",code:"1",nameEn:"Diplomatic IT Security",nameAr:"أمن تقنية المعلومات الدبلوماسية",subs:[
    {id:"MOFA-1-1",code:"1.1",nameEn:"Secure Communications",nameAr:"الاتصالات الآمنة",topic:"diplomatic communications",topicAr:"الاتصالات الدبلوماسية",templateSet:"technical",count:10},
    {id:"MOFA-1-2",code:"1.2",nameEn:"Consular Data Protection",nameAr:"حماية البيانات القنصلية",topic:"consular data",topicAr:"البيانات القنصلية",templateSet:"data",count:8},
  ]},
]});

const DIWAN_FW = regFW({id:"INST-KSA-DIWAN-ROYAL",reg:"REG-KSA-DIWAN",nEn:"Royal Decree Compliance & Strategic IT",nAr:"امتثال المراسيم الملكية وتقنية المعلومات الاستراتيجية",sectors:["SEC-KSA-GOV-MIN"],mandatory:true,tags:["royal","decree"],domains:[
  {id:"DIW-D1",code:"1",nameEn:"Royal Directive IT",nameAr:"تقنية التوجيهات الملكية",subs:[
    {id:"DIW-1-1",code:"1.1",nameEn:"Decree Tracking Systems",nameAr:"أنظمة تتبع المراسيم",topic:"decree compliance tracking",topicAr:"تتبع امتثال المراسيم",templateSet:"governance",count:10},
    {id:"DIW-1-2",code:"1.2",nameEn:"Strategic Data Security",nameAr:"أمن البيانات الاستراتيجية",topic:"strategic directive data",topicAr:"بيانات التوجيهات الاستراتيجية",templateSet:"data",count:8},
  ]},
]});

const SHURA_FW = regFW({id:"INST-KSA-SHURA-LEG",reg:"REG-KSA-SHURA",nEn:"Legislative Oversight & Regulatory Review IT",nAr:"الرقابة التشريعية ومراجعة الأنظمة",sectors:["SEC-KSA-GOV-MIN"],mandatory:false,tags:["legislative","oversight"],domains:[
  {id:"SHR-D1",code:"1",nameEn:"Legislative IT Systems",nameAr:"أنظمة تقنية التشريع",subs:[
    {id:"SHR-1-1",code:"1.1",nameEn:"Parliamentary IT Security",nameAr:"أمن تقنية البرلمان",topic:"parliamentary IT",topicAr:"تقنية المعلومات البرلمانية",templateSet:"technical",count:8},
    {id:"SHR-1-2",code:"1.2",nameEn:"Legislative Data Governance",nameAr:"حوكمة البيانات التشريعية",topic:"legislative data",topicAr:"البيانات التشريعية",templateSet:"governance",count:8},
  ]},
]});

// ═══ LABOR ═══
const HRDF_FW = regFW({id:"INST-KSA-HRDF-TRAIN",reg:"REG-KSA-HRDF",nEn:"Workforce Training & Skills Development IT",nAr:"تقنية تدريب القوى العاملة وتطوير المهارات",sectors:["all_commercial"],mandatory:false,tags:["training","workforce"],domains:[
  {id:"HRDF-D1",code:"1",nameEn:"Training Platform Security",nameAr:"أمن منصة التدريب",subs:[
    {id:"HRDF-1-1",code:"1.1",nameEn:"Training Data Systems",nameAr:"أنظمة بيانات التدريب",topic:"training platform",topicAr:"منصة التدريب",templateSet:"technical",count:8},
    {id:"HRDF-1-2",code:"1.2",nameEn:"Trainee Data Protection",nameAr:"حماية بيانات المتدربين",topic:"trainee data",topicAr:"بيانات المتدربين",templateSet:"data",count:8},
  ]},
]});

const MUSANED_FW = regFW({id:"INST-KSA-MUSANED-DL",reg:"REG-KSA-MUSANED",nEn:"Domestic Labor Recruitment & Contract IT",nAr:"تقنية توظيف العمالة المنزلية والعقود",sectors:["all_commercial"],mandatory:true,tags:["labor","recruitment"],domains:[
  {id:"MUS-D1",code:"1",nameEn:"Recruitment Platform",nameAr:"منصة التوظيف",subs:[
    {id:"MUS-1-1",code:"1.1",nameEn:"Worker Data Protection",nameAr:"حماية بيانات العمال",topic:"worker recruitment data",topicAr:"بيانات توظيف العمال",templateSet:"data",count:8},
    {id:"MUS-1-2",code:"1.2",nameEn:"Contract Management IT",nameAr:"تقنية إدارة العقود",topic:"contract management",topicAr:"إدارة العقود",templateSet:"governance",count:8},
  ]},
]});

const QIWA_FW = regFW({id:"INST-KSA-QIWA-LABOR",reg:"REG-KSA-QIWA",nEn:"Digital Labor Market & E-Contract Standards",nAr:"معايير سوق العمل الرقمي والعقود الإلكترونية",sectors:["all_commercial"],mandatory:true,tags:["labor-market","e-contract"],domains:[
  {id:"QIW-D1",code:"1",nameEn:"Labor Platform Security",nameAr:"أمن منصة العمل",subs:[
    {id:"QIW-1-1",code:"1.1",nameEn:"Qiwa Platform IT",nameAr:"تقنية منصة قوى",topic:"labor platform",topicAr:"منصة العمل",templateSet:"technical",count:10},
    {id:"QIW-1-2",code:"1.2",nameEn:"Employee Data Privacy",nameAr:"خصوصية بيانات الموظفين",topic:"employee data",topicAr:"بيانات الموظفين",templateSet:"data",count:8},
  ]},
]});

const GAZT_FW = regFW({id:"INST-KSA-GAZT-HIST",reg:"REG-KSA-GAZT",nEn:"Historical Zakat Data & Legacy Systems",nAr:"بيانات الزكاة التاريخية والأنظمة القديمة",sectors:["all_commercial"],mandatory:false,tags:["zakat","historical"],domains:[
  {id:"GAZT-D1",code:"1",nameEn:"Legacy Zakat Systems",nameAr:"أنظمة الزكاة القديمة",subs:[
    {id:"GAZT-1-1",code:"1.1",nameEn:"Historical Data Migration",nameAr:"ترحيل البيانات التاريخية",topic:"zakat data migration",topicAr:"ترحيل بيانات الزكاة",templateSet:"data",count:8},
    {id:"GAZT-1-2",code:"1.2",nameEn:"Legacy System Compliance",nameAr:"امتثال الأنظمة القديمة",topic:"legacy system compliance",topicAr:"امتثال الأنظمة القديمة",templateSet:"governance",count:8},
  ]},
]});

const CSC_FW = regFW({id:"INST-KSA-CSC-CIVIL",reg:"REG-KSA-CSC",nEn:"Civil Service Digital HR & Employee Management",nAr:"الموارد البشرية الرقمية وإدارة الموظفين في الخدمة المدنية",sectors:["SEC-KSA-GOV-MIN","SEC-KSA-GOV-AUTH"],mandatory:true,tags:["civil-service","hr"],domains:[
  {id:"CSC-D1",code:"1",nameEn:"Government HR Systems",nameAr:"أنظمة الموارد البشرية الحكومية",subs:[
    {id:"CSC-1-1",code:"1.1",nameEn:"Employee Data Systems",nameAr:"أنظمة بيانات الموظفين",topic:"civil servant data",topicAr:"بيانات الموظفين الحكوميين",templateSet:"data",count:8},
    {id:"CSC-1-2",code:"1.2",nameEn:"Digital HR Platform",nameAr:"منصة الموارد البشرية الرقمية",topic:"government HR platform",topicAr:"منصة الموارد البشرية الحكومية",templateSet:"technical",count:10},
  ]},
]});

// ═══ EDUCATION ═══
const NCEL_FW = regFW({id:"INST-KSA-NCEL-ELEARN",reg:"REG-KSA-NCEL",nEn:"E-Learning Platform & Digital Content Governance",nAr:"منصات التعلم الإلكتروني وحوكمة المحتوى الرقمي",sectors:["SEC-KSA-EDU-UNIV","SEC-KSA-EDU-K12"],mandatory:true,tags:["e-learning","education"],domains:[
  {id:"NCEL-D1",code:"1",nameEn:"E-Learning Platform Security",nameAr:"أمن منصة التعلم الإلكتروني",subs:[
    {id:"NCEL-1-1",code:"1.1",nameEn:"LMS Security Controls",nameAr:"ضوابط أمن نظام إدارة التعلم",topic:"learning management system",topicAr:"نظام إدارة التعلم",templateSet:"technical",count:10},
    {id:"NCEL-1-2",code:"1.2",nameEn:"Student Data Privacy",nameAr:"خصوصية بيانات الطلاب",topic:"student data",topicAr:"بيانات الطلاب",templateSet:"data",count:8},
    {id:"NCEL-1-3",code:"1.3",nameEn:"Digital Content Standards",nameAr:"معايير المحتوى الرقمي",topic:"digital educational content",topicAr:"المحتوى التعليمي الرقمي",templateSet:"governance",count:8},
  ]},
]});

const KACST_FW = regFW({id:"INST-KSA-KACST-RES",reg:"REG-KSA-KACST",nEn:"Science & Technology Research Data Standards",nAr:"معايير بيانات البحث العلمي والتقني",sectors:["SEC-KSA-EDU-UNIV"],mandatory:false,tags:["research","science"],domains:[
  {id:"KACST-D1",code:"1",nameEn:"Research Data Management",nameAr:"إدارة بيانات البحث",subs:[
    {id:"KACST-1-1",code:"1.1",nameEn:"Research Data Governance",nameAr:"حوكمة بيانات البحث",topic:"scientific research data",topicAr:"بيانات البحث العلمي",templateSet:"data",count:8},
    {id:"KACST-1-2",code:"1.2",nameEn:"Lab IT Systems",nameAr:"أنظمة تقنية المختبرات",topic:"laboratory IT systems",topicAr:"أنظمة تقنية المختبرات",templateSet:"technical",count:8},
  ]},
]});

const TVTC_FW = regFW({id:"INST-KSA-TVTC-VOC",reg:"REG-KSA-TVTC",nEn:"Vocational Training IT & Accreditation Standards",nAr:"تقنية التدريب المهني ومعايير الاعتماد",sectors:["SEC-KSA-EDU-K12"],mandatory:false,tags:["vocational","training"],domains:[
  {id:"TVTC-D1",code:"1",nameEn:"Vocational IT Systems",nameAr:"أنظمة تقنية التدريب المهني",subs:[
    {id:"TVTC-1-1",code:"1.1",nameEn:"Training Center IT",nameAr:"تقنية مراكز التدريب",topic:"vocational training IT",topicAr:"تقنية التدريب المهني",templateSet:"technical",count:8},
    {id:"TVTC-1-2",code:"1.2",nameEn:"Trainee Data Governance",nameAr:"حوكمة بيانات المتدربين",topic:"vocational trainee data",topicAr:"بيانات المتدربين المهنيين",templateSet:"governance",count:8},
  ]},
]});

const RACS_FW = regFW({id:"INST-KSA-RACS-ETHICS",reg:"REG-KSA-RACS",nEn:"Research Ethics & Academic Data Integrity",nAr:"أخلاقيات البحث وسلامة البيانات الأكاديمية",sectors:["SEC-KSA-EDU-UNIV"],mandatory:false,tags:["ethics","academic"],domains:[
  {id:"RACS-D1",code:"1",nameEn:"Research Ethics IT",nameAr:"تقنية أخلاقيات البحث",subs:[
    {id:"RACS-1-1",code:"1.1",nameEn:"Ethics Board Systems",nameAr:"أنظمة لجان الأخلاقيات",topic:"research ethics",topicAr:"أخلاقيات البحث",templateSet:"governance",count:8},
    {id:"RACS-1-2",code:"1.2",nameEn:"Research Data Integrity",nameAr:"سلامة بيانات البحث",topic:"academic data integrity",topicAr:"سلامة البيانات الأكاديمية",templateSet:"data",count:8},
  ]},
]});

// ═══ ENVIRONMENT ═══
const NCM_FW = regFW({id:"INST-KSA-NCM-WEATHER",reg:"REG-KSA-NCM",nEn:"Weather Data Governance & IoT Sensor Standards",nAr:"حوكمة بيانات الطقس وأجهزة الاستشعار",sectors:["SEC-KSA-AGRI"],mandatory:false,tags:["weather","iot"],domains:[
  {id:"NCM-D1",code:"1",nameEn:"Meteorological IT",nameAr:"تقنية الأرصاد",subs:[
    {id:"NCM-1-1",code:"1.1",nameEn:"Weather Station IoT",nameAr:"محطات الطقس",topic:"weather station IoT",topicAr:"أجهزة محطات الطقس",templateSet:"technical",count:10},
    {id:"NCM-1-2",code:"1.2",nameEn:"Climate Data Governance",nameAr:"حوكمة بيانات المناخ",topic:"climate data",topicAr:"بيانات المناخ",templateSet:"data",count:8},
  ]},
]});

const NCWCD_FW = regFW({id:"INST-KSA-NCWCD-WILD",reg:"REG-KSA-NCWCD",nEn:"Wildlife Conservation Data & Monitoring",nAr:"بيانات حفظ الحياة الفطرية والمراقبة",sectors:["SEC-KSA-AGRI"],mandatory:false,tags:["wildlife","conservation"],domains:[
  {id:"NCW-D1",code:"1",nameEn:"Conservation IT",nameAr:"تقنية الحفاظ على البيئة",subs:[
    {id:"NCW-1-1",code:"1.1",nameEn:"Wildlife Tracking",nameAr:"تتبع الحياة الفطرية",topic:"wildlife tracking",topicAr:"تتبع الحياة الفطرية",templateSet:"technical",count:8},
    {id:"NCW-1-2",code:"1.2",nameEn:"Biodiversity Data",nameAr:"بيانات التنوع البيولوجي",topic:"biodiversity data",topicAr:"بيانات التنوع البيولوجي",templateSet:"data",count:8},
  ]},
]});

const PME_FW = regFW({id:"INST-KSA-PME-ENV",reg:"REG-KSA-PME",nEn:"Environmental Impact & Emissions Monitoring IT",nAr:"تقنية الأثر البيئي ومراقبة الانبعاثات",sectors:["SEC-KSA-ENERGY-OG","SEC-KSA-INDUSTRY"],mandatory:true,tags:["environment","emissions"],domains:[
  {id:"PME-D1",code:"1",nameEn:"Environmental Monitoring IT",nameAr:"تقنية المراقبة البيئية",subs:[
    {id:"PME-1-1",code:"1.1",nameEn:"Emissions Monitoring",nameAr:"مراقبة الانبعاثات",topic:"emissions monitoring",topicAr:"مراقبة الانبعاثات",templateSet:"technical",count:10},
    {id:"PME-1-2",code:"1.2",nameEn:"Environmental Data",nameAr:"البيانات البيئية",topic:"environmental data",topicAr:"البيانات البيئية",templateSet:"data",count:8},
  ]},
]});

const NWC_FW = regFW({id:"INST-KSA-NWC-UTIL",reg:"REG-KSA-NWC",nEn:"Water Utility SCADA & Customer Data Standards",nAr:"أنظمة التحكم وبيانات العملاء لشركة المياه",sectors:["SEC-KSA-ENERGY-WATER"],mandatory:true,tags:["water","scada"],domains:[
  {id:"NWC-D1",code:"1",nameEn:"Water Utility OT",nameAr:"التقنيات التشغيلية للمياه",subs:[
    {id:"NWC-1-1",code:"1.1",nameEn:"Water SCADA",nameAr:"أنظمة التحكم في المياه",topic:"water utility SCADA",topicAr:"أنظمة التحكم في المياه",templateSet:"technical",count:10},
    {id:"NWC-1-2",code:"1.2",nameEn:"Customer Data Privacy",nameAr:"خصوصية بيانات العملاء",topic:"water customer data",topicAr:"بيانات عملاء المياه",templateSet:"data",count:8},
  ]},
]});

// ═══ TOURISM ═══
const MOT_FW = regFW({id:"INST-KSA-MOT-TOURISM",reg:"REG-KSA-MOT",nEn:"Tourism Licensing & Guest Data Protection",nAr:"ترخيص السياحة وحماية بيانات الضيوف",sectors:["SEC-KSA-TOURISM"],mandatory:true,tags:["tourism","hospitality"],domains:[
  {id:"MOT-D1",code:"1",nameEn:"Tourism IT Security",nameAr:"أمن تقنية السياحة",subs:[
    {id:"MOT-1-1",code:"1.1",nameEn:"Hospitality Platform",nameAr:"منصة الضيافة",topic:"hospitality platform",topicAr:"منصات الضيافة",templateSet:"technical",count:10},
    {id:"MOT-1-2",code:"1.2",nameEn:"Guest Data Protection",nameAr:"حماية بيانات الضيوف",topic:"guest data",topicAr:"بيانات الضيوف",templateSet:"data",count:8},
    {id:"MOT-1-3",code:"1.3",nameEn:"Licensing Governance",nameAr:"حوكمة الترخيص",topic:"tourism licensing",topicAr:"ترخيص السياحة",templateSet:"governance",count:8},
  ]},
]});

const GEA_FW = regFW({id:"INST-KSA-GEA-ENT",reg:"REG-KSA-GEA",nEn:"Entertainment Event & Venue Cybersecurity",nAr:"الأمن السيبراني لفعاليات وأماكن الترفيه",sectors:["SEC-KSA-TOURISM","SEC-KSA-MEDIA"],mandatory:false,tags:["entertainment","events"],domains:[
  {id:"GEA-D1",code:"1",nameEn:"Event IT Security",nameAr:"أمن تقنية الفعاليات",subs:[
    {id:"GEA-1-1",code:"1.1",nameEn:"Ticketing & Venue Systems",nameAr:"أنظمة التذاكر والأماكن",topic:"event ticketing systems",topicAr:"أنظمة تذاكر الفعاليات",templateSet:"technical",count:10},
    {id:"GEA-1-2",code:"1.2",nameEn:"Attendee Data Privacy",nameAr:"خصوصية بيانات الحضور",topic:"attendee data",topicAr:"بيانات الحضور",templateSet:"data",count:8},
  ]},
]});

const MOC_CULT_FW = regFW({id:"INST-KSA-MOCCULT-DIG",reg:"REG-KSA-MOC_CULT",nEn:"Cultural Heritage Digital Preservation & IP",nAr:"الحفاظ الرقمي على التراث الثقافي والملكية الفكرية",sectors:["SEC-KSA-MEDIA"],mandatory:false,tags:["culture","heritage"],domains:[
  {id:"MOCC-D1",code:"1",nameEn:"Digital Preservation IT",nameAr:"تقنية الحفاظ الرقمي",subs:[
    {id:"MOCC-1-1",code:"1.1",nameEn:"Cultural Archive Systems",nameAr:"أنظمة الأرشيف الثقافي",topic:"cultural archive",topicAr:"الأرشيف الثقافي",templateSet:"technical",count:8},
    {id:"MOCC-1-2",code:"1.2",nameEn:"Cultural Data Governance",nameAr:"حوكمة البيانات الثقافية",topic:"cultural data",topicAr:"البيانات الثقافية",templateSet:"governance",count:8},
  ]},
]});

const HERITAGE_FW = regFW({id:"INST-KSA-HERITAGE-ARCH",reg:"REG-KSA-HERITAGE",nEn:"Archaeological Data & Site Monitoring IT",nAr:"البيانات الأثرية ومراقبة المواقع",sectors:["SEC-KSA-TOURISM"],mandatory:false,tags:["archaeology","heritage"],domains:[
  {id:"HER-D1",code:"1",nameEn:"Heritage Site IT",nameAr:"تقنية المواقع التراثية",subs:[
    {id:"HER-1-1",code:"1.1",nameEn:"Site Monitoring",nameAr:"مراقبة المواقع",topic:"heritage site monitoring",topicAr:"مراقبة المواقع التراثية",templateSet:"technical",count:8},
    {id:"HER-1-2",code:"1.2",nameEn:"Archaeological Data",nameAr:"البيانات الأثرية",topic:"archaeological data",topicAr:"البيانات الأثرية",templateSet:"data",count:8},
  ]},
]});

const FILM_FW = regFW({id:"INST-KSA-FILM-PROD",reg:"REG-KSA-FILM",nEn:"Film Production Data & Content Classification",nAr:"بيانات الإنتاج السينمائي وتصنيف المحتوى",sectors:["SEC-KSA-MEDIA"],mandatory:false,tags:["film","content"],domains:[
  {id:"FLM-D1",code:"1",nameEn:"Film Production IT",nameAr:"تقنية الإنتاج السينمائي",subs:[
    {id:"FLM-1-1",code:"1.1",nameEn:"Production Data Security",nameAr:"أمن بيانات الإنتاج",topic:"film production data",topicAr:"بيانات الإنتاج السينمائي",templateSet:"data",count:8},
    {id:"FLM-1-2",code:"1.2",nameEn:"Content Classification IT",nameAr:"تقنية تصنيف المحتوى",topic:"content classification",topicAr:"تصنيف المحتوى",templateSet:"governance",count:8},
  ]},
]});

const STA_FW = regFW({id:"INST-KSA-STA-PROMO",reg:"REG-KSA-STA",nEn:"Tourism Promotion & Visitor Analytics",nAr:"الترويج السياحي وتحليلات الزوار",sectors:["SEC-KSA-TOURISM"],mandatory:false,tags:["tourism","analytics"],domains:[
  {id:"STA-D1",code:"1",nameEn:"Tourism Platform IT",nameAr:"تقنية المنصة السياحية",subs:[
    {id:"STA-1-1",code:"1.1",nameEn:"Promotion Platform",nameAr:"منصة الترويج",topic:"tourism promotion platform",topicAr:"منصة الترويج السياحي",templateSet:"technical",count:8},
    {id:"STA-1-2",code:"1.2",nameEn:"Visitor Data Analytics",nameAr:"تحليلات بيانات الزوار",topic:"visitor analytics data",topicAr:"بيانات تحليلات الزوار",templateSet:"data",count:8},
  ]},
]});

const SCTH_FW = regFW({id:"INST-KSA-SCTH-TOURHRT",reg:"REG-KSA-SCTH",nEn:"Tourism Operator & Heritage Technology",nAr:"مشغلو السياحة وتقنية التراث",sectors:["SEC-KSA-TOURISM"],mandatory:false,tags:["tourism","operator"],domains:[
  {id:"SCTH-D1",code:"1",nameEn:"Tourism Operator IT",nameAr:"تقنية مشغلي السياحة",subs:[
    {id:"SCTH-1-1",code:"1.1",nameEn:"Operator Platform",nameAr:"منصة المشغلين",topic:"tourism operator platform",topicAr:"منصة مشغلي السياحة",templateSet:"technical",count:8},
    {id:"SCTH-1-2",code:"1.2",nameEn:"Heritage Tech Governance",nameAr:"حوكمة تقنية التراث",topic:"heritage technology",topicAr:"تقنية التراث",templateSet:"governance",count:8},
  ]},
]});

// ═══ DEFENSE ═══
const MOD_FW = regFW({id:"INST-KSA-MOD-DEF",reg:"REG-KSA-MOD",nEn:"Defense Systems Cybersecurity & Classified Data",nAr:"الأمن السيبراني لأنظمة الدفاع والبيانات المصنفة",sectors:["SEC-KSA-DEFENSE"],mandatory:true,tags:["defense","classified"],domains:[
  {id:"MOD-D1",code:"1",nameEn:"Military IT Security",nameAr:"أمن تقنية المعلومات العسكرية",subs:[
    {id:"MOD-1-1",code:"1.1",nameEn:"Defense Systems Protection",nameAr:"حماية أنظمة الدفاع",topic:"defense IT systems",topicAr:"أنظمة تقنية الدفاع",templateSet:"technical",count:10},
    {id:"MOD-1-2",code:"1.2",nameEn:"Classified Data Controls",nameAr:"ضوابط البيانات المصنفة",topic:"classified defense data",topicAr:"بيانات الدفاع المصنفة",templateSet:"data",count:8},
    {id:"MOD-1-3",code:"1.3",nameEn:"Military IT Governance",nameAr:"حوكمة تقنية المعلومات العسكرية",topic:"military IT governance",topicAr:"حوكمة تقنية المعلومات العسكرية",templateSet:"governance",count:10},
  ]},
]});

const PSS_FW = regFW({id:"INST-KSA-PSS-INTEL",reg:"REG-KSA-PSS",nEn:"National Security Intelligence & CT Data",nAr:"استخبارات الأمن الوطني وبيانات مكافحة الإرهاب",sectors:["SEC-KSA-DEFENSE"],mandatory:true,tags:["security","intelligence"],domains:[
  {id:"PSS-D1",code:"1",nameEn:"Intelligence Systems",nameAr:"أنظمة الاستخبارات",subs:[
    {id:"PSS-1-1",code:"1.1",nameEn:"Intelligence Platform",nameAr:"منصة الاستخبارات",topic:"intelligence systems",topicAr:"أنظمة الاستخبارات",templateSet:"technical",count:10},
    {id:"PSS-1-2",code:"1.2",nameEn:"Security Intelligence Data",nameAr:"بيانات الاستخبارات الأمنية",topic:"security intelligence data",topicAr:"بيانات الاستخبارات الأمنية",templateSet:"data",count:8},
  ]},
]});

const GDIR_FW = regFW({id:"INST-KSA-GDIR-SIGINT",reg:"REG-KSA-GDIR",nEn:"Signals Intelligence & Secure Communications",nAr:"استخبارات الإشارات والاتصالات الآمنة",sectors:["SEC-KSA-DEFENSE"],mandatory:true,tags:["sigint","secure-comms"],domains:[
  {id:"GDIR-D1",code:"1",nameEn:"SIGINT Systems",nameAr:"أنظمة استخبارات الإشارات",subs:[
    {id:"GDIR-1-1",code:"1.1",nameEn:"Signal Processing",nameAr:"معالجة الإشارات",topic:"signals intelligence",topicAr:"استخبارات الإشارات",templateSet:"technical",count:10},
    {id:"GDIR-1-2",code:"1.2",nameEn:"Classified SIGINT Data",nameAr:"بيانات استخبارات مصنفة",topic:"classified SIGINT data",topicAr:"بيانات الاستخبارات المصنفة",templateSet:"data",count:8},
  ]},
]});

const GAMI_FW = regFW({id:"INST-KSA-GAMI-MIL",reg:"REG-KSA-GAMI",nEn:"Defense Industry Supply Chain & Export Control",nAr:"سلسلة توريد الصناعات العسكرية وضوابط التصدير",sectors:["SEC-KSA-DEFENSE","SEC-KSA-INDUSTRY"],mandatory:true,tags:["defense-industry","export"],domains:[
  {id:"GAMI-D1",code:"1",nameEn:"Defense Supply Chain IT",nameAr:"تقنية سلسلة التوريد الدفاعية",subs:[
    {id:"GAMI-1-1",code:"1.1",nameEn:"Supply Chain Security",nameAr:"أمن سلسلة التوريد",topic:"defense supply chain",topicAr:"سلسلة التوريد الدفاعية",templateSet:"technical",count:10},
    {id:"GAMI-1-2",code:"1.2",nameEn:"Export Control Data",nameAr:"بيانات ضوابط التصدير",topic:"export control data",topicAr:"بيانات ضوابط التصدير",templateSet:"data",count:8},
    {id:"GAMI-1-3",code:"1.3",nameEn:"Defense Industry Compliance",nameAr:"امتثال الصناعات الدفاعية",topic:"defense industry compliance",topicAr:"امتثال الصناعات الدفاعية",templateSet:"governance",count:10},
  ]},
]});

const RBG_FW = regFW({id:"INST-KSA-RBG-BORDER",reg:"REG-KSA-RBG",nEn:"Border Surveillance & Biometric Gate Security",nAr:"أمن المراقبة الحدودية والبوابات البيومترية",sectors:["SEC-KSA-DEFENSE"],mandatory:true,tags:["border","surveillance"],domains:[
  {id:"RBG-D1",code:"1",nameEn:"Border Security IT",nameAr:"تقنية الأمن الحدودي",subs:[
    {id:"RBG-1-1",code:"1.1",nameEn:"Surveillance Systems",nameAr:"أنظمة المراقبة",topic:"border surveillance",topicAr:"المراقبة الحدودية",templateSet:"technical",count:10},
    {id:"RBG-1-2",code:"1.2",nameEn:"Biometric Gate Data",nameAr:"بيانات البوابات البيومترية",topic:"biometric gate data",topicAr:"بيانات البوابات البيومترية",templateSet:"data",count:8},
  ]},
]});

export const REGULATOR_FRAMEWORKS_BATCH5: FrameworkDef[] = [
  BGA_FW, MOMRAH_FW, CGC_FW, NCPD_FW, MOJ_FW, MOI_FW, MOFA_FW, DIWAN_FW, SHURA_FW,
  HRDF_FW, MUSANED_FW, QIWA_FW, GAZT_FW, CSC_FW,
  NCEL_FW, KACST_FW, TVTC_FW, RACS_FW,
  NCM_FW, NCWCD_FW, PME_FW, NWC_FW,
  MOT_FW, GEA_FW, MOC_CULT_FW, HERITAGE_FW, FILM_FW, STA_FW, SCTH_FW,
  MOD_FW, PSS_FW, GDIR_FW, GAMI_FW, RBG_FW,
];
