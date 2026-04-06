// @ts-nocheck
// ============================================
// Shahin AI-KSA GRC — Regulator Frameworks Batch 6
// Hajj, Construction, Media, Mining, Special Zones,
// Nuclear, Digital Economy, Nonprofit, International
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

// ═══ HAJJ ═══
const MOHU_FW = regFW({id:"INST-KSA-MOHU-HAJJ",reg:"REG-KSA-MOHU",nEn:"Hajj & Umrah Pilgrim Data & Digital Services",nAr:"بيانات الحج والعمرة والخدمات الرقمية",sectors:["SEC-KSA-HAJJ"],mandatory:true,tags:["hajj","pilgrim"],domains:[
  {id:"MOHU-D1",code:"1",nameEn:"Pilgrim Data Management",nameAr:"إدارة بيانات الحجاج",subs:[
    {id:"MOHU-1-1",code:"1.1",nameEn:"Pilgrim Registry",nameAr:"سجل الحجاج",topic:"pilgrim data",topicAr:"بيانات الحجاج",templateSet:"data",count:8},
    {id:"MOHU-1-2",code:"1.2",nameEn:"Hajj Digital Platform",nameAr:"المنصة الرقمية للحج",topic:"Hajj digital platform",topicAr:"المنصة الرقمية للحج",templateSet:"technical",count:10},
    {id:"MOHU-1-3",code:"1.3",nameEn:"Crowd Management IT",nameAr:"تقنية إدارة الحشود",topic:"crowd management",topicAr:"إدارة الحشود",templateSet:"technical",count:8},
  ]},
]});

const MOIA_FW = regFW({id:"INST-KSA-MOIA-ISLAMIC",reg:"REG-KSA-MOIA",nEn:"Islamic Affairs IT & Mosque Management",nAr:"تقنية الشؤون الإسلامية وإدارة المساجد",sectors:["SEC-KSA-HAJJ"],mandatory:false,tags:["islamic","mosque"],domains:[
  {id:"MOIA-D1",code:"1",nameEn:"Islamic Affairs IT",nameAr:"تقنية الشؤون الإسلامية",subs:[
    {id:"MOIA-1-1",code:"1.1",nameEn:"Mosque Management Systems",nameAr:"أنظمة إدارة المساجد",topic:"mosque management",topicAr:"إدارة المساجد",templateSet:"technical",count:8},
    {id:"MOIA-1-2",code:"1.2",nameEn:"Religious Content Platform",nameAr:"منصة المحتوى الديني",topic:"religious digital content",topicAr:"المحتوى الديني الرقمي",templateSet:"governance",count:8},
  ]},
]});

const GPHA_FW = regFW({id:"INST-KSA-GPHA-HARAM",reg:"REG-KSA-GPHA",nEn:"Holy Mosques Smart Systems & Pilgrim Safety",nAr:"الأنظمة الذكية للحرمين وسلامة الحجاج",sectors:["SEC-KSA-HAJJ"],mandatory:true,tags:["holy-mosques","smart-systems"],domains:[
  {id:"GPHA-D1",code:"1",nameEn:"Smart Mosque Systems",nameAr:"أنظمة المساجد الذكية",subs:[
    {id:"GPHA-1-1",code:"1.1",nameEn:"IoT & Crowd Analytics",nameAr:"إنترنت الأشياء وتحليلات الحشود",topic:"mosque IoT systems",topicAr:"أنظمة إنترنت الأشياء في المساجد",templateSet:"technical",count:10},
    {id:"GPHA-1-2",code:"1.2",nameEn:"Pilgrim Safety Data",nameAr:"بيانات سلامة الحجاج",topic:"pilgrim safety data",topicAr:"بيانات سلامة الحجاج",templateSet:"data",count:8},
    {id:"GPHA-1-3",code:"1.3",nameEn:"Holy Sites Governance",nameAr:"حوكمة المواقع المقدسة",topic:"holy sites IT governance",topicAr:"حوكمة تقنية المواقع المقدسة",templateSet:"governance",count:8},
  ]},
]});

const RCZM_FW = regFW({id:"INST-KSA-RCZM-MAKKAH",reg:"REG-KSA-RCZM",nEn:"Makkah Smart City & Holy Sites Infrastructure",nAr:"المدينة الذكية والبنية التحتية للمشاعر المقدسة في مكة",sectors:["SEC-KSA-HAJJ","SEC-KSA-SPECIAL-ZONES"],mandatory:true,tags:["makkah","smart-city"],domains:[
  {id:"RCZM-D1",code:"1",nameEn:"Makkah Smart Infrastructure",nameAr:"البنية التحتية الذكية لمكة",subs:[
    {id:"RCZM-1-1",code:"1.1",nameEn:"Smart Transport",nameAr:"النقل الذكي",topic:"Makkah smart transport",topicAr:"النقل الذكي في مكة",templateSet:"technical",count:10},
    {id:"RCZM-1-2",code:"1.2",nameEn:"Visitor Data Analytics",nameAr:"تحليلات بيانات الزوار",topic:"Makkah visitor data",topicAr:"بيانات زوار مكة",templateSet:"data",count:8},
  ]},
]});

const AWQAF_FW = regFW({id:"INST-KSA-AWQAF-ENDOW",reg:"REG-KSA-AWQAF",nEn:"Endowment Fund Digital Governance",nAr:"الحوكمة الرقمية لصناديق الأوقاف",sectors:["SEC-KSA-NONPROFIT"],mandatory:false,tags:["awqaf","endowment"],domains:[
  {id:"AWQ-D1",code:"1",nameEn:"Endowment IT",nameAr:"تقنية الأوقاف",subs:[
    {id:"AWQ-1-1",code:"1.1",nameEn:"Endowment Asset IT",nameAr:"تقنية أصول الأوقاف",topic:"endowment asset management",topicAr:"إدارة أصول الأوقاف",templateSet:"technical",count:8},
    {id:"AWQ-1-2",code:"1.2",nameEn:"Charitable Data Governance",nameAr:"حوكمة البيانات الخيرية",topic:"charitable data",topicAr:"البيانات الخيرية",templateSet:"governance",count:8},
  ]},
]});

// ═══ CONSTRUCTION ═══
const REGA_FW = regFW({id:"INST-KSA-REGA-RE",reg:"REG-KSA-REGA",nEn:"Real Estate Registration & PropTech",nAr:"تسجيل العقارات وتقنية العقارات",sectors:["SEC-KSA-CONST"],mandatory:true,tags:["real-estate","proptech"],domains:[
  {id:"REGA-D1",code:"1",nameEn:"Property Registration IT",nameAr:"تقنية تسجيل العقارات",subs:[
    {id:"REGA-1-1",code:"1.1",nameEn:"Land Registry Systems",nameAr:"أنظمة سجل الأراضي",topic:"land registry",topicAr:"سجل الأراضي",templateSet:"technical",count:10},
    {id:"REGA-1-2",code:"1.2",nameEn:"Property Data Governance",nameAr:"حوكمة البيانات العقارية",topic:"property data",topicAr:"البيانات العقارية",templateSet:"data",count:8},
  ]},
]});

const NHC_FW = regFW({id:"INST-KSA-NHC-HOUSE",reg:"REG-KSA-NHC",nEn:"Smart Home & Housing Project Compliance",nAr:"المنازل الذكية وامتثال مشاريع الإسكان",sectors:["SEC-KSA-CONST"],mandatory:false,tags:["housing","smart-home"],domains:[
  {id:"NHC-D1",code:"1",nameEn:"Smart Housing IT",nameAr:"تقنية الإسكان الذكي",subs:[
    {id:"NHC-1-1",code:"1.1",nameEn:"Smart Home Systems",nameAr:"أنظمة المنازل الذكية",topic:"smart home systems",topicAr:"أنظمة المنازل الذكية",templateSet:"technical",count:8},
    {id:"NHC-1-2",code:"1.2",nameEn:"BIM Data Governance",nameAr:"حوكمة بيانات نمذجة البناء",topic:"BIM data",topicAr:"بيانات نمذجة معلومات البناء",templateSet:"data",count:8},
  ]},
]});

const SCA_FW = regFW({id:"INST-KSA-SCA-CONTR",reg:"REG-KSA-SCA",nEn:"Contractor Classification & Construction IT",nAr:"تصنيف المقاولين وتقنية البناء",sectors:["SEC-KSA-CONST"],mandatory:true,tags:["contractor","construction"],domains:[
  {id:"SCA-D1",code:"1",nameEn:"Contractor IT Systems",nameAr:"أنظمة تقنية المقاولين",subs:[
    {id:"SCA-1-1",code:"1.1",nameEn:"Classification Platform",nameAr:"منصة التصنيف",topic:"contractor classification",topicAr:"تصنيف المقاولين",templateSet:"technical",count:8},
    {id:"SCA-1-2",code:"1.2",nameEn:"Project Data Governance",nameAr:"حوكمة بيانات المشاريع",topic:"construction project data",topicAr:"بيانات مشاريع البناء",templateSet:"governance",count:8},
  ]},
]});

const RCJY_FW = regFW({id:"INST-KSA-RCJY-INDZONE",reg:"REG-KSA-RCJY",nEn:"Industrial City Infrastructure & OT Cybersecurity",nAr:"البنية التحتية للمدن الصناعية والأمن السيبراني",sectors:["SEC-KSA-INDUSTRY","SEC-KSA-SPECIAL-ZONES"],mandatory:true,tags:["industrial-city","ot"],domains:[
  {id:"RCJY-D1",code:"1",nameEn:"Industrial City OT",nameAr:"التقنيات التشغيلية للمدن الصناعية",subs:[
    {id:"RCJY-1-1",code:"1.1",nameEn:"Industrial OT Systems",nameAr:"أنظمة التقنيات التشغيلية",topic:"industrial city OT",topicAr:"التقنيات التشغيلية للمدن الصناعية",templateSet:"technical",count:10},
    {id:"RCJY-1-2",code:"1.2",nameEn:"Environmental Monitoring",nameAr:"المراقبة البيئية",topic:"industrial environmental monitoring",topicAr:"المراقبة البيئية الصناعية",templateSet:"data",count:8},
  ]},
]});

const MODON_FW = regFW({id:"INST-KSA-MODON-INDZN",reg:"REG-KSA-MODON",nEn:"Industrial Zone IT & Smart Factory Standards",nAr:"تقنية المناطق الصناعية والمصانع الذكية",sectors:["SEC-KSA-INDUSTRY"],mandatory:true,tags:["industrial-zone","smart-factory"],domains:[
  {id:"MODN-D1",code:"1",nameEn:"Industrial Zone IT",nameAr:"تقنية المناطق الصناعية",subs:[
    {id:"MODN-1-1",code:"1.1",nameEn:"Smart Factory Systems",nameAr:"أنظمة المصانع الذكية",topic:"smart factory",topicAr:"المصانع الذكية",templateSet:"technical",count:10},
    {id:"MODN-1-2",code:"1.2",nameEn:"Tenant Compliance",nameAr:"امتثال المستأجرين",topic:"industrial tenant compliance",topicAr:"امتثال المستأجرين الصناعيين",templateSet:"governance",count:8},
  ]},
]});

// ═══ MEDIA & SPORTS ═══
const GCAM_FW = regFW({id:"INST-KSA-GCAM-AV",reg:"REG-KSA-GCAM",nEn:"Broadcasting & Content Moderation IT",nAr:"تقنية البث وإدارة المحتوى",sectors:["SEC-KSA-MEDIA"],mandatory:true,tags:["broadcasting","content"],domains:[
  {id:"GCAM-D1",code:"1",nameEn:"Broadcasting IT Security",nameAr:"أمن تقنية البث",subs:[
    {id:"GCAM-1-1",code:"1.1",nameEn:"Broadcast Systems",nameAr:"أنظمة البث",topic:"broadcast systems",topicAr:"أنظمة البث",templateSet:"technical",count:10},
    {id:"GCAM-1-2",code:"1.2",nameEn:"Content Data Governance",nameAr:"حوكمة بيانات المحتوى",topic:"media content data",topicAr:"بيانات المحتوى الإعلامي",templateSet:"data",count:8},
  ]},
]});

const MOS_FW = regFW({id:"INST-KSA-MOS-SPORT",reg:"REG-KSA-MOS",nEn:"Sports Data Analytics & Venue Cybersecurity",nAr:"تحليلات البيانات الرياضية وأمن الملاعب",sectors:["SEC-KSA-SPORTS"],mandatory:false,tags:["sports","venue"],domains:[
  {id:"MOS-D1",code:"1",nameEn:"Sports IT Security",nameAr:"أمن تقنية الرياضة",subs:[
    {id:"MOS-1-1",code:"1.1",nameEn:"Venue Technology",nameAr:"تقنية الملاعب",topic:"sports venue technology",topicAr:"تقنية الملاعب الرياضية",templateSet:"technical",count:8},
    {id:"MOS-1-2",code:"1.2",nameEn:"Athlete Data Protection",nameAr:"حماية بيانات الرياضيين",topic:"athlete data",topicAr:"بيانات الرياضيين",templateSet:"data",count:8},
  ]},
]});

const SPL_FW = regFW({id:"INST-KSA-SPL-LEAGUE",reg:"REG-KSA-SPL",nEn:"Professional League Data & Technology",nAr:"بيانات وتقنية الدوري المحترف",sectors:["SEC-KSA-SPORTS"],mandatory:false,tags:["football","league"],domains:[
  {id:"SPL-D1",code:"1",nameEn:"League IT Systems",nameAr:"أنظمة تقنية الدوري",subs:[
    {id:"SPL-1-1",code:"1.1",nameEn:"Match Technology",nameAr:"تقنية المباريات",topic:"match technology",topicAr:"تقنية المباريات",templateSet:"technical",count:8},
    {id:"SPL-1-2",code:"1.2",nameEn:"Player & Ticketing Data",nameAr:"بيانات اللاعبين والتذاكر",topic:"player and ticketing data",topicAr:"بيانات اللاعبين والتذاكر",templateSet:"data",count:8},
  ]},
]});

const SADC_FW = regFW({id:"INST-KSA-SADC-DOPING",reg:"REG-KSA-SADC",nEn:"Anti-Doping Test Data & Chain of Custody IT",nAr:"بيانات فحوصات المنشطات وسلسلة الحراسة",sectors:["SEC-KSA-SPORTS"],mandatory:true,tags:["anti-doping","wada"],domains:[
  {id:"SADC-D1",code:"1",nameEn:"Anti-Doping IT",nameAr:"تقنية مكافحة المنشطات",subs:[
    {id:"SADC-1-1",code:"1.1",nameEn:"Test Data Chain of Custody",nameAr:"سلسلة حراسة بيانات الفحص",topic:"anti-doping test data",topicAr:"بيانات فحوصات المنشطات",templateSet:"data",count:8},
    {id:"SADC-1-2",code:"1.2",nameEn:"WADA Compliance",nameAr:"امتثال الوكالة الدولية",topic:"WADA compliance",topicAr:"امتثال الوكالة الدولية",templateSet:"governance",count:8},
  ]},
]});

const MOM_FW = regFW({id:"INST-KSA-MOM-MEDIA",reg:"REG-KSA-MOM",nEn:"Media Licensing & Press Data Governance",nAr:"ترخيص الإعلام وحوكمة البيانات الصحفية",sectors:["SEC-KSA-MEDIA"],mandatory:true,tags:["media","press"],domains:[
  {id:"MOM-D1",code:"1",nameEn:"Media Platform Security",nameAr:"أمن المنصات الإعلامية",subs:[
    {id:"MOM-1-1",code:"1.1",nameEn:"Press Platform IT",nameAr:"تقنية المنصات الصحفية",topic:"media platform",topicAr:"المنصات الإعلامية",templateSet:"technical",count:8},
    {id:"MOM-1-2",code:"1.2",nameEn:"Media Data Governance",nameAr:"حوكمة البيانات الإعلامية",topic:"press data",topicAr:"البيانات الصحفية",templateSet:"governance",count:8},
  ]},
]});

const SOC_FW = regFW({id:"INST-KSA-SOC-OLYMPIC",reg:"REG-KSA-SOC",nEn:"Olympic Program Data & International Sports Compliance",nAr:"بيانات البرنامج الأولمبي والامتثال الرياضي الدولي",sectors:["SEC-KSA-SPORTS"],mandatory:false,tags:["olympic","sports"],domains:[
  {id:"SOC-D1",code:"1",nameEn:"Olympic IT Systems",nameAr:"أنظمة تقنية الأولمبياد",subs:[
    {id:"SOC-1-1",code:"1.1",nameEn:"Olympic Data Systems",nameAr:"أنظمة البيانات الأولمبية",topic:"Olympic program data",topicAr:"بيانات البرنامج الأولمبي",templateSet:"data",count:8},
    {id:"SOC-1-2",code:"1.2",nameEn:"International Compliance",nameAr:"الامتثال الدولي",topic:"international sports compliance",topicAr:"الامتثال الرياضي الدولي",templateSet:"governance",count:8},
  ]},
]});

// ═══ MINING ═══
const MIM_FW = regFW({id:"INST-KSA-MIM-MINING",reg:"REG-KSA-MIM",nEn:"Mining & Industrial Licensing IT",nAr:"تقنية ترخيص التعدين والصناعة",sectors:["SEC-KSA-MINING","SEC-KSA-INDUSTRY"],mandatory:true,tags:["mining","industry"],domains:[
  {id:"MIM-D1",code:"1",nameEn:"Mining IT Compliance",nameAr:"امتثال تقنية التعدين",subs:[
    {id:"MIM-1-1",code:"1.1",nameEn:"Mining Permit Systems",nameAr:"أنظمة تراخيص التعدين",topic:"mining permit systems",topicAr:"أنظمة تراخيص التعدين",templateSet:"technical",count:10},
    {id:"MIM-1-2",code:"1.2",nameEn:"Industrial Data Governance",nameAr:"حوكمة البيانات الصناعية",topic:"industrial data",topicAr:"البيانات الصناعية",templateSet:"data",count:8},
  ]},
]});

const MAADEN_FW = regFW({id:"INST-KSA-MAADEN-OT",reg:"REG-KSA-MAADEN",nEn:"Mining OT/SCADA & Environmental Monitoring",nAr:"التقنيات التشغيلية للتعدين والمراقبة البيئية",sectors:["SEC-KSA-MINING"],mandatory:true,tags:["mining","scada"],domains:[
  {id:"MAD-D1",code:"1",nameEn:"Mining OT Security",nameAr:"أمن التقنيات التشغيلية للتعدين",subs:[
    {id:"MAD-1-1",code:"1.1",nameEn:"Mining SCADA",nameAr:"أنظمة التحكم في التعدين",topic:"mining SCADA",topicAr:"أنظمة التحكم في التعدين",templateSet:"technical",count:10},
    {id:"MAD-1-2",code:"1.2",nameEn:"Mining Safety Systems",nameAr:"أنظمة السلامة",topic:"mining safety data",topicAr:"بيانات السلامة في التعدين",templateSet:"data",count:8},
  ]},
]});

const SARI_FW = regFW({id:"INST-KSA-SARI-INSPECT",reg:"REG-KSA-SARI",nEn:"Industrial Inspection & Quality Automation",nAr:"التفتيش الصناعي وأتمتة الجودة",sectors:["SEC-KSA-INDUSTRY","SEC-KSA-ENERGY-OG"],mandatory:true,tags:["inspection","quality"],domains:[
  {id:"SARI-D1",code:"1",nameEn:"Inspection IT",nameAr:"تقنية التفتيش",subs:[
    {id:"SARI-1-1",code:"1.1",nameEn:"Inspection Automation",nameAr:"أتمتة التفتيش",topic:"industrial inspection",topicAr:"التفتيش الصناعي",templateSet:"technical",count:10},
    {id:"SARI-1-2",code:"1.2",nameEn:"Quality Data Governance",nameAr:"حوكمة بيانات الجودة",topic:"quality control data",topicAr:"بيانات ضبط الجودة",templateSet:"governance",count:8},
  ]},
]});

const SABIC_FW = regFW({id:"INST-KSA-SABIC-PETRO",reg:"REG-KSA-SABIC",nEn:"Petrochemical OT & Process Safety",nAr:"التقنيات التشغيلية وسلامة العمليات في البتروكيماويات",sectors:["SEC-KSA-INDUSTRY"],mandatory:true,tags:["petrochemical","ot"],domains:[
  {id:"SABC-D1",code:"1",nameEn:"Petrochemical OT",nameAr:"التقنيات التشغيلية للبتروكيماويات",subs:[
    {id:"SABC-1-1",code:"1.1",nameEn:"Chemical Plant ICS",nameAr:"أنظمة التحكم في المصانع",topic:"petrochemical ICS",topicAr:"أنظمة التحكم في البتروكيماويات",templateSet:"technical",count:10},
    {id:"SABC-1-2",code:"1.2",nameEn:"Process Safety Data",nameAr:"بيانات سلامة العمليات",topic:"process safety data",topicAr:"بيانات سلامة العمليات",templateSet:"data",count:8},
  ]},
]});

// ═══ SPECIAL ZONES ═══
const NEOM_FW = regFW({id:"INST-KSA-NEOM-SMART",reg:"REG-KSA-NEOM",nEn:"NEOM Smart City & Autonomous Systems",nAr:"مدينة نيوم الذكية والأنظمة المستقلة",sectors:["SEC-KSA-SPECIAL-ZONES"],mandatory:true,tags:["neom","smart-city"],domains:[
  {id:"NEOM-D1",code:"1",nameEn:"Smart City Technology",nameAr:"تقنية المدن الذكية",subs:[
    {id:"NEOM-1-1",code:"1.1",nameEn:"Autonomous Systems",nameAr:"الأنظمة المستقلة",topic:"autonomous systems",topicAr:"الأنظمة المستقلة",templateSet:"technical",count:10},
    {id:"NEOM-1-2",code:"1.2",nameEn:"Smart City Data",nameAr:"بيانات المدينة الذكية",topic:"smart city data",topicAr:"بيانات المدينة الذكية",templateSet:"data",count:8},
    {id:"NEOM-1-3",code:"1.3",nameEn:"Zone Compliance",nameAr:"امتثال المنطقة",topic:"NEOM regulatory compliance",topicAr:"الامتثال التنظيمي لنيوم",templateSet:"governance",count:10},
  ]},
]});

const RSGA_FW = regFW({id:"INST-KSA-RSGA-REDSEA",reg:"REG-KSA-RSGA",nEn:"Red Sea Luxury Tourism Smart Infrastructure",nAr:"البنية التحتية الذكية للسياحة في البحر الأحمر",sectors:["SEC-KSA-SPECIAL-ZONES","SEC-KSA-TOURISM"],mandatory:false,tags:["red-sea","tourism"],domains:[
  {id:"RSG-D1",code:"1",nameEn:"Resort Technology",nameAr:"تقنية المنتجعات",subs:[
    {id:"RSG-1-1",code:"1.1",nameEn:"Guest Experience Tech",nameAr:"تقنية تجربة الضيوف",topic:"luxury resort technology",topicAr:"تقنية المنتجعات الفاخرة",templateSet:"technical",count:8},
    {id:"RSG-1-2",code:"1.2",nameEn:"Environmental Monitoring",nameAr:"المراقبة البيئية",topic:"marine environmental data",topicAr:"بيانات البيئة البحرية",templateSet:"data",count:8},
  ]},
]});

const DGDA_FW = regFW({id:"INST-KSA-DGDA-DIRIYAH",reg:"REG-KSA-DGDA",nEn:"Diriyah Heritage Smart District Technology",nAr:"تقنية الحي الذكي لبوابة الدرعية",sectors:["SEC-KSA-SPECIAL-ZONES","SEC-KSA-TOURISM"],mandatory:false,tags:["diriyah","heritage"],domains:[
  {id:"DGD-D1",code:"1",nameEn:"Heritage District IT",nameAr:"تقنية الحي التراثي",subs:[
    {id:"DGD-1-1",code:"1.1",nameEn:"Smart District Systems",nameAr:"أنظمة الحي الذكي",topic:"heritage smart district",topicAr:"الحي الذكي التراثي",templateSet:"technical",count:8},
    {id:"DGD-1-2",code:"1.2",nameEn:"Cultural Data Governance",nameAr:"حوكمة البيانات الثقافية",topic:"Diriyah cultural data",topicAr:"البيانات الثقافية للدرعية",templateSet:"governance",count:8},
  ]},
]});

const KAEC_FW = regFW({id:"INST-KSA-KAEC-ECON",reg:"REG-KSA-KAEC",nEn:"Economic City IT & Port Technology",nAr:"تقنية المدينة الاقتصادية والميناء",sectors:["SEC-KSA-SPECIAL-ZONES","SEC-KSA-INDUSTRY"],mandatory:false,tags:["economic-city","port"],domains:[
  {id:"KAEC-D1",code:"1",nameEn:"Economic Zone IT",nameAr:"تقنية المنطقة الاقتصادية",subs:[
    {id:"KAEC-1-1",code:"1.1",nameEn:"Zone IT Infrastructure",nameAr:"البنية التحتية لتقنية المنطقة",topic:"economic zone IT",topicAr:"تقنية المنطقة الاقتصادية",templateSet:"technical",count:8},
    {id:"KAEC-1-2",code:"1.2",nameEn:"Tenant Data",nameAr:"بيانات المستأجرين",topic:"economic zone tenant data",topicAr:"بيانات مستأجري المنطقة",templateSet:"data",count:8},
  ]},
]});

const SPARK_FW = regFW({id:"INST-KSA-SPARK-ENERGY",reg:"REG-KSA-SPARK",nEn:"Energy Park OT & Supply Chain IT",nAr:"التقنيات التشغيلية وتقنية سلسلة التوريد لمدينة الطاقة",sectors:["SEC-KSA-SPECIAL-ZONES","SEC-KSA-ENERGY-OG"],mandatory:false,tags:["energy-park","ot"],domains:[
  {id:"SPK-D1",code:"1",nameEn:"Energy Park OT",nameAr:"التقنيات التشغيلية لمدينة الطاقة",subs:[
    {id:"SPK-1-1",code:"1.1",nameEn:"Energy Zone OT",nameAr:"أنظمة منطقة الطاقة",topic:"energy park OT",topicAr:"التقنيات التشغيلية لمدينة الطاقة",templateSet:"technical",count:10},
    {id:"SPK-1-2",code:"1.2",nameEn:"Tenant Compliance",nameAr:"امتثال المستأجرين",topic:"energy park tenant",topicAr:"مستأجري مدينة الطاقة",templateSet:"governance",count:8},
  ]},
]});

const QIDDIYA_FW = regFW({id:"INST-KSA-QIDDIYA-ENT",reg:"REG-KSA-QIDDIYA",nEn:"Entertainment Mega-Project Smart Systems",nAr:"الأنظمة الذكية لمشروع الترفيه الكبير",sectors:["SEC-KSA-SPECIAL-ZONES","SEC-KSA-TOURISM"],mandatory:false,tags:["qiddiya","entertainment"],domains:[
  {id:"QID-D1",code:"1",nameEn:"Theme Park Technology",nameAr:"تقنية المتنزهات",subs:[
    {id:"QID-1-1",code:"1.1",nameEn:"Attraction IoT",nameAr:"إنترنت الأشياء للمرافق",topic:"theme park IoT",topicAr:"إنترنت الأشياء في المتنزهات",templateSet:"technical",count:10},
    {id:"QID-1-2",code:"1.2",nameEn:"Visitor Data",nameAr:"بيانات الزوار",topic:"entertainment visitor data",topicAr:"بيانات زوار الترفيه",templateSet:"data",count:8},
  ]},
]});

const ROSHN_FW = regFW({id:"INST-KSA-ROSHN-COMM",reg:"REG-KSA-ROSHN",nEn:"Smart Community & Residential IoT",nAr:"المجتمعات الذكية وإنترنت الأشياء السكنية",sectors:["SEC-KSA-CONST","SEC-KSA-SPECIAL-ZONES"],mandatory:false,tags:["smart-community","iot"],domains:[
  {id:"RSH-D1",code:"1",nameEn:"Smart Community IT",nameAr:"تقنية المجتمعات الذكية",subs:[
    {id:"RSH-1-1",code:"1.1",nameEn:"Residential IoT",nameAr:"إنترنت الأشياء السكنية",topic:"residential IoT",topicAr:"إنترنت الأشياء السكنية",templateSet:"technical",count:8},
    {id:"RSH-1-2",code:"1.2",nameEn:"Homeowner Data",nameAr:"بيانات أصحاب المنازل",topic:"homeowner data",topicAr:"بيانات أصحاب المنازل",templateSet:"data",count:8},
  ]},
]});

const AMAALA_FW = regFW({id:"INST-KSA-AMAALA-LUX",reg:"REG-KSA-AMAALA",nEn:"Ultra-Luxury Tourism & Wellness Data",nAr:"بيانات السياحة الفاخرة والعافية",sectors:["SEC-KSA-SPECIAL-ZONES","SEC-KSA-TOURISM"],mandatory:false,tags:["luxury","wellness"],domains:[
  {id:"AML-D1",code:"1",nameEn:"Luxury Resort IT",nameAr:"تقنية المنتجعات الفاخرة",subs:[
    {id:"AML-1-1",code:"1.1",nameEn:"Wellness Technology",nameAr:"تقنية العافية",topic:"luxury wellness technology",topicAr:"تقنية العافية الفاخرة",templateSet:"technical",count:8},
    {id:"AML-1-2",code:"1.2",nameEn:"Guest Privacy",nameAr:"خصوصية الضيوف",topic:"luxury guest data",topicAr:"بيانات الضيوف",templateSet:"data",count:8},
  ]},
]});

// ═══ NUCLEAR & SPACE ═══
const NRRC_FW = regFW({id:"INST-KSA-NRRC-NUCLEAR",reg:"REG-KSA-NRRC",nEn:"Nuclear & Radiological Facility Cybersecurity",nAr:"الأمن السيبراني للمنشآت النووية والإشعاعية",sectors:["SEC-KSA-NUCLEAR"],mandatory:true,tags:["nuclear","iaea"],domains:[
  {id:"NRRC-D1",code:"1",nameEn:"Nuclear Facility Security",nameAr:"أمن المنشآت النووية",subs:[
    {id:"NRRC-1-1",code:"1.1",nameEn:"Nuclear ICS/SCADA",nameAr:"أنظمة التحكم النووية",topic:"nuclear facility ICS",topicAr:"أنظمة التحكم النووية",templateSet:"technical",count:10},
    {id:"NRRC-1-2",code:"1.2",nameEn:"Radiological Material Data",nameAr:"بيانات المواد الإشعاعية",topic:"radiological material tracking",topicAr:"تتبع المواد الإشعاعية",templateSet:"data",count:8},
    {id:"NRRC-1-3",code:"1.3",nameEn:"IAEA Compliance",nameAr:"امتثال الوكالة الدولية",topic:"IAEA compliance",topicAr:"امتثال الوكالة الدولية",templateSet:"governance",count:10},
  ]},
]});

const KACSTSPACE_FW = regFW({id:"INST-KSA-KACSTSPACE-SAT",reg:"REG-KSA-KACSTSPACE",nEn:"Satellite Operations & Ground Station Security",nAr:"أمن عمليات الأقمار الصناعية والمحطات الأرضية",sectors:["SEC-KSA-SPACE"],mandatory:true,tags:["satellite","space"],domains:[
  {id:"KACS-D1",code:"1",nameEn:"Satellite Operations IT",nameAr:"تقنية عمليات الأقمار الصناعية",subs:[
    {id:"KACS-1-1",code:"1.1",nameEn:"Satellite Control",nameAr:"التحكم في الأقمار الصناعية",topic:"satellite control",topicAr:"التحكم في الأقمار الصناعية",templateSet:"technical",count:10},
    {id:"KACS-1-2",code:"1.2",nameEn:"Space Data Protection",nameAr:"حماية البيانات الفضائية",topic:"satellite data",topicAr:"بيانات الأقمار الصناعية",templateSet:"data",count:8},
  ]},
]});

const SAUDISAT_FW = regFW({id:"INST-KSA-SAUDISAT-BCAST",reg:"REG-KSA-SAUDISAT",nEn:"Satellite Broadcast & Uplink Security",nAr:"أمن البث الفضائي ورابط الصعود",sectors:["SEC-KSA-SPACE","SEC-KSA-TEL-OP"],mandatory:true,tags:["satellite","broadcast"],domains:[
  {id:"SSAT-D1",code:"1",nameEn:"Broadcast Satellite IT",nameAr:"تقنية الأقمار الصناعية للبث",subs:[
    {id:"SSAT-1-1",code:"1.1",nameEn:"Transponder Management",nameAr:"إدارة أجهزة الإرسال",topic:"satellite transponder",topicAr:"أجهزة إرسال الأقمار الصناعية",templateSet:"technical",count:8},
    {id:"SSAT-1-2",code:"1.2",nameEn:"Uplink Security",nameAr:"أمن رابط الصعود",topic:"satellite uplink security",topicAr:"أمن رابط الصعود",templateSet:"technical",count:8},
  ]},
]});

// ═══ DIGITAL ECONOMY ═══
const FINTECH_FW = regFW({id:"INST-KSA-FINTECH-SAND",reg:"REG-KSA-FINTECH",nEn:"Fintech Sandbox & Digital Payment Compliance",nAr:"البيئة التجريبية للتقنية المالية والمدفوعات الرقمية",sectors:["SEC-KSA-FIN-FINTECH"],mandatory:true,tags:["fintech","sandbox"],domains:[
  {id:"FNT-D1",code:"1",nameEn:"Fintech Platform Security",nameAr:"أمن منصات التقنية المالية",subs:[
    {id:"FNT-1-1",code:"1.1",nameEn:"Sandbox Controls",nameAr:"ضوابط البيئة التجريبية",topic:"fintech sandbox",topicAr:"البيئة التجريبية للتقنية المالية",templateSet:"technical",count:10},
    {id:"FNT-1-2",code:"1.2",nameEn:"Payment Data Security",nameAr:"أمن بيانات المدفوعات",topic:"digital payment data",topicAr:"بيانات المدفوعات الرقمية",templateSet:"data",count:8},
    {id:"FNT-1-3",code:"1.3",nameEn:"Fintech Licensing",nameAr:"ترخيص التقنية المالية",topic:"fintech licensing",topicAr:"ترخيص التقنية المالية",templateSet:"governance",count:10},
  ]},
]});

const MADA_FW = regFW({id:"INST-KSA-MADA-PAY",reg:"REG-KSA-MADA",nEn:"Payment Network & PCI Compliance",nAr:"شبكة المدفوعات وامتثال PCI",sectors:["SEC-KSA-FIN-FINTECH","SEC-KSA-FIN-BANK"],mandatory:true,tags:["payment","pci"],domains:[
  {id:"MADA-D1",code:"1",nameEn:"Payment Network Security",nameAr:"أمن شبكة المدفوعات",subs:[
    {id:"MADA-1-1",code:"1.1",nameEn:"Payment Processing",nameAr:"معالجة المدفوعات",topic:"payment processing",topicAr:"معالجة المدفوعات",templateSet:"technical",count:10},
    {id:"MADA-1-2",code:"1.2",nameEn:"Transaction Data",nameAr:"بيانات المعاملات",topic:"transaction data",topicAr:"بيانات المعاملات",templateSet:"data",count:8},
  ]},
]});

const SIMAH_FW = regFW({id:"INST-KSA-SIMAH-CREDIT",reg:"REG-KSA-SIMAH",nEn:"Credit Data Governance & Consumer Financial Data",nAr:"حوكمة البيانات الائتمانية وبيانات المستهلك المالية",sectors:["SEC-KSA-FIN-BANK","SEC-KSA-FIN-FINTECH"],mandatory:true,tags:["credit","consumer-data"],domains:[
  {id:"SIM-D1",code:"1",nameEn:"Credit Bureau IT",nameAr:"تقنية المكتب الائتماني",subs:[
    {id:"SIM-1-1",code:"1.1",nameEn:"Credit Data Protection",nameAr:"حماية البيانات الائتمانية",topic:"credit bureau data",topicAr:"بيانات المكتب الائتماني",templateSet:"data",count:8},
    {id:"SIM-1-2",code:"1.2",nameEn:"Credit Platform Security",nameAr:"أمن منصة الائتمان",topic:"credit reporting platform",topicAr:"منصة التقارير الائتمانية",templateSet:"technical",count:10},
  ]},
]});

const VAC_FW = regFW({id:"INST-KSA-VAC-CRYPTO",reg:"REG-KSA-VAC",nEn:"Virtual Assets & Blockchain Governance",nAr:"حوكمة الأصول الافتراضية والبلوكشين",sectors:["SEC-KSA-FIN-FINTECH","SEC-KSA-FIN-CAPITAL"],mandatory:true,tags:["crypto","blockchain"],domains:[
  {id:"VAC-D1",code:"1",nameEn:"Virtual Asset Security",nameAr:"أمن الأصول الافتراضية",subs:[
    {id:"VAC-1-1",code:"1.1",nameEn:"Blockchain Platform",nameAr:"منصة البلوكشين",topic:"blockchain platform",topicAr:"منصة البلوكشين",templateSet:"technical",count:10},
    {id:"VAC-1-2",code:"1.2",nameEn:"AML/KYC Data",nameAr:"بيانات مكافحة غسل الأموال",topic:"AML/KYC data",topicAr:"بيانات مكافحة غسل الأموال",templateSet:"data",count:8},
    {id:"VAC-1-3",code:"1.3",nameEn:"Virtual Asset Compliance",nameAr:"امتثال الأصول الافتراضية",topic:"virtual asset compliance",topicAr:"امتثال الأصول الافتراضية",templateSet:"governance",count:10},
  ]},
]});

const OBF_FW = regFW({id:"INST-KSA-OBF-OPENBANK",reg:"REG-KSA-OBF",nEn:"Open Banking API & Consent Management",nAr:"واجهات البرمجة المصرفية المفتوحة وإدارة الموافقة",sectors:["SEC-KSA-FIN-BANK","SEC-KSA-FIN-FINTECH"],mandatory:true,tags:["open-banking","api"],domains:[
  {id:"OBF-D1",code:"1",nameEn:"Open Banking API Security",nameAr:"أمن واجهات البرمجة المصرفية",subs:[
    {id:"OBF-1-1",code:"1.1",nameEn:"API Security Controls",nameAr:"ضوابط أمن واجهات البرمجة",topic:"open banking API",topicAr:"واجهات البرمجة المصرفية المفتوحة",templateSet:"technical",count:10},
    {id:"OBF-1-2",code:"1.2",nameEn:"Consent Management",nameAr:"إدارة الموافقة",topic:"consent management data",topicAr:"بيانات إدارة الموافقة",templateSet:"data",count:8},
    {id:"OBF-1-3",code:"1.3",nameEn:"TPP Governance",nameAr:"حوكمة مقدمي الخدمات",topic:"third-party provider compliance",topicAr:"امتثال مقدمي الخدمات",templateSet:"governance",count:10},
  ]},
]});

// ═══ NONPROFIT ═══
const NCNP_FW = regFW({id:"INST-KSA-NCNP-NP",reg:"REG-KSA-NCNP",nEn:"Non-Profit Governance & Donor Data Protection",nAr:"حوكمة القطاع غير الربحي وحماية بيانات المتبرعين",sectors:["SEC-KSA-NONPROFIT"],mandatory:false,tags:["nonprofit","donor"],domains:[
  {id:"NCNP-D1",code:"1",nameEn:"Non-Profit IT",nameAr:"تقنية القطاع غير الربحي",subs:[
    {id:"NCNP-1-1",code:"1.1",nameEn:"Donor Data Protection",nameAr:"حماية بيانات المتبرعين",topic:"donor data",topicAr:"بيانات المتبرعين",templateSet:"data",count:8},
    {id:"NCNP-1-2",code:"1.2",nameEn:"Charitable Transparency",nameAr:"الشفافية الخيرية",topic:"charitable transparency",topicAr:"الشفافية الخيرية",templateSet:"governance",count:8},
  ]},
]});

const SRCA_FW = regFW({id:"INST-KSA-SRCA-EMS",reg:"REG-KSA-SRCA",nEn:"Emergency Medical & Ambulance Telemetry",nAr:"الطوارئ الطبية وقياس عن بعد لسيارات الإسعاف",sectors:["SEC-KSA-HEALTH-HOSP","SEC-KSA-NONPROFIT"],mandatory:true,tags:["emergency","ambulance"],domains:[
  {id:"SRCA-D1",code:"1",nameEn:"Emergency IT Systems",nameAr:"أنظمة تقنية الطوارئ",subs:[
    {id:"SRCA-1-1",code:"1.1",nameEn:"Ambulance Telemetry",nameAr:"قياس عن بعد للإسعاف",topic:"ambulance telemetry",topicAr:"قياس عن بعد لسيارات الإسعاف",templateSet:"technical",count:8},
    {id:"SRCA-1-2",code:"1.2",nameEn:"Patient Data Protection",nameAr:"حماية بيانات المرضى",topic:"emergency patient data",topicAr:"بيانات مرضى الطوارئ",templateSet:"data",count:8},
  ]},
]});

const KSR_FW = regFW({id:"INST-KSA-KSR-AID",reg:"REG-KSA-KSR",nEn:"Humanitarian Data Governance & Aid Compliance",nAr:"حوكمة البيانات الإنسانية وامتثال المساعدات",sectors:["SEC-KSA-NONPROFIT"],mandatory:false,tags:["humanitarian","aid"],domains:[
  {id:"KSR-D1",code:"1",nameEn:"Humanitarian Data IT",nameAr:"تقنية البيانات الإنسانية",subs:[
    {id:"KSR-1-1",code:"1.1",nameEn:"Beneficiary Data",nameAr:"بيانات المستفيدين",topic:"beneficiary data",topicAr:"بيانات المستفيدين",templateSet:"data",count:8},
    {id:"KSR-1-2",code:"1.2",nameEn:"Aid Distribution IT",nameAr:"تقنية توزيع المساعدات",topic:"humanitarian aid distribution",topicAr:"توزيع المساعدات الإنسانية",templateSet:"governance",count:8},
  ]},
]});

// ═══ INTERNATIONAL ═══
const ISACA_FW = regFW({id:"INST-INTL-COBIT",reg:"REG-INTL-ISACA",nEn:"COBIT 2019 IT Governance Framework",nAr:"إطار حوكمة تقنية المعلومات COBIT 2019",sectors:["all"],mandatory:false,tags:["cobit","it-governance"],domains:[
  {id:"COBIT-D1",code:"1",nameEn:"IT Governance & Management",nameAr:"حوكمة وإدارة تقنية المعلومات",subs:[
    {id:"COBIT-1-1",code:"1.1",nameEn:"IT Strategic Alignment",nameAr:"المواءمة الاستراتيجية",topic:"IT governance",topicAr:"حوكمة تقنية المعلومات",templateSet:"governance",count:10},
    {id:"COBIT-1-2",code:"1.2",nameEn:"IT Service Management",nameAr:"إدارة خدمات تقنية المعلومات",topic:"IT service management",topicAr:"إدارة خدمات تقنية المعلومات",templateSet:"technical",count:10},
    {id:"COBIT-1-3",code:"1.3",nameEn:"IT Risk Management",nameAr:"إدارة مخاطر تقنية المعلومات",topic:"IT risk management",topicAr:"إدارة مخاطر تقنية المعلومات",templateSet:"resilience",count:6},
  ]},
]});

export const REGULATOR_FRAMEWORKS_BATCH6: FrameworkDef[] = [
  MOHU_FW, MOIA_FW, GPHA_FW, RCZM_FW, AWQAF_FW,
  REGA_FW, NHC_FW, SCA_FW, RCJY_FW, MODON_FW,
  GCAM_FW, MOS_FW, SPL_FW, SADC_FW, MOM_FW, SOC_FW,
  MIM_FW, MAADEN_FW, SARI_FW, SABIC_FW,
  NEOM_FW, RSGA_FW, DGDA_FW, KAEC_FW, SPARK_FW, QIDDIYA_FW, ROSHN_FW, AMAALA_FW,
  NRRC_FW, KACSTSPACE_FW, SAUDISAT_FW,
  FINTECH_FW, MADA_FW, SIMAH_FW, VAC_FW, OBF_FW,
  NCNP_FW, SRCA_FW, KSR_FW,
  ISACA_FW,
];
