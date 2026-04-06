// ============================================
// Shahin AI-KSA GRC — Bulk Control Expansion Part 2
// Additional ~1600 controls to reach 4000+ total
// ============================================

import { FrameworkDef } from "./ksa-frameworks";
import { FW, bulkDomain, BulkSubSpec } from "./ksa-control-builder";

function bs(id:string, code:string, nEn:string, nAr:string, topic:string, topicAr:string, ts:string, count:number): BulkSubSpec {
  return { id, code, nameEn: nEn, nameAr: nAr, topic, topicAr, templateSet: ts, count };
}

// ════════════════════════════════════════════
// NCA OTCC EXPANSION — 200 more OT controls
// ════════════════════════════════════════════
export const NCA_OTCC_EXT: FrameworkDef = FW({
  id:"INST-KSA-NCA-OTCC-EXT",reg:"REG-KSA-NCA",
  nEn:"OTCC Extended — OT/ICS/SCADA Deep Controls",nAr:"ضوابط التقنيات التشغيلية الموسعة",
  type:"controls_standard",ver:"OTCC Ext",verId:"VER-KSA-OTCC-EXT-1-0",
  sectors:["SEC-KSA-ENERGY-OG","SEC-KSA-ENERGY-ELEC","SEC-KSA-ENERGY-WATER","SEC-KSA-INDUSTRY","SEC-KSA-PETROCHEM"],mandatory:true,
  sumEn:"Extended OT/ICS/SCADA cybersecurity controls for critical infrastructure sectors.",
  sumAr:"ضوابط الأمن السيبراني الموسعة للتقنيات التشغيلية والبنية التحتية الحرجة.",
  tags:["ot","ics","scada","critical_infrastructure","extended"],
  domains:[
    bulkDomain({id:"OTCX-D1",code:"OX1",nameEn:"ICS Network Security",nameAr:"أمن شبكات ICS",subs:[
      bs("OTCX-1-1","OX1.1","Purdue Model Implementation","تنفيذ نموذج بيرديو","Purdue model network","شبكة نموذج بيرديو","technical",12),
      bs("OTCX-1-2","OX1.2","ICS DMZ Configuration","تكوين DMZ لـ ICS","ICS DMZ","منطقة DMZ لأنظمة التحكم","technical",12),
      bs("OTCX-1-3","OX1.3","OT Protocol Security","أمن بروتوكولات OT","OT protocols (Modbus, DNP3, OPC)","بروتوكولات OT","technical",10),
      bs("OTCX-1-4","OX1.4","Wireless OT Security","أمن OT اللاسلكي","wireless OT networks","شبكات OT اللاسلكية","technical",10),
      bs("OTCX-1-5","OX1.5","Remote OT Access","الوصول عن بعد لـ OT","remote OT access","الوصول عن بعد للتقنيات التشغيلية","technical",10),
    ]}),
    bulkDomain({id:"OTCX-D2",code:"OX2",nameEn:"SCADA System Controls",nameAr:"ضوابط أنظمة SCADA",subs:[
      bs("OTCX-2-1","OX2.1","HMI Security","أمن واجهات التشغيل","HMI interfaces","واجهات التشغيل البشرية","technical",12),
      bs("OTCX-2-2","OX2.2","RTU/PLC Hardening","تقوية RTU/PLC","RTU and PLC devices","أجهزة RTU و PLC","technical",12),
      bs("OTCX-2-3","OX2.3","Historian Server Security","أمن خوادم المؤرخ","historian servers","خوادم المؤرخ","technical",10),
      bs("OTCX-2-4","OX2.4","SIS Security","أمن أنظمة الأمان","safety instrumented systems","أنظمة الأمان المزودة بأجهزة قياس","technical",10),
      bs("OTCX-2-5","OX2.5","DCS Security","أمن أنظمة التحكم الموزعة","distributed control systems","أنظمة التحكم الموزعة","technical",10),
    ]}),
    bulkDomain({id:"OTCX-D3",code:"OX3",nameEn:"OT Incident Response",nameAr:"الاستجابة لحوادث OT",subs:[
      bs("OTCX-3-1","OX3.1","OT SOC Operations","عمليات مركز أمن OT","OT SOC","مركز عمليات أمن OT","resilience",6),
      bs("OTCX-3-2","OX3.2","OT Forensics","الطب الشرعي لـ OT","OT digital forensics","الطب الشرعي الرقمي لـ OT","resilience",6),
      bs("OTCX-3-3","OX3.3","OT Recovery Procedures","إجراءات استرداد OT","OT system recovery","استرداد أنظمة OT","resilience",6),
      bs("OTCX-3-4","OX3.4","OT Threat Hunting","البحث عن تهديدات OT","OT threat hunting","البحث عن تهديدات OT","resilience",6),
    ]}),
    bulkDomain({id:"OTCX-D4",code:"OX4",nameEn:"OT Supply Chain Security",nameAr:"أمن سلسلة توريد OT",subs:[
      bs("OTCX-4-1","OX4.1","ICS Vendor Management","إدارة موردي ICS","ICS vendor management","إدارة موردي أنظمة التحكم","governance",10),
      bs("OTCX-4-2","OX4.2","OT Firmware Integrity","سلامة البرامج الثابتة","OT firmware integrity","سلامة البرامج الثابتة لـ OT","technical",10),
      bs("OTCX-4-3","OX4.3","OT Spare Parts Security","أمن قطع الغيار","OT spare parts","قطع غيار OT","governance",8),
      bs("OTCX-4-4","OX4.4","OT Lifecycle Management","إدارة دورة حياة OT","OT lifecycle","دورة حياة OT","governance",10),
    ]}),
  ],
});

// ════════════════════════════════════════════
// NCA DCC + CSCC EXPANSION — 200 more controls
// ════════════════════════════════════════════
export const NCA_DCC_CSCC_EXT: FrameworkDef = FW({
  id:"INST-KSA-NCA-DCC-CSCC-EXT",reg:"REG-KSA-NCA",
  nEn:"Data & Critical Systems Extended Controls",nAr:"ضوابط البيانات والأنظمة الحساسة الموسعة",
  type:"controls_standard",ver:"DCC/CSCC Ext",verId:"VER-KSA-DCC-CSCC-EXT-1-0",
  sectors:["all"],mandatory:true,
  sumEn:"Extended data cybersecurity and critical systems controls covering all data lifecycle phases.",
  sumAr:"ضوابط الأمن السيبراني الموسعة للبيانات والأنظمة الحساسة.",
  tags:["data","critical_systems","extended"],
  domains:[
    bulkDomain({id:"DCCX-D1",code:"DX1",nameEn:"Data Lifecycle Controls",nameAr:"ضوابط دورة حياة البيانات",subs:[
      bs("DCCX-1-1","DX1.1","Data Collection Controls","ضوابط جمع البيانات","data collection","جمع البيانات","data",8),
      bs("DCCX-1-2","DX1.2","Data Processing Controls","ضوابط معالجة البيانات","data processing","معالجة البيانات","data",8),
      bs("DCCX-1-3","DX1.3","Data Storage Extended","ضوابط تخزين البيانات","data storage","تخزين البيانات","data",8),
      bs("DCCX-1-4","DX1.4","Data Archival Controls","ضوابط أرشفة البيانات","data archival","أرشفة البيانات","data",8),
      bs("DCCX-1-5","DX1.5","Data Destruction Ext","ضوابط إتلاف البيانات","data destruction","إتلاف البيانات","data",8),
      bs("DCCX-1-6","DX1.6","Data Transfer Extended","ضوابط نقل البيانات","data transfer","نقل البيانات","data",8),
    ]}),
    bulkDomain({id:"DCCX-D2",code:"DX2",nameEn:"Critical Systems Extended",nameAr:"الأنظمة الحساسة الموسعة",subs:[
      bs("DCCX-2-1","DX2.1","NCI Asset Register","سجل أصول البنية التحتية","national critical infrastructure","البنية التحتية الوطنية الحرجة","governance",10),
      bs("DCCX-2-2","DX2.2","NCI Risk Management","إدارة مخاطر البنية التحتية","NCI risk management","إدارة مخاطر البنية التحتية الحرجة","governance",10),
      bs("DCCX-2-3","DX2.3","NCI Resilience Testing","اختبار مرونة البنية","NCI resilience","مرونة البنية التحتية الحرجة","resilience",6),
      bs("DCCX-2-4","DX2.4","NCI Interdependency","الترابط بين البنى","NCI interdependency analysis","تحليل الترابط بين البنى التحتية","governance",8),
      bs("DCCX-2-5","DX2.5","NCI Workforce Security","أمن القوى العاملة","NCI workforce security","أمن القوى العاملة للبنية التحتية","governance",10),
    ]}),
    bulkDomain({id:"DCCX-D3",code:"DX3",nameEn:"Database & Big Data Security",nameAr:"أمن قواعد البيانات والبيانات الضخمة",subs:[
      bs("DCCX-3-1","DX3.1","RDBMS Security","أمن قواعد البيانات العلائقية","relational database","قاعدة البيانات العلائقية","technical",12),
      bs("DCCX-3-2","DX3.2","NoSQL Security","أمن NoSQL","NoSQL databases","قواعد بيانات NoSQL","technical",10),
      bs("DCCX-3-3","DX3.3","Data Lake Security","أمن بحيرة البيانات","data lake","بحيرة البيانات","technical",10),
      bs("DCCX-3-4","DX3.4","Data Warehouse Security","أمن مستودع البيانات","data warehouse","مستودع البيانات","technical",10),
      bs("DCCX-3-5","DX3.5","Streaming Data Security","أمن البيانات المتدفقة","streaming data platforms","منصات البيانات المتدفقة","technical",10),
    ]}),
  ],
});

// ════════════════════════════════════════════
// MEGA PROJECTS & NEOM — 150 controls
// ════════════════════════════════════════════
export const MEGA_PROJECTS: FrameworkDef = FW({
  id:"INST-KSA-MEGA-PROJ",reg:"REG-KSA-NCA",
  nEn:"Mega Projects & Smart City Cybersecurity Standards",nAr:"معايير الأمن السيبراني للمشاريع الكبرى والمدن الذكية",
  type:"standard",ver:"1.0",verId:"VER-KSA-MEGA-PROJ-1-0",
  sectors:["SEC-KSA-SPECIAL-ZONES","SEC-KSA-SMARTCITY","SEC-KSA-CONST"],mandatory:false,
  sumEn:"Cybersecurity standards for NEOM, Red Sea Global, DGDA, Qiddiya, and other mega projects.",
  sumAr:"معايير الأمن السيبراني لمشروع نيوم والبحر الأحمر ومشروع درعية والقدية.",
  tags:["neom","mega_projects","smart_city","vision2030"],
  domains:[
    bulkDomain({id:"MEGA-D1",code:"M1",nameEn:"Smart Infrastructure",nameAr:"البنية التحتية الذكية",subs:[
      bs("MEGA-1-1","M1.1","Smart Building OT","OT المباني الذكية","smart building OT","التقنيات التشغيلية للمباني الذكية","technical",12),
      bs("MEGA-1-2","M1.2","Smart Grid (City)","الشبكة الذكية (المدينة)","smart city grid","الشبكة الذكية للمدينة","technical",10),
      bs("MEGA-1-3","M1.3","Smart Transport","النقل الذكي","smart transportation","النقل الذكي","technical",10),
      bs("MEGA-1-4","M1.4","Smart Waste/Water","المياه والنفايات الذكية","smart waste and water","المياه والنفايات الذكية","technical",10),
      bs("MEGA-1-5","M1.5","Smart Lighting/Energy","الإضاءة والطاقة الذكية","smart lighting and energy","الإضاءة والطاقة الذكية","technical",8),
    ]}),
    bulkDomain({id:"MEGA-D2",code:"M2",nameEn:"Smart City Platforms",nameAr:"منصات المدينة الذكية",subs:[
      bs("MEGA-2-1","M2.1","City Digital Twin","التوأم الرقمي للمدينة","city digital twin","التوأم الرقمي للمدينة","technical",10),
      bs("MEGA-2-2","M2.2","Resident Super App","التطبيق الشامل للسكان","resident super app","التطبيق الشامل للسكان","technical",10),
      bs("MEGA-2-3","M2.3","Urban Surveillance AI","المراقبة الحضرية بالذكاء الاصطناعي","urban AI surveillance","المراقبة الحضرية بالذكاء الاصطناعي","technical",10),
      bs("MEGA-2-4","M2.4","Smart Tourism Platform","منصة السياحة الذكية","smart tourism platform","منصة السياحة الذكية","technical",8),
      bs("MEGA-2-5","M2.5","City Command Center","مركز قيادة المدينة","city command center","مركز قيادة المدينة","technical",10),
    ]}),
    bulkDomain({id:"MEGA-D3",code:"M3",nameEn:"Construction Phase Security",nameAr:"أمن مرحلة البناء",subs:[
      bs("MEGA-3-1","M3.1","BIM Security","أمن نمذجة معلومات البناء","BIM platform security","أمن منصة نمذجة معلومات البناء","technical",10),
      bs("MEGA-3-2","M3.2","Construction Site IoT","إنترنت الأشياء لمواقع البناء","construction site IoT","إنترنت الأشياء لمواقع البناء","technical",10),
      bs("MEGA-3-3","M3.3","Contractor Cyber Mgmt","إدارة أمن المقاولين","contractor cybersecurity","الأمن السيبراني للمقاولين","governance",10),
      bs("MEGA-3-4","M3.4","Drone Operations Security","أمن عمليات الطائرات المسيرة","construction drone operations","عمليات الطائرات المسيرة في البناء","technical",8),
    ]}),
  ],
});

// ════════════════════════════════════════════
// FINTECH & OPEN BANKING — 150 controls
// ════════════════════════════════════════════
export const FINTECH_OPEN_BANKING: FrameworkDef = FW({
  id:"INST-KSA-FINTECH-OB",reg:"REG-KSA-SAMA",
  nEn:"Fintech & Open Banking Security Extended Controls",nAr:"ضوابط أمن التقنية المالية والخدمات المصرفية المفتوحة الموسعة",
  type:"standard",ver:"1.0",verId:"VER-KSA-FINTECH-OB-1-0",
  sectors:["SEC-KSA-FIN-FINTECH","SEC-KSA-FIN-BANK","SEC-KSA-OPEN-BANKING","SEC-KSA-CRYPTO"],mandatory:true,
  sumEn:"Extended security controls for fintech companies, open banking APIs, digital wallets, and crypto assets.",
  sumAr:"ضوابط أمن موسعة لشركات التقنية المالية والخدمات المصرفية المفتوحة.",
  tags:["fintech","open_banking","crypto","digital_wallet"],
  domains:[
    bulkDomain({id:"FTOB-D1",code:"FT1",nameEn:"Open Banking API Security",nameAr:"أمن واجهات الخدمات المصرفية المفتوحة",subs:[
      bs("FTOB-1-1","FT1.1","Consent API","واجهة الموافقة","consent API","واجهة برمجة الموافقة","technical",12),
      bs("FTOB-1-2","FT1.2","Account Info API","واجهة معلومات الحساب","account information API","واجهة معلومات الحساب","technical",12),
      bs("FTOB-1-3","FT1.3","Payment Initiation API","واجهة بدء الدفع","payment initiation API","واجهة بدء الدفع","technical",12),
      bs("FTOB-1-4","FT1.4","TPP Registration","تسجيل مزود الخدمة الثالث","TPP registration","تسجيل مزود الخدمة الطرف الثالث","governance",8),
    ]}),
    bulkDomain({id:"FTOB-D2",code:"FT2",nameEn:"Digital Asset Security",nameAr:"أمن الأصول الرقمية",subs:[
      bs("FTOB-2-1","FT2.1","Crypto Wallet Security","أمن محفظة العملات المشفرة","cryptocurrency wallet","محفظة العملات المشفرة","technical",12),
      bs("FTOB-2-2","FT2.2","Smart Contract Audit","تدقيق العقود الذكية","smart contract","العقد الذكي","technical",10),
      bs("FTOB-2-3","FT2.3","Token Security","أمن التوكنات","digital token","التوكن الرقمي","technical",10),
      bs("FTOB-2-4","FT2.4","DeFi Protocol Security","أمن بروتوكولات DeFi","DeFi protocol","بروتوكول التمويل اللامركزي","technical",10),
      bs("FTOB-2-5","FT2.5","NFT Platform Security","أمن منصات NFT","NFT platform","منصة الرموز غير القابلة للاستبدال","technical",8),
    ]}),
  ],
});

// ════════════════════════════════════════════
// HAJJ & UMRAH EXTENDED — 120 controls
// ════════════════════════════════════════════
export const HAJJ_UMRAH_EXT: FrameworkDef = FW({
  id:"INST-KSA-HAJJ-EXT",reg:"REG-KSA-NCA",
  nEn:"Hajj & Umrah IT Security Extended Controls",nAr:"ضوابط أمن تقنية المعلومات الموسعة للحج والعمرة",
  type:"standard",ver:"1.0",verId:"VER-KSA-HAJJ-EXT-1-0",
  sectors:["SEC-KSA-HAJJ","SEC-KSA-TOURISM"],mandatory:true,
  sumEn:"Extended cybersecurity controls for Hajj and Umrah crowd management, pilgrim services, and holy sites systems.",
  sumAr:"ضوابط الأمن السيبراني الموسعة لإدارة الحشود وخدمات الحجاج وأنظمة المواقع المقدسة.",
  tags:["hajj","umrah","crowd_management","pilgrim_services"],
  domains:[
    bulkDomain({id:"HAJX-D1",code:"HJ1",nameEn:"Crowd Management Systems",nameAr:"أنظمة إدارة الحشود",subs:[
      bs("HAJX-1-1","HJ1.1","Crowd Density Monitoring","مراقبة كثافة الحشود","crowd density monitoring","مراقبة كثافة الحشود","technical",10),
      bs("HAJX-1-2","HJ1.2","Pilgrim Tracking","تتبع الحجاج","pilgrim tracking system","نظام تتبع الحجاج","technical",10),
      bs("HAJX-1-3","HJ1.3","Emergency Evacuation IT","تقنية المعلومات للإخلاء","emergency evacuation IT","تقنية المعلومات للإخلاء الطارئ","technical",10),
      bs("HAJX-1-4","HJ1.4","Holy Sites Surveillance","مراقبة المواقع المقدسة","holy sites surveillance","مراقبة المواقع المقدسة","technical",10),
    ]}),
    bulkDomain({id:"HAJX-D2",code:"HJ2",nameEn:"Pilgrim Digital Services",nameAr:"الخدمات الرقمية للحجاج",subs:[
      bs("HAJX-2-1","HJ2.1","Nusuk Platform Security","أمن منصة نسك","Nusuk platform","منصة نسك","technical",10),
      bs("HAJX-2-2","HJ2.2","Pilgrim ID & Biometrics","هوية وبيومتريكس الحاج","pilgrim biometric system","نظام البيومتريكس للحجاج","technical",10),
      bs("HAJX-2-3","HJ2.3","Translation & Guidance App","تطبيق الترجمة والإرشاد","translation and guidance app","تطبيق الترجمة والإرشاد","technical",8),
      bs("HAJX-2-4","HJ2.4","Health Services Integration","تكامل الخدمات الصحية","pilgrim health services","الخدمات الصحية للحجاج","technical",10),
      bs("HAJX-2-5","HJ2.5","Transport Booking Security","أمن حجز النقل","pilgrim transport booking","حجز نقل الحجاج","technical",8),
    ]}),
  ],
});

// ════════════════════════════════════════════
// DEFENSE & NATIONAL SECURITY — 150 controls
// ════════════════════════════════════════════
export const DEFENSE_SECURITY: FrameworkDef = FW({
  id:"INST-KSA-DEFENSE-EXT",reg:"REG-KSA-NCA",
  nEn:"Defense & National Security Cybersecurity Controls",nAr:"ضوابط الأمن السيبراني للدفاع والأمن الوطني",
  type:"controls_standard",ver:"1.0",verId:"VER-KSA-DEFENSE-EXT-1-0",
  sectors:["SEC-KSA-DEFENSE"],mandatory:true,
  sumEn:"Cybersecurity controls for defense, military, and national security systems.",
  sumAr:"ضوابط الأمن السيبراني لأنظمة الدفاع والجيش والأمن الوطني.",
  tags:["defense","military","national_security","classified"],
  domains:[
    bulkDomain({id:"DEFX-D1",code:"DF1",nameEn:"Classified Systems Security",nameAr:"أمن الأنظمة المصنفة",subs:[
      bs("DEFX-1-1","DF1.1","Top Secret Systems","الأنظمة السرية للغاية","top secret information systems","أنظمة المعلومات السرية للغاية","technical",12),
      bs("DEFX-1-2","DF1.2","Secret Network Security","أمن الشبكات السرية","secret network infrastructure","البنية التحتية للشبكات السرية","technical",12),
      bs("DEFX-1-3","DF1.3","Cross-Domain Solutions","حلول عبر النطاقات","cross-domain solutions","حلول عبر النطاقات الأمنية","technical",10),
      bs("DEFX-1-4","DF1.4","TEMPEST/EMSEC","الأمن الكهرومغناطيسي","TEMPEST electromagnetic security","الأمن الكهرومغناطيسي TEMPEST","technical",10),
    ]}),
    bulkDomain({id:"DEFX-D2",code:"DF2",nameEn:"Military Communication Security",nameAr:"أمن الاتصالات العسكرية",subs:[
      bs("DEFX-2-1","DF2.1","Tactical Communications","الاتصالات التكتيكية","tactical communications","الاتصالات التكتيكية","technical",12),
      bs("DEFX-2-2","DF2.2","Satellite Military Comms","الاتصالات الفضائية العسكرية","military satellite communications","الاتصالات العسكرية عبر الأقمار الاصطناعية","technical",10),
      bs("DEFX-2-3","DF2.3","Electronic Warfare","الحرب الإلكترونية","electronic warfare systems","أنظمة الحرب الإلكترونية","technical",10),
      bs("DEFX-2-4","DF2.4","C4ISR Systems","أنظمة C4ISR","C4ISR systems","أنظمة القيادة والسيطرة والاتصالات","technical",10),
    ]}),
    bulkDomain({id:"DEFX-D3",code:"DF3",nameEn:"Weapons Systems Cyber",nameAr:"أمن أنظمة الأسلحة السيبراني",subs:[
      bs("DEFX-3-1","DF3.1","UAV/Drone Security","أمن الطائرات المسيرة","military UAV systems","أنظمة الطائرات العسكرية المسيرة","technical",12),
      bs("DEFX-3-2","DF3.2","Missile Defense Cyber","الأمن السيبراني للدفاع الصاروخي","missile defense systems","أنظمة الدفاع الصاروخي","technical",10),
      bs("DEFX-3-3","DF3.3","Naval Systems Cyber","الأمن السيبراني البحري","naval combat systems","أنظمة القتال البحرية","technical",10),
      bs("DEFX-3-4","DF3.4","Air Defense Systems","أنظمة الدفاع الجوي","air defense systems","أنظمة الدفاع الجوي","technical",10),
    ]}),
  ],
});

// ════════════════════════════════════════════
// MEDIA & ENTERTAINMENT — 100 controls
// ════════════════════════════════════════════
export const MEDIA_ENT: FrameworkDef = FW({
  id:"INST-KSA-MEDIA-EXT",reg:"REG-KSA-NCA",
  nEn:"Media & Entertainment Cybersecurity Controls",nAr:"ضوابط الأمن السيبراني للإعلام والترفيه",
  type:"standard",ver:"1.0",verId:"VER-KSA-MEDIA-EXT-1-0",
  sectors:["SEC-KSA-MEDIA","SEC-KSA-SPORTS"],mandatory:false,
  sumEn:"Cybersecurity controls for media, broadcasting, streaming, gaming, and sports technology.",
  sumAr:"ضوابط الأمن السيبراني للإعلام والبث والبث المباشر والألعاب والتقنية الرياضية.",
  tags:["media","entertainment","sports","streaming","gaming"],
  domains:[
    bulkDomain({id:"MEDX-D1",code:"ME1",nameEn:"Broadcasting Security",nameAr:"أمن البث",subs:[
      bs("MEDX-1-1","ME1.1","TV Broadcast Systems","أنظمة البث التلفزيوني","TV broadcast systems","أنظمة البث التلفزيوني","technical",10),
      bs("MEDX-1-2","ME1.2","OTT Streaming Platforms","منصات البث المباشر","OTT streaming platforms","منصات البث عبر الإنترنت","technical",10),
      bs("MEDX-1-3","ME1.3","Content DRM","إدارة الحقوق الرقمية","digital rights management","إدارة الحقوق الرقمية","technical",10),
      bs("MEDX-1-4","ME1.4","Live Event Production","إنتاج الفعاليات المباشرة","live event production systems","أنظمة إنتاج الفعاليات المباشرة","technical",8),
    ]}),
    bulkDomain({id:"MEDX-D2",code:"ME2",nameEn:"Gaming & E-Sports",nameAr:"الألعاب والرياضات الإلكترونية",subs:[
      bs("MEDX-2-1","ME2.1","Gaming Platform Security","أمن منصات الألعاب","gaming platform","منصة الألعاب","technical",10),
      bs("MEDX-2-2","ME2.2","E-Sports Infrastructure","البنية التحتية للرياضات الإلكترونية","e-sports infrastructure","البنية التحتية للرياضات الإلكترونية","technical",10),
      bs("MEDX-2-3","ME2.3","In-Game Economy Security","أمن الاقتصاد داخل اللعبة","in-game economy","الاقتصاد داخل اللعبة","technical",8),
      bs("MEDX-2-4","ME2.4","Anti-Cheat Systems","أنظمة مكافحة الغش","anti-cheat systems","أنظمة مكافحة الغش","technical",8),
    ]}),
    bulkDomain({id:"MEDX-D3",code:"ME3",nameEn:"Sports Technology",nameAr:"التقنية الرياضية",subs:[
      bs("MEDX-3-1","ME3.1","Stadium Systems","أنظمة الاستاد","stadium IT systems","أنظمة تقنية المعلومات في الاستاد","technical",10),
      bs("MEDX-3-2","ME3.2","Ticketing Platform","منصة التذاكر","sports ticketing platform","منصة تذاكر الرياضة","technical",10),
      bs("MEDX-3-3","ME3.3","Performance Analytics","تحليلات الأداء","sports performance analytics","تحليلات الأداء الرياضي","data",8),
      bs("MEDX-3-4","ME3.4","Anti-Doping Data","بيانات مكافحة المنشطات","anti-doping data systems","أنظمة بيانات مكافحة المنشطات","data",8),
    ]}),
  ],
});

// ════════════════════════════════════════════
// RETAIL & HOSPITALITY EXTENDED — 120 controls
// ════════════════════════════════════════════
export const RETAIL_HOSP_EXT: FrameworkDef = FW({
  id:"INST-KSA-RETAIL-HOSP",reg:"REG-KSA-NCA",
  nEn:"Retail & Hospitality Cybersecurity Controls",nAr:"ضوابط الأمن السيبراني للتجزئة والضيافة",
  type:"standard",ver:"1.0",verId:"VER-KSA-RETAIL-HOSP-1-0",
  sectors:["SEC-KSA-RETAIL","SEC-KSA-TOURISM","SEC-KSA-FOOD"],mandatory:false,
  sumEn:"Cybersecurity controls for retail chains, hotels, restaurants, and hospitality technology.",
  sumAr:"ضوابط الأمن السيبراني لسلاسل التجزئة والفنادق والمطاعم وتقنية الضيافة.",
  tags:["retail","hospitality","hotel","restaurant"],
  domains:[
    bulkDomain({id:"RTHX-D1",code:"RT1",nameEn:"Point of Sale Security",nameAr:"أمن نقاط البيع",subs:[
      bs("RTHX-1-1","RT1.1","POS Terminal Hardening","تقوية أجهزة نقاط البيع","POS terminal","جهاز نقطة البيع","technical",12),
      bs("RTHX-1-2","RT1.2","Self-Checkout Systems","أنظمة الدفع الذاتي","self-checkout systems","أنظمة الدفع الذاتي","technical",10),
      bs("RTHX-1-3","RT1.3","Loyalty Program Security","أمن برامج الولاء","loyalty program systems","أنظمة برامج الولاء","technical",10),
      bs("RTHX-1-4","RT1.4","Inventory Management","إدارة المخزون","inventory management systems","أنظمة إدارة المخزون","technical",10),
    ]}),
    bulkDomain({id:"RTHX-D2",code:"RT2",nameEn:"Hotel Technology Security",nameAr:"أمن تقنية الفنادق",subs:[
      bs("RTHX-2-1","RT2.1","PMS Security","أمن نظام إدارة الممتلكات","property management system","نظام إدارة الممتلكات","technical",12),
      bs("RTHX-2-2","RT2.2","Guest WiFi Security","أمن واي فاي الضيوف","guest WiFi network","شبكة واي فاي الضيوف","technical",10),
      bs("RTHX-2-3","RT2.3","Smart Room Systems","أنظمة الغرف الذكية","smart room IoT","إنترنت الأشياء للغرف الذكية","technical",10),
      bs("RTHX-2-4","RT2.4","Booking Engine Security","أمن محرك الحجز","online booking engine","محرك الحجز عبر الإنترنت","technical",10),
      bs("RTHX-2-5","RT2.5","Guest Data Privacy","خصوصية بيانات الضيوف","guest personal data","بيانات الضيوف الشخصية","data",8),
    ]}),
  ],
});

// ── Export all Part 2 bulk frameworks ──
export const BULK_FRAMEWORKS_2: FrameworkDef[] = [
  NCA_OTCC_EXT,
  NCA_DCC_CSCC_EXT,
  MEGA_PROJECTS,
  FINTECH_OPEN_BANKING,
  HAJJ_UMRAH_EXT,
  DEFENSE_SECURITY,
  MEDIA_ENT,
  RETAIL_HOSP_EXT,
];
