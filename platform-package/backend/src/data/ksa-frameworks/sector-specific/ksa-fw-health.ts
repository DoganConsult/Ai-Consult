// ============================================
// Shahin AI-KSA GRC — Health Sector Frameworks
// MOH, CBAHI, SFDA, SCFHS, SHCC
// ============================================
import { FrameworkDef } from "./ksa-frameworks";
import { S, D, FW, controls } from "./ksa-control-builder";

export const MOH_HIS: FrameworkDef = FW({
  id:"INST-KSA-MOH-HIS",reg:"REG-KSA-MOH",nEn:"Health Information Security Standards",nAr:"معايير أمن المعلومات الصحية",
  type:"standard",ver:"2.0",verId:"VER-KSA-MOH-HIS-2-0",
  sectors:["SEC-KSA-HEALTH-HOSP","SEC-KSA-HEALTH-PHARMA"],mandatory:true,
  sumEn:"Ministry of Health information security standards for healthcare facilities and health information systems.",
  sumAr:"معايير أمن المعلومات الصحية لوزارة الصحة للمنشآت الصحية وأنظمة المعلومات الصحية.",
  tags:["health","information_security","mandatory"],
  domains:[
    D("MHIS-D1","1","Health Data Governance","حوكمة البيانات الصحية",[
      S("MHIS-1-1","1.1","Health Data Policy","سياسة البيانات الصحية",controls([
        ["MHIS-1.1.1","1.1.1","Health Data Security Policy","سياسة أمن البيانات الصحية","Establish health data security policy compliant with MOH","وضع سياسة أمن البيانات الصحية المتوافقة مع وزارة الصحة","critical",false,["document"]],
        ["MHIS-1.1.2","1.1.2","Health Data Classification","تصنيف البيانات الصحية","Classify health data per MOH classification scheme","تصنيف البيانات الصحية وفقاً لمخطط تصنيف وزارة الصحة","critical",false,["document"]],
        ["MHIS-1.1.3","1.1.3","Patient Consent","موافقة المريض","Obtain patient consent for health data processing","الحصول على موافقة المريض لمعالجة البيانات الصحية","critical",true,["consent_record"]],
        ["MHIS-1.1.4","1.1.4","Health Data Stewardship","إشراف البيانات الصحية","Appoint health data stewards per department","تعيين أمناء بيانات صحية لكل قسم","high",false,["appointment_record"]],
      ])),
      S("MHIS-1-2","1.2","EHR Security","أمن السجلات الصحية الإلكترونية",controls([
        ["MHIS-1.2.1","1.2.1","EHR Access Control","التحكم في الوصول إلى EHR","Role-based access control for EHR systems","التحكم في الوصول القائم على الأدوار لأنظمة السجلات الصحية","critical",true,["system_config"]],
        ["MHIS-1.2.2","1.2.2","EHR Audit Trail","مسار تدقيق EHR","Complete audit trail for all EHR access and modifications","مسار تدقيق كامل لجميع عمليات الوصول والتعديل في EHR","critical",true,["audit_log"]],
        ["MHIS-1.2.3","1.2.3","EHR Encryption","تشفير EHR","Encrypt EHR data at rest and in transit","تشفير بيانات السجلات الصحية أثناء التخزين والنقل","critical",true,["encryption_report"]],
        ["MHIS-1.2.4","1.2.4","EHR Availability","توفر EHR","Ensure 99.9% availability for EHR systems","ضمان توفر 99.9% لأنظمة السجلات الصحية","critical",true,["sla_report"]],
        ["MHIS-1.2.5","1.2.5","EHR Integration","تكامل EHR","Secure HL7 FHIR integration between health systems","تكامل آمن HL7 FHIR بين الأنظمة الصحية","high",true,["system_config"]],
      ])),
    ]),
    D("MHIS-D2","2","Clinical System Security","أمن الأنظمة السريرية",[
      S("MHIS-2-1","2.1","Medical Device Security","أمن الأجهزة الطبية",controls([
        ["MHIS-2.1.1","2.1.1","Medical Device Inventory","جرد الأجهزة الطبية","Inventory all network-connected medical devices","جرد جميع الأجهزة الطبية المتصلة بالشبكة","critical",true,["asset_register"]],
        ["MHIS-2.1.2","2.1.2","Medical Device Segmentation","تجزئة الأجهزة الطبية","Segment medical devices on dedicated VLANs","تجزئة الأجهزة الطبية على شبكات VLAN مخصصة","critical",true,["network_diagram"]],
        ["MHIS-2.1.3","2.1.3","Medical Device Patching","تصحيح الأجهزة الطبية","Manage medical device patches with vendor coordination","إدارة تصحيحات الأجهزة الطبية بالتنسيق مع المورد","high",false,["patch_report"]],
        ["MHIS-2.1.4","2.1.4","Medical Device Monitoring","مراقبة الأجهزة الطبية","Monitor medical device traffic for anomalies","مراقبة حركة مرور الأجهزة الطبية بحثاً عن شذوذ","high",true,["monitoring_report"]],
      ])),
      S("MHIS-2-2","2.2","Telemedicine Security","أمن الطب عن بعد",controls([
        ["MHIS-2.2.1","2.2.1","Telemedicine Platform","منصة الطب عن بعد","Secure telemedicine platforms with E2E encryption","تأمين منصات الطب عن بعد بالتشفير من طرف إلى طرف","critical",true,["system_config"]],
        ["MHIS-2.2.2","2.2.2","Remote Patient ID","تحديد هوية المريض عن بعد","Verify patient identity in telemedicine sessions","التحقق من هوية المريض في جلسات الطب عن بعد","critical",true,["system_config"]],
        ["MHIS-2.2.3","2.2.3","Telemedicine Recording","تسجيل الطب عن بعد","Secure storage of telemedicine session recordings","التخزين الآمن لتسجيلات جلسات الطب عن بعد","high",true,["system_config"]],
      ])),
    ]),
    D("MHIS-D3","3","Health Data Exchange","تبادل البيانات الصحية",[
      S("MHIS-3-1","3.1","Interoperability","التشغيل البيني",controls([
        ["MHIS-3.1.1","3.1.1","NPHIES Integration","تكامل نفيس","Integrate with NPHIES national health information exchange","التكامل مع منصة نفيس لتبادل المعلومات الصحية الوطنية","critical",true,["system_config"]],
        ["MHIS-3.1.2","3.1.2","Seha Platform","منصة صحة","Integrate with Seha platform for MOH services","التكامل مع منصة صحة لخدمات وزارة الصحة","high",true,["system_config"]],
        ["MHIS-3.1.3","3.1.3","Lab Result Exchange","تبادل نتائج المختبرات","Secure lab result exchange between facilities","تبادل آمن لنتائج المختبرات بين المنشآت","high",true,["system_config"]],
        ["MHIS-3.1.4","3.1.4","Prescription Exchange","تبادل الوصفات","Electronic prescription exchange with pharmacies","تبادل الوصفات الإلكترونية مع الصيدليات","high",true,["system_config"]],
      ])),
      S("MHIS-3-2","3.2","Research Data","بيانات البحث",controls([
        ["MHIS-3.2.1","3.2.1","Research Ethics","أخلاقيات البحث","IRB approval for health data research use","موافقة لجنة الأخلاقيات لاستخدام البيانات الصحية في البحث","critical",false,["irb_approval"]],
        ["MHIS-3.2.2","3.2.2","De-identification","إزالة الهوية","De-identify health data for research purposes","إزالة هوية البيانات الصحية لأغراض البحث","critical",true,["deidentification_report"]],
        ["MHIS-3.2.3","3.2.3","Research Data Access","الوصول لبيانات البحث","Controlled access to research health datasets","الوصول المتحكم به لمجموعات بيانات البحث الصحي","high",true,["access_control"]],
      ])),
    ]),
  ],
});

export const CBAHI_ACC: FrameworkDef = FW({
  id:"INST-KSA-CBAHI-ACC",reg:"REG-KSA-CBAHI",nEn:"Healthcare Facility Accreditation Standards",nAr:"معايير اعتماد المنشآت الصحية",
  type:"standard",ver:"4.0",verId:"VER-KSA-CBAHI-ACC-4-0",
  sectors:["SEC-KSA-HEALTH-HOSP"],mandatory:true,
  sumEn:"CBAHI accreditation standards for healthcare facilities including IT and data security requirements.",
  sumAr:"معايير اعتماد المركز السعودي لاعتماد المنشآت الصحية بما في ذلك متطلبات أمن تقنية المعلومات والبيانات.",
  tags:["healthcare","accreditation","quality"],
  domains:[
    D("CBHI-D1","1","Information Management","إدارة المعلومات",[
      S("CBHI-1-1","1.1","Health Information System","نظام المعلومات الصحية",controls([
        ["CBHI-1.1.1","1.1.1","HIS Implementation","تنفيذ HIS","Implement integrated health information system","تنفيذ نظام معلومات صحية متكامل","critical",true,["system_config"]],
        ["CBHI-1.1.2","1.1.2","Clinical Documentation","التوثيق السريري","Complete and accurate clinical documentation","التوثيق السريري الكامل والدقيق","critical",false,["document"]],
        ["CBHI-1.1.3","1.1.3","Medical Record Security","أمن السجل الطبي","Protect confidentiality and integrity of medical records","حماية سرية وسلامة السجلات الطبية","critical",true,["system_config"]],
        ["CBHI-1.1.4","1.1.4","Record Retention","حفظ السجلات","Retain medical records per MOH requirements","حفظ السجلات الطبية وفقاً لمتطلبات وزارة الصحة","critical",true,["retention_config"]],
      ])),
      S("CBHI-1-2","1.2","Patient Safety IT","تقنية المعلومات لسلامة المرضى",controls([
        ["CBHI-1.2.1","1.2.1","CPOE System","نظام الأوامر الطبية","Implement computerized physician order entry","تنفيذ نظام إدخال الأوامر الطبية المحوسب","high",true,["system_config"]],
        ["CBHI-1.2.2","1.2.2","Medication Safety","سلامة الأدوية","Bar-code medication administration system","نظام إدارة الأدوية بالرمز الشريطي","high",true,["system_config"]],
        ["CBHI-1.2.3","1.2.3","Clinical Decision Support","دعم القرار السريري","Implement clinical decision support alerts","تنفيذ تنبيهات دعم القرار السريري","high",true,["system_config"]],
        ["CBHI-1.2.4","1.2.4","Patient ID","تحديد هوية المريض","Reliable patient identification system","نظام موثوق لتحديد هوية المريض","critical",true,["system_config"]],
      ])),
    ]),
    D("CBHI-D2","2","Facility Safety & Compliance","سلامة المنشأة والامتثال",[
      S("CBHI-2-1","2.1","IT Infrastructure","البنية التحتية لتقنية المعلومات",controls([
        ["CBHI-2.1.1","2.1.1","IT Disaster Recovery","التعافي من كوارث تقنية المعلومات","IT disaster recovery for clinical systems","التعافي من الكوارث لتقنية المعلومات للأنظمة السريرية","critical",false,["dr_plan"]],
        ["CBHI-2.1.2","2.1.2","Network Infrastructure","البنية التحتية للشبكة","Reliable and secure network infrastructure","بنية تحتية للشبكة موثوقة وآمنة","critical",true,["system_config"]],
        ["CBHI-2.1.3","2.1.3","Data Center Standards","معايير مركز البيانات","Healthcare data center physical and environmental controls","ضوابط مادية وبيئية لمركز بيانات الرعاية الصحية","high",true,["system_config"]],
        ["CBHI-2.1.4","2.1.4","Backup & Recovery","النسخ الاحتياطي والاسترداد","Regular backup of clinical data with tested recovery","النسخ الاحتياطي المنتظم للبيانات السريرية مع اختبار الاسترداد","critical",true,["backup_report"]],
      ])),
    ]),
  ],
});

export const SFDA_MDS: FrameworkDef = FW({
  id:"INST-KSA-SFDA-MDS",reg:"REG-KSA-SFDA",nEn:"Medical Device Cybersecurity Guidelines",nAr:"إرشادات الأمن السيبراني للأجهزة الطبية",
  type:"guideline",ver:"1.0",verId:"VER-KSA-SFDA-MDS-1-0",
  sectors:["SEC-KSA-HEALTH-HOSP","SEC-KSA-HEALTH-PHARMA"],mandatory:true,
  sumEn:"SFDA guidelines for cybersecurity of medical devices and SaMD (Software as a Medical Device).",
  sumAr:"إرشادات الهيئة العامة للغذاء والدواء للأمن السيبراني للأجهزة الطبية والبرمجيات كأجهزة طبية.",
  tags:["medical_devices","cybersecurity","pharma"],
  domains:[
    D("SMDS-D1","1","Medical Device Lifecycle","دورة حياة الأجهزة الطبية",[
      S("SMDS-1-1","1.1","Pre-Market","ما قبل السوق",controls([
        ["SMDS-1.1.1","1.1.1","Security by Design","الأمن حسب التصميم","Incorporate security by design in medical device development","دمج الأمن حسب التصميم في تطوير الأجهزة الطبية","critical",false,["design_document"]],
        ["SMDS-1.1.2","1.1.2","Threat Modeling","نمذجة التهديدات","Conduct threat modeling for medical devices","إجراء نمذجة التهديدات للأجهزة الطبية","critical",false,["threat_model"]],
        ["SMDS-1.1.3","1.1.3","Security Testing","اختبار الأمن","Pre-market cybersecurity testing and validation","اختبار والتحقق من الأمن السيبراني قبل طرح السوق","critical",false,["test_report"]],
        ["SMDS-1.1.4","1.1.4","SBOM","قائمة مكونات البرمجيات","Provide Software Bill of Materials (SBOM)","توفير قائمة مكونات البرمجيات","critical",false,["sbom_document"]],
      ])),
      S("SMDS-1-2","1.2","Post-Market","ما بعد السوق",controls([
        ["SMDS-1.2.1","1.2.1","Vulnerability Management","إدارة الثغرات","Ongoing vulnerability monitoring and patching","مراقبة الثغرات المستمرة والتصحيح","critical",true,["vulnerability_report"]],
        ["SMDS-1.2.2","1.2.2","Incident Reporting","الإبلاغ عن الحوادث","Report cybersecurity incidents affecting device safety to SFDA","الإبلاغ عن الحوادث السيبرانية المؤثرة على سلامة الجهاز للهيئة","critical",false,["incident_report"]],
        ["SMDS-1.2.3","1.2.3","End of Support","نهاية الدعم","Plan and communicate end-of-support for medical devices","التخطيط والإبلاغ عن نهاية الدعم للأجهزة الطبية","high",false,["document"]],
        ["SMDS-1.2.4","1.2.4","Field Safety Corrective Action","إجراء تصحيحي ميداني","Process for field safety corrective actions for cyber issues","عملية الإجراءات التصحيحية الميدانية للمشكلات السيبرانية","critical",false,["corrective_action"]],
      ])),
    ]),
    D("SMDS-D2","2","SaMD Security","أمن البرمجيات كأجهزة طبية",[
      S("SMDS-2-1","2.1","SaMD Requirements","متطلبات SaMD",controls([
        ["SMDS-2.1.1","2.1.1","SaMD Classification","تصنيف SaMD","Classify SaMD per IMDRF risk framework","تصنيف البرمجيات كأجهزة طبية وفقاً لإطار مخاطر IMDRF","critical",false,["classification_record"]],
        ["SMDS-2.1.2","2.1.2","Clinical Validation","التحقق السريري","Clinical validation of AI/ML-based SaMD","التحقق السريري من البرمجيات القائمة على الذكاء الاصطناعي","critical",false,["validation_report"]],
        ["SMDS-2.1.3","2.1.3","Update Management","إدارة التحديثات","Manage SaMD updates with regulatory assessment","إدارة تحديثات SaMD مع التقييم التنظيمي","high",false,["update_assessment"]],
        ["SMDS-2.1.4","2.1.4","Data Integrity","سلامة البيانات","Ensure data integrity for SaMD clinical decisions","ضمان سلامة البيانات لقرارات SaMD السريرية","critical",true,["integrity_report"]],
      ])),
    ]),
  ],
});

export const HEALTH_FRAMEWORKS: FrameworkDef[] = [MOH_HIS, CBAHI_ACC, SFDA_MDS];
