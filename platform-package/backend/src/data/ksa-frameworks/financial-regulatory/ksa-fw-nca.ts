// ============================================
// Shahin AI-KSA GRC — NCA Framework Family
// ECC 2-2024, CCC, OTCC, DCC, CSCC, SMACC
// ~800 controls across 6 instruments
// ============================================
import { FrameworkDef } from "./ksa-frameworks";
import { S, D, FW, controls } from "./ksa-control-builder";

// ════════════════════════════════════════════
// 1. NCA ECC 2-2024 — Essential Cybersecurity Controls
//    5 Domains · 29 Subdomains · 114 Controls
// ════════════════════════════════════════════
export const NCA_ECC: FrameworkDef = FW({
  id:"INST-KSA-NCA-ECC",reg:"REG-KSA-NCA",nEn:"Essential Cybersecurity Controls",nAr:"الضوابط الأساسية للأمن السيبراني",
  type:"controls_standard",ver:"ECC 2-2024",verId:"VER-KSA-ECC-2-2024",sectors:["all"],mandatory:true,
  sumEn:"Mandatory cybersecurity controls for all national organizations in Saudi Arabia. ECC 2-2024 supersedes ECC-1:2018.",
  sumAr:"ضوابط الأمن السيبراني الإلزامية لجميع المنظمات الوطنية في المملكة العربية السعودية.",
  tags:["cybersecurity","mandatory","national"],
  domains:[
    D("ECC-D1","1","Cybersecurity Governance","حوكمة الأمن السيبراني",[
      S("ECC-1-1","1-1","Cybersecurity Strategy","استراتيجية الأمن السيبراني",controls([
        ["ECC-1-1-1","1-1-1","CS Strategy Development","تطوير استراتيجية الأمن السيبراني","Develop and approve cybersecurity strategy aligned with business objectives","تطوير واعتماد استراتيجية الأمن السيبراني المتوافقة مع أهداف العمل","critical",false,["document","approval_record"],["SAMA-CSF-1.1"]],
        ["ECC-1-1-2","1-1-2","CS Strategy Review","مراجعة استراتيجية الأمن السيبراني","Periodically review and update cybersecurity strategy","مراجعة وتحديث استراتيجية الأمن السيبراني بشكل دوري","high",false,["document","meeting_minutes"]],
      ])),
      S("ECC-1-2","1-2","Cybersecurity Management","إدارة الأمن السيبراني",controls([
        ["ECC-1-2-1","1-2-1","CS Governance Framework","إطار حوكمة الأمن السيبراني","Establish cybersecurity governance framework with roles and responsibilities","إنشاء إطار حوكمة الأمن السيبراني مع الأدوار والمسؤوليات","critical",false,["document","org_chart"]],
        ["ECC-1-2-2","1-2-2","CS Roles & Responsibilities","أدوار ومسؤوليات الأمن السيبراني","Define and assign cybersecurity roles and responsibilities","تحديد وتعيين أدوار ومسؤوليات الأمن السيبراني","critical",false,["document","hr_record"],["SAMA-CSF-1.3"]],
        ["ECC-1-2-3","1-2-3","CS Committee","لجنة الأمن السيبراني","Establish cybersecurity steering committee","إنشاء لجنة توجيهية للأمن السيبراني","high",false,["document","meeting_minutes"]],
        ["ECC-1-2-4","1-2-4","CS in Project Mgmt","الأمن السيبراني في إدارة المشاريع","Integrate cybersecurity requirements into project management","دمج متطلبات الأمن السيبراني في إدارة المشاريع","high",false,["document","project_record"]],
      ])),
      S("ECC-1-3","1-3","CS Policies & Procedures","سياسات وإجراءات الأمن السيبراني",controls([
        ["ECC-1-3-1","1-3-1","CS Policy","سياسة الأمن السيبراني","Develop, approve, and publish cybersecurity policy","تطوير واعتماد ونشر سياسة الأمن السيبراني","critical",false,["document","approval_record"],["SAMA-CSF-1.2"]],
        ["ECC-1-3-2","1-3-2","CS Procedures","إجراءات الأمن السيبراني","Develop detailed cybersecurity procedures for all domains","تطوير إجراءات تفصيلية للأمن السيبراني لجميع المجالات","high",false,["document"]],
        ["ECC-1-3-3","1-3-3","CS Standards","معايير الأمن السيبراني","Define cybersecurity standards and baselines","تحديد معايير وخطوط أساس الأمن السيبراني","high",false,["document"]],
      ])),
      S("ECC-1-4","1-4","CS Risk Management","إدارة مخاطر الأمن السيبراني",controls([
        ["ECC-1-4-1","1-4-1","Risk Mgmt Methodology","منهجية إدارة المخاطر","Establish risk management methodology for cybersecurity","إنشاء منهجية إدارة المخاطر للأمن السيبراني","critical",false,["document"],["SAMA-CSF-1.4"]],
        ["ECC-1-4-2","1-4-2","CS Risk Assessment","تقييم مخاطر الأمن السيبراني","Conduct periodic cybersecurity risk assessments","إجراء تقييمات دورية لمخاطر الأمن السيبراني","critical",false,["document","assessment_report"],["SAMA-CSF-1.5"]],
        ["ECC-1-4-3","1-4-3","Risk Treatment","معالجة المخاطر","Develop and implement risk treatment plans","تطوير وتنفيذ خطط معالجة المخاطر","high",false,["document","treatment_plan"]],
      ])),
      S("ECC-1-5","1-5","CS Awareness & Training","التوعية والتدريب بالأمن السيبراني",controls([
        ["ECC-1-5-1","1-5-1","Awareness Program","برنامج التوعية","Implement cybersecurity awareness program for all employees","تنفيذ برنامج التوعية بالأمن السيبراني لجميع الموظفين","high",false,["training_record","attendance"]],
        ["ECC-1-5-2","1-5-2","CS Training","التدريب على الأمن السيبراني","Provide specialized cybersecurity training for IT and security staff","توفير تدريب متخصص في الأمن السيبراني لموظفي تقنية المعلومات","high",false,["training_record","certification"]],
      ])),
      S("ECC-1-6","1-6","CS in Human Resources","الأمن السيبراني في الموارد البشرية",controls([
        ["ECC-1-6-1","1-6-1","Pre-Employment Screening","الفحص قبل التوظيف","Conduct background checks for cybersecurity-sensitive positions","إجراء فحوصات خلفية للمناصب الحساسة في الأمن السيبراني","high",false,["hr_record"]],
        ["ECC-1-6-2","1-6-2","Employment Terms","شروط وأحكام التوظيف","Include cybersecurity responsibilities in employment contracts","تضمين مسؤوليات الأمن السيبراني في عقود التوظيف","medium",false,["document","contract"]],
        ["ECC-1-6-3","1-6-3","Termination Procedures","إجراءات إنهاء الخدمة","Revoke access upon termination or role change","إلغاء الوصول عند إنهاء الخدمة أو تغيير الدور","critical",true,["system_log","hr_record"]],
      ])),
      S("ECC-1-7","1-7","CS Compliance","الامتثال للأمن السيبراني",controls([
        ["ECC-1-7-1","1-7-1","Regulatory Compliance","الامتثال التنظيمي","Ensure compliance with applicable cybersecurity regulations","ضمان الامتثال لأنظمة ولوائح الأمن السيبراني المعمول بها","critical",false,["compliance_report"]],
        ["ECC-1-7-2","1-7-2","CS Audit","تدقيق الأمن السيبراني","Conduct periodic cybersecurity reviews and audits","إجراء مراجعات وتدقيقات دورية للأمن السيبراني","high",false,["audit_report"]],
      ])),
    ]),
    D("ECC-D2","2","Cybersecurity Defense","تعزيز الأمن السيبراني",[
      S("ECC-2-1","2-1","Asset Management","إدارة الأصول",controls([
        ["ECC-2-1-1","2-1-1","Asset Inventory","جرد الأصول","Maintain inventory of all information assets","الحفاظ على جرد لجميع أصول المعلومات","critical",true,["asset_register","system_report"]],
        ["ECC-2-1-2","2-1-2","Asset Classification","تصنيف الأصول","Classify assets based on criticality and sensitivity","تصنيف الأصول بناءً على الأهمية والحساسية","high",false,["classification_record"]],
        ["ECC-2-1-3","2-1-3","Asset Ownership","ملكية الأصول","Assign ownership for all information assets","تعيين ملكية لجميع أصول المعلومات","high",false,["asset_register"]],
      ])),
      S("ECC-2-2","2-2","Identity & Access Management","إدارة الهوية والوصول",controls([
        ["ECC-2-2-1","2-2-1","Identity Management","إدارة الهوية","Implement identity management for all users","تنفيذ إدارة الهوية لجميع المستخدمين","critical",true,["system_config","iam_report"],["SAMA-CSF-2.1"]],
        ["ECC-2-2-2","2-2-2","Access Control","التحكم في الوصول","Implement role-based access control","تنفيذ التحكم في الوصول القائم على الأدوار","critical",true,["system_config","access_matrix"]],
        ["ECC-2-2-3","2-2-3","Privileged Access Mgmt","إدارة الوصول المميز","Control and monitor privileged access accounts","التحكم في حسابات الوصول المميز ومراقبتها","critical",true,["pam_report","system_log"],["SAMA-CSF-2.2"]],
        ["ECC-2-2-4","2-2-4","Access Review","مراجعة الوصول","Conduct periodic access reviews","إجراء مراجعات دورية للوصول","high",true,["review_report"]],
        ["ECC-2-2-5","2-2-5","Multi-Factor Auth","المصادقة متعددة العوامل","Implement MFA for critical systems and remote access","تنفيذ المصادقة متعددة العوامل للأنظمة الحرجة والوصول عن بعد","critical",true,["system_config"]],
      ])),
      S("ECC-2-3","2-3","System & Facility Protection","حماية أنظمة المعلومات ومرافق المعالجة",controls([
        ["ECC-2-3-1","2-3-1","Secure Configuration","التكوين الآمن","Implement secure configuration baselines for all systems","تنفيذ خطوط أساس التكوين الآمن لجميع الأنظمة","critical",true,["config_baseline","scan_report"]],
        ["ECC-2-3-2","2-3-2","Patch Management","إدارة التصحيحات","Implement timely patch management process","تنفيذ عملية إدارة التصحيحات في الوقت المناسب","critical",true,["patch_report","system_log"]],
        ["ECC-2-3-3","2-3-3","Malware Protection","الحماية من البرمجيات الخبيثة","Deploy and maintain anti-malware solutions","نشر وصيانة حلول مكافحة البرمجيات الخبيثة","critical",true,["system_config","scan_report"]],
        ["ECC-2-3-4","2-3-4","Email Security","أمن البريد الإلكتروني","Implement email security controls (SPF, DKIM, DMARC)","تنفيذ ضوابط أمن البريد الإلكتروني","high",true,["system_config"]],
        ["ECC-2-3-5","2-3-5","Web Security","أمن الويب","Implement web filtering and security controls","تنفيذ تصفية الويب وضوابط الأمن","high",true,["system_config"]],
        ["ECC-2-3-6","2-3-6","Application Security","أمن التطبيقات","Implement SSDLC and application security testing","تنفيذ دورة حياة التطوير الآمن واختبار أمن التطبيقات","critical",true,["test_report","code_review"]],
      ])),
      S("ECC-2-4","2-4","Network Security","إدارة أمن الشبكات",controls([
        ["ECC-2-4-1","2-4-1","Network Architecture","بنية أمن الشبكات","Design and implement secure network architecture","تصميم وتنفيذ بنية شبكات آمنة","critical",false,["network_diagram","document"]],
        ["ECC-2-4-2","2-4-2","Network Access Control","التحكم في الوصول إلى الشبكة","Implement network access control mechanisms","تنفيذ آليات التحكم في الوصول إلى الشبكة","critical",true,["system_config","nac_report"]],
        ["ECC-2-4-3","2-4-3","Wireless Security","أمن الشبكات اللاسلكية","Secure wireless network configurations","تأمين تكوينات الشبكات اللاسلكية","high",true,["system_config"]],
        ["ECC-2-4-4","2-4-4","Remote Access Security","أمن الوصول عن بعد","Implement secure remote access with VPN and MFA","تنفيذ الوصول الآمن عن بعد مع VPN والمصادقة متعددة العوامل","critical",true,["system_config","vpn_report"]],
        ["ECC-2-4-5","2-4-5","Network Monitoring","مراقبة الشبكة","Implement network traffic monitoring and anomaly detection","تنفيذ مراقبة حركة الشبكة وكشف الشذوذ","critical",true,["monitoring_report"]],
      ])),
      S("ECC-2-5","2-5","Mobile Device Security","أمن الأجهزة المحمولة",controls([
        ["ECC-2-5-1","2-5-1","MDM","إدارة الأجهزة المحمولة","Implement MDM solution for organizational mobile devices","تنفيذ حل إدارة الأجهزة المحمولة للأجهزة المؤسسية","high",true,["mdm_report","system_config"]],
        ["ECC-2-5-2","2-5-2","BYOD Security","أمن الأجهزة الشخصية","Define and enforce BYOD security policy","تحديد وتطبيق سياسة أمن الأجهزة الشخصية","medium",false,["document","system_config"]],
      ])),
      S("ECC-2-6","2-6","Data & Information Protection","حماية البيانات والمعلومات",controls([
        ["ECC-2-6-1","2-6-1","Data Classification","تصنيف البيانات","Classify data based on sensitivity and criticality","تصنيف البيانات بناءً على الحساسية والأهمية","critical",false,["classification_policy","data_inventory"],["DCC-1.1.1"]],
        ["ECC-2-6-2","2-6-2","Data Encryption","تشفير البيانات","Encrypt sensitive data at rest and in transit","تشفير البيانات الحساسة أثناء التخزين والنقل","critical",true,["system_config","encryption_report"],["PDPL-2.2.1"]],
        ["ECC-2-6-3","2-6-3","Data Loss Prevention","منع فقدان البيانات","Implement DLP controls for sensitive data","تنفيذ ضوابط منع فقدان البيانات للبيانات الحساسة","high",true,["dlp_report","system_config"]],
        ["ECC-2-6-4","2-6-4","Data Backup","النسخ الاحتياطي","Implement regular data backup and recovery testing","تنفيذ النسخ الاحتياطي المنتظم للبيانات واختبار الاسترداد","critical",true,["backup_report","recovery_test"]],
        ["ECC-2-6-5","2-6-5","Data Retention & Disposal","الاحتفاظ والتخلص","Define data retention periods and secure disposal procedures","تحديد فترات الاحتفاظ بالبيانات وإجراءات التخلص الآمن","high",false,["document","disposal_record"]],
      ])),
      S("ECC-2-7","2-7","Cryptography","التشفير",controls([
        ["ECC-2-7-1","2-7-1","Cryptographic Policy","سياسة التشفير","Define cryptographic policy and approved algorithms","تحديد سياسة التشفير والخوارزميات المعتمدة","high",false,["document"]],
        ["ECC-2-7-2","2-7-2","Key Management","إدارة المفاتيح","Implement cryptographic key management lifecycle","تنفيذ دورة حياة إدارة مفاتيح التشفير","critical",true,["kms_report","system_config"]],
      ])),
      S("ECC-2-8","2-8","Physical Security","الأمن المادي",controls([
        ["ECC-2-8-1","2-8-1","Physical Access Control","التحكم في الوصول المادي","Implement physical access controls for data centers","تنفيذ ضوابط الوصول المادي لمراكز البيانات","critical",true,["access_log","system_config"]],
        ["ECC-2-8-2","2-8-2","Environmental Controls","الضوابط البيئية","Implement environmental monitoring for IT facilities","تنفيذ المراقبة البيئية والحماية لمرافق تقنية المعلومات","high",true,["monitoring_report"]],
        ["ECC-2-8-3","2-8-3","Surveillance","المراقبة والرصد","Deploy CCTV and physical security monitoring systems","نشر أنظمة الكاميرات والمراقبة الأمنية المادية","high",true,["surveillance_log"]],
        ["ECC-2-8-4","2-8-4","Visitor Management","إدارة الزوار","Control and log visitor access to sensitive areas","التحكم في وصول الزوار وتسجيله للمناطق الحساسة","medium",true,["visitor_log"]],
      ])),
    ]),
    D("ECC-D3","3","Cybersecurity Resilience","صمود الأمن السيبراني",[
      S("ECC-3-1","3-1","Incident Management","إدارة أحداث وحوادث الأمن السيبراني",controls([
        ["ECC-3-1-1","3-1-1","Event Logging & Monitoring","تسجيل ومراقبة الأحداث","Implement centralized logging and monitoring for security events","تنفيذ التسجيل والمراقبة المركزية لأحداث الأمن","critical",true,["siem_config","log_report"]],
        ["ECC-3-1-2","3-1-2","SOC","مركز عمليات الأمن","Establish or subscribe to SOC services","إنشاء أو الاشتراك في خدمات مركز عمليات الأمن","critical",false,["soc_report","contract"]],
        ["ECC-3-1-3","3-1-3","Incident Response Plan","خطة الاستجابة للحوادث","Develop and maintain incident response plan","تطوير وصيانة خطة الاستجابة للحوادث","critical",false,["document","drill_report"]],
        ["ECC-3-1-4","3-1-4","Incident Classification","تصنيف الحوادث والتصعيد","Define incident classification and escalation procedures","تحديد إجراءات تصنيف الحوادث والتصعيد","high",true,["document","incident_record"]],
        ["ECC-3-1-5","3-1-5","Incident Reporting to NCA","الإبلاغ عن الحوادث للهيئة","Report cybersecurity incidents to NCA as required","الإبلاغ عن حوادث الأمن السيبراني للهيئة حسب المطلوب","critical",false,["incident_report","notification_record"]],
        ["ECC-3-1-6","3-1-6","Lessons Learned","الدروس المستفادة","Conduct post-incident reviews and document lessons learned","إجراء مراجعات ما بعد الحادث وتوثيق الدروس المستفادة","high",false,["review_report"]],
      ])),
      S("ECC-3-2","3-2","Business Continuity","إدارة استمرارية الأعمال",controls([
        ["ECC-3-2-1","3-2-1","BCP","خطة استمرارية الأعمال","Develop BCP addressing cybersecurity scenarios","تطوير خطة استمرارية الأعمال التي تعالج سيناريوهات الأمن السيبراني","critical",false,["document","bcp_plan"]],
        ["ECC-3-2-2","3-2-2","DRP","خطة التعافي من الكوارث","Develop and test disaster recovery plan","تطوير واختبار خطة التعافي من الكوارث","critical",false,["document","dr_test_report"]],
        ["ECC-3-2-3","3-2-3","BCP/DRP Testing","اختبار الخطط","Conduct periodic BCP/DRP testing and exercises","إجراء اختبارات وتمارين دورية لخطط الاستمرارية والتعافي","high",false,["test_report","exercise_record"]],
      ])),
      S("ECC-3-3","3-3","Vulnerability Management","إدارة الثغرات",controls([
        ["ECC-3-3-1","3-3-1","Vulnerability Assessment","تقييم الثغرات","Conduct regular vulnerability assessments","إجراء تقييمات منتظمة للثغرات","critical",true,["scan_report"]],
        ["ECC-3-3-2","3-3-2","Penetration Testing","اختبار الاختراق","Conduct periodic penetration testing","إجراء اختبارات اختراق دورية","critical",false,["pentest_report"]],
        ["ECC-3-3-3","3-3-3","Vulnerability Remediation","معالجة الثغرات","Remediate identified vulnerabilities within defined SLAs","معالجة الثغرات المكتشفة ضمن اتفاقيات مستوى الخدمة المحددة","critical",true,["remediation_report","patch_record"]],
      ])),
      S("ECC-3-4","3-4","Threat Management","إدارة التهديدات",controls([
        ["ECC-3-4-1","3-4-1","Threat Intelligence","استخبارات التهديدات","Subscribe to and utilize threat intelligence feeds","الاشتراك في واستخدام مصادر استخبارات التهديدات","high",true,["ti_report","subscription_record"]],
        ["ECC-3-4-2","3-4-2","Threat Hunting","صيد التهديدات","Conduct proactive threat hunting activities","إجراء أنشطة استباقية لصيد التهديدات","high",false,["hunting_report"]],
      ])),
    ]),
    D("ECC-D4","4","Third-Party & Cloud CS","الأمن السيبراني للأطراف الخارجية والحوسبة السحابية",[
      S("ECC-4-1","4-1","Third-Party CS","الأمن السيبراني للأطراف الخارجية",controls([
        ["ECC-4-1-1","4-1-1","3rd-Party Risk Assessment","تقييم مخاطر الأطراف الخارجية","Assess cybersecurity risks of third-party providers","تقييم مخاطر الأمن السيبراني لمقدمي الخدمات الخارجيين","critical",false,["assessment_report","questionnaire"],["SAMA-CSF-3.1"]],
        ["ECC-4-1-2","4-1-2","3rd-Party Contracts","عقود الأطراف الخارجية","Include cybersecurity requirements in third-party contracts","تضمين متطلبات الأمن السيبراني في عقود الأطراف الخارجية","high",false,["contract","sla_document"]],
        ["ECC-4-1-3","4-1-3","3rd-Party Monitoring","مراقبة الأطراف الخارجية","Monitor third-party compliance with cybersecurity requirements","مراقبة امتثال الأطراف الخارجية لمتطلبات الأمن السيبراني","high",false,["monitoring_report","audit_report"]],
      ])),
      S("ECC-4-2","4-2","Cloud CS","الأمن السيبراني للحوسبة السحابية",controls([
        ["ECC-4-2-1","4-2-1","Cloud Security Policy","سياسة أمن السحابة","Define cloud security policy and approved services","تحديد سياسة أمن الحوسبة السحابية والخدمات المعتمدة","critical",false,["document"],["CCC-1.1.1"]],
        ["ECC-4-2-2","4-2-2","Cloud Data Protection","حماية بيانات السحابة","Implement data protection controls for cloud environments","تنفيذ ضوابط حماية البيانات لبيئات الحوسبة السحابية","critical",true,["system_config","encryption_report"]],
        ["ECC-4-2-3","4-2-3","Cloud Access Security","أمن الوصول السحابي","Implement CASB controls","تنفيذ ضوابط وسيط أمن الوصول السحابي","high",true,["casb_report","system_config"]],
        ["ECC-4-2-4","4-2-4","Cloud Compliance","امتثال السحابة","Ensure cloud services comply with NCA CCC","ضمان امتثال الخدمات السحابية لضوابط الحوسبة السحابية","critical",false,["compliance_report","certification"]],
      ])),
    ]),
    D("ECC-D5","5","ICS/OT Cybersecurity","الأمن السيبراني لأنظمة التحكم الصناعي",[
      S("ECC-5-1","5-1","ICS/OT Governance","حوكمة أمن أنظمة التحكم الصناعي",controls([
        ["ECC-5-1-1","5-1-1","ICS/OT Security Policy","سياسة أمن أنظمة التحكم","Develop ICS/OT-specific cybersecurity policy","تطوير سياسة أمن سيبراني خاصة بأنظمة التحكم الصناعي","critical",false,["document"],["OTCC-1.1.1"]],
        ["ECC-5-1-2","5-1-2","ICS/OT Asset Inventory","جرد أصول أنظمة التحكم","Maintain inventory of all ICS/OT assets","الحفاظ على جرد لجميع أصول أنظمة التحكم الصناعي","critical",true,["asset_register"]],
      ])),
      S("ECC-5-2","5-2","ICS/OT Protection","حماية أمن أنظمة التحكم الصناعي",controls([
        ["ECC-5-2-1","5-2-1","IT/OT Segmentation","تجزئة شبكات IT/OT","Implement network segmentation between IT and OT networks","تنفيذ تجزئة الشبكات بين شبكات تقنية المعلومات والتقنيات التشغيلية","critical",true,["network_diagram","firewall_config"]],
        ["ECC-5-2-2","5-2-2","ICS/OT Access Control","التحكم في الوصول لأنظمة التحكم","Implement strict access control for ICS/OT systems","تنفيذ تحكم صارم في الوصول لأنظمة التحكم الصناعي","critical",true,["access_matrix","system_config"]],
        ["ECC-5-2-3","5-2-3","ICS/OT Monitoring","مراقبة أنظمة التحكم","Implement continuous monitoring for ICS/OT environments","تنفيذ المراقبة المستمرة لبيئات أنظمة التحكم الصناعي","critical",true,["monitoring_report","siem_config"]],
        ["ECC-5-2-4","5-2-4","ICS/OT Vuln Mgmt","إدارة ثغرات أنظمة التحكم","Manage vulnerabilities in ICS/OT with OT-specific procedures","إدارة الثغرات في أنظمة التحكم الصناعي بإجراءات خاصة","critical",false,["scan_report","remediation_plan"]],
      ])),
      S("ECC-5-3","5-3","ICS/OT Resilience","صمود أنظمة التحكم الصناعي",controls([
        ["ECC-5-3-1","5-3-1","ICS/OT Incident Response","الاستجابة لحوادث أنظمة التحكم","Develop ICS/OT-specific incident response procedures","تطوير إجراءات استجابة للحوادث خاصة بأنظمة التحكم الصناعي","critical",false,["document","drill_report"]],
        ["ECC-5-3-2","5-3-2","ICS/OT Recovery","تعافي أنظمة التحكم","Develop and test ICS/OT recovery procedures","تطوير واختبار إجراءات تعافي أنظمة التحكم الصناعي","critical",false,["document","test_report"]],
      ])),
    ]),
  ],
});

// ════════════════════════════════════════════
// 2. NCA CCC — Cloud Cybersecurity Controls
//    4 Domains · 12 Subdomains · 56 Controls
// ════════════════════════════════════════════
export const NCA_CCC: FrameworkDef = FW({
  id:"INST-KSA-NCA-CCC",reg:"REG-KSA-NCA",nEn:"Cloud Cybersecurity Controls",nAr:"ضوابط الأمن السيبراني للحوسبة السحابية",
  type:"controls_standard",ver:"1-2020",verId:"VER-KSA-CCC-1-2020",sectors:["all"],mandatory:true,
  sumEn:"NCA controls for cloud computing cybersecurity applicable to CSPs and consumers in KSA.",
  sumAr:"ضوابط الهيئة الوطنية للأمن السيبراني للحوسبة السحابية.",
  tags:["cloud","cybersecurity","mandatory"],
  domains:[
    D("CCC-D1","1","Cloud Security Governance","حوكمة أمن الحوسبة السحابية",[
      S("CCC-1-1","1.1","Cloud Security Strategy","استراتيجية أمن السحابة",controls([
        ["CCC-1.1.1","1.1.1","Cloud Security Policy","سياسة أمن السحابة","Establish cloud-specific security policy","وضع سياسة أمنية خاصة بالحوسبة السحابية","critical",false,["document"],["ECC-4-2-1"]],
        ["CCC-1.1.2","1.1.2","Cloud Risk Assessment","تقييم مخاطر السحابة","Assess risks specific to cloud adoption","تقييم المخاطر الخاصة بتبني الحوسبة السحابية","critical",false,["assessment_report"]],
        ["CCC-1.1.3","1.1.3","Cloud Roles","أدوار السحابة","Define cloud security roles between CSP and consumer","تحديد أدوار أمن السحابة بين المزود والمستهلك","high",false,["document","raci_matrix"]],
        ["CCC-1.1.4","1.1.4","Cloud Compliance","امتثال السحابة","Establish cloud compliance monitoring and reporting","إنشاء مراقبة امتثال السحابة وإعداد التقارير","high",false,["compliance_report"]],
      ])),
      S("CCC-1-2","1.2","Cloud SLA Management","إدارة مستوى خدمة السحابة",controls([
        ["CCC-1.2.1","1.2.1","SLA Security","أمن اتفاقيات الخدمة","Include security metrics in cloud SLAs","تضمين مقاييس الأمن في اتفاقيات الخدمة السحابية","critical",false,["sla_document"]],
        ["CCC-1.2.2","1.2.2","Exit Strategy","استراتيجية الخروج","Define data portability and exit strategy","تحديد قابلية نقل البيانات واستراتيجية الخروج","high",false,["document"]],
        ["CCC-1.2.3","1.2.3","Performance Monitoring","مراقبة الأداء","Monitor cloud service availability against SLAs","مراقبة توفر الخدمة السحابية مقابل اتفاقيات الخدمة","high",true,["monitoring_report"]],
      ])),
    ]),
    D("CCC-D2","2","Cloud Data Protection","حماية بيانات السحابة",[
      S("CCC-2-1","2.1","Data Sovereignty","سيادة البيانات",controls([
        ["CCC-2.1.1","2.1.1","Data Residency","إقامة البيانات","Ensure data residency within KSA borders","ضمان إقامة البيانات داخل حدود المملكة","critical",true,["system_config","cloud_report"]],
        ["CCC-2.1.2","2.1.2","Cloud Data Classification","تصنيف البيانات السحابية","Classify data before cloud migration","تصنيف البيانات قبل الترحيل إلى السحابة","high",false,["classification_record"]],
        ["CCC-2.1.3","2.1.3","Cross-Border Controls","ضوابط النقل عبر الحدود","Implement controls for cross-border data transfers via cloud","تنفيذ ضوابط لنقل البيانات عبر الحدود عبر السحابة","critical",false,["transfer_assessment"]],
      ])),
      S("CCC-2-2","2.2","Cloud Encryption","تشفير السحابة",controls([
        ["CCC-2.2.1","2.2.1","Encryption at Rest","تشفير أثناء التخزين","Encrypt all data at rest in cloud using approved algorithms","تشفير جميع البيانات أثناء التخزين في السحابة بخوارزميات معتمدة","critical",true,["encryption_report"]],
        ["CCC-2.2.2","2.2.2","Encryption in Transit","تشفير أثناء النقل","Encrypt all data in transit using TLS 1.2+","تشفير جميع البيانات أثناء النقل باستخدام TLS 1.2+","critical",true,["system_config"]],
        ["CCC-2.2.3","2.2.3","Cloud Key Mgmt","إدارة مفاتيح السحابة","Maintain customer-managed encryption keys (CMEK)","الحفاظ على مفاتيح تشفير يديرها العميل","critical",true,["kms_report"]],
      ])),
    ]),
    D("CCC-D3","3","Cloud Identity & Access","هوية ووصول السحابة",[
      S("CCC-3-1","3.1","Cloud IAM","إدارة هوية السحابة",controls([
        ["CCC-3.1.1","3.1.1","Cloud IAM Integration","تكامل IAM السحابي","Integrate cloud IAM with organizational identity provider","تكامل إدارة الهوية السحابي مع مزود الهوية المؤسسي","critical",true,["system_config"]],
        ["CCC-3.1.2","3.1.2","Cloud MFA","MFA السحابي","Enforce MFA for all cloud management consoles","فرض المصادقة متعددة العوامل لجميع لوحات إدارة السحابة","critical",true,["system_config"]],
        ["CCC-3.1.3","3.1.3","Service Account Security","أمن حسابات الخدمة","Secure and rotate cloud service account credentials","تأمين وتدوير بيانات اعتماد حسابات خدمة السحابة","high",true,["system_config","rotation_log"]],
        ["CCC-3.1.4","3.1.4","Cloud Privileged Access","الوصول المميز السحابي","Implement JIT privileged access for cloud admin","تنفيذ الوصول المميز في الوقت المناسب لإدارة السحابة","critical",true,["pam_report"]],
      ])),
      S("CCC-3-2","3.2","Cloud Network Security","أمن شبكة السحابة",controls([
        ["CCC-3.2.1","3.2.1","VNet Segmentation","تجزئة الشبكة الافتراضية","Implement virtual network segmentation and security groups","تنفيذ تجزئة الشبكة الافتراضية ومجموعات الأمان","critical",true,["system_config","network_diagram"]],
        ["CCC-3.2.2","3.2.2","Cloud WAF","WAF السحابي","Deploy WAF for cloud-hosted applications","نشر جدار حماية تطبيقات الويب للتطبيقات السحابية","high",true,["waf_config"]],
        ["CCC-3.2.3","3.2.3","DDoS Protection","حماية DDoS","Enable DDoS protection for cloud workloads","تمكين حماية DDoS لأحمال العمل السحابية","high",true,["system_config"]],
      ])),
    ]),
    D("CCC-D4","4","Cloud Operations","عمليات السحابة",[
      S("CCC-4-1","4.1","Cloud Logging","تسجيل السحابة",controls([
        ["CCC-4.1.1","4.1.1","Audit Logging","تسجيل التدقيق","Enable comprehensive audit logging for all cloud services","تمكين التسجيل الشامل للتدقيق لجميع الخدمات السحابية","critical",true,["log_config"]],
        ["CCC-4.1.2","4.1.2","SIEM Integration","تكامل SIEM","Integrate cloud logs with organizational SIEM","تكامل سجلات السحابة مع نظام SIEM المؤسسي","critical",true,["siem_config"]],
        ["CCC-4.1.3","4.1.3","Cloud Alerting","تنبيهات السحابة","Configure security alerting for anomalous cloud activities","تكوين تنبيهات الأمن للأنشطة السحابية غير الطبيعية","high",true,["alert_config"]],
      ])),
      S("CCC-4-2","4.2","Cloud Config Mgmt","إدارة تكوين السحابة",controls([
        ["CCC-4.2.1","4.2.1","CSPM","إدارة الوضع الأمني السحابي","Implement CSPM to assess cloud configuration continuously","تنفيذ إدارة الوضع الأمني السحابي لتقييم التكوين باستمرار","critical",true,["cspm_report"]],
        ["CCC-4.2.2","4.2.2","IaC Security","أمن البنية كرمز","Scan IaC templates for misconfigurations before deployment","فحص قوالب البنية التحتية كرمز بحثاً عن أخطاء قبل النشر","high",true,["scan_report"]],
        ["CCC-4.2.3","4.2.3","Container Security","أمن الحاويات","Implement security controls for containerized workloads","تنفيذ ضوابط أمنية لأحمال العمل المحتواة","high",true,["container_scan"]],
      ])),
    ]),
  ],
});

// ════════════════════════════════════════════
// 3. NCA OTCC — OT Cybersecurity Controls
//    5 Domains · 14 Subdomains · 65 Controls
// ════════════════════════════════════════════
export const NCA_OTCC: FrameworkDef = FW({
  id:"INST-KSA-NCA-OTCC",reg:"REG-KSA-NCA",nEn:"Operational Technology Cybersecurity Controls",nAr:"ضوابط الأمن السيبراني للتقنيات التشغيلية",
  type:"controls_standard",ver:"1-2022",verId:"VER-KSA-OTCC-1-2022",
  sectors:["SEC-KSA-ENERGY-OG","SEC-KSA-ENERGY-ELEC","SEC-KSA-ENERGY-WATER","SEC-KSA-INDUSTRY"],mandatory:true,
  sumEn:"NCA controls for OT and industrial control systems cybersecurity.",
  sumAr:"ضوابط الهيئة الوطنية للأمن السيبراني للتقنيات التشغيلية وأنظمة التحكم الصناعي.",
  tags:["ot","ics","scada","critical_infrastructure"],
  domains:[
    D("OTCC-D1","1","OT Governance","حوكمة التقنيات التشغيلية",[
      S("OTCC-1-1","1.1","OT Security Policy","سياسة أمن التقنيات التشغيلية",controls([
        ["OTCC-1.1.1","1.1.1","OT Security Strategy","استراتيجية أمن OT","Develop OT-specific cybersecurity strategy","تطوير استراتيجية أمن سيبراني خاصة بالتقنيات التشغيلية","critical",false,["document"],["ECC-5-1-1"]],
        ["OTCC-1.1.2","1.1.2","OT Governance Framework","إطار حوكمة OT","Establish OT-specific governance with dedicated roles","إنشاء حوكمة خاصة بالتقنيات التشغيلية مع أدوار مخصصة","critical",false,["document","org_chart"]],
        ["OTCC-1.1.3","1.1.3","OT Risk Management","إدارة مخاطر OT","Implement OT risk management considering safety","تنفيذ إدارة مخاطر التقنيات التشغيلية مع مراعاة السلامة","critical",false,["risk_assessment"]],
        ["OTCC-1.1.4","1.1.4","OT Security Awareness","التوعية بأمن OT","Provide OT-specific cybersecurity awareness for plant operators","توفير التوعية بالأمن السيبراني لمشغلي المصانع","high",false,["training_record"]],
      ])),
      S("OTCC-1-2","1.2","OT Asset Management","إدارة أصول التقنيات التشغيلية",controls([
        ["OTCC-1.2.1","1.2.1","OT Asset Inventory","جرد أصول OT","Maintain comprehensive inventory of all OT/ICS assets (PLCs, RTUs, HMIs)","الحفاظ على جرد شامل لجميع أصول OT/ICS","critical",true,["asset_register"]],
        ["OTCC-1.2.2","1.2.2","OT Asset Classification","تصنيف أصول OT","Classify OT assets based on safety impact and criticality","تصنيف أصول التقنيات التشغيلية بناءً على تأثير السلامة","critical",false,["classification_record"]],
        ["OTCC-1.2.3","1.2.3","OT Lifecycle Mgmt","إدارة دورة حياة OT","Manage OT asset lifecycle from procurement to decommissioning","إدارة دورة حياة أصول التقنيات التشغيلية","high",false,["lifecycle_record"]],
      ])),
    ]),
    D("OTCC-D2","2","OT Network Security","أمن شبكات التقنيات التشغيلية",[
      S("OTCC-2-1","2.1","OT Network Architecture","بنية شبكات OT",controls([
        ["OTCC-2.1.1","2.1.1","IT/OT Segmentation","تجزئة IT/OT","Implement Purdue model IT/OT network segmentation","تنفيذ نموذج بوردو لتجزئة شبكات IT/OT","critical",true,["network_diagram","firewall_config"]],
        ["OTCC-2.1.2","2.1.2","DMZ Implementation","تنفيذ DMZ","Implement industrial DMZ between IT and OT","تنفيذ المنطقة المنزوعة السلاح الصناعية","critical",true,["network_diagram"]],
        ["OTCC-2.1.3","2.1.3","OT Firewall Mgmt","إدارة جدران حماية OT","Deploy OT firewalls with allowlist-only rules","نشر جدران حماية OT مع قواعد القائمة المسموح بها فقط","critical",true,["firewall_config"]],
        ["OTCC-2.1.4","2.1.4","OT Remote Access","الوصول عن بعد لـ OT","Implement secure remote access with jump servers","تنفيذ الوصول الآمن عن بعد مع خوادم القفز","critical",true,["vpn_config","session_log"]],
      ])),
      S("OTCC-2-2","2.2","OT Protocol Security","أمن بروتوكولات OT",controls([
        ["OTCC-2.2.1","2.2.1","Protocol Inspection","فحص البروتوكولات","Inspect and filter industrial protocols (Modbus, DNP3, OPC UA)","فحص وتصفية البروتوكولات الصناعية","critical",true,["system_config"]],
        ["OTCC-2.2.2","2.2.2","Protocol Encryption","تشفير البروتوكولات","Encrypt OT communications where supported","تشفير اتصالات التقنيات التشغيلية حيثما أمكن","high",true,["system_config"]],
        ["OTCC-2.2.3","2.2.3","Wireless OT Security","أمن OT اللاسلكي","Secure wireless communications in OT (WirelessHART, ISA100)","تأمين الاتصالات اللاسلكية في بيئات التقنيات التشغيلية","high",true,["system_config"]],
      ])),
    ]),
    D("OTCC-D3","3","OT System Protection","حماية أنظمة التقنيات التشغيلية",[
      S("OTCC-3-1","3.1","OT Endpoint Security","أمن نقاط نهاية OT",controls([
        ["OTCC-3.1.1","3.1.1","App Whitelisting","القائمة البيضاء للتطبيقات","Implement application whitelisting on OT workstations/HMIs","تنفيذ القائمة البيضاء للتطبيقات على محطات عمل OT","critical",true,["system_config"]],
        ["OTCC-3.1.2","3.1.2","OT Patch Mgmt","إدارة تصحيحات OT","Implement OT-safe patch management with staging tests","تنفيذ إدارة تصحيحات آمنة لـ OT مع اختبارات المرحلة","critical",false,["patch_report"]],
        ["OTCC-3.1.3","3.1.3","USB Control","التحكم في USB","Control and scan removable media before use in OT","التحكم في الوسائط المحمولة وفحصها قبل استخدامها في OT","high",true,["scan_report"]],
        ["OTCC-3.1.4","3.1.4","OT Backup","النسخ الاحتياطي لـ OT","Maintain offline backups of OT configurations and programs","الحفاظ على نسخ احتياطية غير متصلة لتكوينات OT","critical",true,["backup_report"]],
      ])),
      S("OTCC-3-2","3.2","Safety Systems Security","أمن أنظمة السلامة",controls([
        ["OTCC-3.2.1","3.2.1","SIS Isolation","عزل أنظمة السلامة","Ensure Safety Instrumented Systems are isolated","ضمان عزل أنظمة السلامة المجهزة عن الشبكات الأخرى","critical",false,["network_diagram"]],
        ["OTCC-3.2.2","3.2.2","SIS Change Mgmt","إدارة تغيير SIS","Implement strict change management for safety systems","تنفيذ إدارة تغيير صارمة لتعديلات أنظمة السلامة","critical",false,["change_record"]],
        ["OTCC-3.2.3","3.2.3","SIS Testing","اختبار SIS","Conduct periodic functional safety testing with cyber scenarios","إجراء اختبارات السلامة الوظيفية بما في ذلك سيناريوهات سيبرانية","critical",false,["test_report"]],
      ])),
    ]),
    D("OTCC-D4","4","OT Monitoring & Response","مراقبة واستجابة OT",[
      S("OTCC-4-1","4.1","OT Monitoring","مراقبة التقنيات التشغيلية",controls([
        ["OTCC-4.1.1","4.1.1","OT Network Monitoring","مراقبة شبكة OT","Deploy passive network monitoring for OT environments","نشر مراقبة سلبية للشبكة لبيئات التقنيات التشغيلية","critical",true,["monitoring_config"]],
        ["OTCC-4.1.2","4.1.2","OT Anomaly Detection","كشف الشذوذ في OT","Implement behavioral anomaly detection for OT protocols","تنفيذ كشف الشذوذ السلوكي لبروتوكولات التقنيات التشغيلية","critical",true,["anomaly_report"]],
        ["OTCC-4.1.3","4.1.3","OT Log Collection","جمع سجلات OT","Collect and retain OT system logs securely","جمع والاحتفاظ بسجلات أنظمة OT بشكل آمن","high",true,["log_config"]],
      ])),
      S("OTCC-4-2","4.2","OT Incident Response","الاستجابة لحوادث OT",controls([
        ["OTCC-4.2.1","4.2.1","OT IR Plan","خطة استجابة OT","Develop OT-specific incident response plan","تطوير خطة استجابة للحوادث خاصة بالتقنيات التشغيلية","critical",false,["document"]],
        ["OTCC-4.2.2","4.2.2","OT IR Drills","تمارين حوادث OT","Conduct regular OT incident response drills","إجراء تمارين استجابة للحوادث منتظمة لـ OT","high",false,["drill_report"]],
        ["OTCC-4.2.3","4.2.3","OT Forensics","تحقيقات OT الجنائية","Maintain OT forensic capabilities for industrial cyber incidents","الحفاظ على قدرات التحقيق الجنائي لـ OT","high",false,["forensic_toolkit"]],
      ])),
    ]),
    D("OTCC-D5","5","OT Supply Chain","سلسلة التوريد لـ OT",[
      S("OTCC-5-1","5.1","OT Vendor Management","إدارة موردي OT",controls([
        ["OTCC-5.1.1","5.1.1","OT Vendor Assessment","تقييم أمن موردي OT","Assess cybersecurity posture of OT equipment vendors","تقييم الوضع الأمني لموردي معدات التقنيات التشغيلية","critical",false,["assessment_report"]],
        ["OTCC-5.1.2","5.1.2","Supply Chain Integrity","سلامة سلسلة التوريد","Verify integrity of OT firmware and software","التحقق من سلامة البرامج الثابتة والبرمجيات لـ OT","critical",false,["verification_report"]],
        ["OTCC-5.1.3","5.1.3","Maintenance Access","وصول الصيانة","Control vendor maintenance access to OT systems","التحكم في وصول صيانة الموردين لأنظمة OT","high",true,["access_log"]],
      ])),
    ]),
  ],
});

// ════════════════════════════════════════════
// 4. NCA DCC — Data Cybersecurity Controls
//    4 Domains · 10 Subdomains · 42 Controls
// ════════════════════════════════════════════
export const NCA_DCC: FrameworkDef = FW({
  id:"INST-KSA-NCA-DCC",reg:"REG-KSA-NCA",nEn:"Data Cybersecurity Controls",nAr:"ضوابط الأمن السيبراني للبيانات",
  type:"controls_standard",ver:"1-2022",verId:"VER-KSA-DCC-1-2022",sectors:["all"],mandatory:true,
  sumEn:"NCA controls for data cybersecurity covering data lifecycle protection.",
  sumAr:"ضوابط الهيئة الوطنية للأمن السيبراني للبيانات.",
  tags:["data","cybersecurity","mandatory"],
  domains:[
    D("DCC-D1","1","Data Security Governance","حوكمة أمن البيانات",[
      S("DCC-1-1","1.1","Data Security Policy","سياسة أمن البيانات",controls([
        ["DCC-1.1.1","1.1.1","Data Security Policy","سياسة أمن البيانات","Establish data security policy covering classification, handling, disposal","وضع سياسة أمن البيانات تغطي التصنيف والتعامل والتخلص","critical",false,["document"],["ECC-2-6-1"]],
        ["DCC-1.1.2","1.1.2","Data Governance Framework","إطار حوكمة البيانات","Establish data governance framework with data steward roles","إنشاء إطار حوكمة البيانات مع أدوار أمناء البيانات","critical",false,["document","org_chart"]],
        ["DCC-1.1.3","1.1.3","Data Security Standards","معايير أمن البيانات","Define data security standards and technical baselines","تحديد معايير أمن البيانات والخطوط الأساسية التقنية","high",false,["document"]],
      ])),
      S("DCC-1-2","1.2","Data Classification","تصنيف البيانات",controls([
        ["DCC-1.2.1","1.2.1","Classification Scheme","مخطط التصنيف","Define data classification levels (Top Secret, Secret, Confidential, Public)","تحديد مستويات تصنيف البيانات","critical",false,["document"]],
        ["DCC-1.2.2","1.2.2","Data Labeling","وسم البيانات","Implement automated data labeling and classification tools","تنفيذ أدوات وسم وتصنيف البيانات الآلية","high",true,["system_config"]],
        ["DCC-1.2.3","1.2.3","Classification Review","مراجعة التصنيف","Periodically review and update data classifications","مراجعة وتحديث تصنيفات البيانات بشكل دوري","medium",false,["review_report"]],
      ])),
    ]),
    D("DCC-D2","2","Data Protection","حماية البيانات",[
      S("DCC-2-1","2.1","Data at Rest","حماية البيانات أثناء التخزين",controls([
        ["DCC-2.1.1","2.1.1","Encryption at Rest","التشفير أثناء التخزين","Encrypt classified data at rest using AES-256","تشفير البيانات المصنفة أثناء التخزين باستخدام AES-256","critical",true,["encryption_report"]],
        ["DCC-2.1.2","2.1.2","Database Security","أمن قواعد البيانات","Implement database activity monitoring and encryption","تنفيذ مراقبة نشاط قواعد البيانات والتشفير","critical",true,["dam_report"]],
        ["DCC-2.1.3","2.1.3","Storage Security","أمن التخزين","Implement secure storage configurations with access controls","تنفيذ تكوينات تخزين آمنة بضوابط الوصول","high",true,["system_config"]],
      ])),
      S("DCC-2-2","2.2","Data in Transit","حماية البيانات أثناء النقل",controls([
        ["DCC-2.2.1","2.2.1","Transport Encryption","تشفير النقل","Encrypt all classified data in transit using TLS 1.2+ or IPSec","تشفير جميع البيانات المصنفة أثناء النقل","critical",true,["system_config"]],
        ["DCC-2.2.2","2.2.2","Certificate Mgmt","إدارة الشهادات","Manage digital certificates lifecycle","إدارة دورة حياة الشهادات الرقمية","high",true,["certificate_report"]],
        ["DCC-2.2.3","2.2.3","API Security","أمن واجهات البرمجة","Secure APIs handling classified data","تأمين واجهات البرمجة التي تتعامل مع البيانات المصنفة","critical",true,["api_security_report"]],
      ])),
      S("DCC-2-3","2.3","Data in Use","حماية البيانات أثناء الاستخدام",controls([
        ["DCC-2.3.1","2.3.1","DLP","منع فقدان البيانات","Deploy DLP at endpoints, network, and cloud","نشر منع فقدان البيانات على نقاط النهاية والشبكة والسحابة","critical",true,["dlp_report"]],
        ["DCC-2.3.2","2.3.2","Screen Protection","حماية الشاشة","Implement screen watermarking for sensitive data","تنفيذ العلامات المائية للشاشة للبيانات الحساسة","medium",true,["system_config"]],
        ["DCC-2.3.3","2.3.3","Data Masking","إخفاء البيانات","Implement data masking for non-production environments","تنفيذ إخفاء البيانات لبيئات غير الإنتاج","high",true,["masking_report"]],
      ])),
    ]),
    D("DCC-D3","3","Data Lifecycle","إدارة دورة حياة البيانات",[
      S("DCC-3-1","3.1","Data Retention","الاحتفاظ بالبيانات",controls([
        ["DCC-3.1.1","3.1.1","Retention Policy","سياسة الاحتفاظ","Define data retention periods aligned with regulations","تحديد فترات الاحتفاظ المتوافقة مع المتطلبات التنظيمية","critical",false,["document"]],
        ["DCC-3.1.2","3.1.2","Automated Retention","الاحتفاظ الآلي","Implement automated retention enforcement","تنفيذ فرض الاحتفاظ الآلي وإشعارات الانتهاء","high",true,["system_config"]],
      ])),
      S("DCC-3-2","3.2","Data Disposal","التخلص من البيانات",controls([
        ["DCC-3.2.1","3.2.1","Secure Disposal","التخلص الآمن","Implement cryptographic erasure or physical destruction","تنفيذ المحو التشفيري أو التدمير المادي للبيانات المصنفة","critical",false,["disposal_certificate"]],
        ["DCC-3.2.2","3.2.2","Media Sanitization","تطهير الوسائط","Sanitize storage media per NIST 800-88","تطهير وسائط التخزين وفقاً لـ NIST 800-88","critical",false,["sanitization_record"]],
        ["DCC-3.2.3","3.2.3","Disposal Verification","التحقق من التخلص","Verify and certify data disposal with audit trail","التحقق من اكتمال التخلص مع سجل التدقيق","high",false,["verification_certificate"]],
      ])),
    ]),
    D("DCC-D4","4","Data Sharing & Transfer","مشاركة ونقل البيانات",[
      S("DCC-4-1","4.1","Data Sharing","ضوابط مشاركة البيانات",controls([
        ["DCC-4.1.1","4.1.1","Sharing Agreement","اتفاقية المشاركة","Establish data sharing agreements with security requirements","إبرام اتفاقيات مشاركة البيانات مع متطلبات الأمن","critical",false,["agreement_document"]],
        ["DCC-4.1.2","4.1.2","Sharing Approval","موافقة المشاركة","Implement approval workflow for classified data sharing","تنفيذ سير عمل الموافقة لمشاركة البيانات المصنفة","critical",true,["approval_record"]],
        ["DCC-4.1.3","4.1.3","Data Anonymization","إخفاء الهوية","Anonymize data before sharing for non-essential purposes","إخفاء هوية البيانات قبل المشاركة لأغراض غير أساسية","high",true,["anonymization_report"]],
      ])),
      S("DCC-4-2","4.2","Cross-Border Transfer","نقل البيانات عبر الحدود",controls([
        ["DCC-4.2.1","4.2.1","Transfer Impact Assessment","تقييم تأثير النقل","Conduct data transfer impact assessment","إجراء تقييم تأثير نقل البيانات قبل النقل عبر الحدود","critical",false,["assessment_report"]],
        ["DCC-4.2.2","4.2.2","Transfer Safeguards","ضمانات النقل","Implement adequate safeguards for cross-border transfers","تنفيذ ضمانات كافية لنقل البيانات عبر الحدود","critical",false,["document"]],
        ["DCC-4.2.3","4.2.3","Transfer Logging","تسجيل النقل","Log and monitor all cross-border data transfers","تسجيل ومراقبة جميع عمليات نقل البيانات عبر الحدود","high",true,["transfer_log"]],
      ])),
    ]),
  ],
});

// ════════════════════════════════════════════
// 5. NCA CSCC — Critical Systems CS Controls
//    3 Domains · 8 Subdomains · 35 Controls
// ════════════════════════════════════════════
export const NCA_CSCC: FrameworkDef = FW({
  id:"INST-KSA-NCA-CSCC",reg:"REG-KSA-NCA",nEn:"Critical Systems Cybersecurity Controls",nAr:"ضوابط الأمن السيبراني للأنظمة الحساسة",
  type:"controls_standard",ver:"1-2023",verId:"VER-KSA-CSCC-1-2023",sectors:["all"],mandatory:true,
  sumEn:"NCA controls for cybersecurity of critical national systems and infrastructure.",
  sumAr:"ضوابط الهيئة الوطنية للأمن السيبراني لأمن الأنظمة الحساسة.",
  tags:["critical_systems","cybersecurity","mandatory"],
  domains:[
    D("CSCC-D1","1","Critical System Identification","تحديد الأنظمة الحساسة",[
      S("CSCC-1-1","1.1","Criticality Assessment","تقييم الأهمية",controls([
        ["CSCC-1.1.1","1.1.1","Critical Asset ID","تحديد الأصول الحساسة","Identify and document all critical national systems","تحديد وتوثيق جميع الأنظمة الوطنية الحساسة","critical",false,["asset_register"]],
        ["CSCC-1.1.2","1.1.2","Impact Analysis","تحليل التأثير","Conduct business impact analysis for critical systems","إجراء تحليل تأثير الأعمال للأنظمة الحساسة","critical",false,["bia_report"]],
        ["CSCC-1.1.3","1.1.3","Dependency Mapping","رسم التبعيات","Map dependencies of critical systems","رسم خرائط التبعيات للأنظمة الحساسة","high",false,["dependency_map"]],
        ["CSCC-1.1.4","1.1.4","Criticality Review","مراجعة الأهمية","Annually review critical system classifications","مراجعة تصنيفات الأنظمة الحساسة سنوياً","high",false,["review_report"]],
      ])),
      S("CSCC-1-2","1.2","Critical System Registry","سجل الأنظمة الحساسة",controls([
        ["CSCC-1.2.1","1.2.1","Registry Maintenance","صيانة السجل","Maintain comprehensive registry of critical systems","الحفاظ على سجل شامل للأنظمة الحساسة","critical",true,["system_registry"]],
        ["CSCC-1.2.2","1.2.2","Registry Reporting","إعداد تقارير السجل","Report critical system inventory to NCA","الإبلاغ عن جرد الأنظمة الحساسة للهيئة","critical",false,["report"]],
      ])),
    ]),
    D("CSCC-D2","2","Critical System Protection","حماية الأنظمة الحساسة",[
      S("CSCC-2-1","2.1","Enhanced Access","ضوابط وصول معززة",controls([
        ["CSCC-2.1.1","2.1.1","Zero Trust","بنية عدم الثقة","Implement zero trust for critical system access","تنفيذ مبادئ عدم الثقة للوصول إلى الأنظمة الحساسة","critical",true,["system_config"]],
        ["CSCC-2.1.2","2.1.2","Biometric Auth","المصادقة البيومترية","Implement biometric authentication for critical systems","تنفيذ المصادقة البيومترية للأنظمة الحساسة","critical",true,["system_config"]],
        ["CSCC-2.1.3","2.1.3","Session Mgmt","إدارة الجلسات","Strict session management with timeouts and recording","إدارة جلسات صارمة مع المهلات والتسجيل","high",true,["system_config"]],
        ["CSCC-2.1.4","2.1.4","Dual Authorization","التفويض المزدوج","Require dual authorization for critical changes","طلب التفويض المزدوج لتغييرات الأنظمة الحساسة","critical",true,["approval_record"]],
      ])),
      S("CSCC-2-2","2.2","Enhanced Monitoring","مراقبة معززة",controls([
        ["CSCC-2.2.1","2.2.1","24/7 Monitoring","المراقبة المستمرة","24/7 security monitoring for critical systems","المراقبة الأمنية على مدار الساعة للأنظمة الحساسة","critical",true,["soc_report"]],
        ["CSCC-2.2.2","2.2.2","Advanced Threat Detection","كشف التهديدات المتقدمة","Deploy EDR/XDR for critical endpoints","نشر EDR/XDR لنقاط النهاية الحساسة","critical",true,["edr_report"]],
        ["CSCC-2.2.3","2.2.3","Integrity Monitoring","مراقبة السلامة","Implement file and config integrity monitoring","تنفيذ مراقبة سلامة الملفات والتكوين","critical",true,["fim_report"]],
        ["CSCC-2.2.4","2.2.4","UEBA","تحليلات سلوك المستخدم","Deploy UEBA for critical system access patterns","نشر تحليلات سلوك المستخدم للأنظمة الحساسة","high",true,["ueba_report"]],
      ])),
      S("CSCC-2-3","2.3","Enhanced Resilience","مرونة معززة",controls([
        ["CSCC-2.3.1","2.3.1","High Availability","التوفر العالي","Implement HA configurations for critical systems","تنفيذ تكوينات التوفر العالي للأنظمة الحساسة","critical",true,["system_config"]],
        ["CSCC-2.3.2","2.3.2","Geographic Redundancy","التكرار الجغرافي","Maintain geographically separated redundant systems","الحفاظ على أنظمة مكررة مفصولة جغرافياً","critical",false,["architecture_document"]],
        ["CSCC-2.3.3","2.3.3","Rapid Recovery","الاسترداد السريع","RTO <4hrs and RPO <1hr for critical systems","وقت الاسترداد أقل من 4 ساعات للأنظمة الحساسة","critical",false,["dr_test_report"]],
      ])),
    ]),
    D("CSCC-D3","3","Critical System Assurance","ضمان الأنظمة الحساسة",[
      S("CSCC-3-1","3.1","Security Testing","اختبار الأمن",controls([
        ["CSCC-3.1.1","3.1.1","Red Team","تقييم الفريق الأحمر","Annual red team assessments against critical systems","تقييمات الفريق الأحمر السنوية ضد الأنظمة الحساسة","critical",false,["redteam_report"]],
        ["CSCC-3.1.2","3.1.2","Purple Team","تمارين الفريق البنفسجي","Purple team exercises to improve detection","تمارين الفريق البنفسجي لتحسين قدرات الكشف","high",false,["exercise_report"]],
        ["CSCC-3.1.3","3.1.3","Bug Bounty","مكافآت الأخطاء","Establish responsible disclosure and bug bounty","إنشاء الإفصاح المسؤول وبرنامج مكافآت الأخطاء","medium",false,["program_report"]],
      ])),
      S("CSCC-3-2","3.2","Compliance Verification","التحقق من الامتثال",controls([
        ["CSCC-3.2.1","3.2.1","Independent Audit","التدقيق المستقل","Annual independent cybersecurity audit","تدقيق مستقل سنوي للأمن السيبراني للأنظمة الحساسة","critical",false,["audit_report"]],
        ["CSCC-3.2.2","3.2.2","Compliance Reporting","تقارير الامتثال","Quarterly compliance reports to NCA","تقارير امتثال ربع سنوية للهيئة","critical",false,["compliance_report"]],
        ["CSCC-3.2.3","3.2.3","Maturity Assessment","تقييم النضج","Cybersecurity maturity assessment using NCA methodology","تقييم نضج الأمن السيبراني باستخدام منهجية الهيئة","high",false,["maturity_report"]],
      ])),
    ]),
  ],
});

// ════════════════════════════════════════════
// 6. NCA SMACC — Social Media CS Controls
//    2 Domains · 6 Subdomains · 24 Controls
// ════════════════════════════════════════════
export const NCA_SMACC: FrameworkDef = FW({
  id:"INST-KSA-NCA-SMACC",reg:"REG-KSA-NCA",nEn:"Social Media Accounts Cybersecurity Controls",nAr:"ضوابط الأمن السيبراني لحسابات التواصل الاجتماعي",
  type:"controls_standard",ver:"1-2021",verId:"VER-KSA-SMACC-1-2021",sectors:["all"],mandatory:true,
  sumEn:"NCA controls for securing organizational social media accounts and presence.",
  sumAr:"ضوابط الهيئة الوطنية للأمن السيبراني لتأمين حسابات التواصل الاجتماعي المؤسسية.",
  tags:["social_media","cybersecurity","mandatory"],
  domains:[
    D("SMACC-D1","1","SM Governance","حوكمة التواصل الاجتماعي",[
      S("SMACC-1-1","1.1","SM Policy","سياسة التواصل الاجتماعي",controls([
        ["SMACC-1.1.1","1.1.1","SM Security Policy","سياسة أمن التواصل","Establish social media security policy","وضع سياسة أمنية للتواصل الاجتماعي","critical",false,["document"]],
        ["SMACC-1.1.2","1.1.2","SM Account Inventory","جرد الحسابات","Maintain inventory of all organizational social media accounts","الحفاظ على جرد لجميع حسابات التواصل الاجتماعي المؤسسية","critical",true,["account_register"]],
        ["SMACC-1.1.3","1.1.3","SM Roles","أدوار التواصل","Define roles for social media management","تحديد الأدوار لإدارة التواصل الاجتماعي","high",false,["document"]],
        ["SMACC-1.1.4","1.1.4","SM Risk Assessment","تقييم مخاطر التواصل","Assess risks of social media exposure","تقييم مخاطر التعرض عبر التواصل الاجتماعي","high",false,["assessment_report"]],
      ])),
      S("SMACC-1-2","1.2","SM Compliance","امتثال التواصل الاجتماعي",controls([
        ["SMACC-1.2.1","1.2.1","Content Guidelines","إرشادات المحتوى","Define content guidelines and approval workflows","تحديد إرشادات المحتوى وسير عمل الموافقة","high",false,["document"]],
        ["SMACC-1.2.2","1.2.2","Regulatory Compliance","الامتثال التنظيمي","Ensure SM activities comply with KSA regulations","ضمان امتثال أنشطة التواصل الاجتماعي للأنظمة السعودية","critical",false,["compliance_report"]],
        ["SMACC-1.2.3","1.2.3","SM Audit","تدقيق التواصل","Conduct periodic social media security audits","إجراء تدقيقات أمنية دورية للتواصل الاجتماعي","high",false,["audit_report"]],
        ["SMACC-1.2.4","1.2.4","SM Training","تدريب التواصل","Train social media administrators on security","تدريب مديري التواصل الاجتماعي على الأمن","high",false,["training_record"]],
      ])),
    ]),
    D("SMACC-D2","2","SM Security Controls","ضوابط أمن التواصل الاجتماعي",[
      S("SMACC-2-1","2.1","SM Access Security","أمن الوصول للتواصل",controls([
        ["SMACC-2.1.1","2.1.1","SM MFA","المصادقة متعددة العوامل","Enable MFA on all social media accounts","تفعيل المصادقة متعددة العوامل لجميع حسابات التواصل","critical",true,["system_config"]],
        ["SMACC-2.1.2","2.1.2","SM Password Policy","سياسة كلمات المرور","Enforce strong unique passwords per platform","فرض كلمات مرور قوية فريدة لكل منصة","critical",true,["system_config"]],
        ["SMACC-2.1.3","2.1.3","SM Access Review","مراجعة الوصول","Review SM account access quarterly","مراجعة وصول حسابات التواصل ربع سنوياً","high",false,["review_report"]],
        ["SMACC-2.1.4","2.1.4","SM Revocation","إلغاء الوصول","Revoke access upon role change or termination","إلغاء الوصول عند تغيير الدور أو إنهاء الخدمة","critical",true,["system_log"]],
      ])),
      S("SMACC-2-2","2.2","SM Monitoring","مراقبة التواصل الاجتماعي",controls([
        ["SMACC-2.2.1","2.2.1","SM Activity Monitoring","مراقبة النشاط","Monitor social media account activity for anomalies","مراقبة نشاط حسابات التواصل بحثاً عن شذوذ","critical",true,["monitoring_report"]],
        ["SMACC-2.2.2","2.2.2","SM Impersonation Detection","كشف الانتحال","Detect and report fake/impersonation accounts","كشف والإبلاغ عن الحسابات المزيفة والمنتحلة","high",true,["detection_report"]],
        ["SMACC-2.2.3","2.2.3","SM Brand Protection","حماية العلامة","Monitor brand mentions and reputation threats","مراقبة إشارات العلامة التجارية وتهديدات السمعة","medium",true,["monitoring_report"]],
        ["SMACC-2.2.4","2.2.4","SM Alerting","تنبيهات التواصل","Configure alerts for unauthorized changes","تكوين تنبيهات للتغييرات غير المصرح بها","high",true,["alert_config"]],
      ])),
      S("SMACC-2-3","2.3","SM Incident Response","الاستجابة لحوادث التواصل",controls([
        ["SMACC-2.3.1","2.3.1","SM IR Plan","خطة استجابة التواصل","Develop social media incident response plan","تطوير خطة استجابة لحوادث التواصل الاجتماعي","critical",false,["document"]],
        ["SMACC-2.3.2","2.3.2","Account Recovery","استرداد الحسابات","Define account recovery procedures for compromised accounts","تحديد إجراءات استرداد الحسابات المخترقة","critical",false,["document"]],
        ["SMACC-2.3.3","2.3.3","SM Crisis Comms","اتصالات الأزمة","Define crisis communication plan for SM breaches","تحديد خطة اتصالات الأزمة لاختراقات التواصل","high",false,["document"]],
        ["SMACC-2.3.4","2.3.4","SM Reporting to NCA","الإبلاغ للهيئة","Report significant SM security incidents to NCA","الإبلاغ عن حوادث أمن التواصل الهامة للهيئة","critical",false,["incident_report"]],
      ])),
      S("SMACC-2-4","2.4","SM Data Protection","حماية بيانات التواصل",controls([
        ["SMACC-2.4.1","2.4.1","SM Privacy Settings","إعدادات الخصوصية","Configure privacy settings per platform","تكوين إعدادات الخصوصية لكل منصة","high",true,["system_config"]],
        ["SMACC-2.4.2","2.4.2","SM Data Handling","التعامل مع البيانات","Define rules for handling data collected via SM","تحديد قواعد التعامل مع البيانات المجمعة عبر التواصل","high",false,["document"]],
        ["SMACC-2.4.3","2.4.3","SM App Permissions","أذونات التطبيقات","Review and limit third-party app permissions","مراجعة وتقييد أذونات التطبيقات الخارجية","high",true,["review_report"]],
        ["SMACC-2.4.4","2.4.4","SM Backup","النسخ الاحتياطي","Backup social media content and configurations","النسخ الاحتياطي لمحتوى وتكوينات التواصل الاجتماعي","medium",true,["backup_report"]],
      ])),
    ]),
  ],
});

// ── Export all NCA frameworks ──
export const NCA_FRAMEWORKS: FrameworkDef[] = [
  NCA_ECC, NCA_CCC, NCA_OTCC, NCA_DCC, NCA_CSCC, NCA_SMACC,
];
