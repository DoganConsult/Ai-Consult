// ============================================
// Shahin AI-KSA GRC — Digital Economy Frameworks
// DGA, MCIT, Yesser, Fintech Saudi
// ============================================
import { FrameworkDef } from "./ksa-frameworks";
import { S, D, FW, controls } from "./ksa-control-builder";

export const DGA_DGOV: FrameworkDef = FW({
  id:"INST-KSA-DGA-DGOV",reg:"REG-KSA-DGA",nEn:"Digital Government Standards",nAr:"معايير الحكومة الرقمية",
  type:"standard",ver:"2.0",verId:"VER-KSA-DGA-DGOV-2-0",
  sectors:["SEC-KSA-GOV-MIN","SEC-KSA-GOV-AUTH","SEC-KSA-GOV-MUN"],mandatory:true,
  sumEn:"DGA digital government standards for e-services, cloud adoption, and government platform interoperability.",
  sumAr:"معايير هيئة الحكومة الرقمية للخدمات الإلكترونية وتبني السحابة والتشغيل البيني للمنصات الحكومية.",
  tags:["digital_government","e-services","cloud","interoperability"],
  domains:[
    D("DGOV-D1","1","E-Service Standards","معايير الخدمات الإلكترونية",[
      S("DGOV-1-1","1.1","Service Design","تصميم الخدمات",controls([
        ["DGOV-1.1.1","1.1.1","User-Centric Design","التصميم المحوري للمستخدم","Design e-services following DGA UX guidelines","تصميم الخدمات الإلكترونية وفقاً لإرشادات DGA لتجربة المستخدم","high",false,["design_document"]],
        ["DGOV-1.1.2","1.1.2","National SSO","تسجيل الدخول الموحد الوطني","Integrate with National SSO (Nafath) for authentication","التكامل مع تسجيل الدخول الموحد الوطني (نفاذ) للمصادقة","critical",true,["system_config"]],
        ["DGOV-1.1.3","1.1.3","Accessibility","إمكانية الوصول","Comply with WCAG 2.1 AA for all government e-services","الامتثال لـ WCAG 2.1 AA لجميع الخدمات الإلكترونية الحكومية","high",true,["accessibility_report"]],
        ["DGOV-1.1.4","1.1.4","Bilingual Support","الدعم ثنائي اللغة","Full Arabic and English support for all services","دعم كامل باللغتين العربية والإنجليزية لجميع الخدمات","high",true,["system_config"]],
        ["DGOV-1.1.5","1.1.5","Mobile-First","الجوال أولاً","Mobile-first design for all government services","تصميم الجوال أولاً لجميع الخدمات الحكومية","high",true,["design_document"]],
      ])),
      S("DGOV-1-2","1.2","Platform Integration","تكامل المنصات",controls([
        ["DGOV-1.2.1","1.2.1","Absher Integration","تكامل أبشر","Integrate citizen services with Absher platform","تكامل خدمات المواطنين مع منصة أبشر","critical",true,["system_config"]],
        ["DGOV-1.2.2","1.2.2","Tawakkalna Integration","تكامل توكلنا","Integrate health and identity services with Tawakkalna","تكامل الخدمات الصحية والهوية مع توكلنا","high",true,["system_config"]],
        ["DGOV-1.2.3","1.2.3","National Address","العنوان الوطني","Integrate with Saudi Post National Address system","التكامل مع نظام العنوان الوطني للبريد السعودي","high",true,["system_config"]],
        ["DGOV-1.2.4","1.2.4","Government Service Bus","ناقل الخدمات الحكومية","Connect via Government Service Bus (GSB) for inter-agency data exchange","الربط عبر ناقل الخدمات الحكومية لتبادل البيانات بين الجهات","critical",true,["system_config"]],
      ])),
    ]),
    D("DGOV-D2","2","Government Cloud","السحابة الحكومية",[
      S("DGOV-2-1","2.1","Cloud-First Policy","سياسة السحابة أولاً",controls([
        ["DGOV-2.1.1","2.1.1","Cloud-First Adoption","تبني السحابة أولاً","Adopt cloud-first strategy for new government systems","تبني استراتيجية السحابة أولاً للأنظمة الحكومية الجديدة","high",false,["document"]],
        ["DGOV-2.1.2","2.1.2","Government Cloud Marketplace","سوق السحابة الحكومية","Use DGA-approved cloud services from government marketplace","استخدام الخدمات السحابية المعتمدة من سوق السحابة الحكومية","critical",true,["procurement_record"]],
        ["DGOV-2.1.3","2.1.3","Data Sovereignty","سيادة البيانات","Ensure government data resides within KSA","ضمان بقاء البيانات الحكومية داخل المملكة","critical",true,["system_config"]],
        ["DGOV-2.1.4","2.1.4","Cloud Security Standards","معايير أمن السحابة","Comply with NCA CCC for government cloud usage","الامتثال لضوابط الحوسبة السحابية للاستخدام الحكومي","critical",false,["compliance_report"]],
      ])),
    ]),
    D("DGOV-D3","3","Government API","واجهات البرمجة الحكومية",[
      S("DGOV-3-1","3.1","API Standards","معايير واجهات البرمجة",controls([
        ["DGOV-3.1.1","3.1.1","API Design Standards","معايير تصميم API","Follow DGA API design standards (RESTful, OpenAPI 3.0)","اتباع معايير تصميم API لـ DGA","high",true,["api_spec"]],
        ["DGOV-3.1.2","3.1.2","API Gateway","بوابة API","Publish APIs via DGA government API gateway","نشر واجهات البرمجة عبر بوابة API الحكومية","high",true,["system_config"]],
        ["DGOV-3.1.3","3.1.3","API Security","أمن API","Secure APIs with OAuth 2.0 and API key management","تأمين واجهات البرمجة بـ OAuth 2.0 وإدارة مفاتيح API","critical",true,["system_config"]],
        ["DGOV-3.1.4","3.1.4","API Monitoring","مراقبة API","Monitor API usage, performance, and security","مراقبة استخدام وأداء وأمن واجهات البرمجة","high",true,["monitoring_report"]],
      ])),
    ]),
  ],
});

export const MCIT_CLOUD: FrameworkDef = FW({
  id:"INST-KSA-MCIT-CLOUD",reg:"REG-KSA-MCIT",nEn:"Cloud Computing Regulatory Framework",nAr:"الإطار التنظيمي للحوسبة السحابية",
  type:"framework",ver:"2.0",verId:"VER-KSA-MCIT-CLOUD-2-0",
  sectors:["SEC-KSA-TEL-ICT"],mandatory:true,
  sumEn:"MCIT regulatory framework for cloud service providers operating in or serving the KSA market.",
  sumAr:"الإطار التنظيمي لوزارة الاتصالات لمقدمي الخدمات السحابية العاملين في السوق السعودي.",
  tags:["cloud","regulation","csp","data_localization"],
  domains:[
    D("MCLD-D1","1","CSP Licensing","ترخيص مزودي الخدمات السحابية",[
      S("MCLD-1-1","1.1","CSP Requirements","متطلبات مزودي الخدمات",controls([
        ["MCLD-1.1.1","1.1.1","CSP Registration","تسجيل مزود الخدمة","Register as cloud service provider with CST","التسجيل كمزود خدمات سحابية لدى هيئة الاتصالات","critical",false,["registration_record"]],
        ["MCLD-1.1.2","1.1.2","Data Center in KSA","مركز بيانات في المملكة","Operate or partner with data center within KSA","تشغيل أو الشراكة مع مركز بيانات داخل المملكة","critical",false,["certificate"]],
        ["MCLD-1.1.3","1.1.3","Data Classification Support","دعم تصنيف البيانات","Support national data classification for hosted data","دعم التصنيف الوطني للبيانات المستضافة","critical",true,["system_config"]],
        ["MCLD-1.1.4","1.1.4","Transparency Report","تقرير الشفافية","Publish annual transparency report","نشر تقرير شفافية سنوي","high",false,["transparency_report"]],
      ])),
      S("MCLD-1-2","1.2","Data Localization","توطين البيانات",controls([
        ["MCLD-1.2.1","1.2.1","Government Data Localization","توطين البيانات الحكومية","Store government data exclusively within KSA","تخزين البيانات الحكومية حصرياً داخل المملكة","critical",true,["system_config"]],
        ["MCLD-1.2.2","1.2.2","Financial Data Localization","توطين البيانات المالية","Store financial sector data within KSA per SAMA","تخزين بيانات القطاع المالي داخل المملكة وفقاً لساما","critical",true,["system_config"]],
        ["MCLD-1.2.3","1.2.3","Health Data Localization","توطين البيانات الصحية","Store health data within KSA per MOH","تخزين البيانات الصحية داخل المملكة وفقاً لوزارة الصحة","critical",true,["system_config"]],
        ["MCLD-1.2.4","1.2.4","Cross-Border Approval","موافقة النقل عبر الحدود","Obtain approval before cross-border data transfer","الحصول على موافقة قبل نقل البيانات عبر الحدود","critical",false,["approval_record"]],
      ])),
    ]),
    D("MCLD-D2","2","CSP Security","أمن مزودي الخدمات السحابية",[
      S("MCLD-2-1","2.1","CSP Controls","ضوابط مزودي الخدمات",controls([
        ["MCLD-2.1.1","2.1.1","ISO 27017 Compliance","امتثال ISO 27017","Comply with ISO 27017 cloud security controls","الامتثال لضوابط أمن السحابة ISO 27017","critical",false,["certification"]],
        ["MCLD-2.1.2","2.1.2","SOC 2 Report","تقرير SOC 2","Maintain SOC 2 Type II report","الحفاظ على تقرير SOC 2 النوع الثاني","critical",false,["soc2_report"]],
        ["MCLD-2.1.3","2.1.3","Encryption Standards","معايير التشفير","Implement FIPS 140-2 validated encryption","تنفيذ تشفير معتمد من FIPS 140-2","critical",true,["system_config"]],
        ["MCLD-2.1.4","2.1.4","Tenant Isolation","عزل المستأجرين","Ensure strong multi-tenant isolation","ضمان عزل قوي متعدد المستأجرين","critical",true,["system_config"]],
        ["MCLD-2.1.5","2.1.5","Incident Notification","إخطار الحوادث","Notify customers of security incidents within 24 hours","إخطار العملاء بالحوادث الأمنية خلال 24 ساعة","critical",false,["notification_record"]],
      ])),
    ]),
  ],
});

export const DIGITAL_FRAMEWORKS: FrameworkDef[] = [DGA_DGOV, MCIT_CLOUD];
