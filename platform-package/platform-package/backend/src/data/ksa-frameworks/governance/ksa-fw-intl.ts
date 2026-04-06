// ============================================
// Shahin AI-KSA GRC — International Benchmark Frameworks
// ISO 27001, NIST CSF, COBIT, PCI-DSS, CSA CCM, CIS
// ============================================
import { FrameworkDef } from "./ksa-frameworks";
import { S, D, FW, controls } from "./ksa-control-builder";

export const ISO_27001: FrameworkDef = FW({
  id:"INST-INTL-ISO-27001",reg:"REG-INTL-ISO",nEn:"ISO/IEC 27001:2022 Information Security Management",nAr:"آيزو 27001:2022 إدارة أمن المعلومات",
  type:"standard",ver:"2022",verId:"VER-INTL-ISO27001-2022",sectors:["all"],mandatory:false,
  sumEn:"International standard for information security management systems (ISMS). Widely referenced by NCA and SAMA.",
  sumAr:"المعيار الدولي لأنظمة إدارة أمن المعلومات. مرجع رئيسي للهيئة الوطنية وساما.",
  tags:["iso","isms","information_security","international"],
  domains:[
    D("ISO27-D1","A5","Organizational Controls","الضوابط المؤسسية",[
      S("ISO27-A5-1","A5.1","Policies","السياسات",controls([
        ["ISO27-A5.1.1","A5.1.1","IS Policy","سياسة أمن المعلومات","Define and publish information security policy","تحديد ونشر سياسة أمن المعلومات","critical",false,["document"],["ECC-1-3-1"]],
        ["ISO27-A5.1.2","A5.1.2","Policy Review","مراجعة السياسة","Review IS policy at planned intervals","مراجعة سياسة أمن المعلومات على فترات مخططة","high",false,["review_record"]],
      ])),
      S("ISO27-A5-2","A5.2","Roles","الأدوار",controls([
        ["ISO27-A5.2.1","A5.2.1","IS Roles","أدوار أمن المعلومات","Define IS roles and responsibilities","تحديد أدوار ومسؤوليات أمن المعلومات","critical",false,["document"],["ECC-1-2-2"]],
        ["ISO27-A5.2.2","A5.2.2","Segregation of Duties","فصل المهام","Ensure segregation of conflicting duties","ضمان فصل المهام المتضاربة","high",true,["system_config"]],
      ])),
      S("ISO27-A5-3","A5.3","Threat Intelligence","استخبارات التهديدات",controls([
        ["ISO27-A5.3.1","A5.3.1","Threat Intelligence","استخبارات التهديدات","Collect and analyze threat intelligence","جمع وتحليل استخبارات التهديدات","high",true,["ti_report"],["ECC-3-4-1"]],
      ])),
      S("ISO27-A5-4","A5.4","Management Commitment","التزام الإدارة",controls([
        ["ISO27-A5.4.1","A5.4.1","Management Direction","توجيه الإدارة","Management direction for IS","توجيه الإدارة لأمن المعلومات","critical",false,["document"]],
        ["ISO27-A5.4.2","A5.4.2","Contact with Authorities","الاتصال بالسلطات","Maintain contact with relevant authorities","الحفاظ على الاتصال بالسلطات المختصة","high",false,["contact_list"]],
        ["ISO27-A5.4.3","A5.4.3","IS in Projects","أمن المعلومات في المشاريع","Address IS in project management","معالجة أمن المعلومات في إدارة المشاريع","high",false,["document"],["ECC-1-2-4"]],
      ])),
      S("ISO27-A5-5","A5.5","Asset Management","إدارة الأصول",controls([
        ["ISO27-A5.5.1","A5.5.1","Asset Inventory","جرد الأصول","Inventory of information assets","جرد أصول المعلومات","critical",true,["asset_register"],["ECC-2-1-1"]],
        ["ISO27-A5.5.2","A5.5.2","Asset Ownership","ملكية الأصول","Assign ownership for all assets","تعيين ملكية لجميع الأصول","high",false,["asset_register"],["ECC-2-1-3"]],
        ["ISO27-A5.5.3","A5.5.3","Acceptable Use","الاستخدام المقبول","Define acceptable use of assets","تحديد الاستخدام المقبول للأصول","high",false,["document"]],
        ["ISO27-A5.5.4","A5.5.4","Return of Assets","إعادة الأصول","Return assets upon termination","إعادة الأصول عند إنهاء الخدمة","medium",true,["process_record"]],
      ])),
      S("ISO27-A5-6","A5.6","Access Control","التحكم في الوصول",controls([
        ["ISO27-A5.6.1","A5.6.1","Access Control Policy","سياسة التحكم في الوصول","Establish and enforce access control policy","وضع وتطبيق سياسة التحكم في الوصول","critical",true,["document"],["ECC-2-2-2"]],
        ["ISO27-A5.6.2","A5.6.2","Identity Mgmt","إدارة الهوية","Manage full identity lifecycle","إدارة دورة حياة الهوية الكاملة","critical",true,["system_config"],["ECC-2-2-1"]],
        ["ISO27-A5.6.3","A5.6.3","Authentication","المصادقة","Implement strong authentication","تنفيذ المصادقة القوية","critical",true,["system_config"],["ECC-2-2-5"]],
        ["ISO27-A5.6.4","A5.6.4","Access Rights","حقوق الوصول","Provision and review access rights","تزويد ومراجعة حقوق الوصول","high",true,["review_report"],["ECC-2-2-4"]],
        ["ISO27-A5.6.5","A5.6.5","Privileged Access","الوصول المميز","Restrict and control privileged access","تقييد والتحكم في الوصول المميز","critical",true,["pam_report"],["ECC-2-2-3"]],
      ])),
      S("ISO27-A5-7","A5.7","Supplier Relationships","علاقات الموردين",controls([
        ["ISO27-A5.7.1","A5.7.1","Supplier Policy","سياسة الموردين","IS policy for supplier relationships","سياسة أمن المعلومات لعلاقات الموردين","critical",false,["document"],["ECC-4-1-2"]],
        ["ISO27-A5.7.2","A5.7.2","Supplier Agreements","اتفاقيات الموردين","Address IS in supplier agreements","معالجة أمن المعلومات في اتفاقيات الموردين","critical",false,["contract"],["ECC-4-1-2"]],
        ["ISO27-A5.7.3","A5.7.3","Supplier Monitoring","مراقبة الموردين","Monitor and review supplier services","مراقبة ومراجعة خدمات الموردين","high",false,["monitoring_report"],["ECC-4-1-3"]],
        ["ISO27-A5.7.4","A5.7.4","Cloud Services","الخدمات السحابية","IS for cloud service use","أمن المعلومات لاستخدام الخدمات السحابية","critical",false,["document"],["ECC-4-2-1"]],
      ])),
      S("ISO27-A5-8","A5.8","Incident Management","إدارة الحوادث",controls([
        ["ISO27-A5.8.1","A5.8.1","Incident Mgmt Process","عملية إدارة الحوادث","Plan and prepare for IS incidents","التخطيط والاستعداد لحوادث أمن المعلومات","critical",false,["document"],["ECC-3-1-3"]],
        ["ISO27-A5.8.2","A5.8.2","Incident Reporting","الإبلاغ عن الحوادث","Report IS events through channels","الإبلاغ عن أحداث أمن المعلومات عبر القنوات","critical",true,["incident_record"],["ECC-3-1-5"]],
        ["ISO27-A5.8.3","A5.8.3","Lessons Learned","الدروس المستفادة","Learn from IS incidents","التعلم من حوادث أمن المعلومات","high",false,["review_report"],["ECC-3-1-6"]],
        ["ISO27-A5.8.4","A5.8.4","Evidence Collection","جمع الأدلة","Collect and preserve digital evidence","جمع والحفاظ على الأدلة الرقمية","high",false,["forensic_report"]],
      ])),
      S("ISO27-A5-9","A5.9","Continuity","الاستمرارية",controls([
        ["ISO27-A5.9.1","A5.9.1","IS Continuity Planning","تخطيط استمرارية أمن المعلومات","Plan IS continuity","تخطيط استمرارية أمن المعلومات","critical",false,["bcp_plan"],["ECC-3-2-1"]],
        ["ISO27-A5.9.2","A5.9.2","IS Continuity Testing","اختبار الاستمرارية","Test IS continuity arrangements","اختبار ترتيبات استمرارية أمن المعلومات","critical",false,["test_report"],["ECC-3-2-3"]],
        ["ISO27-A5.9.3","A5.9.3","ICT Readiness","جاهزية تقنية المعلومات","ICT readiness for business continuity","جاهزية تقنية المعلومات والاتصالات لاستمرارية الأعمال","critical",false,["dr_plan"],["ECC-3-2-2"]],
      ])),
      S("ISO27-A5-10","A5.10","Compliance","الامتثال",controls([
        ["ISO27-A5.10.1","A5.10.1","Legal Requirements","المتطلبات القانونية","Identify applicable legal requirements","تحديد المتطلبات القانونية المعمول بها","critical",false,["document"],["ECC-1-7-1"]],
        ["ISO27-A5.10.2","A5.10.2","IS Review","مراجعة أمن المعلومات","Independent review of IS","مراجعة مستقلة لأمن المعلومات","high",false,["audit_report"],["ECC-1-7-2"]],
        ["ISO27-A5.10.3","A5.10.3","Technical Compliance","الامتثال التقني","Review technical compliance","مراجعة الامتثال التقني","high",true,["scan_report"]],
      ])),
    ]),
    D("ISO27-D2","A6","People Controls","ضوابط الأفراد",[
      S("ISO27-A6-1","A6.1","HR Security","أمن الموارد البشرية",controls([
        ["ISO27-A6.1.1","A6.1.1","Screening","الفحص","Pre-employment background checks","فحوصات خلفية قبل التوظيف","high",false,["hr_record"],["ECC-1-6-1"]],
        ["ISO27-A6.1.2","A6.1.2","Terms of Employment","شروط التوظيف","IS responsibilities in employment terms","مسؤوليات أمن المعلومات في شروط التوظيف","medium",false,["contract"],["ECC-1-6-2"]],
        ["ISO27-A6.1.3","A6.1.3","Awareness & Training","التوعية والتدريب","IS awareness and training program","برنامج التوعية والتدريب بأمن المعلومات","high",false,["training_record"],["ECC-1-5-1"]],
        ["ISO27-A6.1.4","A6.1.4","Disciplinary Process","الإجراء التأديبي","Disciplinary process for IS violations","الإجراء التأديبي لانتهاكات أمن المعلومات","high",false,["document"]],
        ["ISO27-A6.1.5","A6.1.5","Termination Responsibilities","مسؤوليات إنهاء الخدمة","IS responsibilities on termination","مسؤوليات أمن المعلومات عند إنهاء الخدمة","critical",true,["process_record"],["ECC-1-6-3"]],
        ["ISO27-A6.1.6","A6.1.6","Remote Working","العمل عن بعد","IS measures for remote working","تدابير أمن المعلومات للعمل عن بعد","high",true,["system_config"]],
        ["ISO27-A6.1.7","A6.1.7","IS Event Reporting","الإبلاغ عن الأحداث","Report IS events","الإبلاغ عن أحداث أمن المعلومات","high",true,["system_config"]],
      ])),
    ]),
    D("ISO27-D3","A7","Physical Controls","الضوابط المادية",[
      S("ISO27-A7-1","A7.1","Physical Security","الأمن المادي",controls([
        ["ISO27-A7.1.1","A7.1.1","Physical Perimeter","المحيط المادي","Define and protect physical security perimeters","تحديد وحماية محيطات الأمن المادي","critical",true,["system_config"],["ECC-2-8-1"]],
        ["ISO27-A7.1.2","A7.1.2","Physical Entry","الدخول المادي","Control physical entry to secure areas","التحكم في الدخول المادي للمناطق الآمنة","critical",true,["access_log"],["ECC-2-8-1"]],
        ["ISO27-A7.1.3","A7.1.3","Equipment Protection","حماية المعدات","Protect equipment from environmental threats","حماية المعدات من التهديدات البيئية","high",true,["monitoring_report"],["ECC-2-8-2"]],
        ["ISO27-A7.1.4","A7.1.4","Secure Disposal","التخلص الآمن","Securely dispose of storage media","التخلص الآمن من وسائط التخزين","critical",false,["disposal_record"]],
        ["ISO27-A7.1.5","A7.1.5","Clear Desk","المكتب النظيف","Enforce clear desk and clear screen","فرض سياسة المكتب النظيف والشاشة النظيفة","medium",false,["document"]],
      ])),
    ]),
    D("ISO27-D4","A8","Technological Controls","الضوابط التقنية",[
      S("ISO27-A8-1","A8.1","System Security","أمن الأنظمة",controls([
        ["ISO27-A8.1.1","A8.1.1","Endpoint Security","أمن نقاط النهاية","Protect user endpoint devices","حماية أجهزة المستخدم الطرفية","critical",true,["edr_report"]],
        ["ISO27-A8.1.2","A8.1.2","System Admin Rights","حقوق إدارة النظام","Restrict system admin privileges","تقييد امتيازات إدارة النظام","critical",true,["system_config"]],
        ["ISO27-A8.1.3","A8.1.3","Malware Protection","الحماية من البرمجيات الخبيثة","Implement malware protection","تنفيذ الحماية من البرمجيات الخبيثة","critical",true,["system_config"],["ECC-2-3-3"]],
        ["ISO27-A8.1.4","A8.1.4","Vulnerability Mgmt","إدارة الثغرات","Manage technical vulnerabilities","إدارة الثغرات التقنية","critical",true,["scan_report"],["ECC-3-3-1"]],
        ["ISO27-A8.1.5","A8.1.5","Configuration Mgmt","إدارة التكوين","Establish secure configurations","إنشاء تكوينات آمنة","critical",true,["config_baseline"],["ECC-2-3-1"]],
        ["ISO27-A8.1.6","A8.1.6","Secure Dev","التطوير الآمن","Implement secure development lifecycle","تنفيذ دورة حياة التطوير الآمن","critical",false,["document"]],
        ["ISO27-A8.1.7","A8.1.7","Testing","الاختبار","Security testing in development and acceptance","اختبار الأمن في التطوير والقبول","critical",true,["test_report"]],
      ])),
      S("ISO27-A8-2","A8.2","Network Security","أمن الشبكات",controls([
        ["ISO27-A8.2.1","A8.2.1","Network Security","أمن الشبكات","Secure network infrastructure","تأمين البنية التحتية للشبكة","critical",true,["system_config"],["ECC-2-4-1"]],
        ["ISO27-A8.2.2","A8.2.2","Network Segmentation","تجزئة الشبكة","Implement network segmentation","تنفيذ تجزئة الشبكة","critical",true,["network_diagram"]],
        ["ISO27-A8.2.3","A8.2.3","Web Filtering","تصفية الويب","Implement web content filtering","تنفيذ تصفية محتوى الويب","high",true,["system_config"],["ECC-2-3-5"]],
      ])),
      S("ISO27-A8-3","A8.3","Data Protection","حماية البيانات",controls([
        ["ISO27-A8.3.1","A8.3.1","Data Classification","تصنيف البيانات","Classify information","تصنيف المعلومات","critical",false,["classification_record"],["ECC-2-6-1"]],
        ["ISO27-A8.3.2","A8.3.2","Data Labeling","وسم البيانات","Label information according to classification","وسم المعلومات وفقاً للتصنيف","high",true,["system_config"]],
        ["ISO27-A8.3.3","A8.3.3","Data Transfer","نقل البيانات","Protect data in transfer","حماية البيانات أثناء النقل","critical",true,["system_config"],["ECC-2-6-2"]],
        ["ISO27-A8.3.4","A8.3.4","Data Masking","إخفاء البيانات","Implement data masking","تنفيذ إخفاء البيانات","high",true,["system_config"]],
        ["ISO27-A8.3.5","A8.3.5","DLP","منع فقدان البيانات","Implement data leakage prevention","تنفيذ منع تسريب البيانات","high",true,["dlp_report"],["ECC-2-6-3"]],
        ["ISO27-A8.3.6","A8.3.6","Backup","النسخ الاحتياطي","Maintain tested backups","الحفاظ على نسخ احتياطية مختبرة","critical",true,["backup_report"],["ECC-2-6-4"]],
        ["ISO27-A8.3.7","A8.3.7","Redundancy","التكرار","Implement redundancy of information processing","تنفيذ تكرار معالجة المعلومات","high",true,["system_config"]],
      ])),
      S("ISO27-A8-4","A8.4","Logging & Monitoring","التسجيل والمراقبة",controls([
        ["ISO27-A8.4.1","A8.4.1","Logging","التسجيل","Produce and protect activity logs","إنتاج وحماية سجلات النشاط","critical",true,["log_config"],["ECC-3-1-1"]],
        ["ISO27-A8.4.2","A8.4.2","Monitoring","المراقبة","Monitor networks, systems, and applications","مراقبة الشبكات والأنظمة والتطبيقات","critical",true,["monitoring_report"]],
        ["ISO27-A8.4.3","A8.4.3","Clock Sync","مزامنة الساعة","Synchronize clocks to reference source","مزامنة الساعات مع مصدر مرجعي","high",true,["system_config"]],
      ])),
      S("ISO27-A8-5","A8.5","Cryptography","التشفير",controls([
        ["ISO27-A8.5.1","A8.5.1","Cryptographic Controls","ضوابط التشفير","Implement cryptographic controls","تنفيذ ضوابط التشفير","critical",true,["system_config"],["ECC-2-7-1"]],
        ["ISO27-A8.5.2","A8.5.2","Key Management","إدارة المفاتيح","Manage cryptographic keys","إدارة مفاتيح التشفير","critical",true,["kms_report"],["ECC-2-7-2"]],
      ])),
    ]),
  ],
});

export const NIST_CSF: FrameworkDef = FW({
  id:"INST-INTL-NIST-CSF",reg:"REG-INTL-NIST",nEn:"NIST Cybersecurity Framework 2.0",nAr:"إطار الأمن السيبراني NIST 2.0",
  type:"framework",ver:"2.0",verId:"VER-INTL-NIST-CSF-2-0",sectors:["all"],mandatory:false,
  sumEn:"NIST Cybersecurity Framework 2.0 — Govern, Identify, Protect, Detect, Respond, Recover. Referenced by NCA ECC.",
  sumAr:"إطار الأمن السيبراني NIST 2.0 — الحوكمة، التحديد، الحماية، الكشف، الاستجابة، الاسترداد.",
  tags:["nist","cybersecurity","framework","international"],
  domains:[
    D("NCSF-GV","GV","Govern","الحوكمة",[
      S("NCSF-GV-1","GV.OC","Organizational Context","السياق المؤسسي",controls([
        ["NCSF-GV.OC-1","GV.OC-01","Mission Understanding","فهم المهمة","Understand organizational mission and stakeholder expectations","فهم مهمة المنظمة وتوقعات أصحاب المصلحة","critical",false,["document"]],
        ["NCSF-GV.OC-2","GV.OC-02","Legal Requirements","المتطلبات القانونية","Understand applicable legal and regulatory requirements","فهم المتطلبات القانونية والتنظيمية المعمول بها","critical",false,["document"]],
        ["NCSF-GV.OC-3","GV.OC-03","Supply Chain Dependencies","تبعيات سلسلة التوريد","Understand supply chain dependencies and risks","فهم تبعيات ومخاطر سلسلة التوريد","high",false,["dependency_map"]],
      ])),
      S("NCSF-GV-2","GV.RM","Risk Management Strategy","استراتيجية إدارة المخاطر",controls([
        ["NCSF-GV.RM-1","GV.RM-01","Risk Appetite","الرغبة في المخاطرة","Establish risk management objectives and risk appetite","وضع أهداف إدارة المخاطر والرغبة في المخاطرة","critical",false,["document"]],
        ["NCSF-GV.RM-2","GV.RM-02","Risk Tolerance","تحمل المخاطر","Determine and express risk tolerance","تحديد والتعبير عن تحمل المخاطر","critical",false,["document"]],
        ["NCSF-GV.RM-3","GV.RM-03","Supply Chain Risk","مخاطر سلسلة التوريد","Manage supply chain cybersecurity risks","إدارة مخاطر الأمن السيبراني لسلسلة التوريد","high",false,["risk_assessment"]],
      ])),
    ]),
    D("NCSF-ID","ID","Identify","التحديد",[
      S("NCSF-ID-1","ID.AM","Asset Management","إدارة الأصول",controls([
        ["NCSF-ID.AM-1","ID.AM-01","Hardware Inventory","جرد الأجهزة","Maintain hardware asset inventory","الحفاظ على جرد أصول الأجهزة","critical",true,["asset_register"],["ECC-2-1-1"]],
        ["NCSF-ID.AM-2","ID.AM-02","Software Inventory","جرد البرمجيات","Maintain software asset inventory","الحفاظ على جرد أصول البرمجيات","critical",true,["asset_register"]],
        ["NCSF-ID.AM-3","ID.AM-03","Data Inventory","جرد البيانات","Maintain data flow and asset inventory","الحفاظ على جرد تدفق البيانات والأصول","high",true,["data_inventory"]],
      ])),
      S("NCSF-ID-2","ID.RA","Risk Assessment","تقييم المخاطر",controls([
        ["NCSF-ID.RA-1","ID.RA-01","Vulnerability ID","تحديد الثغرات","Identify vulnerabilities in assets","تحديد الثغرات في الأصول","critical",true,["scan_report"],["ECC-3-3-1"]],
        ["NCSF-ID.RA-2","ID.RA-02","Threat Intelligence","استخبارات التهديدات","Receive and correlate threat intelligence","استقبال وربط استخبارات التهديدات","high",true,["ti_report"],["ECC-3-4-1"]],
        ["NCSF-ID.RA-3","ID.RA-03","Risk Identification","تحديد المخاطر","Identify and document risks","تحديد وتوثيق المخاطر","critical",false,["risk_register"],["ECC-1-4-2"]],
        ["NCSF-ID.RA-4","ID.RA-04","Risk Prioritization","ترتيب المخاطر","Prioritize risks based on impact and likelihood","ترتيب المخاطر بناءً على التأثير والاحتمال","critical",false,["risk_register"]],
      ])),
    ]),
    D("NCSF-PR","PR","Protect","الحماية",[
      S("NCSF-PR-1","PR.AA","Access & Auth","الوصول والمصادقة",controls([
        ["NCSF-PR.AA-1","PR.AA-01","Identity Management","إدارة الهوية","Manage identities and credentials","إدارة الهويات وبيانات الاعتماد","critical",true,["system_config"],["ECC-2-2-1"]],
        ["NCSF-PR.AA-2","PR.AA-02","Authentication","المصادقة","Authenticate users and services","مصادقة المستخدمين والخدمات","critical",true,["system_config"],["ECC-2-2-5"]],
        ["NCSF-PR.AA-3","PR.AA-03","Access Enforcement","فرض الوصول","Enforce authorized access","فرض الوصول المصرح به","critical",true,["system_config"],["ECC-2-2-2"]],
      ])),
      S("NCSF-PR-2","PR.DS","Data Security","أمن البيانات",controls([
        ["NCSF-PR.DS-1","PR.DS-01","Data at Rest","البيانات أثناء التخزين","Protect data at rest","حماية البيانات أثناء التخزين","critical",true,["encryption_report"],["ECC-2-6-2"]],
        ["NCSF-PR.DS-2","PR.DS-02","Data in Transit","البيانات أثناء النقل","Protect data in transit","حماية البيانات أثناء النقل","critical",true,["system_config"]],
        ["NCSF-PR.DS-3","PR.DS-03","Data Integrity","سلامة البيانات","Protect data integrity","حماية سلامة البيانات","critical",true,["system_config"]],
      ])),
    ]),
    D("NCSF-DE","DE","Detect","الكشف",[
      S("NCSF-DE-1","DE.CM","Continuous Monitoring","المراقبة المستمرة",controls([
        ["NCSF-DE.CM-1","DE.CM-01","Network Monitoring","مراقبة الشبكة","Monitor networks for anomalies","مراقبة الشبكات بحثاً عن شذوذ","critical",true,["monitoring_report"],["ECC-3-1-1"]],
        ["NCSF-DE.CM-2","DE.CM-02","Physical Monitoring","المراقبة المادية","Monitor physical environment","مراقبة البيئة المادية","high",true,["monitoring_report"]],
        ["NCSF-DE.CM-3","DE.CM-03","Personnel Monitoring","مراقبة الأفراد","Monitor authorized personnel activity","مراقبة نشاط الأفراد المصرح لهم","high",true,["monitoring_report"]],
      ])),
      S("NCSF-DE-2","DE.AE","Analysis","التحليل",controls([
        ["NCSF-DE.AE-1","DE.AE-01","Event Correlation","ربط الأحداث","Correlate events from multiple sources","ربط الأحداث من مصادر متعددة","critical",true,["siem_config"]],
        ["NCSF-DE.AE-2","DE.AE-02","Anomaly Detection","كشف الشذوذ","Detect anomalous events","كشف الأحداث الشاذة","critical",true,["anomaly_report"]],
        ["NCSF-DE.AE-3","DE.AE-03","Impact Analysis","تحليل التأثير","Analyze detected events for impact","تحليل الأحداث المكتشفة من حيث التأثير","high",true,["analysis_report"]],
      ])),
    ]),
    D("NCSF-RS","RS","Respond","الاستجابة",[
      S("NCSF-RS-1","RS.MA","Management","الإدارة",controls([
        ["NCSF-RS.MA-1","RS.MA-01","IR Execution","تنفيذ الاستجابة","Execute incident response plan","تنفيذ خطة الاستجابة للحوادث","critical",false,["ir_record"],["ECC-3-1-3"]],
        ["NCSF-RS.MA-2","RS.MA-02","Triage","الفرز","Triage and categorize incidents","فرز وتصنيف الحوادث","critical",true,["incident_record"],["ECC-3-1-4"]],
        ["NCSF-RS.MA-3","RS.MA-03","Escalation","التصعيد","Escalate incidents as needed","تصعيد الحوادث حسب الحاجة","critical",true,["escalation_record"]],
        ["NCSF-RS.MA-4","RS.MA-04","Containment","الاحتواء","Contain incidents to limit damage","احتواء الحوادث للحد من الأضرار","critical",true,["containment_record"]],
      ])),
    ]),
    D("NCSF-RC","RC","Recover","الاسترداد",[
      S("NCSF-RC-1","RC.RP","Recovery Planning","تخطيط الاسترداد",controls([
        ["NCSF-RC.RP-1","RC.RP-01","Recovery Plan Execution","تنفيذ خطة الاسترداد","Execute recovery plan","تنفيذ خطة الاسترداد","critical",false,["recovery_record"],["ECC-3-2-2"]],
        ["NCSF-RC.RP-2","RC.RP-02","Recovery Verification","التحقق من الاسترداد","Verify system and data integrity after recovery","التحقق من سلامة النظام والبيانات بعد الاسترداد","critical",true,["verification_report"]],
        ["NCSF-RC.RP-3","RC.RP-03","Communication","الاتصالات","Communicate recovery status to stakeholders","إبلاغ أصحاب المصلحة بحالة الاسترداد","high",false,["communication_record"]],
      ])),
    ]),
  ],
});

export const PCI_DSS: FrameworkDef = FW({
  id:"INST-INTL-PCI-DSS",reg:"REG-INTL-PCI",nEn:"PCI DSS v4.0",nAr:"معيار أمن بيانات صناعة بطاقات الدفع 4.0",
  type:"standard",ver:"4.0",verId:"VER-INTL-PCI-DSS-4-0",
  sectors:["SEC-KSA-FIN-BANK","SEC-KSA-FIN-FINTECH","SEC-KSA-RETAIL"],mandatory:true,
  sumEn:"PCI DSS v4.0 for all entities that store, process, or transmit payment card data. Mandatory per SAMA.",
  sumAr:"معيار أمن بيانات صناعة بطاقات الدفع 4.0 لجميع الكيانات التي تخزن أو تعالج أو تنقل بيانات بطاقات الدفع.",
  tags:["pci","payment","card_data","mandatory"],
  domains:[
    D("PCI-D1","1","Network & System Security","أمن الشبكات والأنظمة",[
      S("PCI-1-1","1","Firewall Controls","ضوابط جدار الحماية",controls([
        ["PCI-1.1","1.1","Network Segmentation","تجزئة الشبكة","Implement CDE network segmentation","تنفيذ تجزئة شبكة بيئة بيانات البطاقات","critical",true,["network_diagram"]],
        ["PCI-1.2","1.2","Firewall Configuration","تكوين جدار الحماية","Restrict traffic to/from CDE","تقييد حركة المرور من وإلى بيئة بيانات البطاقات","critical",true,["firewall_config"]],
        ["PCI-1.3","1.3","DMZ Implementation","تنفيذ DMZ","Implement DMZ for public-facing systems","تنفيذ DMZ للأنظمة المواجهة للإنترنت","critical",true,["network_diagram"]],
      ])),
      S("PCI-1-2","2","System Hardening","تقوية الأنظمة",controls([
        ["PCI-2.1","2.1","Default Passwords","كلمات المرور الافتراضية","Remove vendor-supplied defaults","إزالة الإعدادات الافتراضية للمورد","critical",true,["scan_report"]],
        ["PCI-2.2","2.2","Configuration Standards","معايير التكوين","Develop system configuration standards","تطوير معايير تكوين الأنظمة","critical",true,["config_baseline"]],
        ["PCI-2.3","2.3","Encryption","التشفير","Encrypt non-console admin access","تشفير الوصول الإداري غير المباشر","critical",true,["system_config"]],
      ])),
    ]),
    D("PCI-D2","3","Cardholder Data Protection","حماية بيانات حامل البطاقة",[
      S("PCI-2-1","3","Stored Data","البيانات المخزنة",controls([
        ["PCI-3.1","3.1","Data Retention","الاحتفاظ بالبيانات","Minimize cardholder data storage","تقليل تخزين بيانات حامل البطاقة","critical",true,["retention_config"]],
        ["PCI-3.2","3.2","Sensitive Auth Data","بيانات المصادقة الحساسة","Do not store sensitive authentication data after authorization","عدم تخزين بيانات المصادقة الحساسة بعد التفويض","critical",true,["system_config"]],
        ["PCI-3.3","3.3","PAN Masking","إخفاء PAN","Mask PAN in display","إخفاء رقم البطاقة في العرض","critical",true,["system_config"]],
        ["PCI-3.4","3.4","PAN Encryption","تشفير PAN","Render stored PAN unreadable","جعل PAN المخزن غير قابل للقراءة","critical",true,["encryption_report"]],
      ])),
      S("PCI-2-2","4","Transit Encryption","تشفير النقل",controls([
        ["PCI-4.1","4.1","Strong Cryptography","التشفير القوي","Encrypt cardholder data in transit over public networks","تشفير بيانات حامل البطاقة أثناء النقل عبر الشبكات العامة","critical",true,["system_config"]],
        ["PCI-4.2","4.2","Secure Messaging","الرسائل الآمنة","Never send unprotected PAN via messaging","عدم إرسال PAN غير محمي عبر الرسائل","critical",true,["system_config"]],
      ])),
    ]),
    D("PCI-D3","5","Access Control & Monitoring","التحكم في الوصول والمراقبة",[
      S("PCI-3-1","7","Restrict Access","تقييد الوصول",controls([
        ["PCI-7.1","7.1","Need-to-Know","الحاجة للمعرفة","Restrict access to cardholder data on need-to-know","تقييد الوصول لبيانات حامل البطاقة على أساس الحاجة","critical",true,["access_matrix"]],
        ["PCI-7.2","7.2","Access Control System","نظام التحكم في الوصول","Implement access control system for CDE","تنفيذ نظام التحكم في الوصول لبيئة بيانات البطاقات","critical",true,["system_config"]],
      ])),
      S("PCI-3-2","8","Authentication","المصادقة",controls([
        ["PCI-8.1","8.1","Unique IDs","المعرفات الفريدة","Assign unique ID to each person with access","تعيين معرف فريد لكل شخص له وصول","critical",true,["system_config"]],
        ["PCI-8.2","8.2","Strong Authentication","المصادقة القوية","Implement MFA for CDE access","تنفيذ المصادقة متعددة العوامل للوصول إلى CDE","critical",true,["system_config"]],
        ["PCI-8.3","8.3","Password Policy","سياسة كلمات المرور","Enforce strong password/passphrase policy","فرض سياسة كلمات مرور قوية","critical",true,["system_config"]],
      ])),
      S("PCI-3-3","10","Logging","التسجيل",controls([
        ["PCI-10.1","10.1","Audit Trail","مسار التدقيق","Implement audit trails for all CDE access","تنفيذ مسارات التدقيق لجميع عمليات الوصول لـ CDE","critical",true,["log_config"]],
        ["PCI-10.2","10.2","Event Logging","تسجيل الأحداث","Log all security events","تسجيل جميع الأحداث الأمنية","critical",true,["siem_config"]],
        ["PCI-10.3","10.3","Log Review","مراجعة السجلات","Review logs daily","مراجعة السجلات يومياً","critical",true,["review_report"]],
      ])),
      S("PCI-3-4","11","Testing","الاختبار",controls([
        ["PCI-11.1","11.1","Wireless Scanning","فحص اللاسلكي","Detect unauthorized wireless access points","كشف نقاط الوصول اللاسلكية غير المصرح بها","high",true,["scan_report"]],
        ["PCI-11.2","11.2","Vulnerability Scanning","فحص الثغرات","Quarterly internal and external vulnerability scans","فحص ثغرات داخلي وخارجي ربع سنوي","critical",true,["scan_report"]],
        ["PCI-11.3","11.3","Penetration Testing","اختبار الاختراق","Annual penetration testing of CDE","اختبار اختراق سنوي لبيئة بيانات البطاقات","critical",false,["pentest_report"]],
        ["PCI-11.4","11.4","IDS/IPS","كشف/منع التسلل","Deploy IDS/IPS on CDE network","نشر أنظمة كشف/منع التسلل على شبكة CDE","critical",true,["system_config"]],
        ["PCI-11.5","11.5","Change Detection","كشف التغيير","Implement file integrity monitoring","تنفيذ مراقبة سلامة الملفات","critical",true,["fim_report"]],
      ])),
    ]),
  ],
});

export const INTL_FRAMEWORKS: FrameworkDef[] = [ISO_27001, NIST_CSF, PCI_DSS];
