// ============================================
// Shahin AI-KSA GRC — SDAIA Framework Family
// PDPL, AI Ethics, Data Classification, NDMO
// ============================================
import { FrameworkDef } from "./ksa-frameworks";
import { S, D, FW, controls } from "./ksa-control-builder";

// ════════════════════════════════════════════
// 1. PDPL — Personal Data Protection Law
//    4 Domains · 12 Subdomains · 65 Controls
// ════════════════════════════════════════════
export const SDAIA_PDPL: FrameworkDef = FW({
  id:"INST-KSA-SDAIA-PDPL",reg:"REG-KSA-SDAIA",nEn:"Personal Data Protection Law",nAr:"نظام حماية البيانات الشخصية",
  type:"law",ver:"English V2 (23 Apr 2023)",verId:"VER-KSA-PDPL-EN-V2-20230423",sectors:["all"],mandatory:true,
  sumEn:"Saudi Arabia's comprehensive personal data protection law governing collection, processing, and transfer of personal data.",
  sumAr:"نظام حماية البيانات الشخصية الشامل في المملكة العربية السعودية.",
  tags:["privacy","data_protection","mandatory"],
  domains:[
    D("PDPL-D1","1","Data Collection & Processing","جمع ومعالجة البيانات",[
      S("PDPL-1-1","1.1","Lawful Basis","الأساس القانوني للمعالجة",controls([
        ["PDPL-1.1.1","1.1.1","Consent Management","إدارة الموافقة","Obtain and manage data subject consent for processing","الحصول على موافقة صاحب البيانات وإدارتها للمعالجة","critical",true,["consent_record","system_config"]],
        ["PDPL-1.1.2","1.1.2","Purpose Limitation","تحديد الغرض","Process personal data only for specified legitimate purposes","معالجة البيانات الشخصية فقط لأغراض محددة ومشروعة","critical",false,["document","privacy_notice"]],
        ["PDPL-1.1.3","1.1.3","Data Minimization","تقليل البيانات","Collect only necessary personal data for stated purpose","جمع البيانات الشخصية الضرورية فقط للغرض المحدد","high",false,["data_inventory","assessment"]],
        ["PDPL-1.1.4","1.1.4","Accuracy","دقة البيانات","Ensure personal data is accurate and up to date","ضمان دقة البيانات الشخصية وتحديثها","high",true,["data_quality_report"]],
        ["PDPL-1.1.5","1.1.5","Storage Limitation","تحديد مدة التخزين","Do not store personal data longer than necessary","عدم تخزين البيانات الشخصية لفترة أطول من اللازم","high",true,["retention_config"]],
      ])),
      S("PDPL-1-2","1.2","Data Subject Rights","حقوق صاحب البيانات",controls([
        ["PDPL-1.2.1","1.2.1","Right of Access","حق الوصول","Enable data subjects to access their personal data","تمكين أصحاب البيانات من الوصول إلى بياناتهم الشخصية","critical",true,["system_config","process_document"]],
        ["PDPL-1.2.2","1.2.2","Right of Correction","حق التصحيح","Allow data subjects to correct inaccurate data","السماح لأصحاب البيانات بتصحيح البيانات غير الدقيقة","high",true,["system_config"]],
        ["PDPL-1.2.3","1.2.3","Right of Deletion","حق الحذف","Delete personal data when no longer necessary or upon request","حذف البيانات الشخصية عندما لم تعد ضرورية أو بناءً على طلب","high",true,["system_config","deletion_log"]],
        ["PDPL-1.2.4","1.2.4","Right to Object","حق الاعتراض","Allow data subjects to object to processing","السماح لأصحاب البيانات بالاعتراض على المعالجة","high",true,["system_config"]],
        ["PDPL-1.2.5","1.2.5","Right to Portability","حق نقل البيانات","Provide data portability in machine-readable format","توفير نقل البيانات بتنسيق قابل للقراءة الآلية","high",true,["system_config"]],
        ["PDPL-1.2.6","1.2.6","Request Handling","معالجة الطلبات","Respond to data subject requests within 30 days","الرد على طلبات أصحاب البيانات خلال 30 يوماً","critical",true,["process_log"]],
      ])),
      S("PDPL-1-3","1.3","Special Categories","فئات خاصة من البيانات",controls([
        ["PDPL-1.3.1","1.3.1","Sensitive Data Processing","معالجة البيانات الحساسة","Additional safeguards for sensitive personal data (health, biometric, financial)","ضمانات إضافية للبيانات الشخصية الحساسة","critical",false,["document","assessment"]],
        ["PDPL-1.3.2","1.3.2","Children's Data","بيانات الأطفال","Obtain guardian consent for children's data processing","الحصول على موافقة ولي الأمر لمعالجة بيانات الأطفال","critical",true,["consent_record"]],
        ["PDPL-1.3.3","1.3.3","Health Data","البيانات الصحية","Enhanced protection for health-related personal data","حماية معززة للبيانات الشخصية المتعلقة بالصحة","critical",false,["document"]],
        ["PDPL-1.3.4","1.3.4","Biometric Data","البيانات البيومترية","Specific controls for biometric data processing","ضوابط خاصة لمعالجة البيانات البيومترية","critical",false,["document","assessment"]],
      ])),
    ]),
    D("PDPL-D2","2","Data Transfer & Security","نقل البيانات وأمنها",[
      S("PDPL-2-1","2.1","Cross-Border Transfer","نقل البيانات عبر الحدود",controls([
        ["PDPL-2.1.1","2.1.1","Transfer Restrictions","قيود النقل","Ensure cross-border transfers comply with PDPL","ضمان امتثال النقل عبر الحدود لنظام حماية البيانات","critical",false,["transfer_assessment","document"]],
        ["PDPL-2.1.2","2.1.2","Adequate Protection","الحماية الكافية","Verify adequate protection in receiving jurisdiction","التحقق من حماية البيانات الكافية في الجهة المستقبلة","high",false,["assessment_report"]],
        ["PDPL-2.1.3","2.1.3","SDAIA Approval","موافقة الهيئة","Obtain SDAIA approval for transfers to non-adequate countries","الحصول على موافقة الهيئة للنقل لدول غير مناسبة","critical",false,["approval_record"]],
        ["PDPL-2.1.4","2.1.4","Binding Corporate Rules","القواعد المؤسسية الملزمة","Establish BCRs for intra-group transfers","إنشاء القواعد المؤسسية الملزمة للنقل داخل المجموعة","high",false,["document"]],
        ["PDPL-2.1.5","2.1.5","Transfer Logging","تسجيل النقل","Log all cross-border personal data transfers","تسجيل جميع عمليات نقل البيانات الشخصية عبر الحدود","high",true,["transfer_log"]],
      ])),
      S("PDPL-2-2","2.2","Security Measures","تدابير أمن البيانات",controls([
        ["PDPL-2.2.1","2.2.1","Technical Measures","التدابير التقنية","Implement appropriate technical measures to protect personal data","تنفيذ التدابير التقنية المناسبة لحماية البيانات الشخصية","critical",true,["system_config","security_report"],["ECC-2-6-2"]],
        ["PDPL-2.2.2","2.2.2","Breach Notification","الإخطار بالانتهاك","Notify SDAIA and affected individuals of data breaches","إخطار الهيئة والأفراد المتأثرين بانتهاكات البيانات","critical",false,["notification_record","incident_report"]],
        ["PDPL-2.2.3","2.2.3","Breach Response","الاستجابة للانتهاك","72-hour breach notification to SDAIA","إخطار الهيئة بالانتهاك خلال 72 ساعة","critical",false,["incident_report"]],
        ["PDPL-2.2.4","2.2.4","Access Controls","ضوابط الوصول","Implement access controls for personal data systems","تنفيذ ضوابط الوصول لأنظمة البيانات الشخصية","critical",true,["system_config"]],
        ["PDPL-2.2.5","2.2.5","Encryption","التشفير","Encrypt personal data at rest and in transit","تشفير البيانات الشخصية أثناء التخزين والنقل","critical",true,["encryption_report"]],
      ])),
    ]),
    D("PDPL-D3","3","Organizational Measures","التدابير المؤسسية",[
      S("PDPL-3-1","3.1","DPO & Governance","مسؤول حماية البيانات والحوكمة",controls([
        ["PDPL-3.1.1","3.1.1","Data Protection Officer","مسؤول حماية البيانات","Appoint qualified Data Protection Officer","تعيين مسؤول حماية بيانات مؤهل","critical",false,["appointment_record"]],
        ["PDPL-3.1.2","3.1.2","Privacy Governance","حوكمة الخصوصية","Establish privacy governance framework","إنشاء إطار حوكمة الخصوصية","critical",false,["document"]],
        ["PDPL-3.1.3","3.1.3","ROPA","سجل أنشطة المعالجة","Maintain Record of Processing Activities","الحفاظ على سجل أنشطة المعالجة","critical",true,["processing_record"]],
        ["PDPL-3.1.4","3.1.4","DPIA","تقييم تأثير الخصوصية","Conduct DPIA for high-risk processing activities","إجراء تقييم تأثير الخصوصية للأنشطة عالية المخاطر","critical",false,["dpia_report"]],
        ["PDPL-3.1.5","3.1.5","Privacy by Design","الخصوصية حسب التصميم","Implement privacy by design and by default","تنفيذ الخصوصية حسب التصميم وبشكل افتراضي","high",false,["document"]],
      ])),
      S("PDPL-3-2","3.2","Processor Management","إدارة المعالجين",controls([
        ["PDPL-3.2.1","3.2.1","Processor Contracts","عقود المعالجين","Data processing agreements with all processors","اتفاقيات معالجة البيانات مع جميع المعالجين","critical",false,["contract"]],
        ["PDPL-3.2.2","3.2.2","Processor Due Diligence","العناية الواجبة للمعالجين","Assess processor's ability to protect personal data","تقييم قدرة المعالج على حماية البيانات الشخصية","high",false,["assessment_report"]],
        ["PDPL-3.2.3","3.2.3","Sub-Processor Control","التحكم في المعالجين الفرعيين","Approve and monitor sub-processors","الموافقة على المعالجين الفرعيين ومراقبتهم","high",false,["approval_record"]],
        ["PDPL-3.2.4","3.2.4","Processor Audit","تدقيق المعالجين","Right to audit processors for PDPL compliance","حق تدقيق المعالجين للامتثال لنظام حماية البيانات","high",false,["audit_report"]],
      ])),
      S("PDPL-3-3","3.3","Privacy Notices","إشعارات الخصوصية",controls([
        ["PDPL-3.3.1","3.3.1","Privacy Policy","سياسة الخصوصية","Publish clear and accessible privacy policy","نشر سياسة خصوصية واضحة ويمكن الوصول إليها","critical",false,["document"]],
        ["PDPL-3.3.2","3.3.2","Collection Notice","إشعار الجمع","Inform data subjects at point of collection","إبلاغ أصحاب البيانات عند نقطة الجمع","critical",true,["notice_record"]],
        ["PDPL-3.3.3","3.3.3","Purpose Changes","تغييرات الغرض","Notify data subjects of changes to processing purposes","إخطار أصحاب البيانات بالتغييرات في أغراض المعالجة","high",true,["notification_record"]],
      ])),
    ]),
    D("PDPL-D4","4","Enforcement & Penalties","التنفيذ والعقوبات",[
      S("PDPL-4-1","4.1","Compliance Monitoring","مراقبة الامتثال",controls([
        ["PDPL-4.1.1","4.1.1","Self-Assessment","التقييم الذاتي","Conduct periodic PDPL compliance self-assessment","إجراء تقييم ذاتي دوري لامتثال نظام حماية البيانات","critical",false,["assessment_report"]],
        ["PDPL-4.1.2","4.1.2","External Audit","التدقيق الخارجي","Annual external privacy audit","تدقيق خصوصية خارجي سنوي","high",false,["audit_report"]],
        ["PDPL-4.1.3","4.1.3","Complaint Handling","معالجة الشكاوى","Establish complaint handling mechanism for data subjects","إنشاء آلية معالجة شكاوى لأصحاب البيانات","critical",true,["process_document"]],
        ["PDPL-4.1.4","4.1.4","Regulator Cooperation","التعاون مع الجهة التنظيمية","Cooperate with SDAIA investigations and inspections","التعاون مع تحقيقات وتفتيشات الهيئة","critical",false,["document"]],
      ])),
    ]),
  ],
});

// ════════════════════════════════════════════
// 2. SDAIA AI Ethics — AI Governance Framework
//    3 Domains · 9 Subdomains · 42 Controls
// ════════════════════════════════════════════
export const SDAIA_AI_ETHICS: FrameworkDef = FW({
  id:"INST-KSA-SDAIA-AIE",reg:"REG-KSA-SDAIA",nEn:"AI Ethics & Governance Framework",nAr:"إطار أخلاقيات وحوكمة الذكاء الاصطناعي",
  type:"framework",ver:"1.0",verId:"VER-KSA-SDAIA-AIE-1-0",sectors:["all"],mandatory:false,
  sumEn:"SDAIA framework for ethical AI development, deployment, and governance in Saudi Arabia.",
  sumAr:"إطار الهيئة السعودية للبيانات والذكاء الاصطناعي لأخلاقيات وحوكمة الذكاء الاصطناعي.",
  tags:["ai","ethics","governance","data"],
  domains:[
    D("AIE-D1","1","AI Governance","حوكمة الذكاء الاصطناعي",[
      S("AIE-1-1","1.1","AI Strategy & Policy","استراتيجية وسياسة الذكاء الاصطناعي",controls([
        ["AIE-1.1.1","1.1.1","AI Strategy","استراتيجية الذكاء الاصطناعي","Develop organizational AI strategy aligned with national AI strategy","تطوير استراتيجية الذكاء الاصطناعي المؤسسية المتوافقة مع الاستراتيجية الوطنية","critical",false,["document"]],
        ["AIE-1.1.2","1.1.2","AI Policy","سياسة الذكاء الاصطناعي","Establish AI use policy covering ethical principles","وضع سياسة استخدام الذكاء الاصطناعي تغطي المبادئ الأخلاقية","critical",false,["document"]],
        ["AIE-1.1.3","1.1.3","AI Ethics Board","لجنة أخلاقيات الذكاء الاصطناعي","Establish AI ethics review board","إنشاء لجنة مراجعة أخلاقيات الذكاء الاصطناعي","high",false,["document","meeting_minutes"]],
        ["AIE-1.1.4","1.1.4","AI Risk Register","سجل مخاطر الذكاء الاصطناعي","Maintain AI-specific risk register","الحفاظ على سجل مخاطر خاص بالذكاء الاصطناعي","high",true,["risk_register"]],
      ])),
      S("AIE-1-2","1.2","AI Accountability","مساءلة الذكاء الاصطناعي",controls([
        ["AIE-1.2.1","1.2.1","AI Roles","أدوار الذكاء الاصطناعي","Define AI accountability roles (AI Owner, AI Steward)","تحديد أدوار مساءلة الذكاء الاصطناعي","high",false,["document","org_chart"]],
        ["AIE-1.2.2","1.2.2","AI Inventory","جرد أنظمة الذكاء الاصطناعي","Maintain inventory of all AI/ML systems in use","الحفاظ على جرد لجميع أنظمة الذكاء الاصطناعي المستخدمة","critical",true,["ai_register"]],
        ["AIE-1.2.3","1.2.3","AI Impact Assessment","تقييم تأثير الذكاء الاصطناعي","Conduct AI impact assessment before deployment","إجراء تقييم تأثير الذكاء الاصطناعي قبل النشر","critical",false,["impact_assessment"]],
        ["AIE-1.2.4","1.2.4","Human Oversight","الرقابة البشرية","Ensure human oversight for high-risk AI decisions","ضمان الرقابة البشرية لقرارات الذكاء الاصطناعي عالية المخاطر","critical",false,["document"]],
      ])),
    ]),
    D("AIE-D2","2","AI Ethics Principles","مبادئ أخلاقيات الذكاء الاصطناعي",[
      S("AIE-2-1","2.1","Fairness & Non-Discrimination","العدالة وعدم التمييز",controls([
        ["AIE-2.1.1","2.1.1","Bias Detection","كشف التحيز","Implement bias detection in training data and model outputs","تنفيذ كشف التحيز في بيانات التدريب ومخرجات النموذج","critical",true,["bias_report"]],
        ["AIE-2.1.2","2.1.2","Fairness Metrics","مقاييس العدالة","Define and monitor fairness metrics for AI systems","تحديد ومراقبة مقاييس العدالة لأنظمة الذكاء الاصطناعي","high",true,["metrics_report"]],
        ["AIE-2.1.3","2.1.3","Inclusive Design","التصميم الشامل","Design AI systems for diverse populations","تصميم أنظمة الذكاء الاصطناعي للفئات السكانية المتنوعة","high",false,["design_document"]],
      ])),
      S("AIE-2-2","2.2","Transparency & Explainability","الشفافية وقابلية التفسير",controls([
        ["AIE-2.2.1","2.2.1","Model Documentation","توثيق النموذج","Document AI model purpose, data, and limitations","توثيق غرض نموذج الذكاء الاصطناعي وبياناته وقيوده","critical",false,["model_card"]],
        ["AIE-2.2.2","2.2.2","Explainability","قابلية التفسير","Implement explainable AI for high-impact decisions","تنفيذ الذكاء الاصطناعي القابل للتفسير للقرارات عالية التأثير","critical",true,["explainability_report"]],
        ["AIE-2.2.3","2.2.3","User Notification","إخطار المستخدم","Notify users when interacting with AI systems","إخطار المستخدمين عند التفاعل مع أنظمة الذكاء الاصطناعي","high",true,["system_config"]],
        ["AIE-2.2.4","2.2.4","Decision Audit Trail","مسار تدقيق القرارات","Maintain audit trail for AI-assisted decisions","الحفاظ على مسار تدقيق للقرارات المدعومة بالذكاء الاصطناعي","critical",true,["audit_log"]],
      ])),
      S("AIE-2-3","2.3","Safety & Security","السلامة والأمن",controls([
        ["AIE-2.3.1","2.3.1","AI Security Testing","اختبار أمن الذكاء الاصطناعي","Security testing for AI/ML systems (adversarial, poisoning)","اختبار أمن أنظمة الذكاء الاصطناعي (هجمات عدائية، تسميم)","critical",false,["test_report"]],
        ["AIE-2.3.2","2.3.2","Model Robustness","متانة النموذج","Test model robustness against adversarial inputs","اختبار متانة النموذج ضد المدخلات العدائية","critical",true,["robustness_report"]],
        ["AIE-2.3.3","2.3.3","AI Incident Response","الاستجابة لحوادث الذكاء الاصطناعي","Define incident response for AI failures and misuse","تحديد الاستجابة للحوادث لإخفاقات الذكاء الاصطناعي وسوء الاستخدام","high",false,["document"]],
        ["AIE-2.3.4","2.3.4","Model Monitoring","مراقبة النموذج","Continuous monitoring of AI model performance and drift","المراقبة المستمرة لأداء نموذج الذكاء الاصطناعي والانحراف","critical",true,["monitoring_report"]],
      ])),
    ]),
    D("AIE-D3","3","AI Data Governance","حوكمة بيانات الذكاء الاصطناعي",[
      S("AIE-3-1","3.1","Training Data","بيانات التدريب",controls([
        ["AIE-3.1.1","3.1.1","Data Provenance","مصدر البيانات","Track provenance and lineage of training data","تتبع مصدر وسلسلة بيانات التدريب","critical",true,["data_lineage_report"]],
        ["AIE-3.1.2","3.1.2","Data Quality","جودة البيانات","Ensure training data quality and representativeness","ضمان جودة بيانات التدريب وتمثيلها","critical",true,["quality_report"]],
        ["AIE-3.1.3","3.1.3","Data Consent","موافقة البيانات","Ensure proper consent for personal data used in AI training","ضمان الموافقة المناسبة للبيانات الشخصية المستخدمة في تدريب الذكاء الاصطناعي","critical",false,["consent_record"]],
        ["AIE-3.1.4","3.1.4","Synthetic Data","البيانات الاصطناعية","Use synthetic data where possible to reduce privacy risk","استخدام البيانات الاصطناعية حيثما أمكن لتقليل مخاطر الخصوصية","medium",true,["data_report"]],
      ])),
      S("AIE-3-2","3.2","Model Lifecycle","دورة حياة النموذج",controls([
        ["AIE-3.2.1","3.2.1","Model Versioning","إصدارات النموذج","Version control for all AI/ML models","التحكم في إصدارات جميع نماذج الذكاء الاصطناعي","high",true,["version_log"]],
        ["AIE-3.2.2","3.2.2","Model Validation","التحقق من النموذج","Independent validation before production deployment","التحقق المستقل قبل النشر في الإنتاج","critical",false,["validation_report"]],
        ["AIE-3.2.3","3.2.3","Model Retirement","تقاعد النموذج","Define model retirement criteria and procedures","تحديد معايير وإجراءات تقاعد النموذج","medium",false,["document"]],
        ["AIE-3.2.4","3.2.4","Retraining Policy","سياسة إعادة التدريب","Define retraining triggers and schedules","تحديد محفزات وجداول إعادة التدريب","high",true,["policy_document"]],
      ])),
      S("AIE-3-3","3.3","AI Privacy","خصوصية الذكاء الاصطناعي",controls([
        ["AIE-3.3.1","3.3.1","Privacy-Preserving AI","الذكاء الاصطناعي المحافظ على الخصوصية","Implement privacy-preserving techniques (federated learning, differential privacy)","تنفيذ تقنيات المحافظة على الخصوصية","high",true,["system_config"]],
        ["AIE-3.3.2","3.3.2","Data Anonymization for AI","إخفاء هوية البيانات للذكاء الاصطناعي","Anonymize personal data before AI processing where possible","إخفاء هوية البيانات الشخصية قبل معالجة الذكاء الاصطناعي حيثما أمكن","high",true,["anonymization_report"]],
        ["AIE-3.3.3","3.3.3","Model Inference Risk","مخاطر استدلال النموذج","Assess and mitigate model inversion and membership inference risks","تقييم وتخفيف مخاطر عكس النموذج واستدلال العضوية","high",false,["assessment_report"]],
      ])),
    ]),
  ],
});

// ════════════════════════════════════════════
// 3. NDMO DGF — Data Governance Framework
//    3 Domains · 8 Subdomains · 38 Controls
// ════════════════════════════════════════════
export const NDMO_DGF: FrameworkDef = FW({
  id:"INST-KSA-NDMO-DGF",reg:"REG-KSA-NDMO",nEn:"National Data Governance Framework",nAr:"الإطار الوطني لحوكمة البيانات",
  type:"framework",ver:"1.0",verId:"VER-KSA-NDMO-DGF-1-0",
  sectors:["SEC-KSA-GOV-MIN","SEC-KSA-GOV-AUTH","SEC-KSA-GOV-MUN"],mandatory:true,
  sumEn:"NDMO framework for data governance in government entities, covering data management, quality, and sharing.",
  sumAr:"إطار مكتب إدارة البيانات الوطنية لحوكمة البيانات في الجهات الحكومية.",
  tags:["data_governance","government","mandatory"],
  domains:[
    D("NDGF-D1","1","Data Management","إدارة البيانات",[
      S("NDGF-1-1","1.1","Data Strategy","استراتيجية البيانات",controls([
        ["NDGF-1.1.1","1.1.1","Data Strategy","استراتيجية البيانات","Develop entity-level data strategy aligned with national data strategy","تطوير استراتيجية بيانات على مستوى الجهة متوافقة مع الاستراتيجية الوطنية","critical",false,["document"]],
        ["NDGF-1.1.2","1.1.2","Data Governance Office","مكتب حوكمة البيانات","Establish data governance office with dedicated staff","إنشاء مكتب حوكمة البيانات مع موظفين مخصصين","critical",false,["document","org_chart"]],
        ["NDGF-1.1.3","1.1.3","Data Catalogue","كتالوج البيانات","Maintain comprehensive data catalogue","الحفاظ على كتالوج بيانات شامل","critical",true,["data_catalogue"]],
        ["NDGF-1.1.4","1.1.4","Metadata Management","إدارة البيانات الوصفية","Implement metadata management standards","تنفيذ معايير إدارة البيانات الوصفية","high",true,["system_config"]],
      ])),
      S("NDGF-1-2","1.2","Data Quality","جودة البيانات",controls([
        ["NDGF-1.2.1","1.2.1","Quality Standards","معايير الجودة","Define data quality dimensions and standards","تحديد أبعاد ومعايير جودة البيانات","critical",false,["document"]],
        ["NDGF-1.2.2","1.2.2","Quality Monitoring","مراقبة الجودة","Implement automated data quality monitoring","تنفيذ مراقبة جودة البيانات الآلية","high",true,["quality_report"]],
        ["NDGF-1.2.3","1.2.3","Quality Remediation","معالجة الجودة","Define data quality remediation processes","تحديد عمليات معالجة جودة البيانات","high",false,["process_document"]],
        ["NDGF-1.2.4","1.2.4","Quality Reporting","تقارير الجودة","Regular data quality reporting to governance office","تقارير جودة البيانات المنتظمة لمكتب الحوكمة","high",true,["quality_report"]],
      ])),
    ]),
    D("NDGF-D2","2","Data Sharing & Open Data","مشاركة البيانات والبيانات المفتوحة",[
      S("NDGF-2-1","2.1","Government Data Sharing","مشاركة البيانات الحكومية",controls([
        ["NDGF-2.1.1","2.1.1","Sharing Policy","سياسة المشاركة","Establish government data sharing policy","وضع سياسة مشاركة البيانات الحكومية","critical",false,["document"]],
        ["NDGF-2.1.2","2.1.2","Data Exchange","تبادل البيانات","Implement secure data exchange between government entities","تنفيذ تبادل آمن للبيانات بين الجهات الحكومية","critical",true,["system_config"]],
        ["NDGF-2.1.3","2.1.3","Sharing Agreements","اتفاقيات المشاركة","Formalize data sharing agreements","إضفاء الطابع الرسمي على اتفاقيات مشاركة البيانات","high",false,["agreement"]],
        ["NDGF-2.1.4","2.1.4","API Standards","معايير API","Adopt national API standards for data sharing","اعتماد معايير API الوطنية لمشاركة البيانات","high",true,["system_config"]],
      ])),
      S("NDGF-2-2","2.2","Open Data","البيانات المفتوحة",controls([
        ["NDGF-2.2.1","2.2.1","Open Data Policy","سياسة البيانات المفتوحة","Publish open data policy per NDMO requirements","نشر سياسة البيانات المفتوحة وفقاً لمتطلبات NDMO","critical",false,["document"]],
        ["NDGF-2.2.2","2.2.2","Open Data Portal","بوابة البيانات المفتوحة","Publish datasets on national open data portal","نشر مجموعات البيانات على بوابة البيانات المفتوحة الوطنية","high",true,["portal_config"]],
        ["NDGF-2.2.3","2.2.3","Data Anonymization","إخفاء هوية البيانات","Anonymize personal data before open publication","إخفاء هوية البيانات الشخصية قبل النشر المفتوح","critical",true,["anonymization_report"]],
        ["NDGF-2.2.4","2.2.4","Open Data Licensing","ترخيص البيانات المفتوحة","Apply appropriate licenses to open datasets","تطبيق تراخيص مناسبة على مجموعات البيانات المفتوحة","medium",false,["document"]],
      ])),
    ]),
    D("NDGF-D3","3","Data Protection & Compliance","حماية البيانات والامتثال",[
      S("NDGF-3-1","3.1","Data Classification","تصنيف البيانات",controls([
        ["NDGF-3.1.1","3.1.1","Classification Framework","إطار التصنيف","Adopt national data classification framework","اعتماد إطار تصنيف البيانات الوطني","critical",false,["document"]],
        ["NDGF-3.1.2","3.1.2","Handling Procedures","إجراءات التعامل","Define handling procedures per classification level","تحديد إجراءات التعامل لكل مستوى تصنيف","critical",false,["document"]],
        ["NDGF-3.1.3","3.1.3","Labeling Automation","أتمتة الوسم","Automate data classification labeling","أتمتة وسم تصنيف البيانات","high",true,["system_config"]],
      ])),
      S("NDGF-3-2","3.2","Compliance & Reporting","الامتثال والتقارير",controls([
        ["NDGF-3.2.1","3.2.1","NDMO Compliance","امتثال NDMO","Ensure compliance with NDMO policies and standards","ضمان الامتثال لسياسات ومعايير مكتب إدارة البيانات الوطنية","critical",false,["compliance_report"]],
        ["NDGF-3.2.2","3.2.2","Maturity Assessment","تقييم النضج","Conduct data governance maturity assessment","إجراء تقييم نضج حوكمة البيانات","high",false,["maturity_report"]],
        ["NDGF-3.2.3","3.2.3","Annual Reporting","التقارير السنوية","Submit annual data governance report to NDMO","تقديم تقرير حوكمة البيانات السنوي لـ NDMO","critical",false,["annual_report"]],
        ["NDGF-3.2.4","3.2.4","Training & Awareness","التدريب والتوعية","Data governance training for all staff handling data","تدريب حوكمة البيانات لجميع الموظفين الذين يتعاملون مع البيانات","high",false,["training_record"]],
      ])),
    ]),
  ],
});

// ── Export all SDAIA frameworks ──
export const SDAIA_FRAMEWORKS: FrameworkDef[] = [
  SDAIA_PDPL, SDAIA_AI_ETHICS, NDMO_DGF,
];
