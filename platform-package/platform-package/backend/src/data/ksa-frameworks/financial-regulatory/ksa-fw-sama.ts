// ============================================
// Shahin AI-KSA GRC — SAMA Framework Family
// CSF, BCM, TPR, Fintech, Open Banking, Insurance
// ============================================
import { FrameworkDef } from "./ksa-frameworks";
import { S, D, FW, controls } from "./ksa-control-builder";

// ════════════════════════════════════════════
// 1. SAMA CSF — Cyber Security Framework
//    4 Domains · 16 Subdomains · 95 Controls
// ════════════════════════════════════════════
export const SAMA_CSF: FrameworkDef = FW({
  id:"INST-KSA-SAMA-CSF",reg:"REG-KSA-SAMA",nEn:"Cyber Security Framework",nAr:"إطار الأمن السيبراني",
  type:"framework",ver:"1.0",verId:"VER-KSA-SAMA-CSF-1-0",
  sectors:["SEC-KSA-FIN-BANK","SEC-KSA-FIN-INS","SEC-KSA-FIN-FINTECH"],mandatory:true,
  sumEn:"SAMA Cyber Security Framework for financial institutions regulated by the Saudi Central Bank.",
  sumAr:"إطار الأمن السيبراني للبنك المركزي السعودي للمؤسسات المالية.",
  tags:["cybersecurity","finance","banking","insurance"],
  domains:[
    D("SAMA-D1","1","CS Leadership & Governance","قيادة وحوكمة الأمن السيبراني",[
      S("SAMA-1-1","1.1","CS Governance","حوكمة الأمن السيبراني",controls([
        ["SAMA-CSF-1.1","1.1.1","CS Strategy","استراتيجية الأمن السيبراني","Establish cybersecurity strategy aligned with business strategy","وضع استراتيجية للأمن السيبراني متوافقة مع استراتيجية العمل","critical",false,["document"],["ECC-1-1-1"]],
        ["SAMA-CSF-1.2","1.1.2","CS Policy","سياسة الأمن السيبراني","Develop and maintain cybersecurity policy","تطوير وصيانة سياسة الأمن السيبراني","critical",false,["document"],["ECC-1-3-1"]],
        ["SAMA-CSF-1.3","1.1.3","Roles & Responsibilities","الأدوار والمسؤوليات","Define cybersecurity roles and responsibilities","تحديد أدوار ومسؤوليات الأمن السيبراني","critical",false,["document","org_chart"],["ECC-1-2-2"]],
        ["SAMA-CSF-1.4","1.1.4","CS Committee","لجنة الأمن السيبراني","Establish board-level cybersecurity committee","إنشاء لجنة أمن سيبراني على مستوى مجلس الإدارة","critical",false,["meeting_minutes"]],
        ["SAMA-CSF-1.5","1.1.5","CS Budget","ميزانية الأمن السيبراني","Allocate adequate budget for cybersecurity","تخصيص ميزانية كافية للأمن السيبراني","high",false,["budget_document"]],
        ["SAMA-CSF-1.6","1.1.6","CS Reporting to Board","التقارير لمجلس الإدارة","Regular cybersecurity reporting to board of directors","تقارير دورية عن الأمن السيبراني لمجلس الإدارة","critical",false,["board_report"]],
      ])),
      S("SAMA-1-2","1.2","CS Risk Management","إدارة مخاطر الأمن السيبراني",controls([
        ["SAMA-CSF-1.4","1.2.1","Risk Framework","إطار إدارة المخاطر","Establish cyber risk management framework","إنشاء إطار إدارة المخاطر السيبرانية","critical",false,["document"],["ECC-1-4-1"]],
        ["SAMA-CSF-1.5","1.2.2","Risk Assessment","تقييم المخاطر","Conduct periodic cyber risk assessments","إجراء تقييمات دورية للمخاطر السيبرانية","critical",false,["assessment_report"],["ECC-1-4-2"]],
        ["SAMA-CSF-1.7","1.2.3","Risk Appetite","الرغبة في المخاطرة","Define cyber risk appetite and tolerance levels","تحديد مستويات الرغبة والتحمل للمخاطر السيبرانية","critical",false,["document"]],
        ["SAMA-CSF-1.8","1.2.4","Risk Treatment Plan","خطة معالجة المخاطر","Develop and track risk treatment plans","تطوير ومتابعة خطط معالجة المخاطر","high",false,["treatment_plan"]],
        ["SAMA-CSF-1.9","1.2.5","Emerging Risks","المخاطر الناشئة","Monitor emerging cyber threats relevant to financial sector","مراقبة التهديدات السيبرانية الناشئة ذات الصلة بالقطاع المالي","high",false,["threat_report"]],
      ])),
      S("SAMA-1-3","1.3","CS Compliance","امتثال الأمن السيبراني",controls([
        ["SAMA-CSF-1.10","1.3.1","Regulatory Compliance","الامتثال التنظيمي","Ensure compliance with SAMA CS requirements","ضمان الامتثال لمتطلبات ساما للأمن السيبراني","critical",false,["compliance_report"]],
        ["SAMA-CSF-1.11","1.3.2","Internal Audit","التدقيق الداخلي","Conduct internal cybersecurity audits","إجراء تدقيقات داخلية للأمن السيبراني","high",false,["audit_report"]],
        ["SAMA-CSF-1.12","1.3.3","External Audit","التدقيق الخارجي","Annual external cybersecurity audit","تدقيق خارجي سنوي للأمن السيبراني","critical",false,["audit_report"]],
        ["SAMA-CSF-1.13","1.3.4","Gap Assessment","تقييم الفجوات","Periodic gap assessment against SAMA CSF","تقييم دوري للفجوات مقابل إطار ساما","high",false,["gap_report"]],
      ])),
      S("SAMA-1-4","1.4","CS Awareness","التوعية بالأمن السيبراني",controls([
        ["SAMA-CSF-1.14","1.4.1","Awareness Program","برنامج التوعية","Implement cybersecurity awareness for all staff","تنفيذ برنامج التوعية بالأمن السيبراني لجميع الموظفين","high",false,["training_record"]],
        ["SAMA-CSF-1.15","1.4.2","Phishing Simulations","محاكاة التصيد","Conduct regular phishing simulation exercises","إجراء تمارين محاكاة التصيد بشكل منتظم","high",true,["simulation_report"]],
        ["SAMA-CSF-1.16","1.4.3","Specialized Training","التدريب المتخصص","Provide role-based cybersecurity training","توفير تدريب متخصص في الأمن السيبراني حسب الدور","high",false,["training_record"]],
      ])),
    ]),
    D("SAMA-D2","2","CS Operations & Technology","عمليات وتقنية الأمن السيبراني",[
      S("SAMA-2-1","2.1","IAM","إدارة الهوية والوصول",controls([
        ["SAMA-CSF-2.1","2.1.1","Access Control Policy","سياسة التحكم في الوصول","Implement access control policy for financial systems","تنفيذ سياسة التحكم في الوصول للأنظمة المالية","critical",true,["system_config"],["ECC-2-2-2"]],
        ["SAMA-CSF-2.2","2.1.2","Privileged Access","الوصول المميز","Control privileged access to financial systems","التحكم في الوصول المميز للأنظمة المالية","critical",true,["pam_report"],["ECC-2-2-3"]],
        ["SAMA-CSF-2.3","2.1.3","MFA for Banking","MFA للخدمات المصرفية","Implement MFA for all banking channels","تنفيذ المصادقة متعددة العوامل لجميع القنوات المصرفية","critical",true,["system_config"]],
        ["SAMA-CSF-2.4","2.1.4","Customer Authentication","مصادقة العملاء","Strong customer authentication for digital banking","المصادقة القوية للعملاء في الخدمات المصرفية الرقمية","critical",true,["system_config"]],
        ["SAMA-CSF-2.5","2.1.5","Access Recertification","إعادة اعتماد الوصول","Quarterly access recertification for critical systems","إعادة اعتماد الوصول ربع سنوياً للأنظمة الحرجة","high",true,["review_report"]],
      ])),
      S("SAMA-2-2","2.2","Application Security","أمن التطبيقات",controls([
        ["SAMA-CSF-2.3","2.2.1","Secure Development","التطوير الآمن","Implement secure SDLC for financial applications","تنفيذ دورة حياة تطوير البرمجيات الآمنة للتطبيقات المالية","high",false,["document","code_review"]],
        ["SAMA-CSF-2.4","2.2.2","App Testing","اختبار التطبيقات","Security testing for all financial applications","إجراء اختبارات أمنية لجميع التطبيقات المالية","critical",true,["test_report"]],
        ["SAMA-CSF-2.6","2.2.3","API Security","أمن واجهات البرمجة","Secure financial APIs with OAuth 2.0 and mTLS","تأمين واجهات البرمجة المالية بـ OAuth 2.0 و mTLS","critical",true,["system_config"]],
        ["SAMA-CSF-2.7","2.2.4","Mobile Banking Security","أمن الخدمات المصرفية المحمولة","Secure mobile banking applications","تأمين تطبيقات الخدمات المصرفية المحمولة","critical",true,["test_report"]],
        ["SAMA-CSF-2.8","2.2.5","Code Review","مراجعة الكود","Mandatory code review for critical financial systems","مراجعة إلزامية للكود للأنظمة المالية الحرجة","high",false,["code_review"]],
      ])),
      S("SAMA-2-3","2.3","Infrastructure Security","أمن البنية التحتية",controls([
        ["SAMA-CSF-2.9","2.3.1","Network Segmentation","تجزئة الشبكة","Segment financial networks by security zone","تجزئة الشبكات المالية حسب المنطقة الأمنية","critical",true,["network_diagram"]],
        ["SAMA-CSF-2.10","2.3.2","Endpoint Protection","حماية نقاط النهاية","Deploy EDR on all financial system endpoints","نشر EDR على جميع نقاط نهاية الأنظمة المالية","critical",true,["edr_report"]],
        ["SAMA-CSF-2.11","2.3.3","Database Encryption","تشفير قواعد البيانات","Encrypt all financial databases at rest and in transit","تشفير جميع قواعد البيانات المالية أثناء التخزين والنقل","critical",true,["encryption_report"]],
        ["SAMA-CSF-2.12","2.3.4","ATM Security","أمن أجهزة الصراف","Implement cybersecurity controls for ATM networks","تنفيذ ضوابط الأمن السيبراني لشبكات أجهزة الصراف","critical",true,["system_config"]],
        ["SAMA-CSF-2.13","2.3.5","SWIFT Security","أمن سويفت","Comply with SWIFT CSP requirements","الامتثال لمتطلبات برنامج أمن عملاء سويفت","critical",true,["swift_report"]],
      ])),
      S("SAMA-2-4","2.4","Security Operations","عمليات الأمن",controls([
        ["SAMA-CSF-2.14","2.4.1","SOC","مركز عمليات الأمن","Maintain 24/7 SOC for financial systems","الحفاظ على مركز عمليات الأمن على مدار الساعة","critical",true,["soc_report"]],
        ["SAMA-CSF-2.15","2.4.2","SIEM","نظام إدارة الأحداث الأمنية","Deploy SIEM with financial-specific use cases","نشر SIEM مع حالات استخدام خاصة بالقطاع المالي","critical",true,["siem_config"]],
        ["SAMA-CSF-2.16","2.4.3","Vulnerability Mgmt","إدارة الثغرات","Regular vulnerability scanning of financial systems","فحص منتظم لثغرات الأنظمة المالية","critical",true,["scan_report"]],
        ["SAMA-CSF-2.17","2.4.4","Penetration Testing","اختبار الاختراق","Annual penetration testing of all financial channels","اختبار اختراق سنوي لجميع القنوات المالية","critical",false,["pentest_report"]],
        ["SAMA-CSF-2.18","2.4.5","Patch Mgmt","إدارة التصحيحات","Timely patching with financial system change windows","تطبيق التصحيحات في الوقت المناسب مع نوافذ تغيير الأنظمة المالية","critical",true,["patch_report"]],
      ])),
    ]),
    D("SAMA-D3","3","Third-Party CS","الأمن السيبراني للأطراف الخارجية",[
      S("SAMA-3-1","3.1","Third-Party Management","إدارة الأطراف الخارجية",controls([
        ["SAMA-CSF-3.1","3.1.1","Vendor Risk Assessment","تقييم مخاطر الموردين","Assess cybersecurity posture of third-party vendors","تقييم الوضع الأمني السيبراني لموردي الأطراف الخارجية","critical",false,["assessment_report"],["ECC-4-1-1"]],
        ["SAMA-CSF-3.2","3.1.2","Outsourcing Security","أمن الاستعانة بمصادر خارجية","Ensure security requirements in outsourcing","ضمان متطلبات الأمن في ترتيبات الاستعانة بمصادر خارجية","high",false,["contract","audit_report"]],
        ["SAMA-CSF-3.3","3.1.3","Vendor Monitoring","مراقبة الموردين","Continuous monitoring of critical vendor security posture","المراقبة المستمرة لوضع الأمن السيبراني للموردين الحرجين","high",false,["monitoring_report"]],
        ["SAMA-CSF-3.4","3.1.4","Cloud Risk","مخاطر السحابة","Assess and manage cloud service risks for financial data","تقييم وإدارة مخاطر الخدمات السحابية للبيانات المالية","critical",false,["assessment_report"]],
        ["SAMA-CSF-3.5","3.1.5","Fourth-Party Risk","مخاطر الطرف الرابع","Monitor fourth-party (sub-contractor) risks","مراقبة مخاطر الطرف الرابع (المقاولين من الباطن)","high",false,["assessment_report"]],
      ])),
      S("SAMA-3-2","3.2","Outsourcing Controls","ضوابط الاستعانة بمصادر خارجية",controls([
        ["SAMA-CSF-3.6","3.2.1","Data Localization","توطين البيانات","Ensure financial data stays within KSA or approved jurisdictions","ضمان بقاء البيانات المالية داخل المملكة أو الولايات القضائية المعتمدة","critical",false,["compliance_report"]],
        ["SAMA-CSF-3.7","3.2.2","Contractual Controls","ضوابط تعاقدية","Include security SLAs and audit rights in vendor contracts","تضمين اتفاقيات خدمة الأمن وحقوق التدقيق في عقود الموردين","critical",false,["contract"]],
        ["SAMA-CSF-3.8","3.2.3","Exit Strategy","استراتيجية الخروج","Define vendor exit strategy with data return/destruction","تحديد استراتيجية خروج الموردين مع إرجاع/تدمير البيانات","high",false,["document"]],
      ])),
    ]),
    D("SAMA-D4","4","CS Resilience","مرونة الأمن السيبراني",[
      S("SAMA-4-1","4.1","Incident Response","الاستجابة للحوادث",controls([
        ["SAMA-CSF-4.1","4.1.1","Financial IR Plan","خطة الاستجابة المالية","Develop financial sector incident response plan","تطوير خطة استجابة للحوادث خاصة بالقطاع المالي","critical",false,["document"]],
        ["SAMA-CSF-4.2","4.1.2","Fraud Detection","كشف الاحتيال","Real-time fraud detection and response capabilities","قدرات كشف الاحتيال والاستجابة في الوقت الحقيقي","critical",true,["fraud_report"]],
        ["SAMA-CSF-4.3","4.1.3","SAMA Notification","إخطار ساما","Notify SAMA of significant cyber incidents within 2 hours","إخطار ساما بالحوادث السيبرانية الهامة خلال ساعتين","critical",false,["notification_record"]],
        ["SAMA-CSF-4.4","4.1.4","IR Testing","اختبار الاستجابة","Annual incident response testing and tabletop exercises","اختبارات سنوية للاستجابة للحوادث وتمارين الطاولة","high",false,["drill_report"]],
      ])),
      S("SAMA-4-2","4.2","Business Continuity","استمرارية الأعمال",controls([
        ["SAMA-CSF-4.5","4.2.1","BCP for Financial","BCP للخدمات المالية","Financial services BCP with cyber scenarios","خطة استمرارية الأعمال للخدمات المالية مع سيناريوهات سيبرانية","critical",false,["bcp_plan"]],
        ["SAMA-CSF-4.6","4.2.2","DR for Core Banking","DR للخدمات المصرفية","DR plan for core banking systems with RTO <2hrs","خطة التعافي لأنظمة الخدمات المصرفية الأساسية مع RTO أقل من ساعتين","critical",false,["dr_plan"]],
        ["SAMA-CSF-4.7","4.2.3","Payment Continuity","استمرارية المدفوعات","Ensure payment system continuity during incidents","ضمان استمرارية نظام المدفوعات أثناء الحوادث","critical",false,["continuity_plan"]],
        ["SAMA-CSF-4.8","4.2.4","DR Testing","اختبار التعافي","Bi-annual DR testing for critical financial systems","اختبار التعافي نصف سنوي للأنظمة المالية الحرجة","critical",false,["dr_test_report"]],
      ])),
      S("SAMA-4-3","4.3","Threat Intelligence","استخبارات التهديدات",controls([
        ["SAMA-CSF-4.9","4.3.1","Financial TI","استخبارات التهديدات المالية","Subscribe to financial sector threat intelligence","الاشتراك في استخبارات التهديدات الخاصة بالقطاع المالي","high",true,["ti_subscription"]],
        ["SAMA-CSF-4.10","4.3.2","TI Sharing","مشاركة الاستخبارات","Participate in financial sector information sharing","المشاركة في تبادل المعلومات بالقطاع المالي","high",false,["sharing_record"]],
        ["SAMA-CSF-4.11","4.3.3","Threat Modeling","نمذجة التهديدات","Conduct threat modeling for financial services","إجراء نمذجة التهديدات للخدمات المالية","high",false,["threat_model"]],
      ])),
    ]),
  ],
});

// ════════════════════════════════════════════
// 2. SAMA BCM — Business Continuity Management
//    3 Domains · 9 Subdomains · 45 Controls
// ════════════════════════════════════════════
export const SAMA_BCM: FrameworkDef = FW({
  id:"INST-KSA-SAMA-BCM",reg:"REG-KSA-SAMA",nEn:"Business Continuity Management Framework",nAr:"إطار إدارة استمرارية الأعمال",
  type:"framework",ver:"1.0",verId:"VER-KSA-SAMA-BCM-1-0",
  sectors:["SEC-KSA-FIN-BANK","SEC-KSA-FIN-INS","SEC-KSA-FIN-FINTECH"],mandatory:true,
  sumEn:"SAMA business continuity management requirements for financial institutions.",
  sumAr:"متطلبات ساما لإدارة استمرارية الأعمال للمؤسسات المالية.",
  tags:["business_continuity","finance","mandatory"],
  domains:[
    D("SBCM-D1","1","BCM Governance","حوكمة استمرارية الأعمال",[
      S("SBCM-1-1","1.1","BCM Policy","سياسة استمرارية الأعمال",controls([
        ["SBCM-1.1.1","1.1.1","BCM Policy","سياسة BCM","Establish BCM policy approved by board","وضع سياسة BCM معتمدة من مجلس الإدارة","critical",false,["document"]],
        ["SBCM-1.1.2","1.1.2","BCM Program","برنامج BCM","Establish enterprise-wide BCM program","إنشاء برنامج BCM على مستوى المؤسسة","critical",false,["document"]],
        ["SBCM-1.1.3","1.1.3","BCM Roles","أدوار BCM","Define BCM roles and responsibilities","تحديد أدوار ومسؤوليات BCM","high",false,["document","org_chart"]],
        ["SBCM-1.1.4","1.1.4","BCM Budget","ميزانية BCM","Allocate adequate BCM budget","تخصيص ميزانية كافية لـ BCM","high",false,["budget_document"]],
      ])),
      S("SBCM-1-2","1.2","Risk & Impact Analysis","تحليل المخاطر والتأثير",controls([
        ["SBCM-1.2.1","1.2.1","BIA","تحليل تأثير الأعمال","Conduct BIA for all critical financial processes","إجراء تحليل تأثير الأعمال لجميع العمليات المالية الحرجة","critical",false,["bia_report"]],
        ["SBCM-1.2.2","1.2.2","RTO/RPO Definition","تحديد RTO/RPO","Define RTO and RPO for each critical process","تحديد وقت ونقطة الاسترداد لكل عملية حرجة","critical",false,["document"]],
        ["SBCM-1.2.3","1.2.3","Threat Assessment","تقييم التهديدات","Assess threats to business continuity","تقييم التهديدات لاستمرارية الأعمال","high",false,["assessment_report"]],
        ["SBCM-1.2.4","1.2.4","Dependency Analysis","تحليل التبعيات","Map critical dependencies and single points of failure","رسم خرائط التبعيات الحرجة ونقاط الفشل الفردية","high",false,["dependency_map"]],
      ])),
    ]),
    D("SBCM-D2","2","BCM Strategy & Plans","استراتيجية وخطط الاستمرارية",[
      S("SBCM-2-1","2.1","BCM Strategy","استراتيجية الاستمرارية",controls([
        ["SBCM-2.1.1","2.1.1","Recovery Strategy","استراتيجية الاسترداد","Define recovery strategies for critical processes","تحديد استراتيجيات الاسترداد للعمليات الحرجة","critical",false,["document"]],
        ["SBCM-2.1.2","2.1.2","Alternate Sites","المواقع البديلة","Establish alternate processing and work sites","إنشاء مواقع معالجة وعمل بديلة","critical",false,["site_assessment"]],
        ["SBCM-2.1.3","2.1.3","Data Replication","تكرار البيانات","Implement real-time data replication for critical systems","تنفيذ تكرار البيانات في الوقت الحقيقي للأنظمة الحرجة","critical",true,["system_config"]],
        ["SBCM-2.1.4","2.1.4","Staff Continuity","استمرارية الموظفين","Plan for staff unavailability scenarios","التخطيط لسيناريوهات عدم توفر الموظفين","high",false,["document"]],
      ])),
      S("SBCM-2-2","2.2","Business Continuity Plans","خطط استمرارية الأعمال",controls([
        ["SBCM-2.2.1","2.2.1","Core Banking BCP","BCP الخدمات المصرفية","BCP for core banking and payment systems","خطة استمرارية للخدمات المصرفية الأساسية وأنظمة الدفع","critical",false,["bcp_plan"]],
        ["SBCM-2.2.2","2.2.2","Channel BCP","BCP القنوات","BCP for digital channels (mobile, internet banking)","خطة استمرارية للقنوات الرقمية","critical",false,["bcp_plan"]],
        ["SBCM-2.2.3","2.2.3","ATM/POS BCP","BCP الصراف/نقاط البيع","BCP for ATM and POS networks","خطة استمرارية لشبكات الصراف ونقاط البيع","high",false,["bcp_plan"]],
        ["SBCM-2.2.4","2.2.4","Communication Plan","خطة الاتصالات","Crisis communication plan for stakeholders","خطة اتصالات الأزمة لأصحاب المصلحة","critical",false,["document"]],
      ])),
      S("SBCM-2-3","2.3","Disaster Recovery","التعافي من الكوارث",controls([
        ["SBCM-2.3.1","2.3.1","DR Plan","خطة التعافي","Comprehensive DR plan for IT infrastructure","خطة تعافي شاملة للبنية التحتية لتقنية المعلومات","critical",false,["dr_plan"]],
        ["SBCM-2.3.2","2.3.2","DR Site","موقع التعافي","Maintain DR site with geographic separation","الحفاظ على موقع التعافي مع فصل جغرافي","critical",false,["site_assessment"]],
        ["SBCM-2.3.3","2.3.3","Backup Strategy","استراتيجية النسخ الاحتياطي","3-2-1 backup strategy for all critical data","استراتيجية نسخ احتياطي 3-2-1 لجميع البيانات الحرجة","critical",true,["backup_report"]],
        ["SBCM-2.3.4","2.3.4","Recovery Procedures","إجراءات الاسترداد","Documented step-by-step recovery procedures","إجراءات استرداد موثقة خطوة بخطوة","critical",false,["document"]],
      ])),
    ]),
    D("SBCM-D3","3","BCM Testing & Maintenance","اختبار وصيانة الاستمرارية",[
      S("SBCM-3-1","3.1","BCM Testing","اختبار الاستمرارية",controls([
        ["SBCM-3.1.1","3.1.1","Test Schedule","جدول الاختبارات","Annual BCM test schedule covering all plans","جدول اختبارات BCM سنوي يغطي جميع الخطط","critical",false,["test_schedule"]],
        ["SBCM-3.1.2","3.1.2","Tabletop Exercises","تمارين الطاولة","Quarterly tabletop exercises for crisis scenarios","تمارين طاولة ربع سنوية لسيناريوهات الأزمات","high",false,["exercise_report"]],
        ["SBCM-3.1.3","3.1.3","DR Failover Test","اختبار تجاوز الفشل","Bi-annual full DR failover test","اختبار تجاوز فشل كامل نصف سنوي","critical",false,["dr_test_report"]],
        ["SBCM-3.1.4","3.1.4","Test Results","نتائج الاختبارات","Document and remediate test findings","توثيق ومعالجة نتائج الاختبارات","high",false,["test_report"]],
      ])),
      S("SBCM-3-2","3.2","BCM Maintenance","صيانة الاستمرارية",controls([
        ["SBCM-3.2.1","3.2.1","Plan Review","مراجعة الخطط","Annual review and update of all BCM plans","مراجعة وتحديث سنوي لجميع خطط BCM","critical",false,["review_report"]],
        ["SBCM-3.2.2","3.2.2","Change Triggers","محفزات التغيير","Update BCM plans upon significant changes","تحديث خطط BCM عند التغييرات الهامة","high",false,["change_record"]],
        ["SBCM-3.2.3","3.2.3","BCM Maturity","نضج BCM","Assess BCM program maturity annually","تقييم نضج برنامج BCM سنوياً","high",false,["maturity_report"]],
        ["SBCM-3.2.4","3.2.4","SAMA Reporting","تقارير ساما","Report BCM status to SAMA as required","تقديم تقارير حالة BCM لساما حسب المطلوب","critical",false,["report"]],
      ])),
    ]),
  ],
});

// ════════════════════════════════════════════
// 3. SAMA Fintech — Fintech Regulatory Rules
//    3 Domains · 8 Subdomains · 40 Controls
// ════════════════════════════════════════════
export const SAMA_FINTECH: FrameworkDef = FW({
  id:"INST-KSA-SAMA-FINTECH",reg:"REG-KSA-SAMA",nEn:"Fintech Regulatory Framework",nAr:"الإطار التنظيمي للتقنية المالية",
  type:"regulation",ver:"2.0",verId:"VER-KSA-SAMA-FINTECH-2-0",
  sectors:["SEC-KSA-FIN-FINTECH"],mandatory:true,
  sumEn:"SAMA regulatory framework for fintech companies including sandbox requirements and operational standards.",
  sumAr:"الإطار التنظيمي لساما لشركات التقنية المالية بما في ذلك متطلبات البيئة التجريبية.",
  tags:["fintech","regulation","sandbox"],
  domains:[
    D("SFIN-D1","1","Fintech Licensing","ترخيص التقنية المالية",[
      S("SFIN-1-1","1.1","Sandbox Requirements","متطلبات البيئة التجريبية",controls([
        ["SFIN-1.1.1","1.1.1","Sandbox Application","طلب البيئة التجريبية","Complete sandbox application with security architecture","إكمال طلب البيئة التجريبية مع بنية الأمن","critical",false,["application_form"]],
        ["SFIN-1.1.2","1.1.2","Risk Assessment","تقييم المخاطر","Conduct risk assessment for fintech product/service","إجراء تقييم مخاطر للمنتج/الخدمة المالية التقنية","critical",false,["assessment_report"]],
        ["SFIN-1.1.3","1.1.3","Customer Protection","حماية العملاء","Implement customer protection and redress mechanisms","تنفيذ آليات حماية العملاء والتعويض","critical",false,["document"]],
        ["SFIN-1.1.4","1.1.4","AML/KYC","مكافحة غسل الأموال","Implement AML/CFT and KYC compliance","تنفيذ الامتثال لمكافحة غسل الأموال وتمويل الإرهاب","critical",true,["system_config"]],
      ])),
      S("SFIN-1-2","1.2","Operational Requirements","المتطلبات التشغيلية",controls([
        ["SFIN-1.2.1","1.2.1","Capital Requirements","متطلبات رأس المال","Maintain minimum capital requirements","الحفاظ على الحد الأدنى لمتطلبات رأس المال","critical",false,["financial_statement"]],
        ["SFIN-1.2.2","1.2.2","Governance Structure","هيكل الحوكمة","Establish adequate governance structure","إنشاء هيكل حوكمة مناسب","critical",false,["document","org_chart"]],
        ["SFIN-1.2.3","1.2.3","Technology Standards","معايير التقنية","Meet SAMA technology and security standards","الالتزام بمعايير ساما التقنية والأمنية","critical",true,["compliance_report"]],
        ["SFIN-1.2.4","1.2.4","Reporting Obligations","التزامات التقارير","Regular reporting to SAMA on operations","تقارير منتظمة لساما عن العمليات","high",false,["report"]],
      ])),
    ]),
    D("SFIN-D2","2","Fintech Security","أمن التقنية المالية",[
      S("SFIN-2-1","2.1","Data Protection","حماية البيانات",controls([
        ["SFIN-2.1.1","2.1.1","Customer Data Encryption","تشفير بيانات العملاء","Encrypt all customer financial data at rest and in transit","تشفير جميع البيانات المالية للعملاء أثناء التخزين والنقل","critical",true,["encryption_report"]],
        ["SFIN-2.1.2","2.1.2","Data Localization","توطين البيانات","Store customer data within KSA","تخزين بيانات العملاء داخل المملكة","critical",true,["system_config"]],
        ["SFIN-2.1.3","2.1.3","Privacy Compliance","الامتثال للخصوصية","Comply with PDPL for customer data handling","الامتثال لنظام حماية البيانات في التعامل مع بيانات العملاء","critical",false,["compliance_report"]],
        ["SFIN-2.1.4","2.1.4","Tokenization","الترميز","Tokenize sensitive payment data","ترميز بيانات الدفع الحساسة","critical",true,["system_config"]],
      ])),
      S("SFIN-2-2","2.2","Transaction Security","أمن المعاملات",controls([
        ["SFIN-2.2.1","2.2.1","Transaction Monitoring","مراقبة المعاملات","Real-time transaction monitoring and fraud detection","مراقبة المعاملات في الوقت الحقيقي وكشف الاحتيال","critical",true,["monitoring_report"]],
        ["SFIN-2.2.2","2.2.2","Transaction Signing","توقيع المعاملات","Implement transaction signing for high-value operations","تنفيذ توقيع المعاملات للعمليات عالية القيمة","critical",true,["system_config"]],
        ["SFIN-2.2.3","2.2.3","Rate Limiting","تحديد المعدل","Implement rate limiting and velocity checks","تنفيذ تحديد المعدل وفحوصات السرعة","high",true,["system_config"]],
        ["SFIN-2.2.4","2.2.4","Reconciliation","المطابقة","Automated daily transaction reconciliation","المطابقة الآلية اليومية للمعاملات","critical",true,["reconciliation_report"]],
      ])),
      S("SFIN-2-3","2.3","API & Integration Security","أمن واجهات البرمجة والتكامل",controls([
        ["SFIN-2.3.1","2.3.1","API Gateway","بوابة API","Secure API gateway with rate limiting and authentication","بوابة API آمنة مع تحديد المعدل والمصادقة","critical",true,["system_config"]],
        ["SFIN-2.3.2","2.3.2","API Authentication","مصادقة API","OAuth 2.0 / OpenID Connect for API authentication","OAuth 2.0 / OpenID Connect لمصادقة API","critical",true,["system_config"]],
        ["SFIN-2.3.3","2.3.3","API Versioning","إصدارات API","Implement API versioning and deprecation policy","تنفيذ سياسة إصدارات API والإيقاف","high",true,["document"]],
        ["SFIN-2.3.4","2.3.4","Webhook Security","أمن Webhook","Secure webhook endpoints with signatures","تأمين نقاط نهاية Webhook بالتوقيعات","high",true,["system_config"]],
      ])),
    ]),
    D("SFIN-D3","3","Fintech Resilience","مرونة التقنية المالية",[
      S("SFIN-3-1","3.1","Availability","التوافر",controls([
        ["SFIN-3.1.1","3.1.1","SLA Commitment","التزام SLA","Maintain 99.9%+ uptime for customer-facing services","الحفاظ على توفر 99.9%+ للخدمات المواجهة للعملاء","critical",true,["sla_report"]],
        ["SFIN-3.1.2","3.1.2","Scalability","قابلية التوسع","Implement auto-scaling for peak transaction loads","تنفيذ التوسع التلقائي لأحمال المعاملات القصوى","high",true,["system_config"]],
        ["SFIN-3.1.3","3.1.3","Failover","تجاوز الفشل","Automatic failover for critical fintech services","تجاوز الفشل التلقائي للخدمات المالية التقنية الحرجة","critical",true,["system_config"]],
        ["SFIN-3.1.4","3.1.4","Incident Communication","اتصالات الحوادث","Transparent incident communication to customers","اتصالات الحوادث الشفافة للعملاء","high",false,["document"]],
      ])),
      S("SFIN-3-2","3.2","Open Banking","الخدمات المصرفية المفتوحة",controls([
        ["SFIN-3.2.1","3.2.1","Consent Management","إدارة الموافقة","Customer consent management for data sharing","إدارة موافقة العملاء لمشاركة البيانات","critical",true,["system_config"]],
        ["SFIN-3.2.2","3.2.2","TPP Registration","تسجيل TPP","Third-party provider registration and verification","تسجيل والتحقق من مزودي الخدمات الخارجيين","critical",false,["registration_record"]],
        ["SFIN-3.2.3","3.2.3","Screen Scraping Ban","حظر قراءة الشاشة","Prohibit screen scraping; use dedicated APIs","حظر قراءة الشاشة واستخدام واجهات برمجة مخصصة","critical",true,["system_config"]],
        ["SFIN-3.2.4","3.2.4","API Standards","معايير API","Comply with SAMA Open Banking API standards","الامتثال لمعايير ساما لواجهات البرمجة المصرفية المفتوحة","critical",true,["compliance_report"]],
      ])),
    ]),
  ],
});

// ── Export all SAMA frameworks ──
export const SAMA_FRAMEWORKS: FrameworkDef[] = [
  SAMA_CSF, SAMA_BCM, SAMA_FINTECH,
];
