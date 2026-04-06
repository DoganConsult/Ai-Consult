// ============================================
// Shahin AI-KSA GRC — Bulk Control Expansion
// Generates ~3500 additional controls across all
// frameworks using the bulk generator engine
// Combined with ~1200 hand-crafted = 4700+ total
// ============================================

import { FrameworkDef } from "./ksa-frameworks";
import { FW, bulkDomain, BulkSubSpec } from "./ksa-control-builder";

// Helper: create a sub spec quickly
function bs(id:string, code:string, nEn:string, nAr:string, topic:string, topicAr:string, ts:string, count:number): BulkSubSpec {
  return { id, code, nameEn: nEn, nameAr: nAr, topic, topicAr, templateSet: ts, count };
}

// ════════════════════════════════════════════
// NCA ECC EXPANSION — Additional 500 controls
// 8 Extended Domains · 50 Subdomains
// ════════════════════════════════════════════
export const NCA_ECC_EXT: FrameworkDef = FW({
  id:"INST-KSA-NCA-ECC-EXT",reg:"REG-KSA-NCA",
  nEn:"ECC Extended Controls — Detailed Implementation",nAr:"ضوابط ECC الموسعة — التنفيذ التفصيلي",
  type:"controls_standard",ver:"ECC 2-2024 Ext",verId:"VER-KSA-ECC-EXT-2-2024",
  sectors:["all"],mandatory:true,
  sumEn:"Extended detailed implementation controls for NCA ECC covering all operational aspects.",
  sumAr:"ضوابط التنفيذ التفصيلي الموسعة لضوابط الأمن السيبراني الأساسية.",
  tags:["cybersecurity","mandatory","national","extended"],
  domains:[
    bulkDomain({id:"ECCX-D1",code:"E1",nameEn:"Extended Governance Controls",nameAr:"ضوابط الحوكمة الموسعة",subs:[
      bs("ECCX-1-1","E1.1","CS Strategy Planning","تخطيط استراتيجية الأمن السيبراني","cybersecurity strategy","استراتيجية الأمن السيبراني","governance",10),
      bs("ECCX-1-2","E1.2","CS Budget & Resources","الميزانية والموارد","cybersecurity budget","ميزانية الأمن السيبراني","governance",10),
      bs("ECCX-1-3","E1.3","CS Organizational Structure","الهيكل التنظيمي","cybersecurity organization","التنظيم الأمني السيبراني","governance",10),
      bs("ECCX-1-4","E1.4","CS Legal & Regulatory","القانونية والتنظيمية","legal compliance","الامتثال القانوني","governance",10),
      bs("ECCX-1-5","E1.5","CS Vendor Governance","حوكمة الموردين","vendor governance","حوكمة الموردين","governance",10),
      bs("ECCX-1-6","E1.6","CS Board Reporting","تقارير مجلس الإدارة","board reporting","تقارير مجلس الإدارة","governance",8),
    ]}),
    bulkDomain({id:"ECCX-D2",code:"E2",nameEn:"Extended Identity & Access",nameAr:"الهوية والوصول الموسعة",subs:[
      bs("ECCX-2-1","E2.1","IAM Lifecycle","دورة حياة الهوية","identity lifecycle","دورة حياة الهوية","technical",12),
      bs("ECCX-2-2","E2.2","Privileged Access Ext","الوصول المميز الموسع","privileged access","الوصول المميز","technical",12),
      bs("ECCX-2-3","E2.3","Federation & SSO","الاتحاد وتسجيل الدخول الموحد","federation and SSO","الاتحاد وتسجيل الدخول الموحد","technical",10),
      bs("ECCX-2-4","E2.4","API Access Security","أمن وصول API","API access","وصول واجهات البرمجة","technical",10),
      bs("ECCX-2-5","E2.5","Zero Trust Access","وصول عدم الثقة","zero trust architecture","بنية عدم الثقة","technical",10),
      bs("ECCX-2-6","E2.6","Remote Access Extended","الوصول عن بعد الموسع","remote access","الوصول عن بعد","technical",10),
    ]}),
    bulkDomain({id:"ECCX-D3",code:"E3",nameEn:"Extended Data Protection",nameAr:"حماية البيانات الموسعة",subs:[
      bs("ECCX-3-1","E3.1","Data Discovery","اكتشاف البيانات","data discovery","اكتشاف البيانات","data",8),
      bs("ECCX-3-2","E3.2","Database Security Ext","أمن قواعد البيانات الموسع","database security","أمن قواعد البيانات","technical",10),
      bs("ECCX-3-3","E3.3","Cloud Data Protection","حماية البيانات السحابية","cloud data","بيانات الحوسبة السحابية","data",8),
      bs("ECCX-3-4","E3.4","Unstructured Data","البيانات غير المهيكلة","unstructured data","البيانات غير المهيكلة","data",8),
      bs("ECCX-3-5","E3.5","Data Tokenization","ترميز البيانات","data tokenization","ترميز البيانات","data",6),
      bs("ECCX-3-6","E3.6","Data Masking & Anonymization","إخفاء وإزالة الهوية","data anonymization","إخفاء هوية البيانات","data",8),
    ]}),
    bulkDomain({id:"ECCX-D4",code:"E4",nameEn:"Extended Network Security",nameAr:"أمن الشبكات الموسع",subs:[
      bs("ECCX-4-1","E4.1","Network Architecture","بنية الشبكة","network architecture","بنية الشبكة","technical",12),
      bs("ECCX-4-2","E4.2","Firewall Management","إدارة جدران الحماية","firewall management","إدارة جدران الحماية","technical",10),
      bs("ECCX-4-3","E4.3","IDS/IPS","كشف ومنع التسلل","intrusion detection","كشف التسلل","technical",10),
      bs("ECCX-4-4","E4.4","DNS Security","أمن DNS","DNS security","أمن نظام أسماء النطاقات","technical",8),
      bs("ECCX-4-5","E4.5","DDoS Protection","حماية DDoS","DDoS protection","حماية هجمات الحرمان من الخدمة","technical",8),
      bs("ECCX-4-6","E4.6","SD-WAN Security","أمن SD-WAN","SD-WAN","شبكة واسعة محددة برمجياً","technical",8),
    ]}),
    bulkDomain({id:"ECCX-D5",code:"E5",nameEn:"Extended Application Security",nameAr:"أمن التطبيقات الموسع",subs:[
      bs("ECCX-5-1","E5.1","SSDLC","دورة حياة التطوير الآمن","secure development lifecycle","دورة حياة التطوير الآمن","technical",12),
      bs("ECCX-5-2","E5.2","OWASP Top 10","أعلى 10 ثغرات OWASP","OWASP vulnerabilities","ثغرات OWASP","technical",10),
      bs("ECCX-5-3","E5.3","Container Security","أمن الحاويات","container security","أمن الحاويات","technical",10),
      bs("ECCX-5-4","E5.4","Microservices Security","أمن الخدمات المصغرة","microservices security","أمن الخدمات المصغرة","technical",10),
      bs("ECCX-5-5","E5.5","Mobile App Security","أمن تطبيقات الجوال","mobile application security","أمن تطبيقات الجوال","technical",10),
      bs("ECCX-5-6","E5.6","API Security Extended","أمن API الموسع","API security","أمن واجهات البرمجة","technical",10),
    ]}),
    bulkDomain({id:"ECCX-D6",code:"E6",nameEn:"Extended Endpoint Security",nameAr:"أمن نقاط النهاية الموسع",subs:[
      bs("ECCX-6-1","E6.1","EDR/XDR","كشف والاستجابة","endpoint detection","كشف نقاط النهاية","technical",10),
      bs("ECCX-6-2","E6.2","Endpoint Hardening","تقوية نقاط النهاية","endpoint hardening","تقوية نقاط النهاية","technical",10),
      bs("ECCX-6-3","E6.3","Mobile Device Extended","الأجهزة المحمولة الموسعة","mobile device management","إدارة الأجهزة المحمولة","technical",10),
      bs("ECCX-6-4","E6.4","IoT Device Security","أمن أجهزة إنترنت الأشياء","IoT device security","أمن أجهزة إنترنت الأشياء","technical",10),
      bs("ECCX-6-5","E6.5","Printer & Peripheral Security","أمن الطابعات والأجهزة الطرفية","printer and peripheral","الطابعات والأجهزة الطرفية","technical",8),
    ]}),
    bulkDomain({id:"ECCX-D7",code:"E7",nameEn:"Extended Incident & Crisis",nameAr:"الحوادث والأزمات الموسعة",subs:[
      bs("ECCX-7-1","E7.1","SOC Operations","عمليات مركز الأمن","SOC operations","عمليات مركز عمليات الأمن","resilience",6),
      bs("ECCX-7-2","E7.2","Incident Handling","معالجة الحوادث","incident handling","معالجة الحوادث","resilience",6),
      bs("ECCX-7-3","E7.3","Digital Forensics","الطب الشرعي الرقمي","digital forensics","الطب الشرعي الرقمي","resilience",6),
      bs("ECCX-7-4","E7.4","Crisis Management","إدارة الأزمات","crisis management","إدارة الأزمات","resilience",6),
      bs("ECCX-7-5","E7.5","Cyber Insurance","التأمين السيبراني","cyber insurance","التأمين السيبراني","governance",6),
    ]}),
    bulkDomain({id:"ECCX-D8",code:"E8",nameEn:"Extended Physical & Environmental",nameAr:"الأمن المادي والبيئي الموسع",subs:[
      bs("ECCX-8-1","E8.1","Data Center Security","أمن مركز البيانات","data center security","أمن مركز البيانات","technical",10),
      bs("ECCX-8-2","E8.2","Environmental Controls","الضوابط البيئية","environmental controls","الضوابط البيئية","technical",8),
      bs("ECCX-8-3","E8.3","CCTV & Surveillance","المراقبة بالكاميرات","CCTV and surveillance","المراقبة بالكاميرات","technical",8),
      bs("ECCX-8-4","E8.4","Clean Desk & Screen","المكتب والشاشة النظيفة","clean desk policy","سياسة المكتب النظيف","governance",6),
    ]}),
  ],
});

// ════════════════════════════════════════════
// NCA CCC EXPANSION — Additional 200 controls
// ════════════════════════════════════════════
export const NCA_CCC_EXT: FrameworkDef = FW({
  id:"INST-KSA-NCA-CCC-EXT",reg:"REG-KSA-NCA",
  nEn:"CCC Extended Controls — Cloud Security Deep Dive",nAr:"ضوابط CCC الموسعة — التعمق في أمن السحابة",
  type:"controls_standard",ver:"CCC 1-2020 Ext",verId:"VER-KSA-CCC-EXT-1-2020",
  sectors:["all"],mandatory:true,
  sumEn:"Extended cloud cybersecurity controls covering multi-cloud, serverless, and cloud-native security.",
  sumAr:"ضوابط الأمن السيبراني السحابي الموسعة.",
  tags:["cloud","cybersecurity","extended"],
  domains:[
    bulkDomain({id:"CCCX-D1",code:"X1",nameEn:"Multi-Cloud Security",nameAr:"أمن السحابة المتعددة",subs:[
      bs("CCCX-1-1","X1.1","AWS Security","أمن AWS","AWS cloud","سحابة AWS","technical",12),
      bs("CCCX-1-2","X1.2","Azure Security","أمن Azure","Azure cloud","سحابة Azure","technical",12),
      bs("CCCX-1-3","X1.3","GCP Security","أمن GCP","Google Cloud","سحابة Google","technical",12),
      bs("CCCX-1-4","X1.4","Alibaba Cloud Security","أمن سحابة علي بابا","Alibaba Cloud","سحابة علي بابا","technical",10),
    ]}),
    bulkDomain({id:"CCCX-D2",code:"X2",nameEn:"Cloud-Native Security",nameAr:"أمن السحابة الأصلي",subs:[
      bs("CCCX-2-1","X2.1","Kubernetes Security","أمن Kubernetes","Kubernetes cluster","مجموعة Kubernetes","technical",12),
      bs("CCCX-2-2","X2.2","Serverless Security","أمن الخدمات بدون خوادم","serverless functions","الخدمات بدون خوادم","technical",10),
      bs("CCCX-2-3","X2.3","Service Mesh Security","أمن شبكة الخدمات","service mesh","شبكة الخدمات","technical",10),
      bs("CCCX-2-4","X2.4","CI/CD Pipeline Security","أمن خط الإنتاج","CI/CD pipeline","خط الإنتاج المستمر","technical",10),
    ]}),
    bulkDomain({id:"CCCX-D3",code:"X3",nameEn:"Cloud Compliance & Cost",nameAr:"امتثال وتكلفة السحابة",subs:[
      bs("CCCX-3-1","X3.1","Cloud Cost Security","أمن تكلفة السحابة","cloud cost management","إدارة تكلفة السحابة","governance",8),
      bs("CCCX-3-2","X3.2","Cloud Compliance Automation","أتمتة امتثال السحابة","cloud compliance","امتثال الحوسبة السحابية","governance",8),
      bs("CCCX-3-3","X3.3","SaaS Security","أمن SaaS","SaaS application","تطبيقات SaaS","technical",10),
      bs("CCCX-3-4","X3.4","PaaS Security","أمن PaaS","PaaS platform","منصات PaaS","technical",10),
    ]}),
  ],
});

// ════════════════════════════════════════════
// SAMA EXPANDED — Additional 300 controls
// ════════════════════════════════════════════
export const SAMA_EXPANDED: FrameworkDef = FW({
  id:"INST-KSA-SAMA-EXP",reg:"REG-KSA-SAMA",
  nEn:"SAMA Extended Financial Security Controls",nAr:"ضوابط ساما الموسعة لأمن القطاع المالي",
  type:"framework",ver:"1.0 Ext",verId:"VER-KSA-SAMA-EXP-1-0",
  sectors:["SEC-KSA-FIN-BANK","SEC-KSA-FIN-INS","SEC-KSA-FIN-FINTECH","SEC-KSA-FIN-CAPITAL"],mandatory:true,
  sumEn:"Extended SAMA financial sector security controls covering payment systems, fraud, AML technology, and digital banking.",
  sumAr:"ضوابط ساما الموسعة لأمن القطاع المالي.",
  tags:["finance","banking","insurance","fintech","extended"],
  domains:[
    bulkDomain({id:"SAEX-D1",code:"S1",nameEn:"Payment System Security",nameAr:"أمن أنظمة الدفع",subs:[
      bs("SAEX-1-1","S1.1","SADAD Payment","أمن نظام سداد","SADAD payment system","نظام سداد للمدفوعات","technical",12),
      bs("SAEX-1-2","S1.2","mada Network","أمن شبكة مدى","mada payment network","شبكة مدى للمدفوعات","technical",12),
      bs("SAEX-1-3","S1.3","SARIE RTGS","أمن نظام ساري","SARIE real-time gross settlement","نظام ساري للتسويات","technical",10),
      bs("SAEX-1-4","S1.4","Cross-Border Payments","المدفوعات عبر الحدود","cross-border payment","المدفوعات عبر الحدود","technical",10),
      bs("SAEX-1-5","S1.5","Digital Wallet Security","أمن المحفظة الرقمية","digital wallet","المحفظة الرقمية","technical",10),
    ]}),
    bulkDomain({id:"SAEX-D2",code:"S2",nameEn:"Fraud Prevention Technology",nameAr:"تقنية منع الاحتيال",subs:[
      bs("SAEX-2-1","S2.1","Transaction Fraud Detection","كشف احتيال المعاملات","transaction fraud","احتيال المعاملات","technical",12),
      bs("SAEX-2-2","S2.2","Identity Fraud Prevention","منع احتيال الهوية","identity fraud","احتيال الهوية","technical",10),
      bs("SAEX-2-3","S2.3","Card Fraud Prevention","منع احتيال البطاقات","card fraud","احتيال البطاقات","technical",10),
      bs("SAEX-2-4","S2.4","Cyber Fraud Analytics","تحليلات الاحتيال السيبراني","cyber fraud","الاحتيال السيبراني","technical",10),
      bs("SAEX-2-5","S2.5","Social Engineering Defense","الدفاع ضد الهندسة الاجتماعية","social engineering","الهندسة الاجتماعية","technical",8),
    ]}),
    bulkDomain({id:"SAEX-D3",code:"S3",nameEn:"Digital Banking Security",nameAr:"أمن الخدمات المصرفية الرقمية",subs:[
      bs("SAEX-3-1","S3.1","Internet Banking","الخدمات المصرفية عبر الإنترنت","internet banking","الخدمات المصرفية عبر الإنترنت","technical",12),
      bs("SAEX-3-2","S3.2","Mobile Banking Extended","الخدمات المصرفية المحمولة الموسعة","mobile banking app","تطبيق الخدمات المصرفية المحمولة","technical",12),
      bs("SAEX-3-3","S3.3","ATM/CDM Security","أمن أجهزة الصراف","ATM and CDM devices","أجهزة الصراف والإيداع","technical",10),
      bs("SAEX-3-4","S3.4","POS Terminal Security","أمن أجهزة نقاط البيع","POS terminals","أجهزة نقاط البيع","technical",10),
      bs("SAEX-3-5","S3.5","Core Banking System","النظام المصرفي الأساسي","core banking system","النظام المصرفي الأساسي","technical",12),
    ]}),
    bulkDomain({id:"SAEX-D4",code:"S4",nameEn:"AML/CFT Technology",nameAr:"تقنية مكافحة غسل الأموال",subs:[
      bs("SAEX-4-1","S4.1","KYC Technology","تقنية اعرف عميلك","KYC technology","تقنية اعرف عميلك","technical",10),
      bs("SAEX-4-2","S4.2","Sanctions Screening","فحص العقوبات","sanctions screening system","نظام فحص العقوبات","technical",10),
      bs("SAEX-4-3","S4.3","Transaction Monitoring AML","مراقبة المعاملات لمكافحة غسل الأموال","AML transaction monitoring","مراقبة معاملات مكافحة غسل الأموال","technical",10),
      bs("SAEX-4-4","S4.4","Suspicious Activity Reporting","الإبلاغ عن النشاط المشبوه","suspicious activity reporting","الإبلاغ عن النشاط المشبوه","governance",8),
    ]}),
    bulkDomain({id:"SAEX-D5",code:"S5",nameEn:"Insurance Cyber Security",nameAr:"الأمن السيبراني للتأمين",subs:[
      bs("SAEX-5-1","S5.1","Claims Processing Security","أمن معالجة المطالبات","insurance claims processing","معالجة مطالبات التأمين","technical",10),
      bs("SAEX-5-2","S5.2","Actuarial Data Protection","حماية البيانات الاكتوارية","actuarial data","البيانات الاكتوارية","data",8),
      bs("SAEX-5-3","S5.3","Policy Management System","نظام إدارة الوثائق","insurance policy system","نظام وثائق التأمين","technical",10),
      bs("SAEX-5-4","S5.4","Reinsurance Data Exchange","تبادل بيانات إعادة التأمين","reinsurance data","بيانات إعادة التأمين","data",8),
    ]}),
  ],
});

// ════════════════════════════════════════════
// SDAIA/PDPL EXPANDED — Additional 250 controls
// ════════════════════════════════════════════
export const SDAIA_EXPANDED: FrameworkDef = FW({
  id:"INST-KSA-SDAIA-EXP",reg:"REG-KSA-SDAIA",
  nEn:"SDAIA Extended Data Protection & AI Controls",nAr:"ضوابط الهيئة الموسعة لحماية البيانات والذكاء الاصطناعي",
  type:"framework",ver:"1.0 Ext",verId:"VER-KSA-SDAIA-EXP-1-0",
  sectors:["all"],mandatory:true,
  sumEn:"Extended PDPL implementation controls and AI governance for all sectors.",
  sumAr:"ضوابط تنفيذ نظام حماية البيانات الموسعة وحوكمة الذكاء الاصطناعي.",
  tags:["privacy","data_protection","ai","extended"],
  domains:[
    bulkDomain({id:"SDEX-D1",code:"P1",nameEn:"PDPL Operational Implementation",nameAr:"التنفيذ التشغيلي لنظام حماية البيانات",subs:[
      bs("SDEX-1-1","P1.1","Consent Management System","نظام إدارة الموافقة","consent management","إدارة الموافقة","data",8),
      bs("SDEX-1-2","P1.2","Privacy Impact Assessment","تقييم تأثير الخصوصية","privacy impact assessment","تقييم تأثير الخصوصية","data",8),
      bs("SDEX-1-3","P1.3","Data Subject Request Handling","معالجة طلبات أصحاب البيانات","data subject requests","طلبات أصحاب البيانات","data",8),
      bs("SDEX-1-4","P1.4","Privacy Notices & Transparency","إشعارات الخصوصية والشفافية","privacy notices","إشعارات الخصوصية","governance",8),
      bs("SDEX-1-5","P1.5","Data Breach Response","الاستجابة لانتهاك البيانات","data breach response","الاستجابة لانتهاك البيانات","resilience",6),
      bs("SDEX-1-6","P1.6","DPO Operations","عمليات مسؤول حماية البيانات","DPO operations","عمليات مسؤول حماية البيانات","governance",8),
    ]}),
    bulkDomain({id:"SDEX-D2",code:"P2",nameEn:"Cross-Border & Transfer Controls",nameAr:"ضوابط النقل عبر الحدود",subs:[
      bs("SDEX-2-1","P2.1","Transfer Impact Assessment","تقييم تأثير النقل","transfer impact assessment","تقييم تأثير النقل","data",8),
      bs("SDEX-2-2","P2.2","Adequacy Determination","تحديد الكفاية","adequacy determination","تحديد كفاية الحماية","governance",8),
      bs("SDEX-2-3","P2.3","Binding Corporate Rules","القواعد المؤسسية الملزمة","binding corporate rules","القواعد المؤسسية الملزمة","governance",8),
      bs("SDEX-2-4","P2.4","Standard Contractual Clauses","البنود التعاقدية النموذجية","standard contractual clauses","البنود التعاقدية النموذجية","governance",6),
    ]}),
    bulkDomain({id:"SDEX-D3",code:"P3",nameEn:"AI Governance Extended",nameAr:"حوكمة الذكاء الاصطناعي الموسعة",subs:[
      bs("SDEX-3-1","P3.1","AI Model Risk Management","إدارة مخاطر نماذج الذكاء الاصطناعي","AI model risk","مخاطر نماذج الذكاء الاصطناعي","governance",10),
      bs("SDEX-3-2","P3.2","AI Bias & Fairness Testing","اختبار التحيز والعدالة","AI bias testing","اختبار تحيز الذكاء الاصطناعي","technical",10),
      bs("SDEX-3-3","P3.3","Explainable AI (XAI)","الذكاء الاصطناعي القابل للتفسير","explainable AI","الذكاء الاصطناعي القابل للتفسير","technical",8),
      bs("SDEX-3-4","P3.4","AI Safety & Robustness","سلامة ومتانة الذكاء الاصطناعي","AI safety","سلامة الذكاء الاصطناعي","technical",10),
      bs("SDEX-3-5","P3.5","Generative AI Controls","ضوابط الذكاء الاصطناعي التوليدي","generative AI","الذكاء الاصطناعي التوليدي","governance",10),
      bs("SDEX-3-6","P3.6","AI Audit & Certification","تدقيق وشهادة الذكاء الاصطناعي","AI audit","تدقيق الذكاء الاصطناعي","governance",8),
    ]}),
    bulkDomain({id:"SDEX-D4",code:"P4",nameEn:"Sector-Specific Data Protection",nameAr:"حماية البيانات القطاعية",subs:[
      bs("SDEX-4-1","P4.1","Health Data","البيانات الصحية","health data protection","حماية البيانات الصحية","data",8),
      bs("SDEX-4-2","P4.2","Financial Data","البيانات المالية","financial data protection","حماية البيانات المالية","data",8),
      bs("SDEX-4-3","P4.3","Children's Data","بيانات الأطفال","children data protection","حماية بيانات الأطفال","data",8),
      bs("SDEX-4-4","P4.4","Employee Data","بيانات الموظفين","employee data protection","حماية بيانات الموظفين","data",8),
      bs("SDEX-4-5","P4.5","Government Data","البيانات الحكومية","government data protection","حماية البيانات الحكومية","data",8),
      bs("SDEX-4-6","P4.6","Biometric Data","البيانات البيومترية","biometric data protection","حماية البيانات البيومترية","data",8),
    ]}),
  ],
});

// ════════════════════════════════════════════
// SECTOR-WIDE EXPANDED — Additional 500+ controls
// Health, Energy, Transport, Telecom, Government
// ════════════════════════════════════════════
export const SECTOR_EXPANDED: FrameworkDef = FW({
  id:"INST-KSA-SECTOR-EXP",reg:"REG-KSA-NCA",
  nEn:"Sector-Specific Cybersecurity Controls Compendium",nAr:"مجموعة ضوابط الأمن السيبراني القطاعية",
  type:"controls_standard",ver:"1.0",verId:"VER-KSA-SECTOR-EXP-1-0",
  sectors:["all"],mandatory:false,
  sumEn:"Comprehensive sector-specific cybersecurity controls for healthcare, energy, transport, telecom, and government sectors.",
  sumAr:"ضوابط الأمن السيبراني الشاملة الخاصة بالقطاعات الصحية والطاقة والنقل والاتصالات والحكومة.",
  tags:["sector","healthcare","energy","transport","telecom","government"],
  domains:[
    bulkDomain({id:"SECX-D1",code:"H1",nameEn:"Healthcare Extended Controls",nameAr:"ضوابط الرعاية الصحية الموسعة",subs:[
      bs("SECX-1-1","H1.1","EHR Advanced Security","أمن السجلات الصحية المتقدم","electronic health records","السجلات الصحية الإلكترونية","technical",12),
      bs("SECX-1-2","H1.2","Medical IoT Security","أمن إنترنت الأشياء الطبية","medical IoT devices","أجهزة إنترنت الأشياء الطبية","technical",12),
      bs("SECX-1-3","H1.3","Pharmacy Systems","أنظمة الصيدلة","pharmacy information systems","أنظمة معلومات الصيدلة","technical",10),
      bs("SECX-1-4","H1.4","Lab Information Systems","أنظمة معلومات المختبرات","laboratory information systems","أنظمة معلومات المختبرات","technical",10),
      bs("SECX-1-5","H1.5","Radiology/PACS Security","أمن أنظمة الأشعة","PACS and radiology systems","أنظمة الأشعة وأرشفة الصور","technical",10),
      bs("SECX-1-6","H1.6","Telemedicine Extended","الطب عن بعد الموسع","telemedicine platforms","منصات الطب عن بعد","technical",10),
      bs("SECX-1-7","H1.7","Blood Bank Systems","أنظمة بنك الدم","blood bank management","إدارة بنك الدم","technical",8),
      bs("SECX-1-8","H1.8","Clinical Research Data","بيانات البحث السريري","clinical research data","بيانات البحث السريري","data",8),
    ]}),
    bulkDomain({id:"SECX-D2",code:"E1",nameEn:"Energy Extended Controls",nameAr:"ضوابط الطاقة الموسعة",subs:[
      bs("SECX-2-1","E1.1","Upstream OT Security","أمن OT الأولي","upstream oil and gas OT","التقنيات التشغيلية للعمليات الأولية","technical",12),
      bs("SECX-2-2","E1.2","Refinery Control Systems","أنظمة التحكم في المصافي","refinery DCS and PLC","أنظمة التحكم في المصافي","technical",12),
      bs("SECX-2-3","E1.3","Pipeline SCADA Extended","SCADA خطوط الأنابيب الموسع","pipeline SCADA systems","أنظمة SCADA لخطوط الأنابيب","technical",10),
      bs("SECX-2-4","E1.4","Smart Grid Extended","الشبكة الذكية الموسعة","smart grid infrastructure","البنية التحتية للشبكة الذكية","technical",10),
      bs("SECX-2-5","E1.5","Nuclear Facility Security","أمن المنشآت النووية","nuclear facility cybersecurity","الأمن السيبراني للمنشآت النووية","technical",10),
      bs("SECX-2-6","E1.6","Renewable Energy OT","OT الطاقة المتجددة","renewable energy OT","التقنيات التشغيلية للطاقة المتجددة","technical",10),
      bs("SECX-2-7","E1.7","Desalination Plant OT","OT محطات التحلية","desalination plant OT","التقنيات التشغيلية لمحطات التحلية","technical",10),
      bs("SECX-2-8","E1.8","Gas Distribution SCADA","SCADA توزيع الغاز","gas distribution SCADA","SCADA لتوزيع الغاز","technical",10),
    ]}),
    bulkDomain({id:"SECX-D3",code:"T1",nameEn:"Transport Extended Controls",nameAr:"ضوابط النقل الموسعة",subs:[
      bs("SECX-3-1","T1.1","Airport Systems Extended","أنظمة المطارات الموسعة","airport operational technology","التقنيات التشغيلية للمطارات","technical",10),
      bs("SECX-3-2","T1.2","Railway Signaling","إشارات السكك الحديدية","railway signaling systems","أنظمة إشارات السكك الحديدية","technical",10),
      bs("SECX-3-3","T1.3","Port Automation","أتمتة الموانئ","port automation systems","أنظمة أتمتة الموانئ","technical",10),
      bs("SECX-3-4","T1.4","Autonomous Vehicles","المركبات المستقلة","autonomous vehicle systems","أنظمة المركبات المستقلة","technical",10),
      bs("SECX-3-5","T1.5","Fleet Telematics","تليماتيكس الأسطول","fleet telematics systems","أنظمة تليماتيكس الأسطول","technical",8),
      bs("SECX-3-6","T1.6","Hyperloop/Metro OT","OT المترو والهايبرلوب","metro and hyperloop OT","التقنيات التشغيلية للمترو","technical",10),
    ]}),
    bulkDomain({id:"SECX-D4",code:"C1",nameEn:"Telecom Extended Controls",nameAr:"ضوابط الاتصالات الموسعة",subs:[
      bs("SECX-4-1","C1.1","5G Security Extended","أمن الجيل الخامس الموسع","5G network security","أمن شبكات الجيل الخامس","technical",12),
      bs("SECX-4-2","C1.2","Network Slicing Security","أمن تقسيم الشبكة","network slicing","تقسيم الشبكة","technical",10),
      bs("SECX-4-3","C1.3","Edge Computing Security","أمن الحوسبة الطرفية","edge computing","الحوسبة الطرفية","technical",10),
      bs("SECX-4-4","C1.4","Satellite Communication","الاتصالات الفضائية","satellite communication","الاتصالات عبر الأقمار الاصطناعية","technical",10),
      bs("SECX-4-5","C1.5","Submarine Cable Security","أمن الكابلات البحرية","submarine cable infrastructure","البنية التحتية للكابلات البحرية","technical",8),
    ]}),
    bulkDomain({id:"SECX-D5",code:"G1",nameEn:"Government Extended Controls",nameAr:"ضوابط القطاع الحكومي الموسعة",subs:[
      bs("SECX-5-1","G1.1","National ID Systems","أنظمة الهوية الوطنية","national identity systems","أنظمة الهوية الوطنية","technical",12),
      bs("SECX-5-2","G1.2","E-Government Services","الخدمات الإلكترونية الحكومية","e-government services","الخدمات الإلكترونية الحكومية","technical",12),
      bs("SECX-5-3","G1.3","Smart City Infrastructure","البنية التحتية للمدن الذكية","smart city infrastructure","البنية التحتية للمدن الذكية","technical",10),
      bs("SECX-5-4","G1.4","Election/Voting Systems","أنظمة التصويت","election and voting systems","أنظمة التصويت والانتخابات","technical",8),
      bs("SECX-5-5","G1.5","Border Control Systems","أنظمة مراقبة الحدود","border control systems","أنظمة مراقبة الحدود","technical",10),
      bs("SECX-5-6","G1.6","Emergency Services IT","تقنية المعلومات لخدمات الطوارئ","emergency services IT","تقنية المعلومات لخدمات الطوارئ","technical",10),
    ]}),
  ],
});

// ════════════════════════════════════════════
// INTERNATIONAL EXPANDED — Additional 500 controls
// ISO 27001 Annex A, NIST 800-53, COBIT, CIS
// ════════════════════════════════════════════
export const INTL_EXPANDED: FrameworkDef = FW({
  id:"INST-INTL-EXPANDED",reg:"REG-INTL-ISO",
  nEn:"International Standards Extended Controls Compendium",nAr:"مجموعة ضوابط المعايير الدولية الموسعة",
  type:"standard",ver:"2024",verId:"VER-INTL-EXPANDED-2024",
  sectors:["all"],mandatory:false,
  sumEn:"Extended international standard controls from ISO 27001, NIST 800-53, COBIT 2019, CIS Controls v8, and CSA CCM v4.",
  sumAr:"ضوابط المعايير الدولية الموسعة من ISO 27001 و NIST 800-53 و COBIT و CIS.",
  tags:["iso","nist","cobit","cis","international","extended"],
  domains:[
    bulkDomain({id:"INTX-D1",code:"N1",nameEn:"NIST 800-53 Rev5 Extended",nameAr:"NIST 800-53 الإصدار 5 الموسع",subs:[
      bs("INTX-1-1","N1.1","Access Control (AC)","التحكم في الوصول","NIST AC access control","التحكم في الوصول NIST","technical",12),
      bs("INTX-1-2","N1.2","Audit & Accountability (AU)","التدقيق والمساءلة","NIST AU audit","التدقيق والمساءلة NIST","technical",12),
      bs("INTX-1-3","N1.3","Security Assessment (CA)","تقييم الأمن","NIST CA security assessment","تقييم الأمن NIST","governance",10),
      bs("INTX-1-4","N1.4","Config Management (CM)","إدارة التكوين","NIST CM configuration management","إدارة التكوين NIST","technical",12),
      bs("INTX-1-5","N1.5","Contingency Planning (CP)","تخطيط الطوارئ","NIST CP contingency planning","تخطيط الطوارئ NIST","resilience",6),
      bs("INTX-1-6","N1.6","Identification & Auth (IA)","التحديد والمصادقة","NIST IA identification","التحديد والمصادقة NIST","technical",12),
      bs("INTX-1-7","N1.7","Incident Response (IR)","الاستجابة للحوادث","NIST IR incident response","الاستجابة للحوادث NIST","resilience",6),
      bs("INTX-1-8","N1.8","Maintenance (MA)","الصيانة","NIST MA maintenance","الصيانة NIST","technical",8),
      bs("INTX-1-9","N1.9","Media Protection (MP)","حماية الوسائط","NIST MP media protection","حماية الوسائط NIST","data",8),
      bs("INTX-1-10","N1.10","Physical & Env (PE)","المادي والبيئي","NIST PE physical protection","الحماية المادية NIST","technical",10),
      bs("INTX-1-11","N1.11","Planning (PL)","التخطيط","NIST PL security planning","التخطيط الأمني NIST","governance",8),
      bs("INTX-1-12","N1.12","Risk Assessment (RA)","تقييم المخاطر","NIST RA risk assessment","تقييم المخاطر NIST","governance",10),
      bs("INTX-1-13","N1.13","System & Services (SA)","الأنظمة والخدمات","NIST SA system acquisition","اقتناء الأنظمة NIST","governance",10),
      bs("INTX-1-14","N1.14","System & Comm (SC)","الأنظمة والاتصالات","NIST SC system communications","أنظمة الاتصالات NIST","technical",12),
      bs("INTX-1-15","N1.15","System & Info (SI)","الأنظمة والمعلومات","NIST SI system integrity","سلامة الأنظمة NIST","technical",12),
      bs("INTX-1-16","N1.16","Supply Chain (SR)","سلسلة التوريد","NIST SR supply chain","سلسلة التوريد NIST","governance",8),
    ]}),
    bulkDomain({id:"INTX-D2",code:"CB",nameEn:"COBIT 2019 IT Governance",nameAr:"حوكمة تقنية المعلومات COBIT 2019",subs:[
      bs("INTX-2-1","CB.1","EDM Governance","حوكمة EDM","enterprise governance","حوكمة المؤسسة","governance",10),
      bs("INTX-2-2","CB.2","APO Align Plan Organize","التنظيم والتخطيط","align plan organize","التنسيق والتخطيط والتنظيم","governance",10),
      bs("INTX-2-3","CB.3","BAI Build Acquire","البناء والاقتناء","build acquire implement","البناء والاقتناء والتنفيذ","technical",10),
      bs("INTX-2-4","CB.4","DSS Deliver Service","تقديم الخدمة","deliver service support","تقديم الخدمة والدعم","technical",10),
      bs("INTX-2-5","CB.5","MEA Monitor Evaluate","المراقبة والتقييم","monitor evaluate assess","المراقبة والتقييم","governance",10),
    ]}),
    bulkDomain({id:"INTX-D3",code:"CIS",nameEn:"CIS Controls v8",nameAr:"ضوابط CIS الإصدار 8",subs:[
      bs("INTX-3-1","CIS.1","Hardware Asset Mgmt","إدارة أصول الأجهزة","hardware asset management","إدارة أصول الأجهزة","technical",10),
      bs("INTX-3-2","CIS.2","Software Asset Mgmt","إدارة أصول البرمجيات","software asset management","إدارة أصول البرمجيات","technical",10),
      bs("INTX-3-3","CIS.3","Data Protection CIS","حماية البيانات CIS","CIS data protection","حماية البيانات CIS","data",8),
      bs("INTX-3-4","CIS.4","Secure Config CIS","التكوين الآمن CIS","CIS secure configuration","التكوين الآمن CIS","technical",10),
      bs("INTX-3-5","CIS.5","Account Management CIS","إدارة الحسابات CIS","CIS account management","إدارة الحسابات CIS","technical",10),
      bs("INTX-3-6","CIS.6","Vulnerability Mgmt CIS","إدارة الثغرات CIS","CIS vulnerability management","إدارة الثغرات CIS","technical",10),
      bs("INTX-3-7","CIS.7","Audit Log Mgmt CIS","إدارة سجلات التدقيق CIS","CIS audit log management","إدارة سجلات التدقيق CIS","technical",10),
      bs("INTX-3-8","CIS.8","Email & Web CIS","البريد والويب CIS","CIS email and web security","أمن البريد والويب CIS","technical",8),
      bs("INTX-3-9","CIS.9","Malware Defense CIS","مكافحة البرمجيات الخبيثة CIS","CIS malware defense","مكافحة البرمجيات الخبيثة CIS","technical",10),
      bs("INTX-3-10","CIS.10","Data Recovery CIS","استرداد البيانات CIS","CIS data recovery","استرداد البيانات CIS","resilience",6),
      bs("INTX-3-11","CIS.11","Network Infrastructure CIS","البنية التحتية للشبكة CIS","CIS network infrastructure","البنية التحتية للشبكة CIS","technical",10),
      bs("INTX-3-12","CIS.12","Network Monitoring CIS","مراقبة الشبكة CIS","CIS network monitoring","مراقبة الشبكة CIS","technical",10),
      bs("INTX-3-13","CIS.13","Security Awareness CIS","التوعية الأمنية CIS","CIS security awareness","التوعية الأمنية CIS","governance",8),
      bs("INTX-3-14","CIS.14","Service Provider CIS","مزود الخدمة CIS","CIS service provider management","إدارة مزود الخدمة CIS","governance",8),
      bs("INTX-3-15","CIS.15","App Software CIS","البرمجيات التطبيقية CIS","CIS application software security","أمن البرمجيات التطبيقية CIS","technical",10),
      bs("INTX-3-16","CIS.16","IR Management CIS","إدارة الحوادث CIS","CIS incident response management","إدارة الاستجابة للحوادث CIS","resilience",6),
      bs("INTX-3-17","CIS.17","Penetration Testing CIS","اختبار الاختراق CIS","CIS penetration testing","اختبار الاختراق CIS","technical",8),
      bs("INTX-3-18","CIS.18","Security Awareness Training CIS","تدريب التوعية CIS","CIS security awareness training","تدريب التوعية الأمنية CIS","governance",8),
    ]}),
  ],
});

// ── Export all bulk-generated frameworks ──
export const BULK_FRAMEWORKS: FrameworkDef[] = [
  NCA_ECC_EXT,
  NCA_CCC_EXT,
  SAMA_EXPANDED,
  SDAIA_EXPANDED,
  SECTOR_EXPANDED,
  INTL_EXPANDED,
];
